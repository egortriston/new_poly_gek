import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:5174";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext({ baseURL });
  const session = (
    await (await context.request.get("/api/v1/auth/session")).json()
  ).data;
  const login = await context.request.post("/api/v1/auth/login", {
    headers: { "X-CSRF-Token": session.csrfToken },
    data: { username: "admin", password: process.env.TEST_ADMIN_PASSWORD },
  });
  assert.equal(login.status(), 200);
  const actual = (
    await (await context.request.get("/api/v1/catalog/disciplines/list")).json()
  ).data;
  assert.equal(actual.items.length, Math.min(50, actual.total));
  if (actual.nextCursor) {
    const next = (
      await (
        await context.request.get(
          "/api/v1/catalog/disciplines/list?cursor=" +
            encodeURIComponent(actual.nextCursor),
        )
      ).json()
    ).data;
    assert.equal(next.total, actual.total);
    assert.equal(
      new Set([...actual.items, ...next.items].map((r) => r.id_discipline))
        .size,
      actual.items.length + next.items.length,
    );
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const requests = [];
  page.on("request", (request) =>
    requests.push(new URL(request.url()).pathname),
  );
  const records = Array.from({ length: 160 }, (_, i) => ({
    id_discipline: String(i + 1),
    id_school: "1",
    id_level: "1",
    name_discipline:
      i === 159 ? "Последняя дисциплина" : "Дисциплина " + (i + 1),
    _school: "Тестовая школа",
    _level: "Бакалавриат",
    version: "test",
  }));
  let batches = 0,
    failMore = true,
    failReload = false;
  await page.route("**/api/v1/catalog/disciplines/list**", async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q") || "";
    const offset = Number(url.searchParams.get("cursor") || 0);
    if (failReload) {
      failReload = false;
      await route.fulfill({
        status: 503,
        json: { error: { message: "Проверка обновления" } },
      });
      return;
    }
    if (offset && failMore) {
      failMore = false;
      await route.fulfill({
        status: 503,
        json: { error: { message: "Проверка повторной загрузки" } },
      });
      return;
    }
    if (q === "медленно")
      await new Promise((resolve) => setTimeout(resolve, 600));
    const filtered = records.filter((r) =>
      r.name_discipline.toLowerCase().includes(q.toLowerCase()),
    );
    batches++;
    await route.fulfill({
      json: {
        data: {
          items: filtered.slice(offset, offset + 50),
          total: filtered.length,
          nextCursor:
            offset + 50 < filtered.length ? String(offset + 50) : null,
        },
      },
    });
  });
  await page.goto("/data/catalog/disciplines");
  await expect(
    page.getByText("Всего записей: 160", { exact: true }),
  ).toBeVisible();
  assert.ok(
    (await page.locator("tbody tr[data-index]").count()) < 40,
    "DOM is virtualized",
  );
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole("alert")).toContainText(
    "Проверка повторной загрузки",
  );
  assert.ok(
    (await page.locator("tbody tr[data-index]").count()) > 0,
    "Loaded rows survive errors",
  );
  await page
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect.poll(() => batches).toBeGreaterThan(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(200);
  }
  await expect(
    page.getByText("Последняя дисциплина", { exact: true }),
  ).toBeVisible();
  assert.ok(
    (await page.locator("tbody tr[data-index]").count()) < 40,
    "DOM remains bounded at the end of the list",
  );
  const search = page.getByRole("textbox", {
    name: "Поиск в таблице",
    exact: true,
  });
  await search.fill("медленно");
  await page.waitForTimeout(300);
  await search.fill("Последняя");
  await expect(
    page.getByText("Всего записей: 1", { exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(750);
  await expect(
    page.getByText("Последняя дисциплина", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr[data-index]")).toHaveCount(1);
  failReload = true;
  await page
    .getByRole("button", { name: "Обновить таблицу", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Проверка обновления");
  await page
    .getByRole("button", { name: "Повторить загрузку", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByText("Всего записей: 1", { exact: true }),
  ).toBeVisible();
  await search.fill("");
  await expect(
    page.getByText("Всего записей: 160", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1100, height: 720 });
  await page.screenshot({ path: "artifacts/progressive-table.png" });
  await page.goto("/data/people/complex");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  let optionBatches = 0;
  await page.route("**/api/v1/options/people**", (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q") || "",
      id = url.searchParams.get("id");
    const options = records
      .map((r) => ({
        value: "member:" + r.id_discipline,
        label:
          r.id_discipline === "160"
            ? "Последний участник"
            : "Тестовый участник " + r.id_discipline,
      }))
      .filter(
        (o) =>
          (!id || o.value === id) &&
          o.label.toLowerCase().includes(q.toLowerCase()),
      );
    const offset = Number(url.searchParams.get("cursor") || 0);
    optionBatches++;
    return route.fulfill({
      json: {
        data: {
          items: options.slice(offset, offset + 50),
          total: options.length,
          nextCursor: offset + 50 < options.length ? String(offset + 50) : null,
        },
      },
    });
  });
  await page
    .getByRole("combobox", { name: "Председатель", exact: true })
    .click();
  await expect(page.getByRole("option").first()).toBeVisible();
  assert.ok(
    (await page.getByRole("option").count()) < 30,
    "Options are virtualized",
  );
  await page
    .getByRole("listbox", { name: "Председатель", exact: true })
    .evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
  await expect.poll(() => optionBatches).toBeGreaterThan(1);
  await page
    .getByRole("combobox", { name: "Поиск вариантов", exact: true })
    .fill("Последний");
  await expect(
    page.getByRole("option", { name: "Последний участник", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("option", { name: "Последний участник", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Председатель", exact: true }),
  ).toContainText("Последний участник");
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  const chairs = (
    await (await context.request.get("/api/v1/people/chairmen/list")).json()
  ).data;
  if (chairs.nextCursor) {
    const tail = (
      await (
        await context.request.get(
          "/api/v1/people/chairmen/list?cursor=" +
            encodeURIComponent(chairs.nextCursor),
        )
      ).json()
    ).data;
    await page.goto("/data/people/chairmen?card=" + tail.items.at(-1).id);
    await expect(
      page.getByRole("heading", { name: "Карточка председателя", exact: true }),
    ).toBeVisible();
  }
  assert.ok(
    !requests.includes("/api/v1/catalog") &&
      !requests.includes("/api/v1/people"),
    "UI never loads entire snapshots",
  );
  assert.equal(errors.length, 0, errors.join(";"));
  await context.close();
  console.log(
    "PASS: real bounded API, totals, virtual rows, incremental scrolling, retry, stale search, full search, virtual remote options and selected label. No DB writes.",
  );
} finally {
  await browser.close();
}
