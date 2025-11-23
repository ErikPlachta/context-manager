import { parseFlags, deriveBooleanFlags } from "../bin/repo-ops-next/flags";

describe("repo-ops-next flags parser", () => {
  it("parses positionals and long flags with values", () => {
    const argv = [
      "status",
      "changelog",
      "--type",
      "feat",
      "--summary=Add feature",
    ];
    const result = parseFlags(argv);

    expect(result.positionals).toEqual(["status", "changelog"]);
    expect(result.flags.type).toBe("feat");
    expect(result.flags.summary).toBe("Add feature");
  });

  it("parses boolean and negated flags", () => {
    const argv = [
      "changelog",
      "write",
      "--write",
      "--validate",
      "--no-auto-verify",
    ];
    const result = parseFlags(argv);

    expect(result.positionals).toEqual(["changelog", "write"]);
    expect(result.flags.write).toBe(true);
    expect(result.flags.validate).toBe(true);
    expect(result.flags["auto-verify"]).toBe(false);
  });

  it("derives write/validate booleans solely from flag presence", () => {
    const argv = [
      "changelog",
      "write",
      "--write",
      "--validate",
      "--context",
      "some context",
      "--changes=details",
    ];

    const { positionals, flags } = parseFlags(argv);

    expect(positionals).toEqual(["changelog", "write"]);
    expect(flags.context).toBe("some context");
    expect(flags.changes).toBe("details");

    const derived = deriveBooleanFlags(flags);
    expect(derived.write).toBe(true);
    expect(derived.validate).toBe(true);
  });

  it("treats missing write/validate flags as false", () => {
    const argv = ["status"];
    const { flags } = parseFlags(argv);
    const derived = deriveBooleanFlags(flags);

    expect(derived.write).toBe(false);
    expect(derived.validate).toBe(false);
  });

  it("treats short flags as boolean", () => {
    const argv = ["status", "-v"];
    const result = parseFlags(argv);

    expect(result.positionals).toEqual(["status"]);
    expect(result.flags.v).toBe(true);
  });
});
