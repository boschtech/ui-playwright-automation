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
    await page.goto("/");
    const navbar = new NavbarPage(page);

    // Navigate away from dashboard first, then back.
    await navbar.gotoProducts();
    await navbar.gotoDashboard();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
  });

  test("should highlight active nav link", async ({ page }) => {
    await page.goto("/");
    const navbar = new NavbarPage(page);
    await navbar.gotoProducts();

    // The active nav link exposes `aria-current="page"` (React Router NavLink).
    // Assert on that rather than a visual class which may change with themes.
    await expect(navbar.productsLink).toHaveAttribute("aria-current", "page");
    await expect(navbar.ordersLink).not.toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  test("should navigate through all routes via the navbar", async ({
    page,
  }) => {
    await page.goto("/");
    const navbar = new NavbarPage(page);

    await navbar.gotoProducts();
    await expect(
      page.getByRole("heading", { name: "Products" })
    ).toBeVisible();

    await navbar.gotoOrders();
    await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();

    await page.getByRole("link", { name: "New Order" }).click();
    await expect(page).toHaveURL(/\/orders\/new$/);
    await expect(
      page.getByRole("heading", { name: "Create Order" })
    ).toBeVisible();
  });
});
