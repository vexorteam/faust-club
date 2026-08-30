import { expect, test } from "@playwright/test";

/** Same name `admin.spec.ts` reads: one variable moves the whole suite. */
const API_URL = process.env.E2E_API_URL ?? "http://localhost:8000";

test("головна показує клуб і веде в меню", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("FAUST");
  await expect(page.getByRole("heading", { name: "Знайти Faust" })).toBeVisible();

  await page.getByRole("link", { name: /меню/i }).first().click();
  await expect(page).toHaveURL(/\/menu$/);
});

test("меню наповнене з API: категорії, ціни, описи фото", async ({ page }) => {
  await page.goto("/menu");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Меню Faust");

  const categories = page.getByRole("heading", { level: 2 });
  await expect(categories.first()).toBeVisible();
  expect(await categories.count()).toBeGreaterThan(0);

  /** A price with no digits means the page rendered a shell without data. */
  await expect(page.getByText(/\d+\s*₴/).first()).toBeVisible();

  /**
   * Nothing announced as an image is left nameless: photos carry the
   * description they were uploaded with, the logo carries its label.
   */
  const content = page.getByRole("main");
  const images = content.getByRole("img");
  const named = content.getByRole("img", { name: /\S/ });

  expect(await named.count()).toBe(await images.count());
});

test("прихована категорія на вітрину не потрапляє", async ({ page, request }) => {
  const menu = await (await request.get(`${API_URL}/api/v1/menu`)).json();
  const published: string[] = menu.categories.map((category: { label: string }) => category.label);

  await page.goto("/menu");

  const shown = await page.getByRole("heading", { level: 2 }).allTextContents();

  expect(shown.map((text) => text.trim())).toEqual(published);
});
