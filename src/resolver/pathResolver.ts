import * as path from "path";
import * as fs from "fs";
import {
  getConfig,
  detectConvexProject,
  toApiPath,
  fromApiPath,
} from "../config";
import type { ConvexProjectInfo } from "../types";

// Cache the project info to avoid repeated file system scans
let cachedProjectInfo: ConvexProjectInfo | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Get the Convex project info, using cache if available
 */
export async function getConvexProjectInfo(): Promise<ConvexProjectInfo | null> {
  const now = Date.now();
  if (cachedProjectInfo && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedProjectInfo;
  }

  cachedProjectInfo = await detectConvexProject();
  cacheTimestamp = now;
  return cachedProjectInfo;
}

/**
 * Clear the cached project info
 */
export function clearProjectCache(): void {
  cachedProjectInfo = null;
  cacheTimestamp = 0;
}

/**
 * Given a backend file path and function name, compute the full API path
 * e.g., "/path/to/convex/domains/contacts.ts" + "createContact" -> "api.domains.contacts.createContact"
 */
export async function computeApiPath(
  filePath: string,
  functionName: string,
): Promise<string | null> {
  const projectInfo = await getConvexProjectInfo();
  if (!projectInfo) {
    return null;
  }

  // Check if the file is inside the convex directory
  if (!filePath.startsWith(projectInfo.convexDir)) {
    return null;
  }

  const apiPath = toApiPath(filePath, functionName, projectInfo.convexDir);
  return `api.${apiPath}`;
}

/**
 * Given an API path, resolve it to a file path and function name
 * e.g., "api.domains.contacts.createContact" -> { filePath: "/path/to/convex/domains/contacts.ts", functionName: "createContact" }
 */
export async function resolveApiPath(apiPath: string): Promise<{
  filePath: string;
  functionName: string;
} | null> {
  const projectInfo = await getConvexProjectInfo();
  if (!projectInfo) {
    return null;
  }

  const parsed = fromApiPath(apiPath);
  if (!parsed) {
    return null;
  }

  // Try different extensions
  const extensions = [".ts", ".tsx", ".js", ".jsx"];
  for (const ext of extensions) {
    const fullPath = path.join(projectInfo.convexDir, parsed.modulePath + ext);
    if (fs.existsSync(fullPath)) {
      return {
        filePath: fullPath,
        functionName: parsed.functionName,
      };
    }
  }

  return null;
}

/**
 * Check if a file is inside the Convex backend directory
 */
export async function isConvexBackendFile(filePath: string): Promise<boolean> {
  const projectInfo = await getConvexProjectInfo();
  if (!projectInfo) {
    return false;
  }

  // Normalize paths for comparison
  const normalizedFilePath = path.normalize(filePath);
  const normalizedConvexDir = path.normalize(projectInfo.convexDir);

  // Must be inside convex dir but not in _generated
  return (
    normalizedFilePath.startsWith(normalizedConvexDir) &&
    !normalizedFilePath.includes("_generated")
  );
}

/**
 * Get search paths for finding frontend usages
 * Returns paths to search in, respecting user configuration
 */
export async function getSearchPaths(): Promise<string[]> {
  const config = getConfig();
  const projectInfo = await getConvexProjectInfo();

  if (!projectInfo) {
    return [];
  }

  // If user specified frontend paths, use those
  if (config.frontendPaths.length > 0) {
    return config.frontendPaths.map((p) =>
      path.isAbsolute(p) ? p : path.join(projectInfo.workspaceRoot, p),
    );
  }

  // Otherwise, search the entire workspace
  return [projectInfo.workspaceRoot];
}

/**
 * Get the glob pattern for excluding directories from search
 */
export function getExcludePattern(): string {
  const config = getConfig();
  return `{${config.excludePatterns.join(",")}}`;
}
