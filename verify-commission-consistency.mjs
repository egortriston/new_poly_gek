import {chromium,expect} from '@playwright/test';
const b=await chromium.launch({channel:'msedge',headless:true});
try {
 const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});p.setDefaultTimeout(6000);p.on('pageerror',e=>console.log(e.message));
 await p.goto('http://127.0.0.1:5174/login');await p.getByRole('button',{name:'Заполнить данные для входа'}).click();await p.getByRole('button',{name:'Войти в систему',exact:true}).click();
 for(const kind of ['spo','ac','ppa']){
 await p.goto('http://127.0.0.1:5174/attestation/'+kind);await expect(p.locator('.gek-overview')).toContainText('ТЕКУЩАЯ КАМПАНИЯ');
 await p.locator('.gek-overview').getByRole('link').click();await expect(p.getByRole('columnheader',{name:'Заполнение',exact:true})).toBeVisible();await p.getByRole('tab',{name:/Заполнены/}).click();console.log(kind,p.url(),await p.locator('tbody').innerText());await expect(p.locator('tbody tr')).toHaveCount(0);await p.getByRole('tab',{name:/Все комиссии/}).click();
 const remove=p.getByRole('button',{name:/Удалить комиссию/}).filter({visible:true}).first();const before=await p.locator('tbody tr').count();await remove.click();await p.getByRole('dialog').getByRole('button',{name:'Отмена',exact:true}).click();await expect(p.locator('tbody tr')).toHaveCount(before);await remove.click();await p.getByRole('dialog').getByRole('button',{name:'Удалить',exact:true}).click();await p.reload();await expect(p.locator('tbody tr')).toHaveCount(before-1);
 }
 await p.goto('http://127.0.0.1:5174/commissions');let count=await p.locator('tbody tr').count();await p.locator('tbody').getByRole('button',{name:/Удалить ГЭК/}).first().click();await p.getByRole('dialog').getByRole('button',{name:'Удалить',exact:true}).click();await expect(p.locator('tbody tr')).toHaveCount(count-1);
 await p.setViewportSize({width:390,height:844});await expect(p.locator('.commission-mobile-list').getByRole('button',{name:/Удалить ГЭК/}).first()).toBeVisible();
 await p.setViewportSize({width:1440,height:1000});await p.goto('http://127.0.0.1:5174/attestation/ppa/documents?school=1');await p.getByRole('button',{name:'Печать служебной записки с комиссиями выбранной школы',exact:true}).click();await expect(p.locator('.att-letter-title')).toHaveText('СЛУЖЕБНАЯ ЗАПИСКА');
 console.log('PASS: overview, status filtering, deletion/cancel/reload in SPO/AC/PPA/GEK, mobile actions, PPA print');
}finally{await b.close();}


