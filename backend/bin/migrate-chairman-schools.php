<?php
declare(strict_types=1);

// Run from CLI. --check is read-only; --simulate rolls the migration back;
// --apply backs up every selected database before changing any of them.
require dirname(__DIR__).'/src/bootstrap.php';

$mode='check';
$only=null;
foreach(array_slice($argv,1) as $argument){
    if(in_array($argument,['--check','--simulate','--apply'],true))$mode=substr($argument,2);
    elseif(str_starts_with($argument,'--database='))$only=substr($argument,11);
    else throw new InvalidArgumentException('Usage: php backend/bin/migrate-chairman-schools.php [--check|--simulate|--apply] [--database=registered_name]');
}

$registry=databaseRegistry();
$names=array_values(array_unique(array_map(
    fn($row)=>(string)$row['database'],
    array_filter($registry['databases'],fn($row)=>$row['status']==='ready' && ($only===null || $row['database']===$only))
)));
if(!$names)throw new RuntimeException('No ready registered databases match the request.');

function migrationRows(PgSql\Connection $connection,string $sql): array
{
    return pg_fetch_all(queryConnection($connection,$sql))?:[];
}

function chairmanSchoolSource(): string
{
    return "SELECT DISTINCT c.id_predsedatel_sc,h.id_school
        FROM sec_helper h
        JOIN sec_predsedatel_s c ON c.sm_id=h.chairman AND c.complex IS NOT TRUE
        JOIN school s ON s.id_school=h.id_school
        WHERE (SELECT count(*) FROM sec_predsedatel_s c2
               WHERE c2.sm_id=h.chairman AND c2.complex IS NOT TRUE)=1
        UNION
        SELECT DISTINCT c.id_predsedatel_sc,h.id_school
        FROM sec_complex_sc h
        JOIN sec_predsedatel_s c ON c.id_predsedatel_sc=h.id_predsedatel_sc AND c.complex IS TRUE
        JOIN school s ON s.id_school=h.id_school";
}

function chairmanSchoolReport(PgSql\Connection $connection): array
{
    $source=chairmanSchoolSource();
    $counts=migrationRows($connection,"SELECT
        (SELECT count(*) FROM sec_helper) AS regular_source,
        (SELECT count(*) FROM sec_complex_sc) AS complex_source,
        (SELECT count(*) FROM ($source) mapped) AS mappable,
        (SELECT count(*) FROM sec_helper h WHERE NOT EXISTS
            (SELECT 1 FROM sec_predsedatel_s c WHERE c.sm_id=h.chairman AND c.complex IS NOT TRUE)
        ) AS regular_without_card,
        (SELECT count(*) FROM sec_helper h LEFT JOIN sec_member m ON m.sm_id=h.chairman
            WHERE m.sm_id IS NULL) AS regular_without_person,
        (SELECT count(*) FROM sec_helper h WHERE
            (SELECT count(*) FROM sec_predsedatel_s c
             WHERE c.sm_id=h.chairman AND c.complex IS NOT TRUE)>1) AS ambiguous_regular,
        (SELECT count(*) FROM sec_complex_sc h LEFT JOIN sec_predsedatel_s c
            ON c.id_predsedatel_sc=h.id_predsedatel_sc AND c.complex IS TRUE
            WHERE c.id_predsedatel_sc IS NULL) AS invalid_complex,
        (SELECT count(*) FROM sec_helper h LEFT JOIN school s ON s.id_school=h.id_school
            WHERE s.id_school IS NULL) AS invalid_regular_school,
        (SELECT count(*) FROM sec_complex_sc h LEFT JOIN school s ON s.id_school=h.id_school
            WHERE s.id_school IS NULL) AS invalid_complex_school")[0];
    $exists=migrationRows($connection,"SELECT to_regclass('public.sec_chair_school') IS NOT NULL AS found")[0]['found']==='t';
    $counts['new_links']=$exists?migrationRows($connection,'SELECT count(*) AS n FROM public.sec_chair_school')[0]['n']:null;
    $counts['unresolved_regular_ids']=array_column(migrationRows($connection,"SELECT h.id_sec
        FROM sec_helper h LEFT JOIN school s ON s.id_school=h.id_school
        WHERE s.id_school IS NULL OR
          (SELECT count(*) FROM sec_predsedatel_s c
           WHERE c.sm_id=h.chairman AND c.complex IS NOT TRUE)<>1
        ORDER BY h.id_sec"),'id_sec');
    $counts['unresolved_complex_ids']=array_column(migrationRows($connection,"SELECT h.id
        FROM sec_complex_sc h LEFT JOIN school s ON s.id_school=h.id_school
        LEFT JOIN sec_predsedatel_s c ON c.id_predsedatel_sc=h.id_predsedatel_sc AND c.complex IS TRUE
        WHERE s.id_school IS NULL OR c.id_predsedatel_sc IS NULL
        ORDER BY h.id"),'id');
    return $counts;
}

function backupChairmanDatabase(string $name,string $directory): string
{
    $binary=postgresBin().'/pg_dump.exe';
    if(!is_file($binary))throw new RuntimeException('pg_dump.exe is missing.');
    $config=configuration()['db'];
    $file=$directory.'/'.$name.'-'.date('Ymd-His').'-'.bin2hex(random_bytes(4)).'.dump';
    $previous=getenv('PGPASSWORD');
    putenv('PGPASSWORD='.(string)$config['password']);
    try {
        $process=proc_open([$binary,'--no-password','--format=custom','--host='.(string)$config['host'],
            '--port='.(string)$config['port'],'--username='.(string)$config['user'],
            '--file='.$file,$name],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes,null,null,['bypass_shell'=>true]);
        if(!is_resource($process))throw new RuntimeException('Could not launch pg_dump.');
        fclose($pipes[0]);$output=stream_get_contents($pipes[1]);$error=stream_get_contents($pipes[2]);
        fclose($pipes[1]);fclose($pipes[2]);
        if(proc_close($process)!==0 || !is_file($file) || filesize($file)===0){
            @unlink($file);
            throw new RuntimeException('Backup failed for '.$name.': '.trim($error?:$output));
        }
        return $file;
    } finally {
        if($previous===false)putenv('PGPASSWORD');else putenv('PGPASSWORD='.$previous);
    }
}

function applyChairmanSchools(PgSql\Connection $connection,bool $commit): array
{
    queryConnection($connection,'BEGIN');
    try {
        queryConnection($connection,"SELECT pg_advisory_xact_lock(hashtext('sec_chair_school_migration'))");
        queryConnection($connection,'LOCK TABLE sec_helper,sec_complex_sc,sec_predsedatel_s,school IN SHARE MODE');
        queryConnection($connection,'CREATE TABLE IF NOT EXISTS public.sec_chair_school (
            id_predsedatel_sc integer NOT NULL REFERENCES public.sec_predsedatel_s(id_predsedatel_sc),
            id_school integer NOT NULL REFERENCES public.school(id_school),
            PRIMARY KEY (id_predsedatel_sc,id_school))');
        queryConnection($connection,'CREATE INDEX IF NOT EXISTS sec_chair_school_school_idx ON public.sec_chair_school(id_school)');
        $source=chairmanSchoolSource();
        queryConnection($connection,"INSERT INTO public.sec_chair_school(id_predsedatel_sc,id_school)
            SELECT id_predsedatel_sc,id_school FROM ($source) mapped ON CONFLICT DO NOTHING");
        $missing=migrationRows($connection,"SELECT count(*) AS n FROM ($source) mapped
            WHERE NOT EXISTS (SELECT 1 FROM public.sec_chair_school target
                WHERE target.id_predsedatel_sc=mapped.id_predsedatel_sc
                AND target.id_school=mapped.id_school)")[0]['n'];
        if((int)$missing!==0)throw new RuntimeException('Some resolvable links were not copied.');
        $extra=migrationRows($connection,"SELECT count(*) AS n FROM public.sec_chair_school target
            WHERE NOT EXISTS (SELECT 1 FROM ($source) mapped
                WHERE mapped.id_predsedatel_sc=target.id_predsedatel_sc
                AND mapped.id_school=target.id_school)")[0]['n'];
        if((int)$extra!==0)throw new RuntimeException('The new table has links missing from legacy tables; inspect them before continuing.');
        $report=chairmanSchoolReport($connection);
        queryConnection($connection,$commit?'COMMIT':'ROLLBACK');
        return $report;
    } catch(Throwable $error) {
        @pg_query($connection,'ROLLBACK');
        throw $error;
    }
}

try {
    echo 'Mode: '.$mode.'; databases: '.implode(', ',$names).PHP_EOL;
    if($mode==='apply') {
        $backupDir=dirname(__DIR__).'/var/db-backups/chairman-schools';
        if(!is_dir($backupDir)&&!mkdir($backupDir,0700,true)&&!is_dir($backupDir))
            throw new RuntimeException('Could not create backup directory.');
        foreach($names as $name){
            $file=backupChairmanDatabase($name,$backupDir);
            echo $name.' backup: '.$file.PHP_EOL;
        }
    }
    foreach($names as $name){
        $connection=databaseNamed($name);
        if($mode==='check'){
            queryConnection($connection,'BEGIN READ ONLY');
            try{$report=chairmanSchoolReport($connection);}finally{queryConnection($connection,'ROLLBACK');}
        }else $report=applyChairmanSchools($connection,$mode==='apply');
        echo $name.': '.json_encode($report,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR).PHP_EOL;
    }
} catch(Throwable $error) {
    fwrite(STDERR,'Migration stopped: '.$error->getMessage().PHP_EOL);
    exit(1);
}
