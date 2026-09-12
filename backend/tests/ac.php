<?php
declare(strict_types=1);
require __DIR__.'/spo.php';

$body=['number'=>'1','school'=>$school,'chairman'=>'25011','secretary'=>$teacher,'members'=>[$member],'directions'=>[$direction],'programs'=>[$program]];
$record=saveSpo([...$body,'number'=>'22'],['role'=>'admin'],'ac');
check($record['kind']==='ac','AC kind');
expectError('NOT_FOUND',fn()=>deleteSpo($record));
expectError('DUPLICATE',fn()=>saveSpo([...$body,'number'=>'022'],['role'=>'admin'],'ac'));
$changed=saveSpo([...$record,'chairman'=>$member,'members'=>[]],['role'=>'admin'],'ac');
expectError('FORBIDDEN',fn()=>saveSpo([...$changed,'chairman'=>'25011'],['role'=>'rop'],'ac'));
expectError('STALE_RECORD',fn()=>saveSpo($record,['role'=>'admin'],'ac'));
query("INSERT INTO spo(id_spo,id_com_spo,id_school,chairman,ac) OVERRIDING SYSTEM VALUE VALUES(60,'060',$1,'25011',true)",[$school]);
$special=spoRecord(spoState(rows('SELECT * FROM spo WHERE id_spo=60')[0]));
check(!empty($special['special']),'Special description');
expectError('SPECIAL_COMMISSION',fn()=>deleteSpo($special,'ac'));
$special=saveSpo([...$special,'number'=>'65'],['role'=>'admin'],'ac');
check($special['number']==='065','Special commission number remains editable as in legacy');
$cover=spoCover($school,'ac');
$savedCover=saveSpoCover([...$cover,'num_add'=>'АК-5','cover_date_add'=>'2026-09-12','cover_year'=>'2026/2027'],'ac');
check($savedCover['num_add']==='АК-5','AC cover');
check(spoCover($school)['num_add']==='СПО-1','SPO cover unchanged');
deleteSpo($changed,'ac');
echo "PASS: AC CRUD, roles, stale changes, protected special commissions and cover isolation. Public DB unchanged.\n";
