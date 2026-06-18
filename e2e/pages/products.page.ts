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
  readonly stockSelect: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Products" });
    this.newProductButton = page.getByRole("button", { name: "New Product" });
    // Product cards are direct children of the grid container. The rebrand
    // swapped `rounded-lg`/`border-gray-200` for `rounded-xl`/`border-bosch-border`.
    this.productCards = page.locator(
      "div.grid > div.rounded-xl.border.border-bosch-border"
    );
    this.noProductsMessage = page.getByText("No products found.");
    this.loadingMessage = page.getByText("Loading products");
    this.errorMessage = page.getByText("Failed to load products.");

    this.nameInput = page.locator("#product-name");
    this.categoryInput = page.locator("#product-category");
    this.descriptionInput = page.locator("#product-description");
    this.priceInput = page.locator("#product-price");
    this.stockSelect = page.locator("#product-in-stock");
    this.submitButton = page.locator(
      'form button[type="submit"]'
    );
  }

  async goto() {
    // The deployed host returns 404 on direct URL navigation for SPA routes,
    // so always load the dashboard first and then client-side navigate via
    // the navbar.
    //
    // The list GET against the shared backend occasionally flakes, rendering
    // "Failed to load products." with no "New Product" button. Re-navigate
    // from the dashboard a few times so a transient load error self-heals
    // before callers interact with the page.
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await this.page.goto("/");
      await this.page
        .getByRole("navigation")
        .getByRole("link", { name: "Products", exact: true })
        .click();
      await this.page.waitForURL(/\/products$/);

      // Wait until the list view settles into either a ready or error state.
      // The shared backend can be slow to respond (cold starts), so allow
      // generously more than the 5s default before treating it as an error.
      await expect(this.newProductButton.or(this.errorMessage)).toBeVisible({
        timeout: 15_000,
      });

      if (await this.newProductButton.isVisible()) {
        return;
      }
      // Transient "Failed to load products." — retry from the dashboard.
    }

    // Out of attempts: assert the ready state so the failure is explicit.
    await expect(this.newProductButton).toBeVisible({ timeout: 15_000 });
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
    stock?: "In Stock" | "Out of Stock";
  }) {
    await this.nameInput.fill(data.name);
    await this.categoryInput.fill(data.category);
    await this.descriptionInput.fill(data.description);
    await this.priceInput.fill(data.price);
    if (data.stock !== undefined) {
      await this.stockSelect.selectOption({ label: data.stock });
    }
  }

  async submitForm() {
    await this.submitButton.click();
  }

  async createProduct(data: {
    name: string;
    category: string;
    description: string;
    price: string;
    stock?: "In Stock" | "Out of Stock";
  }) {
    await this.openCreateForm();
    await this.fillProductForm(data);
    await this.submitForm();
    // Wait for the create form to close before returning. This confirms the
    // POST completed and the list re-rendered, so callers don't race the
    // backend when asserting on the newly created card.
    await expect(
      this.page.getByRole("heading", { name: "Create Product" })
    ).toBeHidden();
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
  readonly stockSelect: Locator;
  readonly updateButton: Locator;

  // Orders section
  readonly ordersHeading: Locator;
  readonly ordersTable: Locator;
  readonly noOrdersMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.backLink = page.getByRole("link", { name: "Back to Products" });

    // Scope detail-page locators to the detail card (the rounded-xl panel
    // that contains the product's <h1>). This avoids collisions with the
    // product list cards, which share some styling.
    const detailCard = page
      .locator("div.rounded-xl.border.border-bosch-border")
      .filter({ has: page.locator("h1") });

    this.productName = detailCard.locator("h1");
    this.category = detailCard.locator("p.text-bosch-muted").first();
    this.description = detailCard.locator("p.text-bosch-text");
    this.price = detailCard.locator("span.text-bosch-gold").first();
    this.stockBadge = detailCard.locator("span.rounded-full");
    // Edit / Delete / Cancel buttons live inside the detail card.
    this.editButton = detailCard.getByRole("button", { name: "Edit" });
    this.deleteButton = detailCard.getByRole("button", { name: "Delete" });
    this.cancelEditButton = detailCard.getByRole("button", { name: "Cancel" });

    this.nameInput = page.locator("#product-name");
    this.categoryInput = page.locator("#product-category");
    this.descriptionInput = page.locator("#product-description");
    this.priceInput = page.locator("#product-price");
    this.stockSelect = page.locator("#product-in-stock");
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
    stock?: "In Stock" | "Out of Stock";
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
    if (data.stock !== undefined) {
      await this.stockSelect.selectOption({ label: data.stock });
    }

    await this.updateButton.click();
  }
}
