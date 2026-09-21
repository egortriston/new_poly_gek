<?php
declare(strict_types=1);
// Reuse the isolated schema fixture. It never writes to public.
require __DIR__.'/catalog.php';
require dirname(__DIR__).'/src/lists.php';
for($i=1;$i<=135;$i++)saveCatalog('disciplines',[
    'name_discipline'=>$i===135?'Последняя дисциплина 100%_тест':'Дисциплина '.$i,
    'id_school'=>$school,'id_level'=>'1',
]);
$first=catalogList('disciplines',[]);
check(count($first['items'])===50&&$first['nextCursor']!==null,'First page is bounded');
check($first['total']===135,'Total covers unloaded rows');
check(readList(fn()=>catalogList('disciplines',[]))['total']===135,'Read-only snapshot returns the same total');
$all=$first['items'];$cursor=$first['nextCursor'];
while($cursor){$page=catalogList('disciplines',['cursor'=>$cursor]);$all=[...$all,...$page['items']];$cursor=$page['nextCursor'];}
check(count($all)===135&&count(array_unique(array_column($all,'id_discipline')))===135,'No missing or duplicate rows');
check(count(catalogList('disciplines',['q'=>'Последняя'])['items'])===1,'Search reaches unloaded records');
check(catalogList('disciplines',['q'=>'Последняя'])['total']===1,'Total follows search');
check(count(catalogList('disciplines',['q'=>'%_'])['items'])===1,'Search treats SQL wildcards literally');
check(count(catalogList('disciplines',['id_school'=>$school2])['items'])===0,'Filters apply before pagination');
expectError('INVALID_CURSOR',fn()=>catalogList('disciplines',['q'=>'Другое','cursor'=>$first['nextCursor']]));
$row=$first['items'][0];
saveCatalog('disciplines',[...$row,'id'=>$row['id_discipline'],'name_discipline'=>'Изменённая дисциплина']);
check(count(catalogList('disciplines',['q'=>'Изменённая'])['items'])===1,'List rows preserve valid edit version');
for($i=0;$i<61;$i++)savePeople('external',['person'=>['name'=>'Тестовый участник '.$i]]);
$p=peopleList('external',[]);check(count($p['items'])===50,'People list is bounded');
$last=peopleList('external',['q'=>'участник 60']);
check(count($last['items'])===1,'People search reaches unloaded records');
check(peopleList('external',['id'=>$last['items'][0]['id']])['items'][0]['person']['name']==='Тестовый участник 60','Direct card fetch independent of loaded list');
$opts=optionList('people',[]);check(count($opts['items'])===50,'Options are bounded');
check(count(optionList('people',['q'=>'участник 60'])['items'])===1,'Option search reaches unloaded choices');
check(count(optionList('people',['id'=>$last['items'][0]['personId']])['items'])===1,'Selected option independently resolved');
echo "PASS: cursor traversal, complete search, literal wildcards, filters, scope, list version, direct cards and remote options.".PHP_EOL;

check(catalogList('disciplines',['q'=>'100%_тест · последняя','id_school'=>$school])['total']===1,'Unordered fragments and separators with school filter');
check(catalogList('disciplines',['q'=>'измененная'])['total']===1,'Yo and ye are equivalent');
check(peopleList('external',['q'=>'60 тестовый'])['total']===1,'People search supports reversed fragments');
check(optionList('people',['q'=>'60 · тестовый','id'=>$last['items'][0]['personId']])['total']===1,'Option ID filter follows multiple search parameters');
check(matchesSearch('38.03.05_01 · Архитектура предприятия','предприятия 38.03.05_01 архитект'),'Program code and partial name match in any order');
check(!matchesSearch('38.03.05_01 · Архитектура предприятия','38.03.05_02'),'Program codes stay distinct');
echo "PASS: flexible search regression checks.".PHP_EOL;
