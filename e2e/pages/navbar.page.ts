import { type Page, type Locator } from "@playwright/test";

export class NavbarPage {
  readonly page: Page;
  readonly brand: Locator;
  readonly dashboardLink: Locator;
  readonly productsLink: Locator;
  readonly ordersLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.brand = page.getByText("Bosch Tech");
    this.dashboardLink = page.getByRole("link", { name: "Dashboard" });
    this.productsLink = page.getByRole("link", { name: "Products" });
    this.ordersLink = page.getByRole("link", { name: "Orders" });
  }

  async gotoDashboard() {
    await this.dashboardLink.click();
  }

  async gotoProducts() {
    await this.productsLink.click();
  }

  async gotoOrders() {
    await this.ordersLink.click();
  }
}
