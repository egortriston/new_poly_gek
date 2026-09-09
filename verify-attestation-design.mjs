import {chromium,expect} from '@playwright/test';
const b=await chromium.launch({channel:'msedge',headless:true});
try {
const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});p.setDefaultTimeout(7000);
await p.goto('http://127.0.0.1:5174/login');await p.getByRole('button',{name:'Заполнить данные для входа'}).click();await p.getByRole('button',{name:'Войти в систему',exact:true}).click();
for(const kind of ['spo','ac','ppa']) {
 await p.goto('http://127.0.0.1:5174/attestation/'+kind);
 await expect(p.locator('.att-kind-cards .module-card')).toHaveCount(2);
 await p.locator('.att-kind-cards').getByRole('link').first().click();
 await expect(p.getByRole('heading',{name:'Список комиссий',exact:true})).toBeVisible();
 await p.getByRole('button',{name:/Изменить комиссию/}).first().click();
 await expect(p.locator('.detail-page')).toBeVisible();await expect(p.locator('.person-role').first()).toBeVisible();
 await p.getByRole('tab',{name:'Программы',exact:true}).click();await expect(p.locator('.member-section')).toHaveCount(2);
 await p.getByRole('button',{name:'Сохранить',exact:true}).click();
 await p.getByRole('button',{name:'Список комиссий',exact:true}).click();
 await p.goto('http://127.0.0.1:5174/attestation/'+kind+'/documents?school=1');
 await p.locator('.att-document').first().getByRole('button',{name:'Предпросмотр',exact:true}).click();
 await expect(p.locator('.att-letter-title')).toHaveText('СЛУЖЕБНАЯ ЗАПИСКА');await expect(p.getByRole('button',{name:'Печать / PDF',exact:true})).toBeVisible();
 if(kind==='spo')await p.screenshot({path:'artifacts/attestation-memo.png',fullPage:true});
 await p.getByRole('button',{name:'Закрыть окно',exact:true}).click();
}
await p.goto('http://127.0.0.1:5174/attestation/spo');await p.screenshot({path:'artifacts/attestation-kind.png',fullPage:true});
await p.goto('http://127.0.0.1:5174/attestation/spo/commissions');await p.getByRole('button',{name:/Изменить комиссию/}).first().click();await p.screenshot({path:'artifacts/attestation-detail.png',fullPage:true});
await p.setViewportSize({width:390,height:844});await expect(p.locator('.person-role').first()).toBeVisible();
console.log('PASS: two subblocks, full page cards, program tabs, save, memo/PDF preview for three types, mobile');
}finally{await b.close();}
