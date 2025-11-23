import * as fs from "node:fs";
import * as path from "node:path";
import os from "node:os";
import { addTodo } from "../bin/repo-ops-next/todo/parseTodo";
import { runTodoCommand } from "../bin/repo-ops-next/commands/todo";
import { EXIT_CODES } from "../bin/repo-ops-next/architecture";

const SAMPLE_TODO = `<!-- BEGIN:GENERATED-ACTION-ITEMS -->

## Generated Action Items

<!-- BEGIN:CURRENT_ACTION_ITEMS -->

### Current Action Items

- [ ] P1: Existing current task

<!-- END:CURRENT_ACTION_ITEMS -->
<!-- BEGIN:NEXT_ACTION_ITEMS -->

### Next Action Items

- [ ] P2: Existing next task

<!-- END:NEXT_ACTION_ITEMS -->
<!-- BEGIN:BACKLOG_ACTION_ITEMS -->

### Backlog Action Items

- [ ] P3: Existing backlog task

<!-- END:BACKLOG_ACTION_ITEMS -->
<!-- END:GENERATED-ACTION-ITEMS -->
`;

describe("repo-ops-next TODO helpers", () => {
  it("adds a todo line into the requested section", () => {
    const result = addTodo({
      fileContent: SAMPLE_TODO,
      section: "Current",
      priority: "P1",
      title: "New current task",
    });

    expect(result.ok).toBe(true);
    expect(result.content).toContain("### Current Action Items");
    expect(result.content).toContain("P1: New current task");
  });
});

describe("repo-ops-next todo command", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it("writes a new todo entry via todo add", async () => {
    const tmpDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "repo-ops-next-todo-")
    );
    const todoPath = path.join(tmpDir, "TODO.md");
    fs.writeFileSync(todoPath, SAMPLE_TODO, "utf8");

    process.chdir(tmpDir);

    const code = await runTodoCommand("add", {
      section: "Next",
      priority: "P3",
      title: "Integration-added next task",
    });

    expect(code).toBe(EXIT_CODES.success);

    const updated = fs.readFileSync(todoPath, "utf8");
    expect(updated).toContain("### Next Action Items");
    expect(updated).toContain("P3: Integration-added next task");
  });
});
