import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const c=await browser.newContext({baseURL:'http://127.0.0.1:5174'});
 const session=(await (await c.request.get('/api/v1/auth/session')).json()).data;
 assert.equal((await c.request.post('/api/v1/auth/login',{headers:{'X-CSRF-Token':session.csrfToken},data:{username:'rop',password:process.env.TEST_ROP_PASSWORD}})).status(),200);
 const page=await c.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/oop/print?program=88');
 await page.getByRole('button',{name:'Предпросмотр ООП',exact:true}).click();
 await page.getByRole('link',{name:'Скачать PDF',exact:true}).waitFor({timeout:30000});
 assert.ok(await page.getByTitle('Печатная форма ООП').isVisible());
 assert.ok(await page.getByRole('button',{name:'Печать',exact:true}).isEnabled());
 assert.deepEqual(errors,[]);
 console.log('PASS OOP print: real program selection, ROP access, PDF preview and download. No business writes.');
}finally{await browser.close();}
