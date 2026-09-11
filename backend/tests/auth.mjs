import assert from 'node:assert/strict';
import { chromium, request, expect } from '@playwright/test';

const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5174';
const credentials = [
  ['admin', process.env.TEST_ADMIN_PASSWORD, 'admin'],
  ['rop', process.env.TEST_ROP_PASSWORD, 'rop'],
];
if (credentials.some(([, password]) => !password)) throw Error('Set TEST_ADMIN_PASSWORD and TEST_ROP_PASSWORD locally.');
const anonymous = await request.newContext({ baseURL });
try {
  assert.equal((await anonymous.get('/api/v1/health')).status(), 200);
  assert.equal((await anonymous.get('/api/v1/health/database')).status(), 401);
  assert.equal((await anonymous.post('/api/v1/auth/login', { data: {} })).status(), 403);
} finally { await anonymous.dispose(); }

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const [username, password, role] of credentials) {
    const context = await browser.newContext({ baseURL });
    try {
      const session = (await (await context.request.get('/api/v1/auth/session')).json()).data;
      const bad = await context.request.post('/api/v1/auth/login', { headers: { 'X-CSRF-Token': session.csrfToken }, data: { username: "' OR 1=1 --", password: 'invalid' } });
      assert.equal(bad.status(), 401);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/login');
      await page.getByLabel('Логин', { exact: true }).fill(username);
      await page.getByLabel('Пароль', { exact: true }).fill(password);
      await page.getByRole('button', { name: 'Войти в систему', exact: true }).click();
      await expect(page).toHaveURL(baseURL + '/');
      await page.reload();
      await expect(page.locator('.sidebar-home')).toBeVisible();
      const auth = (await (await context.request.get('/api/v1/auth/session')).json()).data;
      assert.equal(auth.user.role, role);
      assert.notEqual(auth.csrfToken, session.csrfToken);
      assert.equal((await context.request.post('/api/v1/auth/logout', { data: {} })).status(), 403);
      const cookie = (await context.cookies()).find(item => item.name === 'polytech_session');
      assert.equal(cookie.httpOnly, true);
      assert.equal(cookie.sameSite, 'Lax');
      assert.equal((await context.request.get('/api/v1/health/database')).status(), role === 'admin' ? 200 : 403);
      for (const section of ['directions', 'general']) {
        assert.equal((await context.request.get('/api/v1/oop/' + section)).status(), role === 'admin' ? 501 : 403);
        assert.equal((await context.request.post('/api/v1/oop/' + section, { data: {} })).status(), role === 'admin' ? 501 : 403);
        await page.goto('/oop/data/' + section);
        if (role === 'rop') await expect(page.getByRole('heading', { name: 'Нет доступа' })).toBeVisible();
        else await expect(page.locator('main .module-card')).toHaveCount(6);
      }
      await page.goto('/oop/data');
      await expect(page.locator('main .module-card')).toHaveCount(role === 'admin' ? 3 : 1);
      if (role === 'rop') {
        await expect(page.getByRole('link', { name: 'Исходные для направлений', exact: true })).toHaveCount(0);
        await page.getByRole('combobox', { name: 'Поиск по разделам' }).fill('Матрица УК');
        await expect(page.getByRole('option', { name: /Матрица УК/ })).toHaveCount(0);
      }
      await page.goto('/logout');
      await page.getByRole('button', { name: 'Выйти', exact: true }).click();
      await expect(page).toHaveURL(baseURL + '/login');
      assert.equal((await context.request.get('/api/v1/health/database')).status(), 401);
      assert.equal(errors.length, 0, errors.join(';'));
    } finally { await context.close(); }
  }
  console.log('PASS: real DB login for both roles, reload, logout, CSRF, cookie, SQL injection, direct/API/UI/search restrictions. No DB writes.');
} finally { await browser.close(); }
