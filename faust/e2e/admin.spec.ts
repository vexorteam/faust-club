import { expect, test, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const API_URL = process.env.E2E_API_URL ?? "http://localhost:8000";

const credentials = () => {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "Немає E2E_ADMIN_EMAIL і E2E_ADMIN_PASSWORD. Це той самий адмін, якого налив " +
        "`python -m faust_api.seed` — задайте змінні перед запуском.",
    );
  }

  return { email: EMAIL, password: PASSWORD };
};

const signIn = async (page: Page) => {
  const { email, password } = credentials();

  await page.goto("/admin/login");
  await page.getByLabel("Пошта").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Увійти" }).click();

  await expect(page).toHaveURL(/\/admin$/);
};

test("без сесії адмінка не відкривається", async ({ page }) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "Вхід" })).toBeVisible();
});

test("невірний пароль не підказує, чи існує така пошта", async ({ page }) => {
  const { email } = credentials();

  await page.goto("/admin/login");
  await page.getByLabel("Пошта").fill(email);
  await page.getByLabel("Пароль").fill("definitely-not-the-password");
  await page.getByRole("button", { name: "Увійти" }).click();

  await expect(page.getByText("Невірна пошта або пароль")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("зміна ціни в адмінці доїжджає до вітрини", async ({ page, request }) => {
  await signIn(page);

  const menu = await (await request.get(`${API_URL}/api/v1/menu`)).json();
  const item = menu.categories.flatMap((category: { items: unknown[] }) => category.items)[0] as {
    id: string;
    name: string;
    price: number;
  };

  expect(item, "у меню немає жодної позиції — засійте базу перед запуском").toBeTruthy();

  const changed = item.price === 999 ? 998 : 999;

  await page.goto(`/admin/items/${item.id}`);
  await page.getByLabel("Ціна, ₴").fill(String(changed));
  await page.getByRole("button", { name: "Зберегти" }).click();
  await expect(page.getByText("Збережено")).toBeVisible();

  /** The API fires the revalidation webhook itself — the showcase must catch up. */
  await page.goto("/menu");
  await expect(page.getByText(new RegExp(`${changed}\\s*₴`)).first()).toBeVisible();

  await page.goto(`/admin/items/${item.id}`);
  await page.getByLabel("Ціна, ₴").fill(String(item.price));
  await page.getByRole("button", { name: "Зберегти" }).click();
  await expect(page.getByText("Збережено")).toBeVisible();
});
