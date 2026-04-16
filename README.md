# UI Playwright Automation

End-to-end Playwright tests for the Bosch Tech micro-frontend application.

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

## CI Pipeline Integration

Each microservice repo triggers Playwright tests as the **last CI job**:

1. **order-service** CI → runs `@order-service` tests after component tests
2. **product-service** CI → runs `@product-service` tests after component tests
3. **micro-frontend** changes → this repo's own CI runs **all** tests

### Uffizzi Ephemeral Previews

Before tests run, Uffizzi spins up an ephemeral environment with all three services
using `docker-compose.uffizzi.yml`. Tests run against the preview URL, then the
environment is cleaned up.

### Required GitHub Secrets

- `UFFIZZI_USER` — Uffizzi account username
- `UFFIZZI_PASSWORD` — Uffizzi account password
- `UFFIZZI_PROJECT` — Uffizzi project name
- `CROSS_REPO_TOKEN` — GitHub PAT with repo access for cross-repo checkouts

## Project Structure

```
ui-playwright-automation/
├── e2e/
│   ├── fixtures/
│   │   └── test-data.ts          # Test data factories
│   ├── pages/
│   │   ├── navbar.page.ts        # Navbar page object
│   │   ├── dashboard.page.ts     # Dashboard page object
│   │   ├── products.page.ts      # Products + ProductDetail page objects
│   │   └── orders.page.ts        # Orders + CreateOrder page objects
│   └── tests/
│       ├── navigation.spec.ts    # Navigation & layout tests
│       ├── dashboard.spec.ts     # Dashboard tests
│       ├── products.spec.ts      # Product CRUD tests (@product-service)
│       └── orders.spec.ts        # Order workflow tests (@order-service)
├── .github/workflows/
│   └── ci.yml                    # CI pipeline with Uffizzi + Playwright
├── docker-compose.uffizzi.yml    # Uffizzi ephemeral environment config
├── Dockerfile.e2e                # Nginx Dockerfile for micro-frontend
├── playwright.config.ts          # Playwright configuration
├── package.json
└── tsconfig.json
```
