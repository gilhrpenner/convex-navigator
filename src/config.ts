import * as vscode from "vscode";
import type { ConvexNavigatorConfig, ConvexProjectInfo } from "./types";
import * as path from "path";
import * as fs from "fs";

/**
 * Default Convex function wrappers that ship with the Convex library
 */
export const DEFAULT_CONVEX_WRAPPERS = [
  "query",
  "mutation",
  "action",
  "internalQuery",
  "internalMutation",
  "internalAction",
];

/**
 * Get the extension configuration from VS Code settings
 */
export function getConfig(): ConvexNavigatorConfig {
  const config = vscode.workspace.getConfiguration("convexNavigator");

  return {
    convexPath: config.get<string>("convexPath", ""),
    frontendPaths: config.get<string[]>("frontendPaths", []),
    customWrappers: config.get<string[]>("customWrappers", []),
    apiImportPatterns: config.get<string[]>("apiImportPatterns", [
      "api",
      "internal",
    ]),
    excludePatterns: config.get<string[]>("excludePatterns", [
      "**/node_modules/**",
      "**/_generated/**",
      "**/dist/**",
      "**/out/**",
      "**/.git/**",
    ]),
  };
}

/**
 * Get all Convex function wrappers (default + custom)
 */
export function getAllWrappers(): string[] {
  const config = getConfig();
  return [...DEFAULT_CONVEX_WRAPPERS, ...config.customWrappers];
}

/**
 * Auto-detect the Convex project structure in the workspace
 */
export async function detectConvexProject(): Promise<ConvexProjectInfo | null> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return null;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const config = getConfig();

  // If user specified a convex path, use that
  if (config.convexPath) {
    const convexDir = path.join(workspaceRoot, config.convexPath);
    if (fs.existsSync(convexDir)) {
      return {
        convexDir,
        workspaceRoot,
        configPath: findFile(convexDir, "convex.config.ts"),
        generatedApiPath: findFile(
          path.join(convexDir, "_generated"),
          "api.ts",
        ),
      };
    }
  }

  // Auto-detect by searching for convex.config.ts
  const configFiles = await vscode.workspace.findFiles(
    "**/convex.config.ts",
    "**/node_modules/**",
    5,
  );

  if (configFiles.length > 0) {
    const configPath = configFiles[0].fsPath;
    const convexDir = path.dirname(configPath);

    return {
      convexDir,
      workspaceRoot,
      configPath,
      generatedApiPath: findFile(path.join(convexDir, "_generated"), "api.ts"),
    };
  }

  // Fallback: search for _generated/api.ts
  const apiFiles = await vscode.workspace.findFiles(
    "**/convex/_generated/api.ts",
    "**/node_modules/**",
    5,
  );

  if (apiFiles.length > 0) {
    const apiPath = apiFiles[0].fsPath;
    const convexDir = path.dirname(path.dirname(apiPath));

    return {
      convexDir,
      workspaceRoot,
      generatedApiPath: apiPath,
    };
  }

  return null;
}

/**
 * Find a file in a directory
 */
function findFile(dir: string, filename: string): string | undefined {
  const filePath = path.join(dir, filename);
  return fs.existsSync(filePath) ? filePath : undefined;
}

/**
 * Get the relative path from convex directory to a file
 * Used to compute the API path
 */
export function getRelativeConvexPath(
  filePath: string,
  convexDir: string,
): string {
  const relative = path.relative(convexDir, filePath);
  // Remove .ts/.tsx extension
  return relative.replace(/\.(ts|tsx|js|jsx)$/, "");
}

/**
 * Convert a file path and function name to an API path
 * e.g., "domains/contacts.ts" + "createContact" -> "domains.contacts.createContact"
 */
export function toApiPath(
  filePath: string,
  functionName: string,
  convexDir: string,
): string {
  const relativePath = getRelativeConvexPath(filePath, convexDir);
  // Convert path separators to dots
  const modulePath = relativePath.split(path.sep).join(".");
  return `${modulePath}.${functionName}`;
}

/**
 * Convert an API path to a file path
 * e.g., "api.domains.contacts.createContact" -> { filePath: "domains/contacts", functionName: "createContact" }
 */
export function fromApiPath(apiPath: string): {
  modulePath: string;
  functionName: string;
} | null {
  // Remove "api." or "internal." prefix
  const withoutPrefix = apiPath.replace(/^(api|internal)\./, "");
  const parts = withoutPrefix.split(".");

  if (parts.length < 2) {
    return null;
  }

  const functionName = parts.pop()!;
  const modulePath = parts.join("/");

  return { modulePath, functionName };
}
