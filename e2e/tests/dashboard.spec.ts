import { test, expect } from "@playwright/test";
import { DashboardPage } from "../pages/dashboard.page";

test.describe("Dashboard", () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test("should display the dashboard heading", async () => {
    await expect(dashboard.heading).toBeVisible();
  });

  test("should show Service Health section with both services", async () => {
    await expect(dashboard.productServiceCard).toBeVisible();
    await expect(dashboard.orderServiceCard).toBeVisible();
  });

  test("should display service health status badges", async ({ page }) => {
    // Wait for health checks to resolve (UP or DOWN)
    await expect(async () => {
      const badges = page.locator("span.rounded-full");
      const count = await badges.count();
      expect(count).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 15_000 });
  });

  test("should display Overview stats section", async () => {
    await expect(dashboard.totalProducts).toBeVisible();
    await expect(dashboard.totalOrders).toBeVisible();
    await expect(dashboard.inStock).toBeVisible();
    await expect(dashboard.confirmedOrders).toBeVisible();
  });

  test("should link stats cards to correct pages", async ({ page }) => {
    await dashboard.totalProducts.click();
    await expect(page).toHaveURL(/\/products/);

    await page.goto("/");
    dashboard = new DashboardPage(page);

    await dashboard.totalOrders.click();
    await expect(page).toHaveURL(/\/orders/);
  });

  test("should display Recent Orders section", async () => {
    await expect(dashboard.recentOrdersHeading).toBeVisible();
  });

  test("should have View all link to orders page", async ({ page }) => {
    await dashboard.viewAllOrdersLink.click();
    await expect(page).toHaveURL(/\/orders/);
  });
});
