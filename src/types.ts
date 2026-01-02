import type * as vscode from "vscode";

/**
 * Configuration for the Convex Navigator extension
 */
export interface ConvexNavigatorConfig {
  /** Path to the Convex directory relative to workspace root */
  convexPath: string;
  /** Paths to frontend directories to search for usages */
  frontendPaths: string[];
  /** Custom function wrapper names to detect as Convex functions */
  customWrappers: string[];
  /** API object names to search for */
  apiImportPatterns: string[];
  /** Glob patterns to exclude from search */
  excludePatterns: string[];
}

/**
 * Represents a Convex function definition found in the backend
 */
export interface ConvexFunctionDefinition {
  /** Name of the exported function */
  name: string;
  /** Type of Convex function */
  type: ConvexFunctionType;
  /** File path where the function is defined */
  filePath: string;
  /** Line number where the function is defined (0-indexed) */
  line: number;
  /** Column where the function name starts */
  column: number;
  /** The API path (e.g., "domains.contacts.createContact") */
  apiPath: string;
  /** The wrapper function used (e.g., "mutation", "authedQuery") */
  wrapper: string;
}

/**
 * Type of Convex function
 */
export type ConvexFunctionType =
  | "query"
  | "mutation"
  | "action"
  | "internalQuery"
  | "internalMutation"
  | "internalAction"
  | "unknown";

/**
 * Represents a usage of a Convex function in frontend code
 */
export interface ConvexFunctionUsage {
  /** The full API path used (e.g., "api.domains.contacts.createContact") */
  apiPath: string;
  /** File path where the usage is found */
  filePath: string;
  /** Line number (0-indexed) */
  line: number;
  /** Column where the usage starts */
  column: number;
  /** The full line of code containing the usage */
  lineText: string;
  /** The hook or method used (e.g., "useMutation", "useQuery") */
  hookUsed?: string;
}

/**
 * Result of searching for Convex function usages
 */
export interface UsageSearchResult {
  /** The function being searched for */
  functionName: string;
  /** The API path being searched for */
  apiPath: string;
  /** All found usages */
  usages: ConvexFunctionUsage[];
  /** Time taken to search in milliseconds */
  searchTimeMs: number;
}

/**
 * Represents a location in the source code
 */
export interface SourceLocation {
  uri: vscode.Uri;
  range: vscode.Range;
}

/**
 * Information about the detected Convex project
 */
export interface ConvexProjectInfo {
  /** Absolute path to the convex directory */
  convexDir: string;
  /** Absolute path to the workspace root */
  workspaceRoot: string;
  /** Path to convex.config.ts if found */
  configPath?: string;
  /** Path to _generated/api.ts if found */
  generatedApiPath?: string;
}
