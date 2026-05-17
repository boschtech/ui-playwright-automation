import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import { aiConfig } from "../config";
import type { TestRecord, RunHistory } from "../types";

/**
 * Custom Playwright reporter that:
 *  1. Writes failure details to `ai/history/last-failures.json`
 *  2. Appends every run to `ai/history/test-history.json` for trend analysis
 *
 * Register in playwright.config.ts:
 *   reporter: [["./ai/reporters/ai-reporter.ts"], ...]
 */
export default class AIReporter implements Reporter {
  private records: TestRecord[] = [];
  private runId = crypto.randomUUID();
  private startTime = new Date().toISOString();

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.startTime = new Date().toISOString();
    console.log(`[AI Reporter] Run ${this.runId} started`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const record: TestRecord = {
      testId: test.id,
      title: test.title,
      file: path.relative(process.cwd(), test.location.file),
      suite: test.parent.title,
      status: result.status,
      duration: result.duration,
      retries: result.retry,
      timestamp: new Date().toISOString(),
    };

    if (result.status === "failed" || result.status === "timedOut") {
      record.error =
        result.errors.map((e) => e.message ?? e.toString()).join("\n") ||
        undefined;

      // Find screenshot attachment
      const screenshot = result.attachments.find(
        (a) => a.contentType === "image/png"
      );
      if (screenshot?.path) {
        record.screenshotPath = screenshot.path;
      }

      // Find trace attachment
      const trace = result.attachments.find(
        (a) => a.name === "trace" || a.contentType === "application/zip"
      );
      if (trace?.path) {
        record.tracePath = trace.path;
      }
    }

    this.records.push(record);
  }

  onEnd(_result: FullResult): void {
    const historyDir = path.dirname(aiConfig.paths.history);
    fs.mkdirSync(historyDir, { recursive: true });

    // ── Write last-failures.json (only failed tests) ──
    const failures = this.records.filter(
      (r) => r.status === "failed" || r.status === "timedOut"
    );
    fs.writeFileSync(
      aiConfig.paths.failureReport,
      JSON.stringify(failures, null, 2)
    );

    // ── Append to test-history.json ──
    let history: RunHistory[] = [];
    if (fs.existsSync(aiConfig.paths.history)) {
      try {
        history = JSON.parse(fs.readFileSync(aiConfig.paths.history, "utf-8"));
      } catch {
        history = [];
      }
    }

    const run: RunHistory = {
      runId: this.runId,
      timestamp: this.startTime,
      commit: process.env.GITHUB_SHA ?? process.env.GIT_COMMIT,
      branch:
        process.env.GITHUB_REF_NAME ??
        process.env.GIT_BRANCH ??
        process.env.BRANCH,
      results: this.records,
    };

    history.push(run);
    fs.writeFileSync(aiConfig.paths.history, JSON.stringify(history, null, 2));

    const passed = this.records.filter((r) => r.status === "passed").length;
    const failed = failures.length;
    console.log(
      `[AI Reporter] Run ${this.runId} complete — ${passed} passed, ${failed} failed`
    );
  }
}
