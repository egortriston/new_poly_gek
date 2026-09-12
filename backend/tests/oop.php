<?php
declare(strict_types=1);
require __DIR__.'/catalog.php';
require dirname(__DIR__).'/src/oop.php';
function oopGet(string $id): array {return oopResponse(oopSnapshot($id));}
function oopPut(string $id,array $data,string $role='rop'): array {return saveOop(['id'=>$id,'version'=>$data['version'],'draft'=>$data['draft']],['role'=>$role]);}
$ef=insertRecord('education_form',['id_ef'=>'1','name_education_form'=>'очная'],'id_ef');
$taskType=insertRecord('types_task',['name_type_task'=>'Исследовательский'],'id_type_task');
$task=insertRecord('prof_tasks',['id_direction'=>$direction,'id_type_task'=>$taskType,'name_prof_task'=>'Анализ'],'id_prof_task');
$object=insertRecord('prof_objects',['id_direction'=>$direction,'id_type_task'=>$taskType,'name_prof_object'=>'Данные'],'id_prof_object');
$uk=insertRecord('matrix_universal',['id_level'=>'1','category_mu'=>'Категория','code_mu'=>'УК-1','indicator_mu'=>'Индикатор'],'id_mu');
$first=oopGet($program);
$first['draft']['values']['comp']="Цель с апострофом ' и переносом\nстроки";
$first['draft']['values']['num_prof']='0';
$first['draft']['forms']=['очная'];
$first['draft']['tables']['tasks']=$first['options']['tasks'];
$first['draft']['tables']['objects']=$first['options']['objects'];
$first['draft']['tables']['oop']=[['id'=>'new-test','values'=>['Исследовательский','Анализ','Данные','Категория','ПК-1','Индикатор','Стандарт'],'task'=>$task,'object'=>$object]];
$saved=oopPut($program,$first);
check($saved['draft']['values']['num_prof']==='0','Zero preserved');
check($saved['draft']['values']['comp']===$first['draft']['values']['comp'],'Text preserved');
check(count($saved['draft']['tables']['oop'])===1,'Own matrix created');
check(count($saved['draft']['forms'])===1,'Education form saved');
expectError('STALE_RECORD',fn()=>oopPut($program,$first));
$invalid=$saved;$invalid['draft']['values']['num_prof']='101';expectError('VALIDATION',fn()=>oopPut($program,$invalid));
$invalid=$saved;$invalid['draft']['tables']['tasks'][]=['id'=>'999999','values'=>['wrong']];expectError('INVALID_REFERENCE',fn()=>oopPut($program,$invalid));
$invalid=$saved;$invalid['draft']['tables']['uk']=[];expectError('FORBIDDEN',fn()=>oopPut($program,$invalid));
$invalid=$saved;$invalid['draft']['values']['name_direction']='New';expectError('FORBIDDEN',fn()=>oopPut($program,$invalid));
check(oopGet($program)['version']===$saved['version'],'Failed save rolled back');
$saved['draft']['status']='Утверждён';$approved=oopPut($program,$saved);
$invalid=$approved;$invalid['draft']['values']['comp']='Forbidden';expectError('APPROVED_OOP',fn()=>oopPut($program,$invalid));
$approved['draft']['status']='Черновик';$draft=oopPut($program,$approved);
$draft['draft']['values']['comp']='';$draft['draft']['values']['num_prof']='';$draft['draft']['forms']=[];$draft['draft']['tables']['oop']=[];
$cleared=oopPut($program,$draft);
check($cleared['draft']['values']['comp']==='' && $cleared['draft']['values']['num_prof']==='' && $cleared['draft']['forms']===[],'Clear fields and relations');
$cleared['draft']['tables']['uk'][0]['values'][1]='УК-1 изменён';
$admin=oopPut($program,$cleared,'admin');check($admin['draft']['tables']['uk'][0]['values'][1]==='УК-1 изменён','Admin shared edit');
echo "PASS OOP: atomic save, relations, matrices, clearing, stale writes, role restrictions, approve and return. Public DB unchanged.\n";
