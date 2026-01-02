# Convex Navigator

Navigate between Convex backend functions and their frontend usages. Find all references from backend to frontend code.

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue)](https://marketplace.visualstudio.com/items?itemName=your-publisher.convex-navigator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## The Problem

When working with [Convex](https://convex.dev/), VS Code's native "Find All References" doesn't work for Convex functions because:

- Backend functions are exported like: `export const createContact = mutation({...})`
- Frontend code accesses them via: `useMutation(api.domains.contacts.createContact)`

TypeScript sees no direct connection between these two - the `api` object is auto-generated and the path is resolved at runtime. This makes navigation between backend and frontend code frustrating.

**Convex Navigator solves this problem.**

## Features

### Find Frontend Usages (Backend -> Frontend)

When your cursor is on a Convex function definition, use **Find Convex Usages** to discover all places in your frontend code where this function is called.

- **Keyboard shortcut**: `Ctrl+Shift+U` (Windows/Linux) or `Cmd+Shift+U` (Mac)
- **Context menu**: Right-click and select "Find Convex Usages"
- **Command palette**: `Ctrl+Shift+P` / `Cmd+Shift+P` -> "Find Convex Usages"

Results appear in VS Code's native references panel, just like regular "Find All References".

### Hover Information

Hover over any `api.X.Y.Z` pattern in your frontend code to see:

- Function name and type (query, mutation, action)
- The wrapper function used (e.g., `authedMutation`, `query`)
- Args schema preview
- Clickable link to jump directly to the implementation

---

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "Convex Navigator"
4. Click Install

### From VSIX File

1. Download the `.vsix` file from the [releases page](https://github.com/your-username/convex-navigator/releases)
2. In VS Code, go to Extensions > `...` (menu) > "Install from VSIX..."
3. Select the downloaded file

### From Source

```bash
git clone https://github.com/your-username/convex-navigator.git
cd convex-navigator
npm install
npm run package
code --install-extension convex-navigator-0.1.0.vsix
```

---

## Quick Start

1. **Install the extension**
2. **Open a workspace** containing a Convex project (must have `convex.config.ts`)
3. **Open a backend file** (e.g., `convex/domains/contacts.ts`)
4. **Place your cursor** on a function name like `createContact`
5. **Press `Cmd+Shift+U`** (or `Ctrl+Shift+U` on Windows/Linux)
6. **See all usages** in the references panel!

---

## Configuration

Configure the extension in your VS Code settings. Open settings with `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux), then search for "Convex Navigator".

Or add to your `.vscode/settings.json`:

```json
{
  "convexNavigator.convexPath": "",
  "convexNavigator.frontendPaths": [],
  "convexNavigator.customWrappers": [],
  "convexNavigator.excludePatterns": [
    "**/node_modules/**",
    "**/_generated/**",
    "**/dist/**",
    "**/out/**",
    "**/.git/**"
  ]
}
```

### Configuration Options

| Setting                           | Type       | Default     | Description                                                                          |
| --------------------------------- | ---------- | ----------- | ------------------------------------------------------------------------------------ |
| `convexNavigator.convexPath`      | `string`   | `""`        | Path to Convex directory relative to workspace root. Leave empty for auto-detection. |
| `convexNavigator.frontendPaths`   | `string[]` | `[]`        | Directories to search for usages. Empty = search entire workspace.                   |
| `convexNavigator.customWrappers`  | `string[]` | `[]`        | Custom wrapper function names to detect as Convex functions.                         |
| `convexNavigator.excludePatterns` | `string[]` | (see above) | Glob patterns to exclude from search.                                                |

### Default Convex Wrappers

The following wrappers are detected automatically (built into Convex):

- `query`
- `mutation`
- `action`
- `internalQuery`
- `internalMutation`
- `internalAction`

### Adding Custom Wrappers

If you use custom wrapper functions (common in authenticated Convex setups), add them to settings:

```json
{
  "convexNavigator.customWrappers": [
    "authedQuery",
    "authedMutation",
    "authedAction",
    "authedZodQuery",
    "authedZodMutation",
    "authedZodAction",
    "publicQuery",
    "publicMutation"
  ]
}
```

The extension will then detect exports like:

```typescript
export const createContact = authedZodMutation({...});
export const getUser = authedQuery({...});
```

---

## Usage Examples

### Example 1: Finding Usages of a Backend Function

**Backend file: `convex/domains/contacts.ts`**

```typescript
import { authedZodMutation } from "../utils/authedFunctions";
import { z } from "zod";

export const createContact = authedZodMutation({
  args: z.object({
    contact: contactFormSchema,
  }),
  handler: async (ctx, args) => {
    const { user } = ctx;
    // ... implementation
    return { contactId };
  },
});

export const updateContact = authedZodMutation({
  args: z.object({
    contactId: z.string(),
    contact: contactFormSchema,
  }),
  handler: async (ctx, args) => {
    // ... implementation
  },
});
```

**Frontend file: `src/routes/contacts/new.tsx`**

```typescript
import { api } from "@backend/_generated/api";
import { useMutation } from "convex/react";

function NewContactPage() {
  const createContact = useMutation(api.domains.contacts.createContact);

  const handleSubmit = async (data) => {
    await createContact({ contact: data });
  };

  // ...
}
```

**To find usages:**

1. Open `convex/domains/contacts.ts`
2. Click on `createContact` (the function name)
3. Press `Cmd+Shift+U`
4. The references panel shows `src/routes/contacts/new.tsx:6`

### Example 2: Hover Information

When you hover over `api.domains.contacts.createContact` in your frontend code, you'll see:

```
createContact (mutation)

Wrapper: authedZodMutation

Args: z.object({ contact: contactFormSchema })

convex/domains/contacts.ts:5
```

Click the file path to jump directly to the implementation.

### Example 3: Monorepo Setup

For monorepos with the Convex backend in a separate package:

**Project structure:**

```
my-monorepo/
├── apps/
│   ├── web/src/           # Frontend app 1
│   └── admin/src/         # Frontend app 2
├── packages/
│   └── backend/
│       └── convex/        # Convex functions here
│           ├── convex.config.ts
│           ├── _generated/
│           └── domains/
│               └── contacts.ts
```

**Configuration:**

```json
{
  "convexNavigator.convexPath": "packages/backend/convex",
  "convexNavigator.frontendPaths": ["apps/web/src", "apps/admin/src"]
}
```

### Example 4: Speeding Up Search in Large Codebases

If search is slow, limit the search scope:

```json
{
  "convexNavigator.frontendPaths": [
    "src/components",
    "src/routes",
    "src/hooks"
  ],
  "convexNavigator.excludePatterns": [
    "**/node_modules/**",
    "**/_generated/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/__tests__/**"
  ]
}
```

---

## How It Works

### 1. Project Detection

On activation, the extension searches for:

1. `convex.config.ts` - The Convex configuration file
2. `convex/_generated/api.ts` - The auto-generated API file

This determines your Convex directory location.

### 2. Function Detection

When you invoke "Find Convex Usages", the extension:

1. Checks if your cursor is on a Convex function export
2. Parses the pattern: `export const <name> = <wrapper>({...})`
3. Builds the API path: `api.<relative-path>.<function-name>`

For example:

- File: `convex/domains/contacts.ts`
- Export: `createContact`
- API path: `api.domains.contacts.createContact`

### 3. Usage Search

The extension searches for the API path pattern using:

1. **ripgrep** (if available) - Extremely fast, searches entire codebase in milliseconds
2. **VS Code's built-in search** - Fallback if ripgrep is not installed

### 4. Results Display

Results appear in VS Code's native references panel, showing:

- File path
- Line number
- Code preview
- Click to navigate

---

## Troubleshooting

### Extension Not Activating

**Symptoms:** No "Find Convex Usages" in context menu, hover not working.

**Solutions:**

1. Ensure your workspace contains `convex.config.ts` or `convex/_generated/api.ts`
2. Check the Output panel: View > Output > Select "Convex Navigator"
3. Try reloading VS Code: `Cmd+Shift+P` > "Developer: Reload Window"

### Custom Wrappers Not Detected

**Symptoms:** "Cursor is not on a Convex function definition" when it clearly is.

**Solutions:**

1. Add your wrapper to settings:
   ```json
   {
     "convexNavigator.customWrappers": ["yourCustomWrapper"]
   }
   ```
2. Ensure the export follows the pattern:
   ```typescript
   export const functionName = wrapper({...});
   ```
3. The wrapper name must match exactly (case-sensitive)

### No Results Found

**Symptoms:** Search completes but shows 0 usages.

**Solutions:**

1. Verify the API path is correct (check how it's imported in frontend)
2. Check if the file is excluded by `convexNavigator.excludePatterns`
3. If using `frontendPaths`, ensure the usage file is in one of those paths
4. Check for typos in the import path

### Search Too Slow

**Symptoms:** Search takes several seconds or times out.

**Solutions:**

1. Install ripgrep for faster searching:

   ```bash
   # macOS
   brew install ripgrep

   # Ubuntu/Debian
   sudo apt install ripgrep

   # Windows
   choco install ripgrep
   ```

2. Configure `frontendPaths` to limit search scope
3. Add large directories to `excludePatterns`

### Wrong Convex Directory Detected

**Symptoms:** Extension found wrong `convex.config.ts` (e.g., in node_modules).

**Solutions:**

1. Explicitly set the path:
   ```json
   {
     "convexNavigator.convexPath": "packages/backend/convex"
   }
   ```

---

## Keyboard Shortcuts

| Command            | Windows/Linux  | Mac           | Description                                           |
| ------------------ | -------------- | ------------- | ----------------------------------------------------- |
| Find Convex Usages | `Ctrl+Shift+U` | `Cmd+Shift+U` | Find all frontend usages of the function under cursor |

### Customizing Shortcuts

To change the keyboard shortcut:

1. Open Keyboard Shortcuts: `Cmd+K Cmd+S` (Mac) or `Ctrl+K Ctrl+S` (Windows/Linux)
2. Search for "Find Convex Usages"
3. Click the pencil icon and enter your preferred shortcut

---

## Supported Project Structures

### Standard Convex Project

```
my-project/
├── convex/
│   ├── convex.config.ts
│   ├── _generated/
│   └── functions.ts
└── src/
    └── App.tsx
```

No configuration needed - auto-detected.

### Monorepo with Separate Backend Package

```
monorepo/
├── packages/
│   └── backend/
│       └── convex/
│           ├── convex.config.ts
│           └── domains/
└── apps/
    └── web/
        └── src/
```

Configure:

```json
{
  "convexNavigator.convexPath": "packages/backend/convex",
  "convexNavigator.frontendPaths": ["apps/web/src"]
}
```

### Multiple Frontend Apps

```
monorepo/
├── convex/
└── apps/
    ├── web/src/
    ├── mobile/src/
    └── admin/src/
```

Configure:

```json
{
  "convexNavigator.frontendPaths": [
    "apps/web/src",
    "apps/mobile/src",
    "apps/admin/src"
  ]
}
```

---

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/convex-navigator.git
cd convex-navigator

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Run linting
npm run lint

# Package the extension
npm run package
```

### Testing the Extension

1. Open the project in VS Code
2. Press `F5` to launch the Extension Development Host
3. Open a Convex project in the new VS Code window
4. Test the features

### Project Structure

```
convex-navigator/
├── src/
│   ├── extension.ts           # Main entry point
│   ├── config.ts              # Configuration handling
│   ├── types.ts               # TypeScript interfaces
│   ├── providers/
│   │   ├── referenceProvider.ts   # Find usages functionality
│   │   └── hoverProvider.ts       # Hover information
│   └── resolver/
│       ├── pathResolver.ts        # API path <-> file path conversion
│       └── functionDetector.ts    # Detect Convex function exports
├── package.json               # Extension manifest
├── tsconfig.json              # TypeScript configuration
└── README.md
```

### Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run linting: `npm run lint`
5. Compile: `npm run compile`
6. Test manually with F5
7. Commit: `git commit -m "feat: add my feature"`
8. Push: `git push origin feature/my-feature`
9. Open a Pull Request

---

## Roadmap

Future improvements under consideration:

- [ ] **Go to Definition** (Frontend -> Backend): Click on `api.X.Y.Z` to jump to implementation
- [ ] **CodeLens**: Show usage count above function definitions
- [ ] **AST-based search**: More accurate detection using TypeScript compiler
- [ ] **Internal API support**: Support for `internal.X.Y.Z` patterns
- [ ] **Rename support**: Rename function and update all usages
- [ ] **Diagnostics**: Warn about unused Convex functions

---

## Requirements

- **VS Code**: Version 1.85.0 or higher
- **Convex Project**: Must have `convex.config.ts` or `convex/_generated/api.ts`
- **Optional**: [ripgrep](https://github.com/BurntSushi/ripgrep) for faster searching

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Convex](https://convex.dev/) for the excellent backend platform
- The VS Code Extension API documentation
- The ripgrep project for blazing-fast search

---

**Disclaimer**: This extension is not officially affiliated with Convex, Inc. It is a community-built tool to improve the developer experience.
