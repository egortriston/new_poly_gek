import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5174', viewport: { width: 1440, height: 1000 } });
  const request = context.request;
  assert.equal((await request.get('/api/v1/ac/context')).status(), 401);
  const session = (await (await request.get('/api/v1/auth/session')).json()).data;
  const login = await request.post('/api/v1/auth/login', { headers: { 'X-CSRF-Token': session.csrfToken }, data: { username: 'admin', password: process.env.TEST_ADMIN_PASSWORD } });
  assert.equal(login.status(), 200);
  const csrf = (await login.json()).data.csrfToken;
  assert.equal((await request.post('/api/v1/ac/save', { data: {} })).status(), 403);
  const response = await request.get('/api/v1/ac/context');
  assert.equal(response.status(), 200);
  const data = (await response.json()).data;
  assert.ok(data.records.length > 0);
  assert.ok(data.records.every(r => r.kind === 'ac' && r.version));
  const first = data.records[0];
  for (const [name, args] of Object.entries({ order: {}, memo: { school: first.school }, table: { tableOnly: true, ids: [first.id] } })) {
    const result = await request.post('/api/v1/ac/print', { headers: { 'X-CSRF-Token': csrf }, data: { ...args, academicYear: '2026/2027' } });
    assert.equal(result.status(), 200, `Print ${name}`);
    const pdf = Buffer.from((await result.json()).data.pdf, 'base64');
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    await writeFile(`backend/var/print-tests/ac-${name}.pdf`, pdf);
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/attestation/ac');
  await page.getByRole('heading', { name: 'Аттестационные комиссии', exact: true }).waitFor();
  await page.getByRole('link', { name: 'Открыть комиссии', exact: true }).click();
  await page.locator('.att-commission-link').first().click();
  const chair = data.catalog.teachers.find(t => t.id_teacher === first.chairman);
  await page.getByRole('heading', { name: chair.name_teacher, exact: true }).waitFor();
  assert.equal(await page.getByText('Персональные сведения будут подключены из БД').count(), 0);
  await page.getByRole('tab', { name: 'Программы', exact: true }).click();
  await page.getByRole('heading', { name: /Направления подготовки/ }).waitFor();
  await page.goto('/attestation/ac/documents');
  await page.getByRole('button', { name: 'Заполнить титульный лист распоряжения для аттестационных комиссий', exact: true }).click();
  await page.locator('#spo-cover input[type=date]').waitFor();
  assert.ok(await page.locator('#spo-cover input[type=date]').inputValue());
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await page.getByRole('button', { name: 'Печать распоряжения для аттестационных комиссий', exact: true }).click();
  await page.getByRole('link', { name: 'Скачать PDF' }).waitFor({ timeout: 30000 });
  await page.getByRole('button', { name: 'Закрыть', exact: true }).last().click();
  await page.goto('/attestation/ac/commissions');
  await page.locator('.commissions-table').waitFor();
  await page.screenshot({ path: 'backend/var/print-tests/ac-ui.png', fullPage: true });
  const search=page.getByRole('textbox',{name:'Поиск комиссий'});
  await search.fill('несуществующая комиссия');
  await page.getByText('Комиссии не найдены',{exact:true}).waitFor();
  await search.fill('');
  await page.getByRole('button',{name:'Создать комиссию',exact:true}).click();
  await page.getByRole('textbox',{name:'Номер комиссии',exact:true}).waitFor();
  await page.getByRole('button',{name:'Отмена',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'backend/var/print-tests/ac-mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),'Mobile page fits viewport');
  assert.deepEqual(errors, []);
  console.log('PASS: auth, CSRF, real AC data, all 3 PDF modes, editor, cover form, PDF preview. No business data changed.');
} catch (error) {
  console.error('AC browser check failed:', error.message.split('\n')[0]);
  process.exitCode = 1;
} finally { await browser.close(); }
