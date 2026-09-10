import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5174/login');
  await page.getByRole('button', { name: 'Заполнить данные для входа' }).click();
  await page.getByRole('button', { name: 'Войти в систему', exact: true }).click();
  await page.goto('http://127.0.0.1:5174/oop/data');
  await page.locator('.module-card').filter({ hasText: 'Общие исходные данные всех образовательных программ' }).click();
  await expect(page.locator('main .module-card')).toHaveCount(6);
  await expect(page.locator('main').getByRole('combobox')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/oop-general-hub.png' });
  for (const kind of ['areas', 'types', 'standards', 'uk']) {
    await page.goto('http://127.0.0.1:5174/oop/data/general/' + kind + (kind === 'uk' ? '?level=1' : ''));
    await page.getByRole('button', { name: 'Добавить', exact: true }).click();
    const fields = page.getByRole('dialog').locator('textarea');
    for (let i = 0; i < await fields.count(); i++) await fields.nth(i).fill('Проверка ' + kind + ' ' + i);
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await page.reload();
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: /Изменить запись/ }).click();
    await page.getByRole('dialog').locator('textarea').first().fill('Изменённая запись');
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(page.locator('tbody')).toContainText('Изменённая запись');
    await page.getByRole('textbox', { name: 'Поиск в таблице' }).fill('нет результата');
    await expect(page.locator('tbody tr')).toHaveCount(0);
    await page.getByRole('textbox', { name: 'Поиск в таблице' }).fill('');
    if (kind === 'uk') {
      await page.screenshot({ path: 'artifacts/oop-general-uk.png' });
      await page.getByRole('combobox', { name: 'Фильтр уровня обучения' }).click();
      await page.getByRole('option', { name: 'Магистратура', exact: true }).click();
      await expect(page.locator('tbody tr')).toHaveCount(0);
      await page.getByRole('button', { name: 'Сбросить фильтры' }).click();
    }
    await page.getByRole('button', { name: /Удалить запись/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click();
    await expect(page.locator('tbody tr')).toHaveCount(0);
  }
  await page.goto('http://127.0.0.1:5174/oop/data/general');
  await page.locator('.module-card').filter({ hasText: 'Направления подготовки' }).click();
  await expect(page).toHaveURL(/data\/catalog\/directions$/);
  await page.goBack();
  await page.locator('.module-card').filter({ hasText: 'Образовательные программы' }).click();
  await expect(page).toHaveURL(/data\/catalog\/programs$/);
  await page.goto('http://127.0.0.1:5174/oop/data/general/uk');
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Mobile overflow');
  if (errors.length) throw Error(errors.join(';'));
  console.log('PASS: six cards, four CRUD tables, persistence, search, level filter, shared catalog links, mobile');
} finally { await browser.close(); }
