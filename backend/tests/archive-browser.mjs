import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,mkdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {chromium,expect,request} from '@playwright/test';
const root=await mkdtemp(path.join(tmpdir(),'polytech-archive-http-'));
const backend='http://127.0.0.1:8082',frontend='http://127.0.0.1:5174';
const child=spawn(process.env.TEST_PHP||'C:/php/php.exe',['-d','upload_max_filesize=50M','-d','post_max_size=52M','-S','127.0.0.1:8082','-t','backend/public','backend/router.php'],{
  cwd:process.cwd(),env:{...process.env,POLYTECH_ARCHIVE_ROOT:root},windowsHide:true,stdio:'ignore',
});
let browser;
try {
  for(let i=0;i<40;i++){
    try{if((await fetch(backend+'/api/v1/health')).ok)break;}catch{}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  const anonymous=await request.newContext({baseURL:backend});
  assert.equal((await anonymous.get('/api/v1/archive/list')).status(),401);
  assert.equal((await anonymous.get('/api/v1/archive/download?id=anything')).status(),401);
  await anonymous.dispose();
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const username of ['admin','rop']){
    const context=await browser.newContext({baseURL:frontend});
    const session=(await (await context.request.get(backend+'/api/v1/auth/session')).json()).data;
    const login=await context.request.post(backend+'/api/v1/auth/login',{headers:{'X-CSRF-Token':session.csrfToken},data:{username,password:process.env[username==='admin'?'TEST_ADMIN_PASSWORD':'TEST_ROP_PASSWORD']}});
    assert.equal(login.status(),200);
    const csrf=(await login.json()).data.csrfToken;
    const post=(operation,data)=>context.request.post(backend+'/api/v1/archive/'+operation,{headers:{'X-CSRF-Token':csrf},data});
    assert.equal((await context.request.post(backend+'/api/v1/archive/mkdir',{data:{name:'Forbidden'}})).status(),403);
    const create=await post('mkdir',{name:'Папка '+username,folder:''});assert.equal(create.status(),200);
    const folder=(await create.json()).data.id;
    const bytes=Buffer.from([0,1,255,10,65,128]);
    const upload=()=>context.request.post(backend+'/api/v1/archive/upload',{headers:{'X-CSRF-Token':csrf},multipart:{folder,file:{name:'Протокол.bin',mimeType:'application/octet-stream',buffer:bytes}}});
    const first=await upload();assert.equal(first.status(),200);
    const file=(await first.json()).data;
    const duplicate=await upload();assert.equal(duplicate.status(),200);
    assert.equal((await duplicate.json()).data.name,'Протокол (1).bin');
    const download=await context.request.get(backend+'/api/v1/archive/download?id='+file.id);
    assert.equal(download.status(),200);assert.deepEqual(await download.body(),bytes);
    assert.match(download.headers()['content-disposition'],/^attachment;/);
    assert.equal((await context.request.get(backend+'/api/v1/archive/list?folder='+Buffer.from('../escape').toString('base64url'))).status(),422);
    const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/v1/archive/**',async route=>{
      const url=new URL(route.request().url());
      const response=await route.fetch({url:backend+url.pathname+url.search});
      await route.fulfill({response});
    });
    await page.route('**/api/v1/people/*/archive',async route=>{
      const url=new URL(route.request().url());
      const response=await route.fetch({url:backend+url.pathname+url.search});
      await route.fulfill({response});
    });
    await page.goto('/archive?folder='+encodeURIComponent(folder));
    await expect(page.locator('.archive-row')).toHaveCount(2);
    await page.getByRole('button',{name:'Создать папку',exact:true}).click();
    await page.getByRole('textbox',{name:'Название',exact:true}).fill('Вложенная');
    await page.getByRole('dialog').getByRole('button',{name:'Создать папку',exact:true}).click();
    await expect(page.locator('.archive-row')).toHaveCount(3);
    await page.getByRole('button',{name:'Переименовать Протокол.bin',exact:true}).click();
    await page.getByRole('textbox',{name:'Название',exact:true}).fill('Итог.bin');
    await page.getByRole('button',{name:'Сохранить',exact:true}).click();
    await expect(page.getByRole('button',{name:'Скачать Итог.bin',exact:true})).toBeVisible();
    const chairmen=await (await context.request.get(backend+'/api/v1/people/chairmen/list')).json();
    const chairman=chairmen.data.items.find(item=>item.person&&!item.person.missing);
    if(chairman){
      await page.goto('/data/people/chairmen?card='+encodeURIComponent(chairman.id));
      await expect(page.getByText('Карточки по сферам «Образование»')).toHaveCount(0);
      await page.getByRole('button',{name:'Папка архива',exact:true}).click();
      await expect(page).toHaveURL(/\/archive\?folder=/);
      await expect(page.getByRole('heading',{name:/\d+ — /})).toBeVisible();
      await page.goto('/archive?folder='+encodeURIComponent(folder));
    }
    await page.getByRole('button',{name:'Выбрать файлы для архива'}).count(); // input is selected by label below.
    await page.getByLabel('Выбрать файлы для архива',{exact:true}).setInputFiles({name:'Текст.txt',mimeType:'text/plain',buffer:Buffer.from('Проверка загрузки из интерфейса')});
    await page.getByRole('button',{name:'Добавить в архив',exact:true}).click();
    await expect(page.getByRole('button',{name:'Скачать Текст.txt',exact:true})).toBeVisible();
    const event=page.waitForEvent('download');
    await page.getByRole('button',{name:'Скачать Текст.txt',exact:true}).click();
    const downloaded=await event;
    assert.equal(await readFile(await downloaded.path(),'utf8'),'Проверка загрузки из интерфейса');
    await page.getByRole('button',{name:'Удалить Вложенная',exact:true}).click();
    await page.getByRole('button',{name:'Удалить',exact:true}).click();
    await expect(page.getByRole('button',{name:'Удалить Вложенная',exact:true})).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button',{name:'Скачать Итог.bin',exact:true})).toBeVisible();
    assert.equal(errors.length,0,errors.join(';'));
    const rootList=(await (await context.request.get(backend+'/api/v1/archive/list')).json()).data;
    const target=rootList.items.find(item=>item.id===folder);
    assert.equal((await post('delete',target)).status(),200);
    await context.close();
  }
  console.log('PASS: archive HTTP/UI for both roles, auth, CSRF, binary download, duplicate upload, nested folder, rename, deletion, reload and path rejection. Temporary storage only.');
} finally {
  await browser?.close();
  child.kill();
  await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));
  if(path.dirname(root)===tmpdir()&&path.basename(root).startsWith('polytech-archive-http-'))await rm(root,{recursive:true,force:true});
}
