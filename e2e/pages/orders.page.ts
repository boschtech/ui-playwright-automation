import { type Page, type Locator } from "@playwright/test";

export class OrdersPage {
  readonly page: Page;

  // List view
  readonly heading: Locator;
  readonly newOrderButton: Locator;
  readonly ordersTable: Locator;
  readonly orderRows: Locator;
  readonly noOrdersMessage: Locator;
  readonly loadingMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Orders" });
    this.newOrderButton = page.getByRole("link", { name: "New Order" });
    this.ordersTable = page.locator("table");
    this.orderRows = page.locator("tbody tr");
    this.noOrdersMessage = page.getByText("No orders found.");
    this.loadingMessage = page.getByText("Loading orders");
    this.errorMessage = page.getByText("Failed to load orders.");
  }

  async goto() {
    await this.page.goto("/orders");
  }

  async gotoCreateOrder() {
    await this.newOrderButton.click();
  }
}

/** Page object for /orders/new */
export class CreateOrderPage {
  readonly page: Page;

  readonly heading: Locator;
  readonly backLink: Locator;
  readonly productSelect: Locator;
  readonly quantityInput: Locator;
  readonly estimatedTotal: Locator;
  readonly placeOrderButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Create Order" });
    this.backLink = page.getByRole("link", { name: "Back to Orders" });
    this.productSelect = page.locator("#order-product");
    this.quantityInput = page.locator("#order-quantity");
    this.estimatedTotal = page.getByText("Estimated total:");
    this.placeOrderButton = page.getByRole("button", {
      name: "Place Order",
    });
    this.errorMessage = page.getByText("Failed to create order.");
  }

  async goto() {
    await this.page.goto("/orders/new");
  }

  async selectProduct(productName: string) {
    // Find the option whose text contains the product name
    const option = this.page.locator("#order-product option", {
      hasText: productName,
    });
    const value = await option.getAttribute("value");
    await this.productSelect.selectOption(value!);
  }

  async setQuantity(quantity: string) {
    await this.quantityInput.clear();
    await this.quantityInput.fill(quantity);
  }

  async placeOrder(productName: string, quantity: string) {
    await this.selectProduct(productName);
    await this.setQuantity(quantity);
    await this.placeOrderButton.click();
  }
}
