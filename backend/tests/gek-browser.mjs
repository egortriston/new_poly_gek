import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:"msedge"});
try {
 const context=await browser.newContext({baseURL:'http://127.0.0.1:5174'});
 const request=context.request;
 const session=(await (await request.get('/api/v1/auth/session')).json()).data;
 const login=await request.post('/api/v1/auth/login',{headers:{'X-CSRF-Token':session.csrfToken},data:{username:'admin',password:process.env.TEST_ADMIN_PASSWORD}});
 assert.equal(login.status(),200,'Login');
 const token=(await login.json()).data.csrfToken;
 const response=await request.get('/api/v1/gek/context');assert.equal(response.status(),200);
 const data=(await response.json()).data;
 for(const kind of ['commissions','secretaries','chairmen'])for(const school of ['',data.commissions[0].school]){
  const result=await request.post('/api/v1/gek/print',{headers:{'X-CSRF-Token':token},data:{kind,school,academicYear:'2026/2027'}});
  const body=await result.json();assert.equal(result.status(),200,JSON.stringify(body.error));assert.ok(Buffer.from(body.data.pdf,'base64').subarray(0,5).toString()==='%PDF-');
  console.log('PASS PDF',kind,school?'school':'all');
 }
 const page=await context.newPage();
 await page.goto('/gek');await page.getByRole('link',{name:/Открыть комиссии/}).click();await page.getByRole('heading',{name:/Комиссии ГЭК/}).waitFor();
 await page.locator('.commission-link').first().click();await page.getByRole('button',{name:'Назначить секретаря',exact:false}).count();
 await page.goto('/gek/documents');await page.getByRole('button',{name:'По всем школам'}).first().click();await page.getByRole('link',{name:'Скачать PDF'}).waitFor({timeout:30000});
 console.log('PASS GEC navigation and PDF preview');
}finally{await browser.close();}

