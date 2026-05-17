# UI Playwright Automation

End-to-end Playwright tests for the Bosch Tech micro-frontend application, enhanced with an AI-powered test intelligence platform.

## Architecture

Tests are organized by service ownership using tags in `test.describe()` names:

- **`@product-service`** — tests in `products.spec.ts` covering product CRUD
- **`@order-service`** — tests in `orders.spec.ts` covering order workflows
- **Untagged** — `navigation.spec.ts` and `dashboard.spec.ts` run for all changes

## Running Tests

```bash
# Install dependencies
npm ci
npx playwright install --with-deps

# Run all tests against the live app
npm run test:e2e

# Run only product-service tests
npm run test:e2e:products

# Run only order-service tests
npm run test:e2e:orders

# Run against a custom URL (e.g. Uffizzi preview)
E2E_BASE_URL=https://your-preview-url.uffizzi.com npm run test:e2e

# View the HTML report
npm run test:e2e:report
```

---

## AI-Powered Test Intelligence Platform

This project includes 9 AI-powered capabilities built on the Anthropic Claude API. Each feature has a dedicated CLI script accessible via `npm run ai:*` commands.

### Prerequisites

- **Node.js 20+** and npm
- **Anthropic API key** — required for all AI features
- **GitHub CLI (`gh`)** — required only for defect auto-creation (`ai:create-defects`)

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | — | Your Anthropic API key. All AI scripts require this. |
| `AI_FEATURES_ENABLED` | No | `true` | Set to `false` to disable all AI features (kill-switch). |
| `E2E_BASE_URL` | No | `https://micro-frontend-vm5b.onrender.com` | Base URL for the application under test. |
| `GH_TOKEN` | No | — | GitHub token for the `gh` CLI (used by defect auto-creation). In CI this is set automatically via `secrets.GITHUB_TOKEN`. |

#### Local Setup

Create a `.env.local` file (git-ignored) or export directly in your shell:

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
```

#### CI Setup (GitHub Actions)

Add `ANTHROPIC_API_KEY` as a repository secret under **Settings → Secrets and variables → Actions**. All AI steps in the CI workflow are gated behind this secret — if it's not configured, the steps are silently skipped and the pipeline runs normally.

---

### AI Scripts Reference

All scripts support a `--json` flag (where applicable) for machine-readable output. Each script can also be run directly with `npx tsx ai/scripts/<script>.ts`.

#### 1. Requirement-to-Test Generation

Generate Playwright test specs from natural-language requirements, user stories, or acceptance criteria. The generated tests follow the existing Page Object Model conventions.

```bash
# From a text string
npm run ai:generate -- --requirement "As a user, I can search products by name"

# From a file
npm run ai:generate -- --file requirements.txt

# Pipe from stdin
echo "User can cancel an order" | npm run ai:generate

# Specify output file
npm run ai:generate -- --requirement "Filter by category" --output e2e/tests/filter.spec.ts
```

The generated file is written to `e2e/tests/` with a `⚠️ AI-GENERATED` review marker. Always review before committing.

#### 2. Smart Regression Selection

Analyze git changes and determine which tests to run instead of the full suite.

```bash
# Diff against main (default)
npm run ai:select-regression

# Diff against a different branch
npm run ai:select-regression -- --base develop

# Output only the Playwright CLI args (for CI integration)
npm run ai:select-regression -- --output-args
```

Output includes the selected files, grep patterns, reasoning, and a suggested `npx playwright test` command.

#### 3. Autonomous Execution

Orchestrate a full test run with intelligent retry and defect creation:
1. Runs the test suite
2. On failure → analyzes each failure via RCA
3. Retries transient failures (flaky/environment)
4. Auto-creates GitHub issues for confirmed bugs
5. Produces a structured execution report

```bash
# Run the full suite autonomously
npm run ai:run

# Pass extra Playwright args after --
npm run ai:run -- -- --grep @product-service
```

Exits with code 1 if any final failures remain after retries.

#### 4. Failure Root Cause Analysis (RCA)

Analyze the most recent test failures and classify each one. Reads from `ai/history/last-failures.json` (written automatically by the AI reporter after every test run).

```bash
# Human-readable output
npm run ai:rca

# JSON output
npm run ai:rca -- --json
```

Each failure is classified as:
- **BUG** — genuine application defect
- **FLAKY** — intermittent timing/race condition
- **ENVIRONMENT** — infrastructure issue (service down, CI runner)
- **TEST_ISSUE** — problem in the test itself (wrong selector, stale assertion)

Includes a confidence score (0–1), root cause explanation, and suggested fix.

#### 5. Flaky Test Detection

Analyze test execution history for inconsistent pass/fail patterns. Requires at least 3 runs of history.

```bash
# Human-readable output
npm run ai:flaky

# JSON output
npm run ai:flaky -- --json
```

Each flaky test is classified (timing-dependent, data-dependent, race-condition, selector-fragile, environment-sensitive) with a specific fix recommendation.

History is built automatically by the AI reporter (`ai/reporters/ai-reporter.ts`) which is registered in `playwright.config.ts`. Run your tests a few times to build up data.

#### 6. CI/CD Optimization

Analyze the CI pipeline configuration and test execution history to produce optimization recommendations.

```bash
# Human-readable output
npm run ai:optimize-cicd

# JSON output
npm run ai:optimize-cicd -- --json
```

Covers parallelization, caching, sharding, worker count, test ordering, and pipeline structure. If the GitHub CLI (`gh`) is authenticated, it also factors in recent Actions run timing data.

#### 7. Defect Auto-Creation

Automatically create GitHub issues from confirmed test failures. Runs RCA first, then creates issues only for `BUG` failures with confidence ≥ 70%.

```bash
# Create issues
npm run ai:create-defects

# Preview without creating (dry run)
npm run ai:create-defects -- --dry-run
```

Features:
- **Deduplication** — checks existing open issues before creating
- **Auto-labeling** — adds `bug`, `e2e-failure`, and service-specific labels
- **Team assignment** — assigns based on test tag (`@product-service` → product-team)
- **Structured body** — includes summary, repro steps, expected/actual behavior, and error details

Requires the `gh` CLI to be installed and authenticated.

#### 8. Test Coverage Gap Analysis

Identify untested features, missing edge cases, and coverage gaps by analyzing existing page objects and test specs.

```bash
# Human-readable output
npm run ai:coverage-gaps

# JSON output
npm run ai:coverage-gaps -- --json
```

Analyzes: missing user journeys, incomplete CRUD coverage, negative test cases, boundary conditions, cross-feature interactions, accessibility gaps, and error handling.

Output is sorted by priority (high → low), each with a suggested test to write.

#### 9. API Contract Validation

Validate backend API responses against expected contracts. Captures are collected automatically during test runs via the API monitor fixture.

```bash
# Human-readable output
npm run ai:validate-contracts

# JSON output
npm run ai:validate-contracts -- --json
```

To enable API capture in your tests, import from the AI fixture instead of `@playwright/test`:

```typescript
// In your spec file
import { test, expect } from "../../ai/fixtures/api-monitor";
```

This intercepts API calls to `/api/products/**` and `/api/orders/**` during test execution and saves request/response pairs. On first run, contracts are inferred and saved to `ai/contracts/`. On subsequent runs, responses are validated against stored contracts for drift detection.

Exits with code 1 if any `error`-severity violations are found.

---

### How the AI Reporter Works

The custom Playwright reporter (`ai/reporters/ai-reporter.ts`) is registered in `playwright.config.ts` and runs automatically on every test execution. It:

1. **Writes `ai/history/last-failures.json`** — contains details of all failed tests from the most recent run (error messages, screenshot paths, trace paths). Used by the RCA and defect creation scripts.
2. **Appends to `ai/history/test-history.json`** — cumulative log of every run with per-test status, duration, and retry count. Used by the flaky test detector.

Both files are git-ignored. In CI, they exist only for the lifetime of the workflow run.

### CI Pipeline Integration

The GitHub Actions workflow (`.github/workflows/ci.yml`) includes AI steps that run automatically when `ANTHROPIC_API_KEY` is configured:

| Step | When | What it does |
|------|------|--------------|
| Smart Regression Selection | Before tests | Determines `--grep` filter from git diff |
| Failure RCA | On test failure | Classifies each failure |
| Flaky Test Detection | Always (post-test) | Flags inconsistent tests |
| Defect Auto-Creation | On test failure | Creates GitHub issues for confirmed bugs |
| API Contract Validation | Always (post-test) | Validates API responses |

All AI steps use `|| true` to ensure they never block the pipeline. If the `ANTHROPIC_API_KEY` secret is not set, the steps are skipped entirely.

---

### Pipeline Integration (Other Repos)

Each microservice repo triggers Playwright tests as the **last CI job**:

1. **order-service** CI → runs `@order-service` tests after component tests
2. **product-service** CI → runs `@product-service` tests after component tests
3. **micro-frontend** changes → this repo's own CI runs **all** tests

#### Uffizzi Ephemeral Previews

Before tests run, Uffizzi spins up an ephemeral environment with all three services
using `docker-compose.uffizzi.yml`. Tests run against the preview URL, then the
environment is cleaned up.

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `ANTHROPIC_API_KEY` | Enables all AI-powered features |
| `CROSS_REPO_TOKEN` | GitHub PAT for cross-repo checkouts |
| `UFFIZZI_USER` | Uffizzi account username |
| `UFFIZZI_PASSWORD` | Uffizzi account password |
| `UFFIZZI_PROJECT` | Uffizzi project name |

---

## Project Structure

```
ui-playwright-automation/
├── ai/                              # AI-powered test intelligence platform
│   ├── client.ts                    # Shared Claude API client (with prompt caching)
│   ├── config.ts                    # AI configuration (model, thresholds, paths)
│   ├── types.ts                     # Shared TypeScript interfaces
│   ├── reporters/
│   │   └── ai-reporter.ts           # Custom Playwright reporter (history + failures)
│   ├── fixtures/
│   │   └── api-monitor.ts           # Playwright fixture for API capture
│   ├── modules/
│   │   ├── test-generator.ts        # 1. Requirement-to-test generation
│   │   ├── regression-selector.ts   # 2. Smart regression selection
│   │   ├── executor.ts              # 3. Autonomous execution orchestrator
│   │   ├── rca-analyzer.ts          # 4. Failure root cause analysis
│   │   ├── flaky-detector.ts        # 5. Flaky test detection
│   │   ├── cicd-optimizer.ts        # 6. CI/CD optimization
│   │   ├── defect-creator.ts        # 7. Defect auto-creation
│   │   ├── coverage-analyzer.ts     # 8. Test coverage gap analysis
│   │   └── contract-validator.ts    # 9. API contract validation
│   ├── scripts/
│   │   ├── generate-tests.ts        # CLI for test generation
│   │   ├── select-regression.ts     # CLI for regression selection
│   │   ├── run-autonomous.ts        # CLI for autonomous execution
│   │   ├── analyze-failures.ts      # CLI for failure RCA
│   │   ├── detect-flaky.ts          # CLI for flaky detection
│   │   ├── optimize-cicd.ts         # CLI for CI/CD optimization
│   │   ├── create-defects.ts        # CLI for defect creation
│   │   ├── analyze-coverage.ts      # CLI for coverage analysis
│   │   └── validate-contracts.ts    # CLI for contract validation
│   ├── history/                     # (git-ignored) Runtime data
│   │   ├── test-history.json        # Cumulative test run history
│   │   ├── last-failures.json       # Most recent failure details
│   │   └── api-captures.json        # Captured API request/response pairs
│   └── contracts/                   # (git-ignored) Inferred API contracts
├── e2e/
│   ├── fixtures/
│   │   └── test-data.ts             # Test data factories
│   ├── pages/
│   │   ├── navbar.page.ts           # Navbar page object
│   │   ├── dashboard.page.ts        # Dashboard page object
│   │   ├── products.page.ts         # Products + ProductDetail page objects
│   │   └── orders.page.ts           # Orders + CreateOrder page objects
│   └── tests/
│       ├── navigation.spec.ts       # Navigation & layout tests
│       ├── dashboard.spec.ts        # Dashboard tests
│       ├── products.spec.ts         # Product CRUD tests (@product-service)
│       └── orders.spec.ts           # Order workflow tests (@order-service)
├── .github/workflows/
│   └── ci.yml                       # CI pipeline with AI + Playwright
├── docker-compose.uffizzi.yml       # Uffizzi ephemeral environment config
├── Dockerfile.e2e                   # Nginx Dockerfile for micro-frontend
├── playwright.config.ts             # Playwright configuration
├── package.json
└── tsconfig.json
```
