import {
  createDescriptorMap,
  type ConfigDescriptor,
} from "@shared/config/descriptors";

describe("shared/config/descriptors", () => {
  test("createDescriptorMap returns record keyed by path", () => {
    const map = createDescriptorMap([
      [
        "performance.caching.enable",
        {
          name: "Enable Caching",
          path: "performance.caching.enable",
          type: "boolean",
          visibility: "public",
          description: "Toggle in-memory caching",
          validate: (v) => typeof v === "boolean" || "Must be boolean",
        } satisfies ConfigDescriptor,
      ],
      [
        "analysis.depth.max",
        {
          name: "Max Analysis Depth",
          path: "analysis.depth.max",
          type: "number",
          visibility: "private",
          description: "Maximum recursion depth for analysis graph",
          validate: (v) =>
            (typeof v === "number" && v > 0) || "Positive number required",
        } satisfies ConfigDescriptor,
      ],
    ]);

    expect(Object.keys(map)).toEqual([
      "performance.caching.enable",
      "analysis.depth.max",
    ]);
    expect(map["performance.caching.enable"].type).toBe("boolean");
    expect(map["analysis.depth.max"].visibility).toBe("private");
    // run validators
    expect(map["performance.caching.enable"].validate?.(true)).toBe(true);
    expect(map["analysis.depth.max"].validate?.(3)).toBe(true);
  });
});
