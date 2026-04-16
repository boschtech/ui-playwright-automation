import { test, expect } from "@playwright/test";
import { ProductsPage, ProductDetailPage } from "../pages/products.page";
import { buildProduct } from "../fixtures/test-data";

test.describe("Products @product-service", () => {
  let productsPage: ProductsPage;

  test.beforeEach(async ({ page }) => {
    productsPage = new ProductsPage(page);
    await productsPage.goto();
  });

  test("should display the products page heading", async () => {
    await expect(productsPage.heading).toBeVisible();
  });

  test("should show New Product button", async () => {
    await expect(productsPage.newProductButton).toBeVisible();
  });

  test("should display product list or empty state", async () => {
    // Either product cards or the empty-state message should eventually
    // be visible. Using `.or()` avoids racing with the initial data load.
    await expect(
      productsPage.productCards.first().or(productsPage.noProductsMessage)
    ).toBeVisible();
  });

  test("should open and close the create product form", async ({ page }) => {
    await productsPage.newProductButton.click();
    await expect(
      page.getByRole("heading", { name: "Create Product" })
    ).toBeVisible();
    await expect(productsPage.nameInput).toBeVisible();

    // Click Cancel to close
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(
      page.getByRole("heading", { name: "Create Product" })
    ).not.toBeVisible();
  });

  test("should create a new product", async ({ page }) => {
    const product = buildProduct();

    await productsPage.createProduct(product);

    // Form should close and new product should appear in the list
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });
    await expect(productsPage.getProductCard(product.name)).toContainText(
      product.category
    );
    await expect(productsPage.getProductCard(product.name)).toContainText(
      `$${Number(product.price).toFixed(2)}`
    );
  });

  test("should navigate to product detail page", async ({ page }) => {
    const product = buildProduct();
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    await productsPage.getProductLink(product.name).click();
    await expect(page).toHaveURL(/\/products\/.+/);

    const detail = new ProductDetailPage(page);
    await expect(detail.productName).toHaveText(product.name);
    await expect(detail.category).toHaveText(product.category);
    await expect(detail.description).toHaveText(product.description);
    await expect(detail.price).toContainText(
      `$${Number(product.price).toFixed(2)}`
    );
  });

  test("should edit a product from the detail page", async ({ page }) => {
    const product = buildProduct();
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    await productsPage.getProductLink(product.name).click();
    const detail = new ProductDetailPage(page);

    const updatedName = `${product.name} Updated`;
    await detail.editProduct({ name: updatedName, price: "99.99" });

    // Verify the updated values are reflected
    await expect(detail.productName).toHaveText(updatedName, {
      timeout: 10_000,
    });
    await expect(detail.price).toContainText("$99.99");
  });

  test("should delete a product from the list page", async ({ page }) => {
    const product = buildProduct();
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    await productsPage.deleteProduct(product.name);

    // Product card should disappear
    await expect(productsPage.getProductCard(product.name)).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test("should delete a product from the detail page", async ({ page }) => {
    const product = buildProduct();
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    await productsPage.getProductLink(product.name).click();
    const detail = new ProductDetailPage(page);
    await detail.deleteButton.click();

    // Should redirect back to products list
    await expect(page).toHaveURL(/\/products$/, { timeout: 10_000 });
  });

  test("should show back link on detail page", async ({ page }) => {
    const product = buildProduct();
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    await productsPage.getProductLink(product.name).click();
    const detail = new ProductDetailPage(page);

    await detail.backLink.click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(productsPage.heading).toBeVisible();
  });

  test("should display stock badge on product cards", async ({ page }) => {
    const product = buildProduct();
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    const card = productsPage.getProductCard(product.name);
    const badge = card.locator("span.rounded-full");
    await expect(badge).toBeVisible();
    // Badge text is either "In Stock" or "Out of Stock"
    await expect(badge).toHaveText(/In Stock|Out of Stock/);
  });

  test("should show product orders section on detail page", async ({
    page,
  }) => {
    const product = buildProduct();
    await productsPage.createProduct(product);
    await expect(productsPage.getProductCard(product.name)).toBeVisible({
      timeout: 10_000,
    });

    await productsPage.getProductLink(product.name).click();
    const detail = new ProductDetailPage(page);
    await expect(detail.ordersHeading).toBeVisible();
  });
});
