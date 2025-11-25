import { describe, it, expect } from "@jest/globals";
import { handleJsonRpcMessage } from "@server/index";

function req(
  partial: Partial<import("@server/index").JsonRpcRequest>
): import("@server/index").JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "",
    ...partial,
  } as any;
}

describe("JSON-RPC dispatcher", () => {
  it("returns -32600 for invalid jsonrpc version", async () => {
    const res = await handleJsonRpcMessage({
      jsonrpc: "1.0",
      id: 1,
      method: "tools/list",
    } as any);
    expect(res.error?.code).toBe(-32600);
  });

  it("returns -32601 for unknown method", async () => {
    const res = await handleJsonRpcMessage(req({ method: "unknown/method" }));
    expect(res.error?.code).toBe(-32601);
  });

  it("lists tools", async () => {
    const res = await handleJsonRpcMessage(
      req({ method: "tools/list", params: {} })
    );
    expect(res.result).toBeTruthy();
    const result = res.result as any;
    expect(Array.isArray(result.tools)).toBe(true);
  });

  it("errors when tool name missing", async () => {
    const res = await handleJsonRpcMessage(
      req({
        method: "tools/call",
        params: {
          /* no name */
        } as any,
      })
    );
    expect(res.error?.code).toBe(-32602);
  });

  it("errors when tool name unknown", async () => {
    const res = await handleJsonRpcMessage(
      req({ method: "tools/call", params: { name: "nope" } })
    );
    expect(res.error?.code).toBe(-32602);
  });

  // Note: initialize path covered by server.http test; list path covered above.

  // Happy-path tools/call cases will be covered by transport-specific tests
});
