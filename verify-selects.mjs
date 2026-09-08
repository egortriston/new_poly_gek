import {chromium,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(8000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5174/login');await page.getByRole('button',{name:'Заполнить данные для входа'}).click();await page.getByRole('button',{name:'Войти в рабочее пространство'}).click();
const year=page.getByRole('combobox',{name:'Год кампании',exact:true});await expect(year).toHaveText('2026/2027');await year.click();await expect(page.getByRole('option')).toHaveCount(2);await page.getByRole('option',{name:'2025/2026',exact:true}).click();await expect(year).toHaveText('2025/2026');
await page.getByRole('link',{name:'Комиссии ГЭК',exact:true}).click();await page.getByRole('link',{name:'Открыть комиссии',exact:true}).click();await expect(page.locator('.commission-link')).toHaveCount(1);
await year.focus();await page.keyboard.press('ArrowDown');await expect(page.getByRole('listbox')).toBeVisible();await page.keyboard.press('End');await expect(page.getByRole('option',{name:'2026/2027',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(year).toHaveText('2026/2027');await expect(page.locator('.commission-link')).toHaveCount(7);
await page.getByRole('combobox',{name:'Фильтр высшей школы'}).click();await page.getByRole('option',{name:'ВШПМ',exact:true}).click();await expect(page.locator('.commission-link')).toHaveCount(2);
await page.getByRole('link',{name:'Создать ГЭК',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
const school=dialog.getByRole('combobox',{name:/Высшая школа/});await school.click();await expect(page.getByRole('listbox')).toBeVisible();await page.screenshot({path:'artifacts/select-modal.png',fullPage:false});await page.getByRole('option',{name:'Высшая школа производственного менеджмента',exact:true}).click();await expect(school).toContainText('Высшая школа производственного менеджмента');
await school.click();await page.keyboard.press('Escape');await expect(page.getByRole('listbox')).toHaveCount(0);await expect(dialog).toBeVisible();await page.getByRole('button',{name:'Закрыть окно',exact:true}).click();
await page.goto('http://127.0.0.1:5174/data/people/chairmen');await page.getByRole('combobox',{name:'Сфера деятельности',exact:true}).click();await page.getByRole('option',{name:'Бизнес',exact:true}).click();await expect(page.locator('.people-table tbody tr')).toHaveCount(1);
await page.setViewportSize({width:390,height:844});await year.click();await expect(page.getByRole('listbox')).toBeVisible();const box=await page.getByRole('listbox').boundingBox();if(box.x<0||box.x+box.width>391)throw Error('Dropdown overflow');await page.screenshot({path:'artifacts/select-mobile.png',fullPage:false});
console.log(JSON.stringify({result:'PASS',errors}));if(errors.length)throw Error(errors.join(';'));
}finally{await browser.close();}
