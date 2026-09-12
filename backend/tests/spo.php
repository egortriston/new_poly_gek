<?php
declare(strict_types=1);
require __DIR__.'/catalog.php';
require dirname(__DIR__).'/src/archive.php';
require dirname(__DIR__).'/src/spo.php';
function saveSpoAsRop(array $body): array {return saveSpo($body,['role'=>'rop']);}

query("INSERT INTO teacher(id_teacher,name_teacher,id_school) VALUES('25011','Председатель СПО',$1)",[$school]);
$member=insertRecord('teacher',['id_teacher'=>'spo-member','name_teacher'=>'Член СПО','id_school'=>$school],'id_teacher');
$body=['number'=>'1','school'=>$school,'chairman'=>'25011','secretary'=>$teacher,'members'=>[$member],'directions'=>[],'programs'=>[]];
$saved=saveSpoAsRop($body);
check($saved['number']==='001','Number is padded');
check($saved['members']===[$member] && $saved['secretary']===$teacher,'Real relations saved');
expectError('DUPLICATE',fn()=>saveSpoAsRop([...$body,'number'=>'0001']));
expectError('FORBIDDEN',fn()=>saveSpoAsRop([...$saved,'chairman'=>$member]));
expectError('DUPLICATE_ROLE',fn()=>saveSpoAsRop([...$saved,'members'=>[$teacher]]));
expectError('PROGRAM_DIRECTION',fn()=>saveSpoAsRop([...$saved,'programs'=>[$program]]));
$next=saveSpoAsRop([...$saved,'members'=>[],'secretary'=>'','directions'=>[$direction],'programs'=>[$program]]);
check($next['programs']===[$program],'Program relation is stored');
check(!$next['members'] && !$next['secretary'],'Roles can be cleared');
expectError('STALE_RECORD',fn()=>saveSpoAsRop($saved));
$ac=insertRecord('spo',['id_com_spo'=>'001','id_school'=>$school,'chairman'=>'25011','ac'=>'true'],'id_spo');
expectError('NOT_FOUND',fn()=>deleteSpo(['id'=>$ac,'version'=>$next['version']]));
$empty=spoCover($school);
$cover=saveSpoCover([...$empty,'cover_date_add'=>'2026-09-12','num_add'=>'СПО-1','cover_year'=>'2026/2027']);
check($cover['num_add']==='СПО-1','Cover stored');
expectError('STALE_RECORD',fn()=>saveSpoCover([...$empty,'cover_date_add'=>'2026-09-12','num_add'=>'2','cover_year'=>'2026/2027']));
expectError('VALIDATION',fn()=>saveSpoCover([...$cover,'cover_date_add'=>'2026-02-31']));
$next=saveSpo([...$next,'chairman'=>$member],['role'=>'admin']);
check($next['chairman']===$member,'Admin may change chairman');
expectError('FORBIDDEN',fn()=>saveSpoAsRop([...$next,'chairman'=>'25011']));
deleteSpo($next);
check(!rows('SELECT * FROM spo WHERE id_spo=$1',[$saved['id']]),'SPO deleted');
check(count(rows('SELECT * FROM teacher WHERE id_teacher=$1',[$member]))===1,'Teachers preserved');
check(count(rows('SELECT * FROM spo WHERE id_spo=$1',[$ac]))===1,'AC preserved');
echo "PASS: SPO CRUD, numbering, fixed chairman, roles, stale writes, covers and AC isolation. Public DB unchanged.\n";
