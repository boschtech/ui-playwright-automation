import { execSync } from "node:child_process";
import { ask } from "../client";
import { aiConfig } from "../config";
import type { RCAResult, DefectIssue } from "../types";

/**
 * Create GitHub issues for failures classified as BUG by the RCA module.
 * Uses the `gh` CLI for issue creation and deduplication.
 */
export async function createDefectsFromRCA(
  rcaResults: RCAResult[]
): Promise<DefectIssue[]> {
  const bugs = rcaResults.filter(
    (r) =>
      r.category === "BUG" && r.confidence >= aiConfig.defectConfidenceThreshold
  );

  if (bugs.length === 0) {
    console.log("No high-confidence BUG failures to report.");
    return [];
  }

  const created: DefectIssue[] = [];

  for (const bug of bugs) {
    // ── Deduplication: check if an issue already exists ──
    if (isDuplicate(bug.title)) {
      console.log(`⏭️  Skipping duplicate issue for: ${bug.title}`);
      continue;
    }

    // ── Generate issue body via Claude ──
    const issue = await generateIssue(bug);

    // ── Create via gh CLI ──
    try {
      const labelArgs = issue.labels.map((l) => `--label "${l}"`).join(" ");
      const assigneeArg = issue.assignee
        ? `--assignee "${issue.assignee}"`
        : "";

      execSync(
        `gh issue create --title "${escapeShell(issue.title)}" --body "${escapeShell(issue.body)}" ${labelArgs} ${assigneeArg}`,
        { encoding: "utf-8", stdio: "pipe" }
      );

      console.log(`✅ Created issue: ${issue.title}`);
      created.push(issue);
    } catch (err) {
      console.error(
        `❌ Failed to create issue for "${bug.title}":`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return created;
}

async function generateIssue(bug: RCAResult): Promise<DefectIssue> {
  const systemPrompt = `You are a QA engineer creating a concise, well-structured GitHub issue from a test failure analysis.

Write a clear issue body with these sections:
## Summary
## Steps to Reproduce (from the test spec)
## Expected Behavior
## Actual Behavior
## Error Details
## Suggested Fix
## Test Information

Keep it factual and actionable. No speculation beyond the RCA analysis.`;

  const userPrompt = `Create a GitHub issue for this failure:
- Test: ${bug.title}
- File: ${bug.file}
- Category: ${bug.category}
- Root Cause: ${bug.rootCause}
- Suggested Fix: ${bug.suggestedFix}
- Confidence: ${bug.confidence}`;

  const body = await ask(systemPrompt, userPrompt, { maxTokens: 2048 });

  // Determine labels and assignee from test suite tags
  const labels = ["bug", "e2e-failure"];
  let assignee: string | undefined;

  for (const [tag, team] of Object.entries(aiConfig.teamMapping)) {
    if (bug.file.includes(tag.replace("@", "")) || bug.title.includes(tag)) {
      assignee = team;
      labels.push(tag.replace("@", ""));
      break;
    }
  }

  return {
    title: `[E2E Failure] ${bug.title}`,
    body,
    labels,
    assignee,
  };
}

function isDuplicate(testTitle: string): boolean {
  try {
    const result = execSync(
      `gh issue list --state open --search "${escapeShell(testTitle)}" --json title --limit 5`,
      { encoding: "utf-8", timeout: 10_000 }
    );
    const issues = JSON.parse(result);
    return issues.some((i: { title: string }) =>
      i.title.includes(testTitle.slice(0, 50))
    );
  } catch {
    // If gh CLI fails, assume no duplicate to avoid blocking
    return false;
  }
}

function escapeShell(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`");
}
