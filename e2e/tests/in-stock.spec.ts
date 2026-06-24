import { test, expect } from "../../ai/fixtures/api-monitor";
import { ProductsPage, ProductDetailPage } from "../pages/products.page";
import { DashboardPage } from "../pages/dashboard.page";
import { buildProduct } from "../fixtures/test-data";

test.describe("In Stock Functionality @product-service", () => {
  let productsPage: ProductsPage;

  test.beforeEach(async ({ page }) => {
    productsPage = new ProductsPage(page);
    await productsPage.goto();
  });

  // ── Creation defaults ───────────────────────────────────────────────────

  test("should default to In Stock badge when no stock option is chosen", async () => {
    const product = buildProduct(); // no stock override → form defaults to "In Stock"
    await productsPage.createProduct(product);

    const card = productsPage.getProductCard(product.name);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.locator("span.rounded-full")).toHaveText("In Stock");
  });

  // ── Badge text & colour on the list page ───────────────────────────────

  test("should display a green In Stock badge for an in-stock product", async () => {
    const product = buildProduct({ stock: "In Stock" });
    await productsPage.createProduct(product);

    const card = productsPage.getProductCard(product.name);
    await expect(card).toBeVisible({ timeout: 10_000 });

    const badge = card.locator("span.rounded-full");
    await expect(badge).toHaveText("In Stock");
    await expect(badge).toHaveClass(/bg-green-100/);
    await expect(badge).toHaveClass(/text-green-800/);
  });

  test("should display a red Out of Stock badge for an out-of-stock product", async () => {
    const product = buildProduct({ stock: "Out of Stock" });
    await productsPage.createProduct(product);

    const card = productsPage.getProductCard(product.name);
    await expect(card).toBeVisible({ timeout: 10_000 });

    const badge = card.locator("span.rounded-full");
    await expect(badge).toHaveText("Out of Stock");
    await expect(badge).toHaveClass(/bg-red-100/);
    await expect(badge).toHaveClass(/text-red-800/);
  });

  // ── Badge on the detail page ────────────────────────────────────────────

  test("should show In Stock badge on the product detail page", async ({ page }) => {
    const product = buildProduct({ stock: "In Stock" });
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    await productsPage.getProductLink(product.name).click();
    const detail = new ProductDetailPage(page);

    await expect(detail.stockBadge).toHaveText("In Stock");
    await expect(detail.stockBadge).toHaveClass(/bg-green-100/);
    await expect(detail.stockBadge).toHaveClass(/text-green-800/);
  });

  test("should show Out of Stock badge on the product detail page", async ({ page }) => {
    const product = buildProduct({ stock: "Out of Stock" });
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    await productsPage.getProductLink(product.name).click();
    const detail = new ProductDetailPage(page);

    await expect(detail.stockBadge).toHaveText("Out of Stock");
    await expect(detail.stockBadge).toHaveClass(/bg-red-100/);
    await expect(detail.stockBadge).toHaveClass(/text-red-800/);
  });

  // ── Editing stock status ────────────────────────────────────────────────

  test("should update stock from In Stock to Out of Stock via the edit form", async ({ page }) => {
    const product = buildProduct({ stock: "In Stock" });
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    await productsPage.getProductLink(product.name).click();
    const detail = new ProductDetailPage(page);

    await expect(detail.stockBadge).toHaveText("In Stock");

    await detail.editProduct({ stock: "Out of Stock" });

    await expect(detail.stockBadge).toHaveText("Out of Stock", {
      timeout: 10_000,
    });
    await expect(detail.stockBadge).toHaveClass(/bg-red-100/);
  });

  test("should update stock from Out of Stock to In Stock via the edit form", async ({ page }) => {
    const product = buildProduct({ stock: "Out of Stock" });
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    await productsPage.getProductLink(product.name).click();
    const detail = new ProductDetailPage(page);

    await expect(detail.stockBadge).toHaveText("Out of Stock");

    await detail.editProduct({ stock: "In Stock" });

    await expect(detail.stockBadge).toHaveText("In Stock", {
      timeout: 10_000,
    });
    await expect(detail.stockBadge).toHaveClass(/bg-green-100/);
  });

  // ── Stock change reflected back on the list ─────────────────────────────

  test("should reflect an In Stock → Out of Stock edit on the products list", async ({ page }) => {
    const product = buildProduct({ stock: "In Stock" });
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    await productsPage.getProductLink(product.name).click();
    const detail = new ProductDetailPage(page);
    await detail.editProduct({ stock: "Out of Stock" });
    await expect(detail.stockBadge).toHaveText("Out of Stock", {
      timeout: 10_000,
    });

    await detail.backLink.click();
    await expect(page).toHaveURL(/\/products$/);

    const card = productsPage.getProductCard(product.name);
    await expect(card.locator("span.rounded-full")).toHaveText("Out of Stock", {
      timeout: 10_000,
    });
  });

  // ── Dashboard In Stock stat ─────────────────────────────────────────────

  test("should show a numeric In Stock count on the dashboard after data loads", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    await expect(dashboard.inStock).toBeVisible();

    // Once the product service responds the placeholder "—" is replaced by a number
    await expect(async () => {
      const text = await dashboard.inStock.textContent();
      const match = text?.match(/\d+/);
      expect(match, `Expected a numeric In Stock value but got: "${text}"`).not.toBeNull();
    }).toPass({ timeout: 15_000 });
  });

  test("should increment the dashboard In Stock count after creating an in-stock product", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();

    // Wait for the initial count to resolve to a number
    let initialCount = 0;
    await expect(async () => {
      const text = await dashboard.inStock.textContent();
      const match = text?.match(/(\d+)/);
      expect(match).not.toBeNull();
      initialCount = parseInt(match![1], 10);
    }).toPass({ timeout: 15_000 });

    // Create a new in-stock product
    await productsPage.goto();
    const product = buildProduct({ stock: "In Stock" });
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    // Return to the dashboard and verify the count reflects our new product.
    // The suite runs fully in parallel against a shared backend, so other
    // workers may create in-stock products concurrently. Assert the count
    // grew by *at least* one (>=) rather than exactly one, otherwise a
    // concurrent create pushes the value past initialCount + 1 and an exact
    // match would never settle within the polling window.
    await dashboard.goto();
    await expect(async () => {
      const text = await dashboard.inStock.textContent();
      const match = text?.match(/(\d+)/);
      expect(match).not.toBeNull();
      expect(parseInt(match![1], 10)).toBeGreaterThanOrEqual(initialCount + 1);
    }).toPass({ timeout: 15_000 });
  });
});
