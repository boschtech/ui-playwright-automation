import { describe, it, expect, vi, beforeEach } from "vitest";

// Must mock before importing the module under test
vi.mock("@anthropic-ai/sdk", () => {
  const create = vi.fn();
  return {
    default: vi.fn(() => ({ messages: { create } })),
    __mockCreate: create,
  };
});

describe("client", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("throws when ANTHROPIC_API_KEY is not set", async () => {
    const { getClient } = await import("../client");
    expect(() => getClient()).toThrow("ANTHROPIC_API_KEY");
  });

  it("creates a client when API key is provided", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    const { getClient } = await import("../client");
    const client = getClient();
    expect(client).toBeDefined();
    expect(client.messages).toBeDefined();
  });

  it("ask() returns text from Claude response", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    const mod = await import("@anthropic-ai/sdk");
    const mockCreate = (mod as any).__mockCreate as ReturnType<typeof vi.fn>;
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "Hello from Claude" }],
    });

    const { ask } = await import("../client");
    const result = await ask("system prompt", "user prompt");
    expect(result).toBe("Hello from Claude");
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("ask() returns empty string when no text block in response", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    const mod = await import("@anthropic-ai/sdk");
    const mockCreate = (mod as any).__mockCreate as ReturnType<typeof vi.fn>;
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "tool_use", id: "t1" }],
    });

    const { ask } = await import("../client");
    const result = await ask("sys", "usr");
    expect(result).toBe("");
  });

  it("askJSON() parses JSON from Claude response", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    const mod = await import("@anthropic-ai/sdk");
    const mockCreate = (mod as any).__mockCreate as ReturnType<typeof vi.fn>;
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '{"status": "ok", "count": 3}' }],
    });

    const { askJSON } = await import("../client");
    const result = await askJSON<{ status: string; count: number }>("sys", "usr");
    expect(result).toEqual({ status: "ok", count: 3 });
  });

  it("askJSON() strips markdown fences from response", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    const mod = await import("@anthropic-ai/sdk");
    const mockCreate = (mod as any).__mockCreate as ReturnType<typeof vi.fn>;
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: '```json\n{"key": "value"}\n```' }],
    });

    const { askJSON } = await import("../client");
    const result = await askJSON("sys", "usr");
    expect(result).toEqual({ key: "value" });
  });

  it("askJSON() throws on invalid JSON", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    const mod = await import("@anthropic-ai/sdk");
    const mockCreate = (mod as any).__mockCreate as ReturnType<typeof vi.fn>;
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "not valid json" }],
    });

    const { askJSON } = await import("../client");
    await expect(askJSON("sys", "usr")).rejects.toThrow();
  });
});
