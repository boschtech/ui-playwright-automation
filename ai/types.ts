/* ------------------------------------------------------------------ */
/*  Shared types for the AI test-intelligence platform                */
/* ------------------------------------------------------------------ */

/** A single test result as recorded by the AI reporter. */
export interface TestRecord {
  testId: string;
  title: string;
  file: string;
  suite: string;
  status: "passed" | "failed" | "timedOut" | "skipped";
  duration: number;
  retries: number;
  error?: string;
  screenshotPath?: string;
  tracePath?: string;
  timestamp: string;
}

/** Persisted history entry — one per Playwright run. */
export interface RunHistory {
  runId: string;
  timestamp: string;
  commit?: string;
  branch?: string;
  results: TestRecord[];
}

/** RCA output for a single failure. */
export interface RCAResult {
  testId: string;
  title: string;
  file: string;
  category: "BUG" | "FLAKY" | "ENVIRONMENT" | "TEST_ISSUE";
  rootCause: string;
  suggestedFix: string;
  confidence: number;
}

/** Flaky test report entry. */
export interface FlakyTestEntry {
  testId: string;
  title: string;
  file: string;
  passRate: number;
  totalRuns: number;
  avgDuration: number;
  durationVariance: number;
  classification: string;
  recommendation: string;
}

/** API capture recorded during test execution. */
export interface APICapture {
  testTitle: string;
  method: string;
  url: string;
  requestBody?: unknown;
  status: number;
  responseBody?: unknown;
  timestamp: string;
}

/** Contract validation result. */
export interface ContractViolation {
  endpoint: string;
  method: string;
  issue: string;
  severity: "error" | "warning" | "info";
  details: string;
}

/** Coverage gap entry. */
export interface CoverageGap {
  feature: string;
  description: string;
  priority: "high" | "medium" | "low";
  suggestedTest: string;
}

/** CI/CD optimization recommendation. */
export interface CICDRecommendation {
  area: string;
  current: string;
  suggestion: string;
  impact: "high" | "medium" | "low";
}

/** Defect issue to be created. */
export interface DefectIssue {
  title: string;
  body: string;
  labels: string[];
  assignee?: string;
}
