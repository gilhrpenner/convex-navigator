# Changelog

All notable changes to the "Convex Navigator" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-02

### Added

- Initial release
- **Find Convex Usages** command to find frontend usages of backend functions
  - Keyboard shortcut: `Ctrl+Shift+U` / `Cmd+Shift+U`
  - Context menu integration
  - Command palette support
- **Hover Provider** for `api.X.Y.Z` patterns
  - Shows function name and type
  - Displays wrapper function used
  - Args schema preview
  - Clickable link to implementation
- **Auto-detection** of Convex projects via `convex.config.ts`
- **Configurable settings**
  - Custom Convex directory path
  - Frontend paths to search
  - Custom wrapper function names
  - Exclude patterns
- **Default wrapper detection** for:
  - `query`, `mutation`, `action`
  - `internalQuery`, `internalMutation`, `internalAction`
- Ripgrep integration for fast searching (with VS Code fallback)
- Reference provider integration with VS Code's native features
