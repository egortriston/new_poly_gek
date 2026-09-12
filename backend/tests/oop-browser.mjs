import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 for(const role of ['admin','rop']){
  const c=await browser.newContext({baseURL:'http://127.0.0.1:5174',viewport:{width:1440,height:1000}});
  const session=(await (await c.request.get('/api/v1/auth/session')).json()).data;
  assert.equal((await c.request.post('/api/v1/auth/login',{headers:{'X-CSRF-Token':session.csrfToken},data:{username:role,password:process.env[role==='admin'?'TEST_ADMIN_PASSWORD':'TEST_ROP_PASSWORD']}})).status(),200);
  const options=(await (await c.request.get('/api/v1/options/programs')).json()).data.items;
  const id=options[0].value;
  const res=await c.request.get('/api/v1/oop/formation?program='+id);assert.equal(res.status(),200);
  const data=(await res.json()).data;
  const page=await c.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/oop/formation?program='+id);
  await page.locator('.oop-savebar strong').waitFor();
  assert.ok((await page.locator('.oop-savebar strong').innerText()).includes(data.program.name_program));
  assert.equal(await page.getByRole('textbox',{name:'Номер протокола утверждения',exact:true}).inputValue(),data.draft.values.protocol_approved);
  assert.equal(await page.getByRole('button',{name:'Редактировать информацию о направлении подготовки',exact:true}).first().isEnabled(),role==='admin');
  await page.screenshot({path:'backend/var/oop-'+role+'.png'});
  const input=page.getByRole('textbox',{name:'Номер протокола утверждения',exact:true});
  await input.fill('Проверка несохранённых изменений');
  await page.locator('.oop-page > a').first().click();
  await page.getByRole('heading',{name:'Изменения ещё не сохранены',exact:true}).waitFor();
  await page.getByRole('button',{name:'Отмена',exact:true}).click();
  assert.equal(await input.inputValue(),'Проверка несохранённых изменений');
  await page.locator('.oop-page > a').first().click();
  await page.getByRole('button',{name:'Уйти без сохранения',exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/oop');
  await page.goto('/oop/formation?program='+id);
  await page.locator('.oop-savebar strong').waitFor();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'backend/var/oop-mobile-'+role+'.png'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Mobile overflow');
  assert.deepEqual(errors,[]);await c.close();
 }
 console.log('PASS formation: real program/fields, admin and ROP, unsaved navigation guard. No business writes.');
}finally{await browser.close();}
