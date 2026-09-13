<?php
require __DIR__.'/oop.php';
require dirname(__DIR__).'/src/lists.php';
require dirname(__DIR__).'/src/oop-program-data.php';
function dataRows(string $kind):array{return oopDataList($kind,[])['items'];}
$entry=['programId'=>$program,'form'=>$ef];
oopDataMutate('forms',$entry,false,['role'=>'rop']);
$row=dataRows('forms')[0];
check(count(oopGet($program)['draft']['forms'])===1,'Formation sees form link');
expectError('DUPLICATE',fn()=>oopDataMutate('forms',$entry,false,['role'=>'rop']));
$stale=$row;
oopDataMutate('forms',$row,true,['role'=>'rop']);
check(oopGet($program)['draft']['forms']===[],'Formation sees removed form');
$entry=['programId'=>$program,'task'=>$task,'object'=>$object,'values'=>['','','','Категория','ПК-9','Проверка','Основание']];
oopDataMutate('matrix',$entry,false,['role'=>'rop']);
$row=dataRows('matrix')[0];
check(oopGet($program)['draft']['tables']['oop'][0]['values'][4]==='ПК-9','Formation sees matrix');
$oldRow=$row;$row['values'][4]='ПК-10';
oopDataMutate('matrix',$row,false,['role'=>'rop']);
expectError('STALE_RECORD',fn()=>oopDataMutate('matrix',$oldRow,true,['role'=>'rop']));
$row=dataRows('matrix')[0];
$state=oopGet($program);$state['draft']['status']='Утверждён';oopPut($program,$state);
expectError('APPROVED_OOP',fn()=>oopDataMutate('matrix',$row,true,['role'=>'rop']));
oopDataMutate('matrix',$row,true,['role'=>'admin']);
check(oopGet($program)['draft']['tables']['oop']===[],'Admin removes record');
echo "PASS OOP data: CRUD, shared formation data, duplicate forms, stale deletion and role restrictions. Public DB unchanged.\n";
