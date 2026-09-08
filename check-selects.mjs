import fs from 'node:fs';
for(const f of ['src/components/Layout.tsx','src/pages/Commissions.tsx','src/pages/CommissionDetail.tsx']){const s=fs.readFileSync(f,'utf8');console.log(f,[...s.matchAll(/<AppSelect[\s\S]*?<\/AppSelect>/g)].map(m=>m[0].slice(-210)));}
