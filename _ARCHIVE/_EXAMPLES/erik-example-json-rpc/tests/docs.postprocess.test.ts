import { describe, it, expect } from "@jest/globals";
import path from "node:path";
import { getStructuredPromotions } from "../bin/utils/postprocessDocs";

describe("docs postprocess promotions", () => {
  it("includes JSON-RPC page promotion mapping", () => {
    const base = path.join("/tmp", "docs", "docs");
    const docsDir = path.join("/tmp", "docs");
    const promos = getStructuredPromotions(base, docsDir);
    const match = promos.find((p) =>
      p.src.endsWith(path.join("mcp", "jsonRpc", "README.md"))
    );
    expect(match).toBeTruthy();
    expect(match?.dest.endsWith(path.join("mcp", "json-rpc.md"))).toBe(true);
  });
});
