import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const c=await browser.newContext({baseURL:'http://127.0.0.1:5174'});
 const session=(await (await c.request.get('/api/v1/auth/session')).json()).data;
 await c.request.post('/api/v1/auth/login',{headers:{'X-CSRF-Token':session.csrfToken},data:{username:'admin',password:process.env.TEST_ADMIN_PASSWORD}});
 const page=await c.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const kind of ['matrix','forms']){
  const response=await c.request.get('/api/v1/oop/program-data/'+kind+'/list');assert.equal(response.status(),200);
  const data=(await response.json()).data;assert.ok(data.total>0);
  await page.goto('/oop/data/programs/'+kind);
  await page.getByText('Записей: '+data.total,{exact:true}).waitFor();
  await page.getByRole('button',{name:/Изменить запись/}).first().click();
  await page.getByRole('button',{name:'Сохранить',exact:true}).waitFor();
  if(kind==='matrix')await page.getByRole('textbox',{name:'Категория профессиональных компетенций',exact:true}).waitFor();
  else await page.getByRole('combobox',{name:'Форма обучения',exact:true}).waitFor();
  await page.getByRole('button',{name:'Отмена',exact:true}).click();
 }
 assert.deepEqual(errors,[]);console.log('PASS both tables and edit forms; no business writes.');
}finally{await browser.close();}
