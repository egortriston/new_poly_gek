import { chromium, expect } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
 const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
 page.setDefaultTimeout(8000);
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 await page.goto('http://127.0.0.1:5174/login');
 await page.getByRole('button', { name: 'Заполнить данные для входа' }).click();
 await page.getByRole('button', { name: 'Войти в систему', exact: true }).click();
 await page.goto('http://127.0.0.1:5174/attestation');
 await expect(page.locator('.module-card')).toHaveCount(3);
 for (const kind of ['spo', 'ac', 'ppa']) {
  await page.goto(`http://127.0.0.1:5174/attestation/${kind}`);
  await page.getByRole('combobox', { name: 'Высшая школа', exact: true }).click();
  await page.getByRole('option', { name: 'Высшая школа производственного менеджмента', exact: true }).click();
  await page.getByRole('button', { name: 'Добавить', exact: true }).click();
  await page.getByRole('textbox', { name: 'Номер комиссии', exact: true }).fill('019');
  const dialog = page.getByRole('dialog');
  if (kind === 'ppa') {
   await dialog.getByRole('combobox', { name: 'Председатель', exact: true }).click();
   await page.getByRole('option', { name: 'Лебедева Анна Олеговна', exact: true }).click();
   await expect(dialog.getByRole('group', { name: /Дисциплины/ })).toBeVisible();
  } else await expect(dialog.getByLabel('Председатель', { exact: false }).first()).toHaveAttribute('readonly', '');
  await dialog.getByRole('group', { name: /Направления подготовки/ }).getByRole('checkbox').first().check();
  await dialog.getByRole('group', { name: /Образовательные программы/ }).getByRole('checkbox').first().check();
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Изменить комиссию 019', exact: true })).toBeVisible();
 }
 await page.getByRole('button', { name: 'Изменения и дополнения', exact: true }).click();
 await expect(page.getByRole('button', { name: 'Изменить комиссию 019', exact: true })).toHaveCount(0);
 await page.getByRole('button', { name: 'Добавить', exact: true }).click();
 await page.getByRole('dialog').getByRole('button', { name: 'Сохранить', exact: true }).click();
 await page.getByRole('button', { name: 'Формирование и печать', exact: true }).click();
 await expect(page.locator('.att-document')).toHaveCount(4);
 await page.locator('.att-document').last().getByRole('button', { name: 'Титульный лист' }).click();
 await page.getByRole('textbox', { name: 'Номер документа', exact: true }).fill('ТЕСТ-42');
 await page.getByRole('dialog').getByRole('button', { name: 'Сохранить', exact: true }).click();
 await page.reload();
 await page.locator('.att-document').last().getByRole('button', { name: 'Печать', exact: true }).click();
 await expect(page.getByRole('dialog')).toContainText('ТЕСТ-42');
 await page.getByRole('button', { name: 'Закрыть окно', exact: true }).click();
 await page.goto('http://127.0.0.1:5174/attestation/ac');
 await expect(page.getByRole('button', { name: 'Удалить комиссию 002', exact: true })).toBeDisabled();
 await page.getByRole('button', { name: 'Удалить комиссию 019', exact: true }).click();
 await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click();
 await expect(page.getByRole('button', { name: 'Изменить комиссию 019', exact: true })).toHaveCount(0);
 await page.goto('http://127.0.0.1:5174/attestation');
 await page.screenshot({path:'artifacts/attestation-hub.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await expect(page.locator('.module-card').first()).toBeVisible();
 if(errors.length) throw Error(errors.join(';'));
 console.log('PASS: three types, forms, reload, PPA amendment isolation, cover persistence and preview, protected commissions, delete, mobile hub');
} finally { await browser.close(); }
