import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:5174";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const username of ["admin", "rop"]) {
    const password =
      process.env[
        username === "admin" ? "TEST_ADMIN_PASSWORD" : "TEST_ROP_PASSWORD"
      ];
    if (!password) throw Error("Set test credentials locally");
    const context = await browser.newContext({ baseURL });
    const session = (
      await (await context.request.get("/api/v1/auth/session")).json()
    ).data;
    const login = await context.request.post("/api/v1/auth/login", {
      headers: { "X-CSRF-Token": session.csrfToken },
      data: { username, password },
    });
    assert.equal(login.status(), 200);
    const catalogResponse = await context.request.get("/api/v1/catalog");
    assert.equal(catalogResponse.status(), 200);
    const catalog = (await catalogResponse.json()).data;
    const peopleResponse = await context.request.get("/api/v1/people");
    assert.equal(peopleResponse.status(), 200);
    const people = (await peopleResponse.json()).data;
    assert.equal(
      (
        await context.request.post("/api/v1/catalog/schools/save", { data: {} })
      ).status(),
      403,
    );
    const auth = (await login.json()).data;
    const invalid = await context.request.post("/api/v1/catalog/schools/save", {
      headers: { "X-CSRF-Token": auth.csrfToken },
      data: {},
    });
    assert.equal(invalid.status(), 422);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const kind of [
      "schools",
      "teachers",
      "directions",
      "programs",
      "disciplines",
    ]) {
      await page.goto("/data/catalog/" + kind);
      await expect(
        page.getByText("Всего записей: " + catalog[kind].length, {
          exact: true,
        }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Добавить", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      if (kind === "teachers")
        await expect(
          page.getByLabel("Табельный номер", { exact: true }),
        ).toBeVisible();
      await page.getByRole("button", { name: "Отмена", exact: true }).click();
    }
    if (username === "admin" && people.entries.external.length) {
      await page.goto("/data/people/external");
      await page
        .locator(".people-table tbody tr[data-index]")
        .first()
        .getByRole("button", { name: /Изменить/ })
        .click();
      await page
        .getByLabel("Организация", { exact: true })
        .fill("Несохранённая проверка");
      await page.route("**/api/v1/people/external/save", (route) =>
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "STALE_RECORD",
              message: "Запись уже изменена. Обновите таблицу.",
            },
          }),
        }),
      );
      await page
        .getByRole("button", { name: "Сохранить", exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText(
        "Запись уже изменена",
      );
      await expect(page.getByLabel("Организация", { exact: true })).toHaveValue(
        "Несохранённая проверка",
      );
      await page.getByRole("button", { name: "Отмена", exact: true }).click();
      await page.unroute("**/api/v1/people/external/save");
      await page.route("**/api/v1/catalog/schools/list**", (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "DATABASE_UNAVAILABLE",
              message: "База данных временно недоступна.",
            },
          }),
        }),
      );
      await page.goto("/data/catalog/schools");
      await expect(
        page.getByText("База данных временно недоступна.", { exact: true }),
      ).toBeVisible();
      await expect(
        page.locator(".people-table tbody tr[data-index]"),
      ).toHaveCount(0);
      await page.unroute("**/api/v1/catalog/schools/list**");
    }
    for (const category of ["external", "chairmen", "complex"]) {
      await page.goto("/data/people/" + category);
      await expect(
        page.getByText("Всего записей: " + people.entries[category].length, {
          exact: true,
        }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Добавить", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Отмена", exact: true }).click();
      const sample = people.entries[category][0];
      if (sample) {
        await page
          .locator(".people-table tbody tr[data-index]")
          .first()
          .getByRole("button", { name: /Изменить/ })
          .click();
        if (category === "external") {
          await expect(page.getByRole("dialog")).toBeVisible();
          await page
            .getByRole("button", { name: "Отмена", exact: true })
            .click();
        } else {
          await expect(
            page.getByRole("heading", {
              name: "Карточка председателя",
              exact: true,
            }),
          ).toBeVisible();
          await expect(
            page.getByLabel("Учебное заведение", { exact: true }),
          ).toHaveValue(sample.values.university);
          await expect(
            page.getByLabel(
              sample.sphere === "Образование"
                ? "Публикации по программе"
                : "Вид деятельности",
              { exact: true },
            ),
          ).toBeVisible();
          await page.reload();
          await expect(
            page.getByRole("heading", {
              name: "Карточка председателя",
              exact: true,
            }),
          ).toBeVisible();
        }
      }
    }
    assert.equal(errors.length, 0, errors.join(";"));
    await context.close();
  }
  console.log(
    "PASS: both roles, five DB catalogs, three people tables, forms, card reload, sphere fields, CSRF. No DB writes.",
  );
} finally {
  await browser.close();
}
