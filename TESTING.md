# Testing Convex Navigator Locally

This guide walks you through compiling and testing the extension in your local VS Code.

## Prerequisites

- Node.js 18+ installed
- VS Code installed
- A Convex project to test with (e.g., your purple-law project)

## Method 1: Using F5 (Extension Development Host)

This is the recommended method during development - it opens a new VS Code window with the extension loaded.

### Steps

1. **Open the extension project in VS Code:**

   ```bash
   code /Users/gilpenner/Developer/convex-navigator
   ```

2. **Install dependencies** (if not already done):

   ```bash
   npm install
   ```

3. **Compile the extension:**

   ```bash
   npm run compile
   ```

4. **Press F5** to launch the Extension Development Host
   - This opens a new VS Code window with the extension active
   - The original window shows debug output

5. **In the new VS Code window**, open your Convex project:
   - File > Open Folder > Select `/Users/gilpenner/Developer/purple-law`

6. **Test the extension** (see Testing Checklist below)

7. **To stop debugging**, close the Extension Development Host window or press `Shift+F5`

### Watch Mode (Auto-recompile)

For faster iteration, use watch mode:

```bash
npm run watch
```

This automatically recompiles when you change source files. After changes:

1. Press `Ctrl+Shift+F5` (or `Cmd+Shift+F5` on Mac) to restart the Extension Development Host
2. Test your changes

---

## Method 2: Install VSIX Directly

This installs the extension into your regular VS Code (not a development host).

### Steps

1. **Navigate to the extension directory:**

   ```bash
   cd /Users/gilpenner/Developer/convex-navigator
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Package the extension:**

   ```bash
   npm run package
   ```

   This creates `convex-navigator-0.1.0.vsix` in the project root.

4. **Install the VSIX:**

   **Option A: Via command line:**

   ```bash
   code --install-extension convex-navigator-0.1.0.vsix
   ```

   **Option B: Via VS Code UI:**
   1. Open VS Code
   2. Go to Extensions (`Cmd+Shift+X`)
   3. Click the `...` menu (top-right of Extensions panel)
   4. Select "Install from VSIX..."
   5. Navigate to `/Users/gilpenner/Developer/convex-navigator/`
   6. Select `convex-navigator-0.1.0.vsix`

5. **Reload VS Code:**
   - Press `Cmd+Shift+P` > "Developer: Reload Window"

6. **Open your Convex project** and test

### Uninstalling

To uninstall the extension:

**Option A: Via command line:**

```bash
code --uninstall-extension your-publisher-name.convex-navigator
```

**Option B: Via VS Code UI:**

1. Go to Extensions
2. Find "Convex Navigator"
3. Click the gear icon > Uninstall

---

## Method 3: Symlink to Extensions Folder (Advanced)

This method links the compiled output directly to VS Code's extensions folder.

### Steps

1. **Compile the extension:**

   ```bash
   cd /Users/gilpenner/Developer/convex-navigator
   npm install
   npm run compile
   ```

2. **Find your VS Code extensions folder:**

   ```bash
   # macOS
   ls ~/.vscode/extensions/

   # Linux
   ls ~/.vscode/extensions/

   # Windows
   dir %USERPROFILE%\.vscode\extensions\
   ```

3. **Create a symlink:**

   ```bash
   # macOS/Linux
   ln -s /Users/gilpenner/Developer/convex-navigator ~/.vscode/extensions/convex-navigator

   # Windows (run as admin)
   mklink /D "%USERPROFILE%\.vscode\extensions\convex-navigator" "C:\path\to\convex-navigator"
   ```

4. **Reload VS Code**

5. **To remove:**
   ```bash
   rm ~/.vscode/extensions/convex-navigator
   ```

---

## Testing Checklist

Once the extension is loaded, test these features in your purple-law project:

### 1. Extension Activation

- [ ] Open the Output panel: View > Output
- [ ] Select "Convex Navigator" from the dropdown
- [ ] Verify you see: "Convex Navigator extension activated successfully!"
- [ ] Verify the convex directory is detected correctly

### 2. Find Convex Usages (Backend -> Frontend)

- [ ] Open `packages/backend/convex/domains/contacts.ts`
- [ ] Place cursor on `createContact` (line 37)
- [ ] Press `Cmd+Shift+U` (or `Ctrl+Shift+U`)
- [ ] Verify the references panel shows usages in frontend code
- [ ] Click a result to navigate to the frontend file

**Alternative methods to test:**

- [ ] Right-click on `createContact` > "Find Convex Usages"
- [ ] `Cmd+Shift+P` > "Find Convex Usages"

### 3. Hover Information

- [ ] Open `apps/crm/src/routes/_auth/office/contacts/new.tsx`
- [ ] Hover over `api.domains.contacts.createContact` (line 22)
- [ ] Verify hover shows:
  - Function name: `createContact`
  - Type: `mutation`
  - Wrapper: `authedZodMutation`
  - File path (clickable)
- [ ] Click the file path to navigate to backend

### 4. Custom Wrappers Configuration

- [ ] Open VS Code Settings (`Cmd+,`)
- [ ] Search for "Convex Navigator"
- [ ] Add custom wrappers:
  ```json
  "convexNavigator.customWrappers": [
    "authedQuery",
    "authedMutation",
    "authedAction",
    "authedZodMutation",
    "authedZodQuery"
  ]
  ```
- [ ] Reload VS Code
- [ ] Test Find Usages on a function using `authedZodMutation`

### 5. Edge Cases

- [ ] Test on a function with no usages (should show "No usages found")
- [ ] Test with cursor NOT on a function (should show warning)
- [ ] Test on `_generated` files (should not trigger)

---

## Debugging Tips

### View Extension Logs

1. Open Output panel: View > Output
2. Select "Convex Navigator" from dropdown
3. See activation messages and errors

### Debug Mode with Breakpoints

1. Open `/Users/gilpenner/Developer/convex-navigator` in VS Code
2. Set breakpoints in `src/` files
3. Press F5 to start debugging
4. Breakpoints will pause execution in the Extension Development Host

### Check if Extension is Active

1. Open Command Palette (`Cmd+Shift+P`)
2. Type "Convex"
3. You should see "Find Convex Usages" command

### Common Issues

**"Convex Navigator: No Convex project detected"**

- Ensure the workspace contains `convex.config.ts`
- Or set `convexNavigator.convexPath` in settings

**"Cursor is not on a Convex function definition"**

- Ensure cursor is on the function NAME, not the wrapper
- Add custom wrappers to settings if using non-standard ones

**No hover information showing**

- Check that you're hovering over `api.something.something`
- Ensure the pattern matches `api.X.Y.Z`

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Compile once
npm run compile

# Watch mode (auto-compile)
npm run watch

# Run linter
npm run lint

# Package as VSIX
npm run package

# Install VSIX to VS Code
code --install-extension convex-navigator-0.1.0.vsix

# Uninstall
code --uninstall-extension your-publisher-name.convex-navigator
```

---

## Recommended Test Flow

1. Start with **Method 1 (F5)** for initial testing
2. Use **watch mode** for rapid iteration
3. Once stable, use **Method 2 (VSIX)** to test in your normal VS Code environment
4. Test with your purple-law project to validate real-world usage
