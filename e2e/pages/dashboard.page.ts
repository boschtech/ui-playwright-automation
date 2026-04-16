import { type Page, type Locator } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;

  // Service health
  readonly productServiceCard: Locator;
  readonly orderServiceCard: Locator;

  // Stats
  readonly totalProducts: Locator;
  readonly totalOrders: Locator;
  readonly inStock: Locator;
  readonly confirmedOrders: Locator;

  // Recent orders
  readonly recentOrdersHeading: Locator;
  readonly recentOrdersTable: Locator;
  readonly viewAllOrdersLink: Locator;
  readonly noOrdersMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Dashboard" });

    this.productServiceCard = page
      .locator("div")
      .filter({ hasText: "Product Service" })
      .first();
    this.orderServiceCard = page
      .locator("div")
      .filter({ hasText: "Order Service" })
      .first();

    this.totalProducts = page
      .locator("a")
      .filter({ hasText: "Total Products" });
    this.totalOrders = page.locator("a").filter({ hasText: "Total Orders" });
    this.inStock = page.locator("a").filter({ hasText: "In Stock" });
    this.confirmedOrders = page
      .locator("a")
      .filter({ hasText: "Confirmed Orders" });

    this.recentOrdersHeading = page.getByRole("heading", {
      name: "Recent Orders",
    });
    this.recentOrdersTable = page.locator("section").last().locator("table");
    this.viewAllOrdersLink = page.getByRole("link", { name: "View all" });
    this.noOrdersMessage = page.getByText("No orders yet.");
  }

  async goto() {
    await this.page.goto("/");
  }
}
