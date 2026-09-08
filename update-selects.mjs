import fs from 'node:fs';
for(const dir of ['src/pages','src/components']) for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.tsx')&&f!=='AppSelect.tsx')){
 const path=dir+'/'+file;let s=fs.readFileSync(path,'utf8');if(!s.includes('<select'))continue;
 s=s.replaceAll('<select','<AppSelect').replaceAll('</select>','</AppSelect>');
 s=`import { AppSelect } from '${dir.endsWith('pages')?'../components/AppSelect':'./AppSelect'}';\n`+s;
 s=s.replace(/<option>202[567]<\/option>/g,'');
 // Insert the same academic period options into each year selector.
 s=s.replace(/(<AppSelect[^]*?value=\{(?:year|form.year|draft.year)\}[^]*?>)(<\/AppSelect>)/g,(m,start,end)=>start+'<option value="2025">2025/2026</option><option value="2026">2026/2027</option>'+end);
 fs.writeFileSync(path,s);
}
