<?php
declare(strict_types=1);
require __DIR__.'/catalog.php';
require dirname(__DIR__).'/src/lists.php';
require dirname(__DIR__).'/src/oop.php';
require dirname(__DIR__).'/src/oop-directions.php';
function directionRow(string $kind,string $id): array {
 foreach(oopDirectionList($kind,[])['items'] as $row)if($row['id']===$id)return $row;
 throw new RuntimeException('Missing row');
}
$area=insertRecord('area_activities_list',['id_area_activity'=>'99','area_activity'=>'Test area'],'id_area_activity');
$type=insertRecord('types_task',['name_type_task'=>'Test type'],'id_type_task');
$standard=insertRecord('prof_standards',['cod_prof_standard'=>'99.001','name_prof_standard'=>'Test standard'],'id_prof_standard');
$ids=[];
foreach(['areas'=>[$area,'Scope'],'tasks'=>[$type,'Task'],'objects'=>[$type,'Object'],'standards'=>[$standard],'opk'=>['Category','OPK-99','Indicator'],'pk'=>['','','Category','PK-99','Indicator','Base']] as $kind=>$values){
 if($kind==='pk'){$values[0]=$ids['tasks'];$values[1]=$ids['objects'];}
 $id=oopDirectionMutate($kind,['directionId'=>$direction,'values'=>$values],false)['id'];$ids[$kind]=$id;
 $row=directionRow($kind,$id);check($row['values']===$values,'Round trip '.$kind);
 oopDirectionMutate($kind,$row,false);
 if($kind!=='standards'){
  $edit=$row;$edit['values'][count($values)-1].=' changed';oopDirectionMutate($kind,$edit,false);
  expectError('STALE_RECORD',fn()=>oopDirectionMutate($kind,$row,false));
 }
}
expectError('DUPLICATE',fn()=>oopDirectionMutate('standards',['directionId'=>$direction,'values'=>[$standard]],false));
expectError('IN_USE',fn()=>oopDirectionMutate('tasks',directionRow('tasks',$ids['tasks']),true));
$other=insertRecord('direction_list',['number_direction'=>'99.99.99','name_direction'=>'Other','id_level'=>'1'],'id_direction');
$edit=directionRow('pk',$ids['pk']);$edit['directionId']=$other;
expectError('VALIDATION',fn()=>oopDirectionMutate('pk',$edit,false));
check(oopDirectionOptions('pk','0',['direction'=>$other])['total']===0,'Options scoped');
check(oopDirectionList('tasks',['q'=>'Test type'])['total']===1,'Search related label');
check(oopDirectionList('tasks',['direction'=>$other])['total']===0,'Direction filter');
foreach(['pk','opk','standards','objects','tasks','areas'] as $kind)oopDirectionMutate($kind,directionRow($kind,$ids[$kind]),true);
echo "PASS direction OOP: CRUD, references, scope, search, versions and duplicates. TEMP only.\n";
