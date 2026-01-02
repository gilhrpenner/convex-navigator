import * as vscode from "vscode";
import * as path from "path";
import { getConvexProjectInfo, resolveApiPath } from "../resolver/pathResolver";

/**
 * Regex to match api.X.Y.Z patterns in code
 * Matches: api.domains.contacts.createContact
 * Also matches: internal.domains.contacts.createContact
 */
const API_PATH_PATTERN = /\b(api|internal)(\.\w+)+\b/g;

/**
 * Extract the API path at a given position in the document
 */
function getApiPathAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position,
): { apiPath: string; range: vscode.Range } | null {
  const line = document.lineAt(position.line).text;
  const pattern = new RegExp(API_PATH_PATTERN.source, "g");

  let match: RegExpExecArray | null = pattern.exec(line);
  while (match !== null) {
    const startCol = match.index;
    const endCol = match.index + match[0].length;

    // Check if position is within this match
    if (position.character >= startCol && position.character <= endCol) {
      return {
        apiPath: match[0],
        range: new vscode.Range(position.line, startCol, position.line, endCol),
      };
    }

    match = pattern.exec(line);
  }

  return null;
}

/**
 * Try to extract function signature from the source file
 * This is a simplified extraction - for full accuracy, use TypeScript AST
 */
async function extractFunctionInfo(
  filePath: string,
  functionName: string,
): Promise<{
  wrapper: string;
  argsPreview: string;
  lineNumber: number;
} | null> {
  try {
    const document = await vscode.workspace.openTextDocument(filePath);
    const content = document.getText();

    // Find the export const line
    const exportPattern = new RegExp(
      `export\\s+const\\s+${functionName}\\s*=\\s*(\\w+)(?:<[^>]+>)?\\s*\\(\\s*\\{`,
      "s",
    );
    const match = exportPattern.exec(content);

    if (!match) {
      return null;
    }

    const wrapper = match[1];
    const position = document.positionAt(match.index);

    // Try to extract the args object (simplified)
    const afterMatch = content.slice(match.index + match[0].length);

    // Find the args property
    const argsMatch = afterMatch.match(
      /args\s*:\s*(?:z\.object\()?(\{[^}]+\}|\w+)/s,
    );
    let argsPreview = "unknown";

    if (argsMatch) {
      argsPreview = argsMatch[1].trim();
      // Truncate if too long
      if (argsPreview.length > 100) {
        argsPreview = argsPreview.slice(0, 100) + "...";
      }
    } else {
      // Check for validator pattern (e.g., args: v.object({...}))
      const validatorMatch = afterMatch.match(/args\s*:\s*v\.(\w+)\(/);
      if (validatorMatch) {
        argsPreview = `v.${validatorMatch[1]}(...)`;
      }
    }

    return {
      wrapper,
      argsPreview,
      lineNumber: position.line + 1, // Convert to 1-indexed for display
    };
  } catch (error) {
    console.error(`Error extracting function info from ${filePath}:`, error);
    return null;
  }
}

/**
 * Determine function type from wrapper name for display
 */
function getFunctionTypeLabel(wrapper: string): string {
  const lower = wrapper.toLowerCase();
  if (lower.includes("query")) {
    return "query";
  }
  if (lower.includes("mutation")) {
    return "mutation";
  }
  if (lower.includes("action")) {
    return "action";
  }
  return wrapper;
}

/**
 * VS Code Hover Provider implementation
 * Provides hover information for api.X.Y.Z patterns
 */
export class ConvexHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): Promise<vscode.Hover | null> {
    const apiMatch = getApiPathAtPosition(document, position);
    if (!apiMatch) {
      return null;
    }

    const { apiPath, range } = apiMatch;

    // Resolve the API path to a file
    const resolved = await resolveApiPath(apiPath);
    if (!resolved) {
      return null;
    }

    const { filePath, functionName } = resolved;
    const projectInfo = await getConvexProjectInfo();

    // Get function information
    const functionInfo = await extractFunctionInfo(filePath, functionName);

    // Build the hover content
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    markdown.supportHtml = true;

    // Header with function name and type
    if (functionInfo) {
      const typeLabel = getFunctionTypeLabel(functionInfo.wrapper);
      markdown.appendMarkdown(`**${functionName}** *(${typeLabel})*\n\n`);
      markdown.appendMarkdown(`Wrapper: \`${functionInfo.wrapper}\`\n\n`);

      if (functionInfo.argsPreview !== "unknown") {
        markdown.appendMarkdown(`Args: \`${functionInfo.argsPreview}\`\n\n`);
      }
    } else {
      markdown.appendMarkdown(`**${functionName}**\n\n`);
    }

    // File location with clickable link
    const relativePath = projectInfo
      ? path.relative(projectInfo.workspaceRoot, filePath)
      : filePath;

    const lineNumber = functionInfo?.lineNumber ?? 1;
    const fileUri = vscode.Uri.file(filePath);
    const commandUri = vscode.Uri.parse(
      `command:vscode.open?${encodeURIComponent(
        JSON.stringify([
          fileUri,
          { selection: { startLine: lineNumber - 1, startColumn: 0 } },
        ]),
      )}`,
    );

    markdown.appendMarkdown(`[${relativePath}:${lineNumber}](${commandUri})`);

    return new vscode.Hover(markdown, range);
  }
}
