import fs from "node:fs";
import path from "node:path";
import { askJSON } from "../client";
import { aiConfig } from "../config";
import type { APICapture, ContractViolation } from "../types";

/**
 * Validate API captures against known contracts or infer contracts from history.
 * Reads captures from `ai/history/api-captures.json` (written by api-monitor fixture).
 */
export async function validateContracts(): Promise<ContractViolation[]> {
  if (!fs.existsSync(aiConfig.paths.apiCaptures)) {
    console.log(
      "No API captures found. Run tests with the API monitor fixture first."
    );
    return [];
  }

  const captures: APICapture[] = JSON.parse(
    fs.readFileSync(aiConfig.paths.apiCaptures, "utf-8")
  );

  if (captures.length === 0) return [];

  // Load existing contracts if available
  const knownContracts = loadKnownContracts();

  const systemPrompt = `You are an API contract validation expert.
Analyze captured API request/response pairs and identify contract violations.

Check for:
- Missing required fields in responses
- Type mismatches (string where number expected, etc.)
- Unexpected HTTP status codes
- Inconsistent response shapes across similar endpoints
- Breaking changes compared to known contracts (if provided)
- Null/undefined values in required fields
- Inconsistent date formats
- Missing error response bodies

${knownContracts ? `Known contracts from previous runs:\n${knownContracts}` : "No known contracts — infer the expected contract from the captures and note any inconsistencies."}

Return a JSON array:
[{
  "endpoint": "/api/products",
  "method": "GET",
  "issue": "Short description",
  "severity": "error|warning|info",
  "details": "Detailed explanation with specific field names and values"
}]

Also return an empty array [] if no violations are found.`;

  // Group captures by endpoint
  const grouped = groupByEndpoint(captures);
  const userPrompt = `## API Captures (${captures.length} total)
${JSON.stringify(grouped, null, 2)}`;

  const violations = await askJSON<ContractViolation[]>(
    systemPrompt,
    userPrompt,
    { maxTokens: 4096 }
  );

  // Save inferred contracts for future drift detection
  saveInferredContracts(captures);

  return violations;
}

function loadKnownContracts(): string | null {
  const contractsDir = aiConfig.paths.contracts;
  if (!fs.existsSync(contractsDir)) return null;

  const files = fs.readdirSync(contractsDir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) return null;

  return files
    .map((f) => {
      const content = fs.readFileSync(path.join(contractsDir, f), "utf-8");
      return `--- ${f} ---\n${content}`;
    })
    .join("\n\n");
}

function saveInferredContracts(captures: APICapture[]): void {
  const contractsDir = aiConfig.paths.contracts;
  fs.mkdirSync(contractsDir, { recursive: true });

  // Group by endpoint and save a representative response shape
  const endpoints = new Map<string, APICapture>();
  for (const capture of captures) {
    const key = `${capture.method}-${new URL(capture.url, "http://localhost").pathname}`;
    // Keep the first successful response as the contract
    if (capture.status >= 200 && capture.status < 300 && !endpoints.has(key)) {
      endpoints.set(key, capture);
    }
  }

  for (const [key, capture] of endpoints) {
    const filename = key.replace(/\//g, "_").replace(/^_/, "") + ".json";
    fs.writeFileSync(
      path.join(contractsDir, filename),
      JSON.stringify(
        {
          method: capture.method,
          url: capture.url,
          status: capture.status,
          responseShape: capture.responseBody,
          capturedAt: capture.timestamp,
        },
        null,
        2
      )
    );
  }
}

function groupByEndpoint(
  captures: APICapture[]
): Record<string, APICapture[]> {
  const grouped: Record<string, APICapture[]> = {};
  for (const c of captures) {
    const key = `${c.method} ${new URL(c.url, "http://localhost").pathname}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }
  return grouped;
}
