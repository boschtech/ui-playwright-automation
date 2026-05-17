import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Do NOT use a file-level vi.mock("@anthropic-ai/sdk") here.
// In vitest v3, hoisting a vi.mock() for a module causes all modules that
// IMPORT that module (like ../client) to also be auto-mocked as a side
// effect, making getClient a vi.fn() that returns undefined.
// Instead, each test that needs the SDK mock uses vi.doMock() (non-hoisted)
// followed by vi.resetModules() + a fresh dynamic import, keeping the
// client module real and un-mocked.

/** Creates a fresh SDK mock and returns the `create` spy for assertions. */
async function setupSdkMock(): Promise<ReturnType<typeof vi.fn>> {
  const create = vi.fn();
  vi.doMock("@anthropic-ai/sdk", () => ({
    default: vi.fn(() => ({ messages: { create } })),
    __mockCreate: create,
  }));
  vi.resetModules();
  // Import client fresh so it picks up the new SDK mock.
  const { _resetClientForTesting } = await import("../client");
  _resetClientForTesting();
  return create;
}

describe("client", () => {
  beforeEach(() => {
    vi.resetModules();
    // Explicitly delete rather than vi.stubEnv(key, undefined):
    // vi.stubEnv with undefined stores the literal string "undefined" in
    // Node.js process.env which is truthy, causing getClient() to skip the
    // API key guard.
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    vi.doUnmock("@anthropic-ai/sdk");
  });

  it("throws when ANTHROPIC_API_KEY is not set", async () => {
    // setupSdkMock is required even for this test: without a mock for
    // @anthropic-ai/sdk, vitest fails to reliably initialize ../client
    // (the real SDK import causes module resolution issues in this env).
    await setupSdkMock();
    // Re-delete the key after setupSdkMock in case it was restored.
    delete process.env.ANTHROPIC_API_KEY;
    const { getClient, _resetClientForTesting } = await import("../client");
    _resetClientForTesting();
    expect(() => getClient()).toThrow("ANTHROPIC_API_KEY");
  });

  it("creates a client when API key is provided", async () => {
    await setupSdkMock();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-key");
    const { getClient } = await import("../client");
    const client = getClient();
    expect(client).toBeDefined();
    expect(client.messages).toBeDefined();
  });

  it("ask() returns text from Claude response", async () => {
    const mockCreate = await setupSdkMock();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-key");
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Hello from Claude" }],
    });

    const { ask } = await import("../client");
    const result = await ask("system prompt", "user prompt");
    expect(result).toBe("Hello from Claude");
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("ask() returns empty string when no text block in response", async () => {
    const mockCreate = await setupSdkMock();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-key");
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "t1" }],
    });

    const { ask } = await import("../client");
    const result = await ask("sys", "usr");
    expect(result).toBe("");
  });

  it("askJSON() parses JSON from Claude response", async () => {
    const mockCreate = await setupSdkMock();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-key");
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"status": "ok", "count": 3}' }],
    });

    const { askJSON } = await import("../client");
    const result = await askJSON<{ status: string; count: number }>("sys", "usr");
    expect(result).toEqual({ status: "ok", count: 3 });
  });

  it("askJSON() strips markdown fences from response", async () => {
    const mockCreate = await setupSdkMock();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-key");
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '```json\n{"key": "value"}\n```' }],
    });

    const { askJSON } = await import("../client");
    const result = await askJSON("sys", "usr");
    expect(result).toEqual({ key: "value" });
  });

  it("askJSON() throws on invalid JSON", async () => {
    const mockCreate = await setupSdkMock();
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-key");
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "not valid json" }],
    });

    const { askJSON } = await import("../client");
    await expect(askJSON("sys", "usr")).rejects.toThrow();
  });
});
