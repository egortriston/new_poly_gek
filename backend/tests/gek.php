<?php
declare(strict_types=1);
require __DIR__.'/catalog.php';
require dirname(__DIR__).'/src/lists.php';
require dirname(__DIR__).'/src/gek.php';
$person=savePeople('external',['person'=>['name'=>'Председатель Тестовый']])['id'];
$other=savePeople('external',['person'=>['name'=>'Участник Тестовый']])['id'];
$appointment=savePeople('chairmen',['personId'=>'member:'.$person,'sphere'=>'Бизнес','schoolIds'=>[$school],'values'=>[]])['id'];
$body=['number'=>'123','school'=>$school,'chairmanId'=>'member:'.$person,'secretaryId'=>'teacher:'.$teacher,
    'internalIds'=>[],'externalIds'=>['member:'.$other],'programIds'=>[]];
$saved=saveGek($body);
expectError('CHAIRMAN_SCHOOL',fn()=>saveGek([...$body,'school'=>$school2]));
expectError('CHAIRMAN_SCHOOL',fn()=>saveGek([...$body,'number'=>'25','chairmanId'=>'member:'.$other,'externalIds'=>[]]));
// Complex chairmen are available to every school explicitly selected in their card.
$complexPerson=savePeople('external',['person'=>['name'=>'Комплексный Тестовый']])['id'];
savePeople('complex',['personId'=>'member:'.$complexPerson,'sphere'=>'Образование','schoolIds'=>[$school,$school2],'values'=>[]]);
foreach([$school,$school2] as $complexSchool) {
    $complexCommission=saveGek([...$body,'number'=>'26','school'=>$complexSchool,'chairmanId'=>'member:'.$complexPerson]);
    deleteGek($complexCommission);
}
// Withdrawing an appointment must not block unrelated edits to an existing commission.
query('UPDATE sec_predsedatel_s SET area=NULL WHERE id_predsedatel_sc=$1',[$appointment]);
query('DELETE FROM sec_helper WHERE chairman=$1',[$person]);
$saved=saveGek($saved);
expectError('CHAIRMAN_SCHOOL',fn()=>saveGek([...$body,'number'=>'27']));
check(normalizeGekId('2','1')==='102','Missing prefix is normalized');
check(normalizeGekId('102','2')==='202','School prefix is corrected');
expectError('VALIDATION',fn()=>normalizeGekId('100','1'));
check($saved['gekId']===$school.'23','ID uses school prefix');
check($saved['chairmanId']==='member:'.$person,'Chairman is stored');
check($saved['secretaryId']==='teacher:'.$teacher,'Teacher secretary retains ID');
check(count($saved['externalIds'])===1,'External member is stored');
expectError('DUPLICATE',fn()=>saveGek($body));
$next=saveGek([...$saved,'gekId'=>'24','chairmanId'=>'','externalIds'=>[]]);
check($next['chairmanId']===''&&$next['externalIds']===[],'Fields and links can be cleared');
expectError('STALE_RECORD',fn()=>saveGek($saved));
expectError('VALIDATION',fn()=>saveGek([...$next,'internalIds'=>['teacher:'.$teacher]]));
check(rows('SELECT id_com_sec FROM sec WHERE id_sec=$1',[$saved['id']])[0]['id_com_sec']===$school.'24','Failed edit rolls back');
deleteGek($next);
check(count(rows('SELECT * FROM sec WHERE id_sec=$1',[$saved['id']]))===0,'Commission deleted');
check(count(rows('SELECT * FROM sec_member WHERE sm_id=$1',[$person]))===1,'Members preserved');
echo "PASS: GEC CRUD, atomic relations, duplicate numbers, stale updates, clearing fields, deletion.\n";
