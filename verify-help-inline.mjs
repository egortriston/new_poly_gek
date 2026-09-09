import {chromium,expect} from '@playwright/test';
const b=await chromium.launch({channel:'msedge',headless:true});try{
const p=await b.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
await p.goto('http://127.0.0.1:5174/login');await p.getByRole('button',{name:'Заполнить данные для входа'}).click();await p.getByRole('button',{name:'Войти в систему',exact:true}).click();
for(const route of ['/','/oop/status','/commissions','/archive','/data/catalog/programs']){
await p.goto('http://127.0.0.1:5174'+route);await expect(p.locator('.page-title-help').first()).toBeVisible();await expect(p.locator('.section-help-bar')).toHaveCount(0);}
await p.goto('http://127.0.0.1:5174/oop/status');await p.locator('.page-title-help').click();await expect(p.getByRole('dialog')).toBeVisible();await p.keyboard.press('Escape');await p.screenshot({path:'artifacts/help-inline.png'});await p.getByRole('link',{name:'На главную',exact:true}).click();await expect(p).toHaveURL('http://127.0.0.1:5174/');await expect(p.getByRole('navigation',{name:'Основная навигация'}).getByRole('link',{name:'Главная',exact:true})).toHaveCount(0);console.log('PASS: shared help, modal, logo navigation and removed menu item');
}finally{await b.close();}
