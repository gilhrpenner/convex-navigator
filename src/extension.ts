import * as vscode from "vscode";
import { detectConvexProject } from "./config";
import { clearProjectCache } from "./resolver/pathResolver";
import {
  ConvexReferenceProvider,
  findConvexUsagesCommand,
} from "./providers/referenceProvider";
import { ConvexHoverProvider } from "./providers/hoverProvider";

let outputChannel: vscode.OutputChannel;

/**
 * Extension activation
 * Called when the extension is activated (workspace contains convex.config.ts or _generated/api.ts)
 */
export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  outputChannel = vscode.window.createOutputChannel("Convex Navigator");
  outputChannel.appendLine("Convex Navigator extension activating...");

  // Detect Convex project
  const projectInfo = await detectConvexProject();
  if (!projectInfo) {
    outputChannel.appendLine(
      "No Convex project detected. Extension features will be limited.",
    );
    vscode.window.showInformationMessage(
      "Convex Navigator: No Convex project detected in workspace.",
    );
    return;
  }

  outputChannel.appendLine(`Convex directory found: ${projectInfo.convexDir}`);

  // Register document selectors for TypeScript/JavaScript files
  const documentSelector: vscode.DocumentSelector = [
    { language: "typescript", scheme: "file" },
    { language: "typescriptreact", scheme: "file" },
    { language: "javascript", scheme: "file" },
    { language: "javascriptreact", scheme: "file" },
  ];

  // Register Reference Provider
  const referenceProvider = new ConvexReferenceProvider();
  context.subscriptions.push(
    vscode.languages.registerReferenceProvider(
      documentSelector,
      referenceProvider,
    ),
  );
  outputChannel.appendLine("Reference provider registered");

  // Register Hover Provider
  const hoverProvider = new ConvexHoverProvider();
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(documentSelector, hoverProvider),
  );
  outputChannel.appendLine("Hover provider registered");

  // Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "convexNavigator.findUsages",
      findConvexUsagesCommand,
    ),
  );
  outputChannel.appendLine("Commands registered");

  // Watch for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("convexNavigator")) {
        outputChannel.appendLine("Configuration changed, clearing cache...");
        clearProjectCache();
      }
    }),
  );

  // Watch for file system changes in convex directory
  const convexWatcher = vscode.workspace.createFileSystemWatcher(
    `${projectInfo.convexDir}/**/*.{ts,tsx,js,jsx}`,
    false,
    false,
    false,
  );

  convexWatcher.onDidCreate(() => {
    outputChannel.appendLine("Convex file created, clearing cache...");
    clearProjectCache();
  });

  convexWatcher.onDidDelete(() => {
    outputChannel.appendLine("Convex file deleted, clearing cache...");
    clearProjectCache();
  });

  context.subscriptions.push(convexWatcher);

  outputChannel.appendLine(
    "Convex Navigator extension activated successfully!",
  );
  vscode.window.showInformationMessage(
    `Convex Navigator: Found project at ${projectInfo.convexDir}`,
  );
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  if (outputChannel) {
    outputChannel.appendLine("Convex Navigator extension deactivating...");
    outputChannel.dispose();
  }
}
