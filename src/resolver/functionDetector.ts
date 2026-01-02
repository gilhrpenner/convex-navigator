import * as vscode from "vscode";
import { getAllWrappers } from "../config";
import type { ConvexFunctionDefinition, ConvexFunctionType } from "../types";
import { getConvexProjectInfo, computeApiPath } from "./pathResolver";

/**
 * Regex pattern to match Convex function exports
 * Matches patterns like:
 *   export const functionName = query({...})
 *   export const functionName = mutation({...})
 *   export const functionName = authedMutation({...})
 *
 * Note: This uses regex for simplicity and speed.
 * TODO: For more accurate detection, consider using TypeScript AST parsing.
 * AST parsing would handle edge cases like:
 *   - Multi-line declarations
 *   - Aliased imports (e.g., import { query as q } from "convex/server")
 *   - Re-exports
 * For AST parsing, use the TypeScript compiler API:
 *   import * as ts from "typescript";
 *   const sourceFile = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
 *   // Walk the AST to find export declarations
 */
function buildFunctionPattern(wrappers: string[]): RegExp {
  const wrappersPattern = wrappers.join("|");
  // Match: export const <name> = <wrapper>({
  // Also handles: export const <name> = <wrapper><GenericType>({
  return new RegExp(
    `export\\s+const\\s+(\\w+)\\s*=\\s*(${wrappersPattern})(?:<[^>]+>)?\\s*\\(`,
    "g",
  );
}

/**
 * Determine the function type based on the wrapper name
 */
function getFunctionType(wrapper: string): ConvexFunctionType {
  const lowerWrapper = wrapper.toLowerCase();

  if (lowerWrapper.includes("internalquery")) {
    return "internalQuery";
  }
  if (lowerWrapper.includes("internalmutation")) {
    return "internalMutation";
  }
  if (lowerWrapper.includes("internalaction")) {
    return "internalAction";
  }
  if (lowerWrapper.includes("query")) {
    return "query";
  }
  if (lowerWrapper.includes("mutation")) {
    return "mutation";
  }
  if (lowerWrapper.includes("action")) {
    return "action";
  }

  return "unknown";
}

/**
 * Find all Convex function definitions in a file
 */
export async function findConvexFunctionsInFile(
  filePath: string,
): Promise<ConvexFunctionDefinition[]> {
  const projectInfo = await getConvexProjectInfo();
  if (!projectInfo) {
    return [];
  }

  try {
    const document = await vscode.workspace.openTextDocument(filePath);
    const content = document.getText();
    const wrappers = getAllWrappers();
    const pattern = buildFunctionPattern(wrappers);

    const functions: ConvexFunctionDefinition[] = [];
    let match: RegExpExecArray | null = pattern.exec(content);

    while (match !== null) {
      const functionName = match[1];
      const wrapper = match[2];
      const position = document.positionAt(match.index);

      const apiPath = await computeApiPath(filePath, functionName);
      if (apiPath) {
        functions.push({
          name: functionName,
          type: getFunctionType(wrapper),
          filePath,
          line: position.line,
          column: position.character,
          apiPath,
          wrapper,
        });
      }

      match = pattern.exec(content);
    }

    return functions;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

/**
 * Find the Convex function at a specific position in a document
 */
export async function findConvexFunctionAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): Promise<ConvexFunctionDefinition | null> {
  const projectInfo = await getConvexProjectInfo();
  if (!projectInfo) {
    return null;
  }

  // Check if we're in a convex file
  if (!document.uri.fsPath.startsWith(projectInfo.convexDir)) {
    return null;
  }

  // Skip _generated files
  if (document.uri.fsPath.includes("_generated")) {
    return null;
  }

  const content = document.getText();
  const wrappers = getAllWrappers();
  const pattern = buildFunctionPattern(wrappers);

  let match: RegExpExecArray | null = pattern.exec(content);

  while (match !== null) {
    const functionName = match[1];
    const wrapper = match[2];
    const startPos = document.positionAt(match.index);

    // Check if position is on this line and within the function name
    if (position.line === startPos.line) {
      // Find where the function name starts in the match
      const nameStart = match[0].indexOf(functionName);
      const nameStartCol = startPos.character + nameStart;
      const nameEndCol = nameStartCol + functionName.length;

      if (
        position.character >= nameStartCol &&
        position.character <= nameEndCol
      ) {
        const apiPath = await computeApiPath(document.uri.fsPath, functionName);
        if (apiPath) {
          return {
            name: functionName,
            type: getFunctionType(wrapper),
            filePath: document.uri.fsPath,
            line: startPos.line,
            column: startPos.character,
            apiPath,
            wrapper,
          };
        }
      }
    }

    match = pattern.exec(content);
  }

  return null;
}

/**
 * Get the word at a position that might be a function name
 */
export function getWordAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): string | null {
  const wordRange = document.getWordRangeAtPosition(position, /\w+/);
  if (!wordRange) {
    return null;
  }
  return document.getText(wordRange);
}
