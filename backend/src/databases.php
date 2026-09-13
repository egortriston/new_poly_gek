<?php
declare(strict_types=1);

// One private registry; neither credentials nor archives are duplicated here.
function databaseRegistry(callable $change = null): array
{
    $path=configuration()['database_registry'];
    if(!is_dir(dirname($path)))mkdir(dirname($path),0700,true);
    $lock=fopen($path.'.lock','c');
    if(!$lock||!flock($lock,LOCK_EX))throw new ApiError(503,'REGISTRY_UNAVAILABLE','Не удалось прочитать список баз.');
    try {
        if(is_file($path))$registry=json_decode(file_get_contents($path),true,64,JSON_THROW_ON_ERROR);
        else $registry=['defaultId'=>'initial','defaultRevision'=>0,'databases'=>[['id'=>'initial','name'=>'Основная база','database'=>configuration()['db']['dbname'],'academicYear'=>configuration()['initial_academic_year'],'status'=>'ready','createdAt'=>date(DATE_ATOM)]]];
        if(!isset($registry['defaultId'],$registry['databases']))throw new RuntimeException('Invalid database registry');
        if($change)$registry=$change($registry);
        if($change||!is_file($path)){
            $tmp=$path.'.'.bin2hex(random_bytes(6)).'.tmp';
            if(file_put_contents($tmp,json_encode($registry,JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR))===false||!rename($tmp,$path))throw new RuntimeException('Registry write failed');
        }
        return $registry;
    } finally {flock($lock,LOCK_UN);fclose($lock);}
}

function registryDatabase(array $registry,string $id,bool $ready=true): array
{
    foreach($registry['databases'] as $item)if($item['id']===$id){
        if($ready&&$item['status']!=='ready')throw new ApiError(409,'DATABASE_NOT_READY','Копирование базы ещё не завершено.');
        return $item;
    }
    throw new ApiError(404,'DATABASE_NOT_FOUND','База не найдена в списке.');
}

function selectedDatabase(): array
{
    $registry=databaseRegistry();
    $id=$_SESSION['databaseId']??$registry['defaultId'];
    return registryDatabase($registry,$id);
}

function databaseSession(): ?array
{
    if(!isset($_SESSION['user_id']))return null;
    $selected=selectedDatabase();
    $_SESSION['databaseId']=$selected['id'];
    $_SESSION['databaseContext']??=bin2hex(random_bytes(16));
    $registry=databaseRegistry();
    return ['selectedId'=>$selected['id'],'context'=>$_SESSION['databaseContext'],'defaultId'=>$registry['defaultId'],'items'=>array_values(array_map(fn($r)=>['id'=>$r['id'],'name'=>$r['name'],'academicYear'=>$r['academicYear']],array_filter($registry['databases'],fn($r)=>$r['status']==='ready')))];
}

function requireDatabaseContext(): void
{
    databaseSession();
    $received=$_SERVER['HTTP_X_DATABASE_CONTEXT']??'';
    if(!hash_equals($_SESSION['databaseContext'],$received))throw new ApiError(409,'DATABASE_CHANGED','База была переключена. Обновите страницу перед продолжением работы.');
}

function switchDatabase(array $body,array $user): array
{
    $target=registryDatabase(databaseRegistry(),requiredText($body,'id',true));
    // Same existing authentication, verified against the target copy before switching.
    $result=queryConnection(databaseNamed($target['database']),'SELECT user_id FROM user_list WHERE username=$1',[$user['username']]);
    if(pg_num_rows($result)!==1)throw new ApiError(409,'USER_NOT_IN_DATABASE','В выбранной базе не найден ваш пользователь.');
    $_SESSION['user_id']=pg_fetch_result($result,0,0);
    $_SESSION['databaseId']=$target['id'];
    $_SESSION['databaseContext']=bin2hex(random_bytes(16));
    return databaseSession();
}

function defaultDatabase(string $id): array
{
    return databaseRegistry(function($registry)use($id){
        registryDatabase($registry,$id);$registry['defaultId']=$id;$registry['defaultRevision']++;return $registry;
    });
}

function postgresBin(): string
{
    $configured=configuration()['postgres_bin'];
    if($configured!=='')return rtrim($configured,'/\\');
    $paths=glob('C:/Program Files/PostgreSQL/*/bin')?:[];
    usort($paths,fn($a,$b)=>strnatcmp($b,$a));
    foreach($paths as $path)if(is_file($path.'/pg_dump.exe')&&is_file($path.'/pg_restore.exe'))return $path;
    throw new ApiError(503,'COPY_NOT_CONFIGURED','Укажите каталог PostgreSQL в настройке postgres_bin.');
}

function createDatabaseCopy(array $body): array
{
    $name=requiredText($body,'name',true);$database=requiredText($body,'database',true);
    $period=requiredText($body,'period',true);$source=requiredText($body,'sourceId',true);
    if(mb_strlen($name)>120||!preg_match('/^[a-z][a-z0-9_]{0,62}$/D',$database))throw new ApiError(422,'VALIDATION','Имя БД: латинские строчные буквы, цифры и подчёркивание, до 63 символов.');
    if(!preg_match('#^(20[0-9]{2})/(20[0-9]{2})$#D',$period,$years)||(int)$years[2]!==((int)$years[1]+1))throw new ApiError(422,'VALIDATION','Укажите учебный период, например 2026/2027.');
    postgresBin();
    $admin=databaseNamed(configuration()['db']['dbname']);
    if(pg_num_rows(queryConnection($admin,'SELECT 1 FROM pg_database WHERE datname=$1',[$database])))throw new ApiError(409,'DUPLICATE','База с таким техническим именем уже существует.');
    $id=bin2hex(random_bytes(16));
    databaseRegistry(function($registry)use($body,$name,$database,$period,$source,$id){
        $from=registryDatabase($registry,$source);
        foreach($registry['databases'] as $row)if($row['database']===$database)throw new ApiError(409,'DUPLICATE','Имя базы уже зарегистрировано.');
        if(array_filter($registry['databases'],fn($row)=>$row['status']==='copying'))throw new ApiError(409,'COPY_IN_PROGRESS','Дождитесь завершения текущего копирования.');
        $makeDefault=($body['makeDefault']??false)===true;
        if($makeDefault)$registry['defaultRevision']++;
        $registry['databases'][]=['id'=>$id,'name'=>$name,'database'=>$database,'academicYear'=>$period,'sourceId'=>$source,'sourceDatabase'=>$from['database'],'status'=>'copying','phase'=>'Подготовка копии','createdAt'=>date(DATE_ATOM),'makeDefault'=>$makeDefault,'defaultRevision'=>$registry['defaultRevision']];
        return $registry;
    });
    try {launchDatabaseCopy($id);}catch(Throwable $e){databaseCopyState($id,'failed','Не удалось запустить копирование. Проверьте PHP CLI и журнал сервера.');throw $e;}
    return ['id'=>$id];
}

function databaseCopyState(string $id,string $status,string $phase): void
{
    databaseRegistry(function($registry)use($id,$status,$phase){
        foreach($registry['databases'] as &$row)if($row['id']===$id){
            $row['status']=$status;$row['phase']=$phase;
            if($status==='ready'&&$row['makeDefault']&&$row['defaultRevision']===$registry['defaultRevision'])$registry['defaultId']=$id;
        }
        return $registry;
    });
}

function launchDatabaseCopy(string $id): void
{
    $php=configuration()['php_cli']?:PHP_BINDIR.'/php.exe';
    if(!is_file($php))throw new ApiError(503,'COPY_NOT_CONFIGURED','Укажите путь php_cli для запуска копирования.');
    $launcher=dirname(__DIR__).'/bin/start-database-copy.ps1';
    $process=proc_open(['powershell.exe','-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',$launcher,'-Php',$php,'-Worker',dirname(__DIR__).'/bin/database-copy.php','-Job',$id],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes,null,null,['bypass_shell'=>true]);
    if(!is_resource($process))throw new RuntimeException('Worker launch failed');
    fclose($pipes[0]);$out=stream_get_contents($pipes[1]);$error=stream_get_contents($pipes[2]);fclose($pipes[1]);fclose($pipes[2]);
    if(proc_close($process)!==0){error_log($error);throw new RuntimeException('Worker launch failed');}
}

// Recover a visibly interrupted worker without offering its partial database.
function databaseRegistryStatus(): array
{
    $registry=databaseRegistry();
    foreach($registry['databases'] as $row){
        if($row['status']!=='copying'||time()-strtotime($row['createdAt'])<60)continue;
        $path=dirname(__DIR__).'/var/database-copies/'.$row['id'].'.lock';
        $lock=is_file($path)?fopen($path,'c'):false;
        if(!$lock||flock($lock,LOCK_EX|LOCK_NB)){
            databaseCopyState($row['id'],'failed','Копирование было прервано. Частичная база недоступна для выбора.');
            if($lock)flock($lock,LOCK_UN);
        }
        if($lock)fclose($lock);
    }
    return databaseRegistry();
}
