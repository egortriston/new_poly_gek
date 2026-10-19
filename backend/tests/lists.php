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
$filteredChair=savePeople('chairmen',['personId'=>'member:'.$external,'sphere'=>'Бизнес','schoolIds'=>[$school2]]);
$filteredComplex=savePeople('complex',['personId'=>$complexRow['personId'],'sphere'=>'Образование','schoolIds'=>[$school,$school2]]);
check(peopleList('chairmen',['school'=>$school2])['total']===1,'Chairman school filter uses the assigned school');
check(peopleList('chairmen',['school'=>$school])['total']===0,'Chairman school filter excludes other schools');
check(peopleList('complex',['school'=>$school])['total']===1,'Complex chairman filter finds any assigned school');
check(peopleList('complex',['school'=>$school2,'sphere'=>'Образование'])['total']===1,'School and sphere filters work together');
check(peopleList('complex',['school'=>$school2,'sphere'=>'Бизнес'])['total']===0,'Combined filters exclude non-matching cards');
echo "PASS: cursor traversal, complete search, literal wildcards, filters, scope, list version, direct cards and remote options.".PHP_EOL;

check(catalogList('disciplines',['q'=>'100%_тест · последняя','id_school'=>$school])['total']===1,'Unordered fragments and separators with school filter');
check(catalogList('disciplines',['q'=>'измененная'])['total']===1,'Yo and ye are equivalent');
check(peopleList('external',['q'=>'60 тестовый'])['total']===1,'People search supports reversed fragments');
check(optionList('people',['q'=>'60 · тестовый','id'=>$last['items'][0]['personId']])['total']===1,'Option ID filter follows multiple search parameters');
check(matchesSearch('38.03.05_01 · Архитектура предприятия','предприятия 38.03.05_01 архитект'),'Program code and partial name match in any order');
check(!matchesSearch('38.03.05_01 · Архитектура предприятия','38.03.05_02'),'Program codes stay distinct');
echo "PASS: flexible search regression checks.".PHP_EOL;

// Codes are deliberately inserted in reverse order to test sorting across page boundaries.
for($i=55;$i>=1;$i--){
    $code=sprintf('90.03.05_%02d',$i);
    saveCatalog('programs',['id_program'=>$code,'name_program'=>'Программа '.$i,'id_direction'=>$direction]);
    saveCatalog('directions',['number_direction'=>sprintf('90.%02d.01',$i),'name_direction'=>'Направление '.$i,'id_level'=>'1']);
}
foreach([['programs','id_program'],['directions','number_direction']] as [$kind,$code]){
    $all=[];$cursor=null;
    do{
        $page=catalogList($kind,$cursor?['cursor'=>$cursor]:[]);
        $all=[...$all,...array_column($page['items'],$code)];
        $cursor=$page['nextCursor'];
    }while($cursor);
    $expected=$all;sort($expected,SORT_STRING);
    check($all===$expected && count($all)===count(array_unique($all)),"$kind stay sorted across pages");
    $options=[];$cursor=null;
    do{
        $page=optionList($kind,$cursor?['cursor'=>$cursor]:[]);
        $options=[...$options,...array_column($page['items'],'sort_code')];
        $cursor=$page['nextCursor'];
    }while($cursor);
    check($options===$all,"$kind options follow the same code order");
}
require dirname(__DIR__).'/src/oop-status.php';
$status=[];$cursor=null;
do{
    $page=oopStatusList($cursor?['cursor'=>$cursor]:[]);
    $status=[...$status,...array_column($page['items'],'id_program')];
    $cursor=$page['nextCursor'];
}while($cursor);
$expected=$status;sort($expected,SORT_STRING);
check($status===$expected,'OOP status stays sorted across pages');
echo "PASS: directions, programs, options and OOP status follow code order across pages.".PHP_EOL;
