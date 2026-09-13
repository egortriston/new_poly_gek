import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 for(const username of ['admin','rop']){
  const c=await browser.newContext({baseURL:'http://127.0.0.1:5174',viewport:{width:1440,height:1000}});
  const s=(await(await c.request.get('/api/v1/auth/session')).json()).data;
  assert.equal((await c.request.post('/api/v1/auth/login',{headers:{'X-CSRF-Token':s.csrfToken},data:{username,password:process.env[username==='admin'?'TEST_ADMIN_PASSWORD':'TEST_ROP_PASSWORD']}})).status(),200);
  const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('/');
  await p.getByRole('combobox',{name:'База данных и учебный период'}).waitFor();
  if(username==='admin'){
   await p.getByRole('link',{name:'Управление базами',exact:true}).click();await p.getByRole('button',{name:'Создать базу',exact:true}).click();
   await p.getByRole('dialog').waitFor();
   await p.getByRole('combobox',{name:'Учебный период',exact:true}).click();
   await p.getByRole('option',{name:'2027/2028',exact:true}).click();
   assert.equal(await p.locator('input[placeholder="2027/2028"]').count(),0);
   await p.getByRole('button',{name:'Отмена',exact:true}).click();
   await p.screenshot({path:'backend/var/databases-page.png'});
  }else{assert.equal(await p.getByRole('link',{name:'Управление базами',exact:true}).count(),0);await p.goto('/databases');await p.getByRole('heading',{name:'Нет доступа'}).waitFor();}
  assert.deepEqual(errors,[]);await c.close();
 }
 console.log('PASS database picker, admin management form and ROP restriction. No working data changed.');
}finally{await browser.close();}
