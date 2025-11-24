# Testing Guide - Phase 4.5 PoC Verification

This guide walks through manual testing of the Context Manager PoC.

## Prerequisites

- VS Code installed
- Node.js and pnpm installed
- Extension built (`pnpm build:extension`)
- Server built (`pnpm build:server`)

## Test 1: Extension Installation

**Goal**: Verify extension loads in VS Code

**Steps**:

1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Extensions: Install from VSIX"
4. If no VSIX exists, use "Developer: Install Extension from Location"
5. Point to the extension directory or create VSIX with `pnpm package`

**Expected**:

- Extension appears in Extensions list
- No activation errors

**Issues to note**:

- Extension fails to activate?
- Error messages in Output panel?

---

## Test 2: Server Activation

**Goal**: Verify MCP server starts when extension activates

**Steps**:

1. Open Output panel (`Ctrl+Shift+U` or `Cmd+Shift+U`)
2. Select "Context Manager" from dropdown
3. Look for activation messages

**Expected Output**:

```
Context Manager extension activated
Connected to MCP server
Commands registered
```

**Issues to note**:

- Server process fails to spawn?
- STDIO connection errors?
- Path issues to server executable?

---

## Test 3: List Tools Command

**Goal**: Verify extension can communicate with server

**Steps**:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
2. Type "Context Manager: List Available Tools"
3. Execute command
4. Check Output panel

**Expected Output**:

```
Available tools:
read_todo
update_todo
read_context
update_context
```

**Expected Notification**:
"Found 4 tool(s). Check output panel for details."

**Issues to note**:

- No tools listed?
- Connection error?
- Server not responding?

---

## Test 4: Read TODO Command

**Goal**: Test governance skill tool execution

**Steps**:

1. Ensure `TODO.md` exists in workspace root
2. Press `Ctrl+Shift+P`
3. Type "Context Manager: Read TODO"
4. Execute command
5. Check Output panel

**Expected Output**:

```
TODO.md contents:
{
  "content": [
    {
      "type": "text",
      "text": "... TODO.md contents ..."
    }
  ]
}
```

**Issues to note**:

- File not found error?
- Permission errors?
- Server communication failure?

---

## Test 5: Update TODO Command

**Goal**: Test write operations via governance skill

**Steps**:

1. Press `Ctrl+Shift+P`
2. Type "Context Manager: Update TODO"
3. Execute command
4. Enter test content in input box: "Test task 1\nTest task 2"
5. Press Enter
6. Check Output panel

**Expected Output**:

```
TODO updated:
{
  "content": [
    {
      "type": "text",
      "text": "Successfully updated TODO.md"
    }
  ]
}
```

**Expected Notification**:
"TODO updated successfully"

**Verify**: Check `TODO.md` file contains new content

**Issues to note**:

- Write permission errors?
- File not updated?
- Error handling issues?

---

## Test 6: Call Tool (Interactive)

**Goal**: Test generic tool calling interface

**Steps**:

1. Press `Ctrl+Shift+P`
2. Type "Context Manager: Call Tool"
3. Execute command
4. Select a tool from picker (e.g., "read_todo")
5. Enter arguments as JSON: `{}`
6. Press Enter
7. Check Output panel

**Expected**:

- Tool picker shows all 4 tools
- Each tool has description
- Execution succeeds
- Result appears in Output panel

**Issues to note**:

- Tool picker empty?
- Arguments not parsed?
- Execution errors?

---

## Test 7: Server Status Command

**Goal**: Verify connection monitoring

**Steps**:

1. Press `Ctrl+Shift+P`
2. Type "Context Manager: Show Server Status"
3. Execute command

**Expected Output (Output panel)**:

```
Server status: ✓ Connected
```

**Expected Notification**:
"Context Manager: ✓ Connected (4 tools available)"

**Issues to note**:

- Shows disconnected when connected?
- Tool count incorrect?

---

## Test 8: Error Handling

**Goal**: Verify graceful error handling

**Steps**:

1. Call a tool with invalid arguments
2. Try to read non-existent file
3. Close server manually (kill process)
4. Try to execute command

**Expected**:

- Clear error messages
- No crashes
- Output panel shows error details

**Issues to note**:

- Crashes on error?
- Unclear error messages?
- No error handling?

---

## Test 9: Extension Deactivation

**Goal**: Verify clean shutdown

**Steps**:

1. Reload VS Code window or close
2. Check Output panel for shutdown messages

**Expected Output**:

```
Disconnecting...
Disconnected from MCP server
```

**Issues to note**:

- Server process orphaned?
- Cleanup errors?
- Resources not released?

---

## Test 10: MCP Inspector (Standalone)

**Goal**: Verify server works outside extension

**Steps**:

1. Run `pnpm inspector` from terminal
2. Open inspector URL in browser
3. Try listing tools
4. Try calling `read_todo` tool

**Expected**:

- Inspector connects to server
- Shows 4 tools
- Can execute tools
- See responses

**Issues to note**:

- Inspector connection fails?
- Tools not visible?
- Execution errors?

---

## Feedback Checklist

After testing, answer these questions:

### Architecture

- [ ] Is STDIO communication approach working well?
- [ ] Is skill system flexible enough?
- [ ] Are shared services useful?
- [ ] Any performance concerns?

### Usability

- [ ] Are commands discoverable?
- [ ] Is error handling clear?
- [ ] Is setup/installation straightforward?
- [ ] Are logs helpful for debugging?

### Functionality

- [ ] What features are missing?
- [ ] What doesn't work as expected?
- [ ] What should be prioritized?
- [ ] Any security concerns?

### Next Steps

- [ ] Continue with Phase 5?
- [ ] Need architecture changes?
- [ ] Focus on production readiness?
- [ ] Add more PoC features first?

---

## Known Limitations (PoC)

- **No production integrations**: Shared services use placeholder/simulated logic
- **Limited error recovery**: Basic error handling, not production-grade
- **No authentication**: Security features are stubs
- **Single governance skill**: Only one skill implemented
- **No hot reload**: Skills loaded at startup only
- **No telemetry**: No usage tracking or monitoring
- **Minimal logging**: Debug output needs improvement
- **No tests for extension**: Extension code not unit tested

---

## Reporting Issues

When reporting issues, include:

1. **Test number** that failed
2. **Expected behavior** vs **actual behavior**
3. **Output panel logs**
4. **VS Code version**
5. **Operating system**
6. **Screenshots** if relevant

Create issues in the repository or document for discussion.
