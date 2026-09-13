import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try {
 for(const username of ['admin','rop']){
  const c=await browser.newContext({baseURL:'http://127.0.0.1:5174',viewport:{width:1440,height:900}});
  const session=(await(await c.request.get('/api/v1/auth/session')).json()).data;
  const login=await c.request.post('/api/v1/auth/login',{headers:{'X-CSRF-Token':session.csrfToken},data:{username,password:process.env[username==='admin'?'TEST_ADMIN_PASSWORD':'TEST_ROP_PASSWORD']}});
  assert.equal(login.status(),200);
  const csrf=(await login.json()).data.csrfToken;
  const page=await c.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const kind of ['areas','tasks','objects','standards','pk','opk']){
   const response=await c.request.get(`/api/v1/oop/directions/${kind}/list`);
   assert.equal(response.status(),username==='admin'?200:403);
   if(username==='rop'){
    assert.equal((await c.request.post(`/api/v1/oop/directions/${kind}/save`,{headers:{'X-CSRF-Token':csrf},data:{}})).status(),403);continue;
   }
   const data=(await response.json()).data;assert.ok(data.total>0);
   if(kind!=='opk'){
    const opt=await c.request.get(`/api/v1/oop/directions/${kind}/options/0?direction=${data.items[0].directionId}`);
    assert.equal(opt.status(),200);assert.ok(Array.isArray((await opt.json()).data.items));
   }
   await page.goto(`/oop/data/directions/${kind}`);
   await page.getByText(`Записей: ${data.total}`,{exact:true}).waitFor();
   await page.getByRole('button',{name:'Добавить',exact:true}).click();
   await page.getByRole('dialog').waitFor();
   await page.getByRole('button',{name:'Отмена',exact:true}).click();
   await page.getByRole('button',{name:/Изменить запись/}).first().click();
   await page.getByRole('dialog').waitFor();
   await page.getByRole('combobox',{name:'Направление подготовки',exact:true}).waitFor();
   await page.getByRole('button',{name:'Отмена',exact:true}).click();
   if(kind==='pk')await page.screenshot({path:'backend/var/oop-direction-pk.png'});
  }
  assert.deepEqual(errors,[]);await c.close();
 }
 console.log('PASS admin tables and modals, ROP denied. No business writes.');
} finally {await browser.close();}
