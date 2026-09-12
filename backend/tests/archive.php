<?php
declare(strict_types=1);
require __DIR__.'/catalog.php'; // Isolated DB tables only.
require dirname(__DIR__).'/src/lists.php';
require dirname(__DIR__).'/src/archive.php';
$root=str_replace('\\','/',sys_get_temp_dir()).'/polytech-archive-test-'.bin2hex(random_bytes(8));
mkdir($root,0700);
$previous=getenv('POLYTECH_ARCHIVE_ROOT');
putenv('POLYTECH_ARCHIVE_ROOT='.$root);
try {
    check(archiveContext('')['parents']===[],'Empty archive context');
    $folder=archiveMutate('mkdir',['name'=>'Документы','folder'=>''])['id'];
    archiveMutate('mkdir',['name'=>'Вложения','folder'=>$folder]);
    check(archiveContext(archiveId('Документы/Вложения'))['parents'][0]['name']==='Документы','Breadcrumbs include parents');
    expectError('DUPLICATE',fn()=>archiveMutate('mkdir',['name'=>'документы','folder'=>'']));
    foreach(['../escape','/absolute','C:/secret',ARCHIVE_INTERNAL.'/lock'] as $path)
        expectError('INVALID_NAME',fn()=>archiveContext(archiveId($path)));
    file_put_contents($root.'/Документы/Файл.txt','Содержимое');
    $list=archiveList(['folder'=>$folder]);check($list['total']===2,'Only current folder is listed');
    $file=array_values(array_filter($list['items'],fn($row)=>$row['kind']==='file'))[0];
    $renamed=archiveMutate('rename',[...$file,'name'=>'Протокол.txt'])['id'];
    check(file_get_contents(archivePath(archiveRelative($renamed)))==='Содержимое','Rename preserves bytes');
    $current=archiveItem('Документы/Протокол.txt');
    archiveMutate('mkdir',['folder'=>'','name'=>'Другая папка']);
    expectError('STALE_RECORD',fn()=>archiveMutate('delete',$current));
    for($i=0;$i<65;$i++)file_put_contents($root.'/Документы/Запись '.$i.'.txt','test');
    $first=archiveList(['folder'=>$folder]);
    check(count($first['items'])===50&&$first['total']===67,'Archive pages are bounded');
    $last=archiveList(['folder'=>$folder,'cursor'=>$first['nextCursor']]);
    check(count($last['items'])===17,'Remaining archive items loaded');
    check(archiveList(['folder'=>$folder,'q'=>'Запись 64'])['total']===1,'Search includes unloaded files');
    archiveMutate('mkdir',['folder'=>'','name'=>'Изменение']);
    expectError('ARCHIVE_CHANGED',fn()=>archiveList(['folder'=>$folder,'cursor'=>$first['nextCursor']]));
    $chairFolder=archiveEnsureChairman('123','2026/2027','Иванов Иван Иванович');
    check(archiveRelative($chairFolder)==='Председатели ГЭК 2027/123 — Иванов Иван Иванович','Chairman folder uses ending year, ID and full name');
    check(archiveEnsureChairman('123','2026/2027','Иванов Иван Иванович')===$chairFolder,'Repeated folder creation is idempotent');
    expectError('INVALID_PERIOD',fn()=>archiveEnsureChairman('123','2026/2028','Иванов Иван Иванович'));
    $created=savePeople('complex',['academicYear'=>'2026/2027','personId'=>'teacher:'.$teacher,'sphere'=>'Образование','schoolIds'=>[$school],'values'=>[]]);
    check(is_dir(archivePath(archiveRelative($created['archiveFolder']))),'Chairman creation is connected to archive');
    $card=peopleList('complex',['id'=>$created['id']])['items'][0];
    $opened=chairmanArchiveFolder('complex',['id'=>$card['id'],'version'=>$card['version'],'academicYear'=>'2026/2027']);
    check($opened['folder']===$created['archiveFolder'],'Existing chairman card opens the same archive folder');
    archiveMutate('delete',archiveItem('Документы'));
    check(!file_exists($root.'/Документы'),'Folder removed with all children');
    check(is_dir(archivePath(archiveRelative($chairFolder))),'Other folders preserved');
    check(archiveList([])['total']===3,'Internal storage is never listed');
    echo "PASS: isolated archive, breadcrumbs, search, paging, conflicts, names, path boundaries, rename, recursive deletion, period/ID/full name and chairman integration.".PHP_EOL;
} finally {
    if(str_starts_with(basename($root),'polytech-archive-test-') && realpath($root)!==false)
        archivePurge($root,str_replace('\\','/',dirname($root)));
    $previous===false?putenv('POLYTECH_ARCHIVE_ROOT'):putenv('POLYTECH_ARCHIVE_ROOT='.$previous);
}
