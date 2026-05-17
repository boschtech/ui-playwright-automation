import { execSync, type ExecSyncOptionsWithStringEncoding } from "node:child_process";
import { analyzeFailures } from "./rca-analyzer";
import { createDefectsFromRCA } from "./defect-creator";
import type { RCAResult } from "../types";

interface ExecutionReport {
  totalRuns: number;
  initialFailures: number;
  retriedTests: number;
  finalFailures: number;
  decisions: string[];
  rcaResults: RCAResult[];
  defectsCreated: number;
}

const EXEC_OPTS: ExecSyncOptionsWithStringEncoding = {
  encoding: "utf-8",
  stdio: "inherit",
  maxBuffer: 1024 * 1024 * 10,
};

/**
 * Orchestrate a Playwright test run with AI-driven retry and halt logic.
 *
 * Flow:
 *  1. Run full suite (or filtered by args)
 *  2. If failures → RCA
 *  3. If RCA says FLAKY/ENVIRONMENT → retry only those tests
 *  4. If RCA says BUG → halt + auto-create defects
 *  5. Generate execution summary
 */
export async function runAutonomous(
  extraArgs: string[] = []
): Promise<ExecutionReport> {
  const report: ExecutionReport = {
    totalRuns: 0,
    initialFailures: 0,
    retriedTests: 0,
    finalFailures: 0,
    decisions: [],
    rcaResults: [],
    defectsCreated: 0,
  };

  // ── First run ──
  console.log("🚀 [Autonomous] Starting initial test run...");
  const firstRunPassed = runPlaywright(extraArgs);
  report.totalRuns++;

  if (firstRunPassed) {
    report.decisions.push("All tests passed on first run. No further action.");
    return report;
  }

  // ── RCA on failures ──
  console.log("🔍 [Autonomous] Analyzing failures...");
  const rcaResults = await analyzeFailures();
  report.rcaResults = rcaResults;
  report.initialFailures = rcaResults.length;

  const transient = rcaResults.filter(
    (r) => r.category === "FLAKY" || r.category === "ENVIRONMENT"
  );
  const bugs = rcaResults.filter((r) => r.category === "BUG");
  const testIssues = rcaResults.filter((r) => r.category === "TEST_ISSUE");

  // ── Retry transient failures ──
  if (transient.length > 0) {
    const retryTitles = transient.map((r) => r.title);
    console.log(
      `🔄 [Autonomous] Retrying ${transient.length} transient failure(s)...`
    );
    report.decisions.push(
      `Retrying ${transient.length} test(s) classified as FLAKY/ENVIRONMENT: ${retryTitles.join(", ")}`
    );
    report.retriedTests = transient.length;

    const grepPattern = retryTitles
      .map((t) => escapeRegex(t))
      .join("|");
    const retryPassed = runPlaywright([
      ...extraArgs,
      "--grep",
      grepPattern,
    ]);

    if (retryPassed) {
      report.decisions.push("All transient failures passed on retry.");
    } else {
      report.decisions.push("Some transient failures persisted after retry.");
      report.finalFailures += transient.length;
    }
    report.totalRuns++;
  }

  // ── Handle real bugs ──
  if (bugs.length > 0) {
    report.decisions.push(
      `${bugs.length} failure(s) classified as BUG — creating defects.`
    );
    report.finalFailures += bugs.length;

    try {
      const created = await createDefectsFromRCA(bugs);
      report.defectsCreated = created.length;
      report.decisions.push(`Created ${created.length} GitHub issue(s).`);
    } catch (err) {
      report.decisions.push(
        `Failed to create defects: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // ── Log test issues ──
  if (testIssues.length > 0) {
    report.decisions.push(
      `${testIssues.length} failure(s) classified as TEST_ISSUE — tests need fixing.`
    );
    report.finalFailures += testIssues.length;
  }

  return report;
}

function runPlaywright(args: string[]): boolean {
  try {
    execSync(`npx playwright test ${args.join(" ")}`, EXEC_OPTS);
    return true;
  } catch {
    return false;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
