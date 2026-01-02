import * as vscode from "vscode";
import * as cp from "child_process";
import { getConfig } from "../config";
import type { ConvexFunctionUsage, UsageSearchResult } from "../types";
import { getConvexProjectInfo, getSearchPaths } from "../resolver/pathResolver";
import { findConvexFunctionAtPosition } from "../resolver/functionDetector";

/**
 * Search for usages of a Convex function in the frontend code
 * Uses ripgrep for fast searching across the codebase
 *
 * TODO: For more accurate results, consider implementing AST-based search.
 * AST parsing would:
 *   - Identify actual usages vs. string literals or comments
 *   - Track variable assignments (e.g., const myApi = api.domains.contacts)
 *   - Handle dynamic property access
 */
export async function searchForUsages(
  apiPath: string,
  functionName: string,
): Promise<UsageSearchResult> {
  const startTime = Date.now();
  const usages: ConvexFunctionUsage[] = [];

  const projectInfo = await getConvexProjectInfo();
  if (!projectInfo) {
    return {
      functionName,
      apiPath,
      usages: [],
      searchTimeMs: Date.now() - startTime,
    };
  }

  const searchPaths = await getSearchPaths();
  const config = getConfig();

  // Build the search pattern - escape dots for regex
  const escapedApiPath = apiPath.replace(/\./g, "\\.");
  const searchPattern = escapedApiPath;

  for (const searchPath of searchPaths) {
    try {
      const results = await searchWithRipgrep(
        searchPattern,
        searchPath,
        config.excludePatterns,
      );

      for (const result of results) {
        // Try to detect which hook is being used
        const hookMatch = result.lineText.match(
          /(useQuery|useMutation|useAction|usePaginatedQuery|useConvexQuery|useConvexMutation|ctx\.(runQuery|runMutation|runAction))\s*\(/,
        );

        usages.push({
          apiPath,
          filePath: result.filePath,
          line: result.line,
          column: result.column,
          lineText: result.lineText,
          hookUsed: hookMatch ? hookMatch[1] : undefined,
        });
      }
    } catch (error) {
      console.error(`Error searching in ${searchPath}:`, error);
    }
  }

  return {
    functionName,
    apiPath,
    usages,
    searchTimeMs: Date.now() - startTime,
  };
}

/**
 * Result from ripgrep search
 */
interface RipgrepResult {
  filePath: string;
  line: number;
  column: number;
  lineText: string;
}

/**
 * Execute ripgrep to search for a pattern
 * Falls back to VS Code's built-in search if ripgrep is not available
 */
async function searchWithRipgrep(
  pattern: string,
  searchPath: string,
  excludePatterns: string[],
): Promise<RipgrepResult[]> {
  return new Promise((resolve) => {
    // Build ripgrep arguments
    // Use glob patterns instead of --type since tsx/jsx aren't built-in types
    const args = [
      "--json",
      "--line-number",
      "--column",
      "--no-heading",
      "-e",
      pattern,
      "--glob",
      "*.ts",
      "--glob",
      "*.tsx",
      "--glob",
      "*.js",
      "--glob",
      "*.jsx",
    ];

    // Add exclude patterns
    for (const exclude of excludePatterns) {
      args.push("--glob", `!${exclude}`);
    }

    args.push(searchPath);

    // Try to use ripgrep
    const rg = cp.spawn("rg", args, {
      cwd: searchPath,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    rg.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    rg.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    rg.on("error", () => {
      // Ripgrep not found, fall back to VS Code search
      console.log("ripgrep not found, falling back to VS Code search");
      fallbackSearch(pattern, searchPath, excludePatterns).then(resolve);
    });

    rg.on("close", (code) => {
      if (code !== 0 && code !== 1) {
        // code 1 means no matches, which is fine
        console.error("ripgrep error:", stderr);
        resolve([]);
        return;
      }

      const results: RipgrepResult[] = [];
      const lines = stdout.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.type === "match") {
            const data = json.data;
            results.push({
              filePath: data.path.text,
              line: data.line_number - 1, // Convert to 0-indexed
              column: data.submatches[0]?.start ?? 0,
              lineText: data.lines.text.trim(),
            });
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      resolve(results);
    });
  });
}

/**
 * Fallback search using VS Code's built-in text search
 */
async function fallbackSearch(
  pattern: string,
  searchPath: string,
  excludePatterns: string[],
): Promise<RipgrepResult[]> {
  const results: RipgrepResult[] = [];

  try {
    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(searchPath, "**/*.{ts,tsx,js,jsx}"),
      `{${excludePatterns.join(",")}}`,
      1000, // Limit to 1000 files
    );

    for (const file of files) {
      try {
        const document = await vscode.workspace.openTextDocument(file);
        const content = document.getText();
        const regex = new RegExp(pattern, "g");
        let match: RegExpExecArray | null = regex.exec(content);

        while (match !== null) {
          const position = document.positionAt(match.index);
          const lineText = document.lineAt(position.line).text;

          results.push({
            filePath: file.fsPath,
            line: position.line,
            column: position.character,
            lineText: lineText.trim(),
          });

          match = regex.exec(content);
        }
      } catch (error) {
        console.error(`Error reading file ${file.fsPath}:`, error);
      }
    }
  } catch (error) {
    console.error("Fallback search error:", error);
  }

  return results;
}

/**
 * VS Code Reference Provider implementation
 * Provides references for Convex function definitions
 *
 * This integrates with VS Code's native "Find All References" (Shift+F12)
 * When the cursor is on a Convex function definition, this provider
 * returns all frontend usages of that function.
 */
export class ConvexReferenceProvider implements vscode.ReferenceProvider {
  async provideReferences(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.ReferenceContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.Location[] | null> {
    // Check if this is a Convex function definition
    const convexFunction = await findConvexFunctionAtPosition(
      document,
      position,
    );
    if (!convexFunction) {
      return null;
    }

    if (token.isCancellationRequested) {
      return null;
    }

    // Search for usages
    const result = await searchForUsages(
      convexFunction.apiPath,
      convexFunction.name,
    );

    if (token.isCancellationRequested) {
      return null;
    }

    // Convert to VS Code locations
    const locations: vscode.Location[] = result.usages.map((usage) => {
      const uri = vscode.Uri.file(usage.filePath);
      const range = new vscode.Range(
        usage.line,
        usage.column,
        usage.line,
        usage.column + convexFunction.apiPath.length,
      );
      return new vscode.Location(uri, range);
    });

    // Include the definition itself if requested (for "Find All References")
    if (context.includeDeclaration) {
      const definitionLocation = new vscode.Location(
        document.uri,
        new vscode.Range(
          convexFunction.line,
          convexFunction.column,
          convexFunction.line,
          convexFunction.column + convexFunction.name.length,
        ),
      );
      locations.unshift(definitionLocation);
    }

    return locations;
  }
}

/**
 * Command handler for "Find Convex Usages"
 */
export async function findConvexUsagesCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("No active editor");
    return;
  }

  const position = editor.selection.active;
  const convexFunction = await findConvexFunctionAtPosition(
    editor.document,
    position,
  );

  if (!convexFunction) {
    vscode.window.showWarningMessage(
      "Cursor is not on a Convex function definition",
    );
    return;
  }

  // Show progress
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Finding usages of ${convexFunction.name}...`,
      cancellable: true,
    },
    async (_progress, token) => {
      const result = await searchForUsages(
        convexFunction.apiPath,
        convexFunction.name,
      );

      if (token.isCancellationRequested) {
        return;
      }

      if (result.usages.length === 0) {
        vscode.window.showInformationMessage(
          `No usages found for ${convexFunction.name}`,
        );
        return;
      }

      // Show results in the references panel
      const locations: vscode.Location[] = result.usages.map((usage) => {
        const uri = vscode.Uri.file(usage.filePath);
        const range = new vscode.Range(
          usage.line,
          usage.column,
          usage.line,
          usage.column + convexFunction.apiPath.length,
        );
        return new vscode.Location(uri, range);
      });

      // Use VS Code's built-in peek references view
      await vscode.commands.executeCommand(
        "editor.action.showReferences",
        editor.document.uri,
        position,
        locations,
      );

      vscode.window.showInformationMessage(
        `Found ${result.usages.length} usage(s) of ${convexFunction.name} (${result.searchTimeMs}ms)`,
      );
    },
  );
}

/**
 * Command handler for "Find All References" (Shift+F12 override)
 * This is triggered when Shift+F12 is pressed in a Convex backend file.
 * It first tries to find Convex usages, and if not on a Convex function,
 * falls back to the default "Find All References" behavior.
 */
export async function findAllReferencesCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    // Fall back to default
    await vscode.commands.executeCommand(
      "editor.action.referenceSearch.trigger",
    );
    return;
  }

  const position = editor.selection.active;
  const convexFunction = await findConvexFunctionAtPosition(
    editor.document,
    position,
  );

  if (!convexFunction) {
    // Not on a Convex function, fall back to default Find All References
    await vscode.commands.executeCommand(
      "editor.action.referenceSearch.trigger",
    );
    return;
  }

  // Found a Convex function, search for usages
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Finding references to ${convexFunction.name}...`,
      cancellable: true,
    },
    async (_progress, token) => {
      const result = await searchForUsages(
        convexFunction.apiPath,
        convexFunction.name,
      );

      if (token.isCancellationRequested) {
        return;
      }

      // Build locations array - include definition first
      const locations: vscode.Location[] = [];

      // Add the definition itself
      locations.push(
        new vscode.Location(
          editor.document.uri,
          new vscode.Range(
            convexFunction.line,
            convexFunction.column,
            convexFunction.line,
            convexFunction.column + convexFunction.name.length,
          ),
        ),
      );

      // Add all usages
      for (const usage of result.usages) {
        const uri = vscode.Uri.file(usage.filePath);
        const range = new vscode.Range(
          usage.line,
          usage.column,
          usage.line,
          usage.column + convexFunction.apiPath.length,
        );
        locations.push(new vscode.Location(uri, range));
      }

      // Show in the references panel (same as native Find All References)
      await vscode.commands.executeCommand(
        "editor.action.showReferences",
        editor.document.uri,
        position,
        locations,
      );
    },
  );
}
