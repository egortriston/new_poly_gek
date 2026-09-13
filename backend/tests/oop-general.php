<?php
declare(strict_types=1);
require __DIR__.'/catalog.php';
require dirname(__DIR__).'/src/lists.php';
require dirname(__DIR__).'/src/oop.php';
require dirname(__DIR__).'/src/oop-general.php';
function generalRow(string $kind,string $id): array {
 foreach(oopGeneralList($kind,[])['items'] as $row)if($row['id']===$id)return $row;
 throw new RuntimeException('Missing general row');
}
foreach(['areas'=>['99','Test area'],'types'=>['Test type'],'standards'=>['99.001','Test standard','Approved'],'uk'=>['Category','UK-99','Indicator']] as $kind=>$values){
 $id=oopGeneralMutate($kind,['values'=>$values,'level'=>'1'],false)['id'];
 $row=generalRow($kind,$id);
 check($row['values']===$values,'Values round trip');
 $edited=$row;$edited['values'][count($values)-1].=' changed';
 oopGeneralMutate($kind,$edited,false);
 expectError('STALE_RECORD',fn()=>oopGeneralMutate($kind,$row,false));
 if($kind==='standards'){
  $edited=generalRow($kind,$id);$edited['values'][2]='';oopGeneralMutate($kind,$edited,false);
  check(generalRow($kind,$id)['values'][2]==='','Clear optional field');
 }
 if($kind!=='uk')expectError('DUPLICATE',fn()=>oopGeneralMutate($kind,['values'=>generalRow($kind,$id)['values']],false));
 if($kind==='uk')check(oopGeneralList('uk',['level'=>'2'])['total']===0,'Level filtering');
 oopGeneralMutate($kind,generalRow($kind,$id),true);
}
$area=oopGeneralMutate('areas',['values'=>['88','Used area']],false)['id'];
$standard=insertRecord('prof_standards',['cod_prof_standard'=>'88.001','id_area_activity'=>$area],'id_prof_standard');
expectError('IN_USE',fn()=>oopGeneralMutate('areas',generalRow('areas',$area),true));
$edit=generalRow('areas',$area);$edit['values'][0]='87';
expectError('IN_USE',fn()=>oopGeneralMutate('areas',$edit,false));
query('DELETE FROM prof_standards WHERE id_prof_standard=$1',[$standard]);
for($i=0;$i<65;$i++)oopGeneralMutate('types',['values'=>['Paging '.$i]],false);
$first=oopGeneralList('types',['q'=>'Paging']);
$second=oopGeneralList('types',['q'=>'Paging','cursor'=>$first['nextCursor']]);
check($first['total']===65&&count($first['items'])===50&&count($second['items'])===15,'Pagination');
check(count(array_unique(array_column(array_merge($first['items'],$second['items']),'id')))===65,'No duplicate rows');
check(oopGeneralList('types',['q'=>'Paging 64'])['total']===1,'Search includes unloaded rows');
expectError('VALIDATION',fn()=>oopGeneralMutate('types',['values'=>['']],false));
echo "PASS general OOP: CRUD, versions, dependencies, levels, search and pagination. TEMP only.\n";
