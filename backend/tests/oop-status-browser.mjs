import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 for(const role of ['admin','rop']){
  const c=await browser.newContext({baseURL:'http://127.0.0.1:5174'});
  const session=(await (await c.request.get('/api/v1/auth/session')).json()).data;
  assert.equal((await c.request.post('/api/v1/auth/login',{headers:{'X-CSRF-Token':session.csrfToken},data:{username:role,password:process.env[role==='admin'?'TEST_ADMIN_PASSWORD':'TEST_ROP_PASSWORD']}})).status(),200);
  const response=await c.request.get('/api/v1/oop/status');
  assert.equal(response.status(),role==='admin'?200:403);
  const page=await c.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/oop/status');
  if(role==='admin'){
   const first=(await response.json()).data;
   assert.ok(first.total>50);assert.equal(first.items.length,50);
   const next=(await (await c.request.get('/api/v1/oop/status?cursor='+encodeURIComponent(first.nextCursor))).json()).data;
   assert.equal(new Set([...first.items,...next.items].map(x=>x.id_mep)).size,first.items.length+next.items.length);
   const target=next.items.at(-1);
   const search=(await (await c.request.get('/api/v1/oop/status?q='+encodeURIComponent(target.id_program))).json()).data;
   assert.ok(search.items.some(x=>x.id_mep===target.id_mep));
   await page.locator('.oop-status-table tbody strong').first().waitFor();
   await page.getByRole('textbox',{name:'Поиск ООП'}).fill(target.id_program);
   await page.getByText(target.name_program,{exact:true}).first().waitFor();
   await page.screenshot({path:'backend/var/status-ui.png',fullPage:false});
  }else{
   await page.getByRole('heading',{name:'Нет доступа'}).waitFor();
   await page.goto('/oop');assert.equal(await page.locator('a[href="/oop/status"]').count(),0);
  }
  assert.deepEqual(errors,[]);await c.close();
 }
 console.log('PASS status: database, search beyond first batch, cursor without duplicates, UI and admin/ROP restrictions');
}finally{await browser.close();}
