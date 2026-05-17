import Anthropic from "@anthropic-ai/sdk";
import { aiConfig } from "./config";

let _client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY environment variable is required. " +
          "Set it in your shell or add it as a GitHub Actions secret."
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/**
 * Send a prompt to Claude and return the text response.
 * Wraps the Messages API with sensible defaults and prompt caching
 * for the system prompt (which is reused across calls).
 */
export async function ask(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const client = getClient();
  const { maxTokens = 4096, temperature = 0 } = options;

  const response = await client.messages.create({
    model: aiConfig.model,
    max_tokens: maxTokens,
    temperature,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}

/**
 * Same as `ask` but parses the response as JSON.
 * Claude is instructed to return valid JSON via the system prompt.
 */
export async function askJSON<T = unknown>(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<T> {
  const raw = await ask(
    systemPrompt +
      "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown fences, no commentary.",
    userPrompt,
    options
  );

  // Strip markdown fences if Claude adds them despite instructions
  const cleaned = raw.replace(/^```json?\n?/m, "").replace(/\n?```$/m, "");
  return JSON.parse(cleaned) as T;
}
