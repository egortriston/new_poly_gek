<?php
declare(strict_types=1);
require dirname(__DIR__).'/src/bootstrap.php';
if(PHP_SAPI!=='cli')exit(1);
$id=$argv[1]??'';
if(!preg_match('/^[a-f0-9]{32}$/D',$id))exit(1);
$directory=dirname(__DIR__).'/var/database-copies';
if(!is_dir($directory))mkdir($directory,0700,true);
$lock=fopen($directory.'/'.$id.'.lock','c');
if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))exit(1);
$dump=$directory.'/'.$id.'.dump';$log=$directory.'/'.$id.'.log';
$created=false;
try {
    $job=registryDatabase(databaseRegistry(),$id,false);
    if($job['status']!=='copying')exit(0);
    set_time_limit(0);
    $config=configuration()['db'];$bin=postgresBin();
    $args=['--host='.$config['host'],'--port='.$config['port'],'--username='.$config['user'],'--no-password'];
    $environment=getenv();$environment['PGPASSWORD']=$config['password'];$environment['PGCONNECT_TIMEOUT']='10';
    $run=function(array $command)use($environment,$log){
        $process=proc_open($command,[0=>['file','NUL','r'],1=>['file',$log,'a'],2=>['file',$log,'a']],$pipes,null,$environment,['bypass_shell'=>true]);
        if(!is_resource($process)||proc_close($process)!==0)throw new RuntimeException('PostgreSQL copy command failed; see private job log');
    };
    databaseCopyState($id,'copying','Создание резервной копии');
    $run(array_merge([$bin.'/pg_dump.exe'],$args,['--format=custom','--file='.$dump,'--dbname='.$job['sourceDatabase']]));
    $connection=databaseNamed(configuration()['db']['dbname']);
    queryConnection($connection,'CREATE DATABASE '.pg_escape_identifier($connection,$job['database']).' TEMPLATE template0');$created=true;
    databaseCopyState($id,'copying','Восстановление данных');
    $run(array_merge([$bin.'/pg_restore.exe'],$args,['--exit-on-error','--no-owner','--no-privileges','--single-transaction','--dbname='.$job['database'],$dump]));
    $target=databaseNamed($job['database']);
    queryConnection($target,'SELECT user_id,username FROM user_list LIMIT 1');
    queryConnection($target,'SELECT id_mep FROM program_list LIMIT 1');
    // Preserve per-database application settings, while the archive stays shared.
    $numbering=dirname(__DIR__).'/var/gek-numbering-'.hash('sha256',$job['sourceDatabase']).'.json';
    if(!is_file($numbering)&&$job['sourceDatabase']===configuration()['db']['dbname'])$numbering=dirname(__DIR__).'/var/gek-numbering.json';
    if(is_file($numbering))copy($numbering,dirname(__DIR__).'/var/gek-numbering-'.hash('sha256',$job['database']).'.json');
    databaseCopyState($id,'ready','Копия готова');
} catch(Throwable $error) {
    file_put_contents($log,date(DATE_ATOM).' '.$error->getMessage().PHP_EOL,FILE_APPEND);
    // Never drop a database on a failed job: leave it unavailable for investigation.
    databaseCopyState($id,'failed',$created?'Не удалось восстановить копию. База недоступна для выбора; подробности в журнале копирования.':'Не удалось создать копию. Проверьте права PostgreSQL и журнал копирования.');
    $failed=true;
} finally {
    if(is_file($dump))unlink($dump);
    flock($lock,LOCK_UN);fclose($lock);
}

exit(isset($failed)?1:0);
