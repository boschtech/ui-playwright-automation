import fs from "node:fs";
import path from "node:path";
import { ask } from "../client";
import { aiConfig } from "../config";

/**
 * Reads all page objects and existing specs to build context,
 * then asks Claude to generate a new Playwright spec from a requirement.
 */
export async function generateTests(requirement: string): Promise<string> {
  // Gather existing patterns as context
  const pageObjects = readDirFiles(aiConfig.paths.e2ePages);
  const existingTests = readDirFiles(aiConfig.paths.e2eTests);
  const testData = readDirFiles(aiConfig.paths.e2eFixtures);

  const systemPrompt = `You are an expert Playwright E2E test engineer.
You generate Playwright test specs that follow the EXACT patterns of an existing codebase.

Rules:
- Use TypeScript with @playwright/test imports
- Follow the Page Object Model (POM) — import page objects from "../pages/"
- Use test data factories from "../fixtures/test-data" where applicable
- Group tests in test.describe() blocks with service tags like @product-service or @order-service
- Use test.beforeEach for common setup
- Use meaningful test names that describe the expected behavior
- Use Playwright best practices: role-based selectors, proper waits, expect assertions
- Add comments only where the intent is non-obvious
- If a new page object is needed, include it as a separate code block marked with the filename

Here are the existing page objects:
${formatFiles(pageObjects)}

Here are the existing test specs (for pattern reference):
${formatFiles(existingTests)}

Here are the test data factories:
${formatFiles(testData)}`;

  const userPrompt = `Generate a complete Playwright test spec file for the following requirement:

${requirement}

Return the spec file content. If new page objects or test data factories are needed, include them as additional code blocks with their file paths as comments at the top.`;

  const generated = await ask(systemPrompt, userPrompt, { maxTokens: 8192 });
  return `// ⚠️ AI-GENERATED — Review before committing\n// Requirement: ${requirement.slice(0, 100).replace(/\n/g, " ")}...\n// Generated: ${new Date().toISOString()}\n\n${generated}`;
}

function readDirFiles(dirPath: string): { name: string; content: string }[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => ({
      name: f,
      content: fs.readFileSync(path.join(dirPath, f), "utf-8"),
    }));
}

function formatFiles(files: { name: string; content: string }[]): string {
  return files
    .map((f) => `--- ${f.name} ---\n${f.content}`)
    .join("\n\n");
}
