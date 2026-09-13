import {request} from '@playwright/test';
import assert from 'node:assert/strict';
const baseURL=process.env.TEST_DATABASE_URL;
if(!baseURL)throw new Error('Use an isolated test server: TEST_DATABASE_URL required');
const contexts=[];
async function login(username){const c=await request.newContext({baseURL});contexts.push(c);const s=(await(await c.get('/api/v1/auth/session')).json()).data;const r=await c.post('/api/v1/auth/login',{headers:{'X-CSRF-Token':s.csrfToken},data:{username,password:process.env[username==='admin'?'TEST_ADMIN_PASSWORD':'TEST_ROP_PASSWORD']}});assert.equal(r.status(),200);const data=(await r.json()).data;return {c,data,headers:{'X-CSRF-Token':data.csrfToken,'X-Database-Context':data.databases.context}};}
try{
 const admin=await login('admin'),rop=await login('rop');
 assert.equal((await rop.c.get('/api/v1/databases',{headers:rop.headers})).status(),403);
 assert.equal((await rop.c.post('/api/v1/databases/create',{headers:rop.headers,data:{}})).status(),403);
 const name='polytech_test_copy_'+Date.now();
 const response=await admin.c.post('/api/v1/databases/create',{headers:admin.headers,data:{name:'Тестовая копия',database:name,period:'2027/2028',sourceId:'initial',makeDefault:true}});
 const body=await response.json();assert.equal(response.status(),202,JSON.stringify(body));const id=body.data.id;
 let item;
 for(let n=0;n<90;n++){
  const registry=(await(await admin.c.get('/api/v1/databases',{headers:admin.headers})).json()).data;
  item=registry.databases.find(r=>r.id===id);
  if(item.status!=='copying'){assert.equal(item.status,'ready',JSON.stringify(item));assert.equal(registry.defaultId,id);break;}
  await new Promise(r=>setTimeout(r,500));
 }
 assert.equal(item.status,'ready');
 assert.equal((await(await rop.c.get('/api/v1/auth/session')).json()).data.databases.selectedId,'initial');
 const fresh=await login('rop');assert.equal(fresh.data.databases.selectedId,id);
 const switched=await rop.c.post('/api/v1/databases/switch',{headers:rop.headers,data:{id}});assert.equal(switched.status(),200);
 const next=(await switched.json()).data;assert.equal(next.selectedId,id);assert.notEqual(next.context,rop.headers['X-Database-Context']);
 assert.equal((await rop.c.post('/api/v1/oop/general/types/save',{headers:rop.headers,data:{values:['MUST NOT WRITE']}})).status(),409);
 rop.headers['X-Database-Context']=next.context;
 assert.equal((await(await rop.c.get('/api/v1/auth/session')).json()).data.databases.selectedId,id);
 assert.equal((await admin.c.post('/api/v1/databases/default',{headers:admin.headers,data:{id:'initial'}})).status(),200);
 assert.equal((await(await rop.c.get('/api/v1/auth/session')).json()).data.databases.selectedId,id);
 assert.equal((await admin.c.post('/api/v1/databases/create',{headers:admin.headers,data:{name:'Bad',database:'bad;drop',period:'2027/2028',sourceId:'initial'}})).status(),422);
 console.log('PASS real background copy, admin/ROP permissions, default selection, pinned sessions, switching and stale-tab rejection.');
} finally {for(const c of contexts)await c.dispose();}
