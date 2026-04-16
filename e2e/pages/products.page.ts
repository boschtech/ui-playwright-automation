import { type Page, type Locator, expect } from "@playwright/test";

export class ProductsPage {
  readonly page: Page;

  // List view
  readonly heading: Locator;
  readonly newProductButton: Locator;
  readonly productCards: Locator;
  readonly noProductsMessage: Locator;
  readonly loadingMessage: Locator;
  readonly errorMessage: Locator;

  // Create / Edit form
  readonly nameInput: Locator;
  readonly categoryInput: Locator;
  readonly descriptionInput: Locator;
  readonly priceInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Products" });
    this.newProductButton = page.getByRole("button", { name: "New Product" });
    this.productCards = page.locator(
      "div.grid > div.rounded-lg.border.border-gray-200"
    );
    this.noProductsMessage = page.getByText("No products found.");
    this.loadingMessage = page.getByText("Loading products");
    this.errorMessage = page.getByText("Failed to load products.");

    this.nameInput = page.locator("#product-name");
    this.categoryInput = page.locator("#product-category");
    this.descriptionInput = page.locator("#product-description");
    this.priceInput = page.locator("#product-price");
    this.submitButton = page.locator(
      'form button[type="submit"]'
    );
  }

  async goto() {
    await this.page.goto("/products");
  }

  async openCreateForm() {
    await this.newProductButton.click();
    await expect(
      this.page.getByRole("heading", { name: "Create Product" })
    ).toBeVisible();
  }

  async fillProductForm(data: {
    name: string;
    category: string;
    description: string;
    price: string;
  }) {
    await this.nameInput.fill(data.name);
    await this.categoryInput.fill(data.category);
    await this.descriptionInput.fill(data.description);
    await this.priceInput.fill(data.price);
  }

  async submitForm() {
    await this.submitButton.click();
  }

  async createProduct(data: {
    name: string;
    category: string;
    description: string;
    price: string;
  }) {
    await this.openCreateForm();
    await this.fillProductForm(data);
    await this.submitForm();
  }

  getProductCard(productName: string): Locator {
    return this.productCards.filter({ hasText: productName });
  }

  getProductLink(productName: string): Locator {
    return this.page.getByRole("link", { name: productName });
  }

  getDeleteButton(productName: string): Locator {
    return this.getProductCard(productName).getByRole("button", {
      name: "Delete",
    });
  }

  async deleteProduct(productName: string) {
    await this.getDeleteButton(productName).click();
  }
}

/** Page object for /products/:id detail view */
export class ProductDetailPage {
  readonly page: Page;

  readonly backLink: Locator;
  readonly productName: Locator;
  readonly category: Locator;
  readonly description: Locator;
  readonly price: Locator;
  readonly stockBadge: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly cancelEditButton: Locator;

  // Edit form (reuses same input IDs as create)
  readonly nameInput: Locator;
  readonly categoryInput: Locator;
  readonly descriptionInput: Locator;
  readonly priceInput: Locator;
  readonly updateButton: Locator;

  // Orders section
  readonly ordersHeading: Locator;
  readonly ordersTable: Locator;
  readonly noOrdersMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.backLink = page.getByRole("link", { name: "Back to Products" });
    this.productName = page.locator("h1.text-2xl.font-bold");
    this.category = page.locator("p.text-sm.text-gray-500").first();
    this.description = page.locator("p.mt-4.text-gray-600");
    this.price = page.locator("span.text-2xl.font-bold");
    this.stockBadge = page.locator("span.rounded-full");
    this.editButton = page.getByRole("button", { name: "Edit" });
    this.deleteButton = page.getByRole("button", { name: "Delete" });
    this.cancelEditButton = page.getByRole("button", { name: "Cancel" });

    this.nameInput = page.locator("#product-name");
    this.categoryInput = page.locator("#product-category");
    this.descriptionInput = page.locator("#product-description");
    this.priceInput = page.locator("#product-price");
    this.updateButton = page.getByRole("button", { name: "Update" });

    this.ordersHeading = page.getByRole("heading", { name: "Orders" });
    this.ordersTable = page.locator("table");
    this.noOrdersMessage = page.getByText("No orders for this product.");
  }

  async editProduct(data: {
    name?: string;
    category?: string;
    description?: string;
    price?: string;
  }) {
    await this.editButton.click();
    await expect(
      this.page.getByRole("heading", { name: "Edit Product" })
    ).toBeVisible();

    if (data.name !== undefined) {
      await this.nameInput.clear();
      await this.nameInput.fill(data.name);
    }
    if (data.category !== undefined) {
      await this.categoryInput.clear();
      await this.categoryInput.fill(data.category);
    }
    if (data.description !== undefined) {
      await this.descriptionInput.clear();
      await this.descriptionInput.fill(data.description);
    }
    if (data.price !== undefined) {
      await this.priceInput.clear();
      await this.priceInput.fill(data.price);
    }

    await this.updateButton.click();
  }
}
