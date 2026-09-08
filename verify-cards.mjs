import {chromium} from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(8000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5174/login');await page.getByRole('button',{name:'Заполнить данные для входа'}).click();await page.getByRole('button',{name:'Войти в рабочее пространство'}).click();
await page.goto('http://127.0.0.1:5174/commissions/gek-01?tab=chairman');
if(await page.locator('.profile-form input').count())throw Error('Duplicate editor remains');
if(await page.getByRole('tab',{name:'Председатель',exact:true}).count())throw Error('Chairman tab remains');
if(await page.getByRole('button',{name:'Карточка',exact:true}).count())throw Error('Card link remains');
await page.getByRole('button',{name:'Изменить: председатель',exact:true}).click();
await page.getByRole('dialog').waitFor();
await page.getByRole('button',{name:'Закрыть окно',exact:true}).click();
await page.goto('http://127.0.0.1:5174/data/people/chairmen?person=e1');
await page.getByRole('heading',{name:'Профессиональная карточка',exact:true}).waitFor();
await page.getByLabel('Кандидат является',{exact:true}).waitFor();
if(await page.getByLabel('Публикации по программе',{exact:true}).count())throw Error('Mixed sphere fields');
await page.getByLabel('Учебное заведение',{exact:true}).fill('Тестовый университет');
await page.getByRole('button',{name:'Сохранить',exact:true}).click();await page.reload();
if(await page.getByLabel('Учебное заведение',{exact:true}).inputValue()!=='Тестовый университет')throw Error('Not persisted');
await page.screenshot({path:'artifacts/chairman-card.png',fullPage:true});
await page.getByLabel('Учебное заведение',{exact:true}).fill('Не сохранять');
await page.getByRole('link',{name:'Главная',exact:true}).click();
await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Отмена',exact:true}).click();
await page.getByRole('button',{name:'Отменить изменения',exact:true}).click();
await page.getByRole('link',{name:'Председатели комплексных ГЭК',exact:true}).click();
await page.getByRole('row').filter({hasText:'Кузнецова'}).getByRole('button',{name:'Открыть',exact:true}).click();
await page.getByLabel('Публикации по программе',{exact:true}).waitFor();
if(await page.getByRole('checkbox').count()!==4)throw Error('Missing schools');
await page.setViewportSize({width:390,height:844});
if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Overflow');
await page.screenshot({path:'artifacts/chairman-mobile.png',fullPage:true});
console.log(JSON.stringify({result:'PASS',errors}));
} finally {await browser.close();}

