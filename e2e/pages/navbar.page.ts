import { type Page, type Locator } from "@playwright/test";

export class NavbarPage {
  readonly page: Page;
  readonly nav: Locator;
  readonly brand: Locator;
  readonly dashboardLink: Locator;
  readonly productsLink: Locator;
  readonly ordersLink: Locator;

  constructor(page: Page) {
    this.page = page;
    // Scope navbar link lookups to the <nav> element so they don't collide
    // with links on the page that share a substring (e.g. "Total Products",
    // "Total Orders", "Confirmed Orders").
    this.nav = page.getByRole("navigation");
    // The brand is an <a aria-label="Bosch Tech"> containing a logo <img>.
    // The visible <span>Bosch Tech</span> is `sr-only`, so match via the
    // accessible role/name instead of plain text for visibility checks.
    this.brand = this.nav.getByRole("link", { name: "Bosch Tech" });
    this.dashboardLink = this.nav.getByRole("link", {
      name: "Dashboard",
      exact: true,
    });
    this.productsLink = this.nav.getByRole("link", {
      name: "Products",
      exact: true,
    });
    this.ordersLink = this.nav.getByRole("link", {
      name: "Orders",
      exact: true,
    });
  }

  async gotoDashboard() {
    await this.dashboardLink.click();
    await this.page.waitForURL(/\/$/);
  }

  async gotoProducts() {
    await this.productsLink.click();
    await this.page.waitForURL(/\/products$/);
  }

  async gotoOrders() {
    await this.ordersLink.click();
    await this.page.waitForURL(/\/orders$/);
  }
}
