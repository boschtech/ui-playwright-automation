import { type Page } from "@playwright/test";
import { test, expect } from "../../ai/fixtures/api-monitor";
import { OrdersPage, CreateOrderPage } from "../pages/orders.page";
import { ProductsPage } from "../pages/products.page";
import { buildProduct, buildOrder } from "../fixtures/test-data";

/**
 * Guarantee at least one order exists by creating a fresh product and placing
 * an order against it. Returns the created product so callers can target its
 * specific order row. This keeps assertions deterministic instead of silently
 * skipping when the shared backend happens to have no orders.
 */
async function seedOrder(page: Page) {
  const productsPage = new ProductsPage(page);
  await productsPage.goto();
  const product = buildProduct();
  await productsPage.createProduct(product);
  await expect(productsPage.getProductCard(product.name)).toBeVisible({
    timeout: 10_000,
  });

  const createPage = new CreateOrderPage(page);
  await createPage.goto();
  const order = buildOrder();
  await createPage.placeOrder(product.name, order.quantity);
  await expect(page).toHaveURL(/\/orders$/, { timeout: 10_000 });

  return product;
}

test.describe("Orders @order-service", () => {
  let ordersPage: OrdersPage;

  test.beforeEach(async ({ page }) => {
    ordersPage = new OrdersPage(page);
  });

  test("should display orders page heading", async ({ page }) => {
    await ordersPage.goto();
    await expect(ordersPage.heading).toBeVisible();
  });

  test("should show New Order button", async ({ page }) => {
    await ordersPage.goto();
    await expect(ordersPage.newOrderButton).toBeVisible();
  });

  test("should display orders list or empty state", async ({ page }) => {
    await ordersPage.goto();
    // Wait for either the table or the empty-state message to appear.
    // `.count()` can race with the React Query load, so use `.or()` to
    // allow whichever condition settles first.
    await expect(
      ordersPage.ordersTable.or(ordersPage.noOrdersMessage)
    ).toBeVisible();
  });

  test("should display order table headers when orders exist", async ({
    page,
  }) => {
    // Seed an order so the table is guaranteed to render rather than the
    // empty state, making the header assertions meaningful every run.
    await seedOrder(page);
    await expect(ordersPage.orderRows.first()).toBeVisible({ timeout: 10_000 });

    await expect(page.getByRole("columnheader", { name: "Order ID" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Product" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Qty" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Total" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Date" })).toBeVisible();
  });

  test("should navigate to Create Order page", async ({ page }) => {
    await ordersPage.goto();
    await ordersPage.gotoCreateOrder();
    await expect(page).toHaveURL(/\/orders\/new/);

    const createPage = new CreateOrderPage(page);
    await expect(createPage.heading).toBeVisible();
  });

  test("should show Create Order form elements", async ({ page }) => {
    const createPage = new CreateOrderPage(page);
    await createPage.goto();

    await expect(createPage.heading).toBeVisible();
    await expect(createPage.backLink).toBeVisible();
    await expect(createPage.productSelect).toBeVisible();
    await expect(createPage.quantityInput).toBeVisible();
    await expect(createPage.placeOrderButton).toBeVisible();
  });

  test("should disable Place Order button when no product selected", async ({
    page,
  }) => {
    const createPage = new CreateOrderPage(page);
    await createPage.goto();

    await expect(createPage.placeOrderButton).toBeDisabled();
  });

  test("should show estimated total when product is selected", async ({
    page,
  }) => {
    // First create a product to ensure one exists
    const productsPage = new ProductsPage(page);
    await productsPage.goto();
    const product = buildProduct();
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    // Navigate to create order
    const createPage = new CreateOrderPage(page);
    await createPage.goto();
    await createPage.selectProduct(product.name);

    await expect(createPage.estimatedTotal).toBeVisible();
  });

  test("should create an order and redirect to orders list", async ({
    page,
  }) => {
    // First create a product to order
    const productsPage = new ProductsPage(page);
    await productsPage.goto();
    const product = buildProduct();
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    // Create the order
    const createPage = new CreateOrderPage(page);
    await createPage.goto();
    const order = buildOrder();
    await createPage.placeOrder(product.name, order.quantity);

    // Should redirect to orders list
    await expect(page).toHaveURL(/\/orders$/, { timeout: 10_000 });

    // Newly created order should appear in the table
    ordersPage = new OrdersPage(page);
    await expect(ordersPage.ordersTable).toBeVisible();
    await expect(page.getByText(product.name).first()).toBeVisible();
  });

  test("should display status badges on orders", async ({ page }) => {
    // Seed an order so there is always at least one row carrying a badge.
    await seedOrder(page);
    await expect(ordersPage.orderRows.first()).toBeVisible({ timeout: 10_000 });

    const statusBadge = ordersPage.orderRows
      .first()
      .locator("span.rounded-full");
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toHaveText(/CONFIRMED|PENDING|CANCELLED/);
  });

  test("should navigate back to orders from Create Order page", async ({
    page,
  }) => {
    const createPage = new CreateOrderPage(page);
    await createPage.goto();

    await createPage.backLink.click();
    await expect(page).toHaveURL(/\/orders$/);
    await expect(ordersPage.heading).toBeVisible();
  });

  test("should link product name in order row to product detail", async ({
    page,
  }) => {
    // Seed an order and target its specific row so the product link is
    // guaranteed to be present and points at the product detail page.
    const product = await seedOrder(page);
    const row = ordersPage.orderRows.filter({ hasText: product.name }).first();
    await expect(row).toBeVisible({ timeout: 10_000 });

    // Product links in order rows point at `/products/:id`. Select by href
    // prefix so the test is resilient to visual class changes.
    const productLink = row.locator("a[href^='/products/']");
    await expect(productLink.first()).toBeVisible();
    await productLink.first().click();
    await expect(page).toHaveURL(/\/products\/.+/);
  });
});
