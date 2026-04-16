import { test, expect } from "@playwright/test";
import { OrdersPage, CreateOrderPage } from "../pages/orders.page";
import { ProductsPage } from "../pages/products.page";
import { buildProduct, buildOrder } from "../fixtures/test-data";

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
    const hasOrders = (await ordersPage.orderRows.count()) > 0;
    if (hasOrders) {
      await expect(ordersPage.ordersTable).toBeVisible();
    } else {
      await expect(ordersPage.noOrdersMessage).toBeVisible();
    }
  });

  test("should display order table headers when orders exist", async ({
    page,
  }) => {
    await ordersPage.goto();
    const hasOrders = (await ordersPage.orderRows.count()) > 0;
    if (hasOrders) {
      await expect(page.getByRole("columnheader", { name: "Order ID" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Product" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Qty" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Total" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Date" })).toBeVisible();
    }
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
    await ordersPage.goto();
    const hasOrders = (await ordersPage.orderRows.count()) > 0;
    if (hasOrders) {
      const statusBadge = ordersPage.orderRows
        .first()
        .locator("span.rounded-full");
      await expect(statusBadge).toBeVisible();
      await expect(statusBadge).toHaveText(/CONFIRMED|PENDING|CANCELLED/);
    }
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
    await ordersPage.goto();
    const hasOrders = (await ordersPage.orderRows.count()) > 0;
    if (hasOrders) {
      const productLink = ordersPage.orderRows
        .first()
        .locator("a.text-indigo-600");
      if ((await productLink.count()) > 0) {
        await productLink.click();
        await expect(page).toHaveURL(/\/products\/.+/);
      }
    }
  });
});
