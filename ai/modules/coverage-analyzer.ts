import fs from "node:fs";
import path from "node:path";
import { askJSON } from "../client";
import { aiConfig } from "../config";
import type { CoverageGap } from "../types";

/**
 * Analyze existing page objects and test specs to identify
 * untested features, missing edge cases, and coverage gaps.
 */
export async function analyzeCoverageGaps(): Promise<CoverageGap[]> {
  const pageObjects = readDirFiles(aiConfig.paths.e2ePages);
  const testSpecs = readDirFiles(aiConfig.paths.e2eTests);
  const testData = readDirFiles(aiConfig.paths.e2eFixtures);

  const systemPrompt = `You are a senior QA architect performing a test coverage gap analysis for a Playwright E2E suite.

You are given:
1. Page objects — define the full UI surface (all selectors, actions, and pages)
2. Test specs — the existing test coverage
3. Test data factories — how test data is created

Analyze what is MISSING. Consider:
- User journeys that are not tested end-to-end
- CRUD operations not fully covered (create, read, update, delete)
- Negative test cases (invalid input, error states, empty states)
- Boundary conditions (min/max values, long strings, special characters)
- Cross-feature interactions (e.g. deleting a product that has orders)
- Accessibility testing gaps
- Responsive/mobile testing gaps
- Error handling (API failures, network errors, timeouts)
- Authentication/authorization (if applicable)
- Data integrity (e.g. after operations, does related data update?)

Return a JSON array sorted by priority (high first):
[{
  "feature": "Short feature/area name",
  "description": "What is missing and why it matters",
  "priority": "high|medium|low",
  "suggestedTest": "Describe the test that should be written"
}]`;

  const userPrompt = `## Page Objects (UI Surface)
${formatFiles(pageObjects)}

## Existing Test Specs
${formatFiles(testSpecs)}

## Test Data Factories
${formatFiles(testData)}`;

  return askJSON<CoverageGap[]>(systemPrompt, userPrompt, {
    maxTokens: 8192,
  });
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
  return files.map((f) => `--- ${f.name} ---\n${f.content}`).join("\n\n");
}
