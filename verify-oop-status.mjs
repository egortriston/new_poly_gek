import {chromium,expect} from '@playwright/test';
const b=await chromium.launch({channel:'msedge',headless:true});try{
const p=await b.newPage({viewport:{width:1600,height:1100},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:5174/login');await p.getByRole('button',{name:'Заполнить данные для входа'}).click();await p.getByRole('button',{name:'Войти в систему',exact:true}).click();
await p.evaluate(()=>localStorage.setItem('polytech-oop-form-1',JSON.stringify({values:{},forms:['очная'],tables:{},display84:true,status:'Утверждён'})));
await p.goto('http://127.0.0.1:5174/oop/status');await expect(p.locator('tbody tr')).toHaveCount(8);await expect(p.locator('tbody tr').filter({hasText:'38.03.02.01'})).toContainText('Утверждён');
await p.screenshot({path:'artifacts/oop-status-desktop.png'});
await p.getByRole('button',{name:/^Утверждён/}).click();await expect(p.locator('tbody tr')).toHaveCount(1);
await p.getByRole('link',{name:'Открыть ООП 38.03.02.01',exact:true}).click();await expect(p).toHaveURL(/formation\?program=1/);await p.goBack();await expect(p.getByRole('button',{name:/^Утверждён/})).toHaveAttribute('aria-pressed','true');
await p.getByRole('button',{name:/Все программы/}).click();await p.getByRole('combobox',{name:'Направление подготовки'}).click();await p.getByRole('option',{name:'38.03.02 · Менеджмент',exact:true}).click();await expect(p.locator('tbody tr')).toHaveCount(2);
await p.getByRole('textbox',{name:'Поиск ООП'}).fill('не существует');await expect(p.getByText('Программы не найдены',{exact:true})).toBeVisible();await p.getByRole('button',{name:'Сбросить фильтры'}).click();await expect(p.locator('tbody tr')).toHaveCount(8);
await p.getByRole('link',{name:'Печать ООП 38.03.02.01',exact:true}).click();await expect(p).toHaveURL(/print\?program=1/);await p.goBack();await p.setViewportSize({width:390,height:844});await p.screenshot({path:'artifacts/oop-status-mobile.png'});if(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile page overflow');if(errors.length)throw Error(errors.join(';'));console.log('PASS: statuses, filters, search, empty state, navigation, mobile width');
}finally{await b.close();}

