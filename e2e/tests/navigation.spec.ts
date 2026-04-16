import { test, expect } from "@playwright/test";
import { NavbarPage } from "../pages/navbar.page";

test.describe("Navigation & Layout", () => {
  test("should display the navbar with brand and links", async ({ page }) => {
    await page.goto("/");
    const navbar = new NavbarPage(page);

    await expect(navbar.brand).toBeVisible();
    await expect(navbar.dashboardLink).toBeVisible();
    await expect(navbar.productsLink).toBeVisible();
    await expect(navbar.ordersLink).toBeVisible();
  });

  test("should navigate to Products page", async ({ page }) => {
    await page.goto("/");
    const navbar = new NavbarPage(page);

    await navbar.gotoProducts();
    await expect(page).toHaveURL(/\/products$/);
    await expect(
      page.getByRole("heading", { name: "Products" })
    ).toBeVisible();
  });

  test("should navigate to Orders page", async ({ page }) => {
    await page.goto("/");
    const navbar = new NavbarPage(page);

    await navbar.gotoOrders();
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  });

  test("should navigate back to Dashboard", async ({ page }) => {
    await page.goto("/products");
    const navbar = new NavbarPage(page);

    await navbar.gotoDashboard();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
  });

  test("should highlight active nav link", async ({ page }) => {
    await page.goto("/products");
    const navbar = new NavbarPage(page);

    await expect(navbar.productsLink).toHaveClass(/text-indigo-600/);
    await expect(navbar.ordersLink).not.toHaveClass(/text-indigo-600/);
  });

  test("should handle direct URL navigation for all routes", async ({
    page,
  }) => {
    await page.goto("/products");
    await expect(
      page.getByRole("heading", { name: "Products" })
    ).toBeVisible();

    await page.goto("/orders");
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();

    await page.goto("/orders/new");
    await expect(
      page.getByRole("heading", { name: "Create Order" })
    ).toBeVisible();
  });
});
