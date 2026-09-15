<?php
declare(strict_types=1);

function gekNumbering(string $period, ?int $start = null): int
{
    archiveYear($period);
    $dir=dirname(__DIR__).'/var';
    if(!is_dir($dir)) mkdir($dir,0750,true);
    $name=PHP_SAPI==='cli'?configuration()['db']['dbname']:selectedDatabase()['database'];
    $path=$dir.'/gek-numbering-'.hash('sha256',$name).'.json';
    if(!is_file($path)&&$name===configuration()['db']['dbname']&&is_file($dir.'/gek-numbering.json'))copy($dir.'/gek-numbering.json',$path);
    $file=fopen($path,'c+');
    if(!$file || !flock($file,LOCK_EX)) throw new ApiError(503,'SETTINGS_UNAVAILABLE','Не удалось прочитать настройки нумерации.');
    try {
        $raw=stream_get_contents($file);
        $settings=$raw!=='' ? json_decode($raw,true,512,JSON_THROW_ON_ERROR) : [];
        if($start!==null) {
            if($start<1||$start>9999) throw new ApiError(422,'VALIDATION','Первый номер должен быть от 1 до 9999.');
            $settings[$period]=$start;
            rewind($file);ftruncate($file,0);fwrite($file,json_encode($settings,JSON_THROW_ON_ERROR));fflush($file);
        }
        return $settings[$period]??1;
    } finally {flock($file,LOCK_UN);fclose($file);}
}

function normalizeGekId(string $value, string $school): string
{
    if(!ctype_digit($value)||strlen($value)>6) throw new ApiError(422,'VALIDATION','Введите ГЭК ID цифрами.');
    $order=(int)substr($value,-2);
    if($order<1) throw new ApiError(422,'VALIDATION','Порядковая часть ГЭК ID должна быть от 01 до 99.');
    return $school.str_pad((string)$order,2,'0',STR_PAD_LEFT);
}

const GEK_LINKS = ['internalIds'=>['sec_teacher','id_teacher','teacher','id_teacher','teacher:'],
    'externalIds'=>['sec_sm','sm_id','sec_member','sm_id','member:'],
    'programIds'=>['sec_mep','id_mep','program_list','id_mep','']];

function gekState(array $record): array
{
    $state = ['record'=>$record];
    foreach (GEK_LINKS as $key=>[$table,$column]) {
        $state[$key] = array_column(rows("SELECT $column FROM $table WHERE id_sec=$1 ORDER BY $column", [$record['id_sec']]), $column);
    }
    return $state;
}

function gekCommission(array $state): array
{
    $row = $state['record'];
    $chair = rows('SELECT * FROM sec_predsedatel_s WHERE sm_id=$1', [$row['chairman']])[0] ?? [];
    $profile = array_fill_keys(['university','educationName','qualification','diplomaSeries','diplomaNumber','diplomaDate','department','speciality','certificateSeries','certificateNumber','certificateDate','honoraryTitle','publications','lectures','activity','experience'], '');
    foreach (CHAIR_FIELDS as $key=>$column) {
        $target = ['education'=>'educationName','type_activity'=>'activity','career_activity'=>'experience'][$key] ?? $key;
        if (array_key_exists($target, $profile)) $profile[$target] = $chair[$column] ?? '';
    }
    $result = ['id'=>(string)$row['id_sec'], 'number'=>(string)$row['id_com_sec'], 'gekId'=>(string)$row['id_com_sec'], 'school'=>(string)$row['id_school'],
        'year'=>'', 'type'=>($chair['complex']??'f')==='t'?'complex':'regular',
        'chairmanId'=>$row['chairman'] ? 'member:'.$row['chairman'] : '',
        'secretaryId'=>$row['secretary'] ? 'teacher:'.$row['secretary'] : '',
        'profile'=>$profile, 'updatedAt'=>'', 'version'=>version($state)];
    foreach (GEK_LINKS as $key=>[$table,$column,$ref,$pk,$prefix]) $result[$key]=array_map(fn($id)=>$prefix.$id, $state[$key]);
    return $result;
}

function gekSnapshot(string $period='2026/2027'): array
{
    $schools=rows('SELECT id_school AS id, name_school AS name, short FROM school ORDER BY id_school');
    $people=array_map(function($member){
        $person=personFromMember($member);
        $profile=rows('SELECT id_predsedatel_sc FROM sec_predsedatel_s WHERE sm_id=$1',[$member['sm_id']])[0]??null;
        if($profile)$person['chairmanProgramIds']=array_column(rows('SELECT p.id_mep::text AS id_mep FROM sec_program s JOIN program_list p ON p.id_program=s.id_program WHERE s.id_predsedatel_sc=$1 ORDER BY p.id_program,p.id_mep',[$profile['id_predsedatel_sc']]),'id_mep');
        return $person;
    }, rows('SELECT * FROM sec_member ORDER BY sm_name, sm_id'));
    foreach(rows('SELECT t.*, s.name_school FROM teacher t LEFT JOIN school s ON s.id_school=t.id_school ORDER BY name_teacher,id_teacher') as $t) {
        $people[]=['id'=>'teacher:'.$t['id_teacher'], 'name'=>$t['name_teacher']??'', 'organization'=>$t['name_school']??'',
            'position'=>$t['position_teacher']??'', 'degree'=>$t['academic_degree']??'', 'rank'=>$t['academic_rank']??'',
            'kind'=>'internal', 'initials'=>mb_substr($t['name_teacher']??'',0,1), 'color'=>'sage'];
    }
    $programs=rows("SELECT p.id_mep::text AS id,p.id_program AS code,p.name_program AS name,coalesce(l.level,'') AS level,'' AS school
        FROM program_list p LEFT JOIN direction_list d ON d.id_direction=p.id_direction LEFT JOIN levels l ON l.id_level=d.id_level ORDER BY p.id_program,p.id_mep");
    $commissions=array_map(fn($row)=>gekCommission(gekState($row)), rows('SELECT * FROM sec ORDER BY id_com_sec,id_sec'));
    $numberingStart=gekNumbering($period);
    $ordinals=array_column(rows('SELECT id_sec, number FROM sec_info'),'number','id_sec');
    foreach($commissions as &$commission) {
        $commission['gekId']=$commission['number'];
        $ordinal=(int)($ordinals[$commission['id']]??1)+$numberingStart-1;
        $commission['number']='37'.substr(archiveYear($period),-2).str_pad((string)$ordinal,2,'0',STR_PAD_LEFT);
    }
    unset($commission);
    return compact('schools','people','programs','commissions','numberingStart');
}

function gekId(?string $id, string $prefix): ?string
{
    if (!$id) return null;
    if ($prefix !== '' && !str_starts_with($id,$prefix)) throw new ApiError(422,'VALIDATION','Неверный тип участника. Обновите справочники.');
    return substr($id,strlen($prefix));
}

function saveGek(array $body): array
{
    return transaction(function() use ($body) {
        // Prevent concurrent duplicate numbers without changing the database schema.
        query('LOCK TABLE sec IN SHARE ROW EXCLUSIVE MODE');
        $id=requiredText($body,'id');
        $old=$id ? lockedRecord('sec','id_sec',$id) : null;
        if($old) requireVersion($body,gekState($old));
        $school=requiredText($body,'school',true);
        referenceExists('school','id_school',$school);
        $number=normalizeGekId(requiredText($body,isset($body['gekId'])?'gekId':'number',true),$school);
        if(rows('SELECT 1 FROM sec WHERE id_com_sec=$1 AND ($2::bigint IS NULL OR id_sec<>$2)',[$number,$id])) throw new ApiError(409,'DUPLICATE','Комиссия с таким ГЭК ID уже существует.');
        $chairman=gekId(requiredText($body,'chairmanId'),'member:');
        $secretary=gekId(requiredText($body,'secretaryId'),'teacher:');
        referenceExists('sec_member','sm_id',$chairman);
        referenceExists('teacher','id_teacher',$secretary);
        $links=[];
        foreach(GEK_LINKS as $key=>[$table,$column,$ref,$pk,$prefix]) {
            if(!is_array($body[$key]??null) || count($body[$key])>1000) throw new ApiError(422,'VALIDATION','Проверьте состав комиссии и программы.');
            $links[$key]=[];
            foreach($body[$key] as $value) {
                if(!is_string($value) || $value==='') throw new ApiError(422,'VALIDATION','Некорректная запись в составе комиссии.');
                $value=gekId($value,$prefix); referenceExists($ref,$pk,$value);
                $links[$key][]=$value;
            }
            $links[$key]=array_values(array_unique($links[$key]));
        }
        if(($secretary && in_array($secretary,$links['internalIds'],true)) || ($chairman && in_array($chairman,$links['externalIds'],true))) {
            throw new ApiError(422,'VALIDATION','Председателя и секретаря не нужно повторно добавлять в состав комиссии.');
        }
        $chairProfile=rows('SELECT id_predsedatel_sc FROM sec_predsedatel_s WHERE sm_id=$1',[$chairman])[0]??null;
        if($chairProfile){
            $allowed=rows('SELECT p.id_mep::text AS id_mep FROM sec_program s JOIN program_list p ON p.id_program=s.id_program WHERE s.id_predsedatel_sc=$1',[$chairProfile['id_predsedatel_sc']]);
            if($allowed){
                $allowedPrograms=array_column($allowed,'id_mep');
                foreach($links['programIds'] as $programId){
                    if(!in_array($programId,$allowedPrograms,true))
                        throw new ApiError(422,'CHAIRMAN_SCOPE','Выбранная ООП не закреплена за председателем.');
                }
            }
        }
        $values=['id_com_sec'=>$number,'id_school'=>$school,'chairman'=>$chairman,'secretary'=>$secretary];
        if($id) updateRecord('sec','id_sec',$id,$values); else $id=insertRecord('sec',$values,'id_sec');
        foreach(GEK_LINKS as $key=>[$table,$column]) {
            query("DELETE FROM $table WHERE id_sec=$1",[$id]);
            foreach($links[$key] as $value) query("INSERT INTO $table(id_sec,$column) VALUES($1,$2)",[$id,$value]);
        }
        return gekCommission(gekState(rows('SELECT * FROM sec WHERE id_sec=$1',[$id])[0]));
    });
}

function deleteGek(array $body): array
{
    return transaction(function() use ($body) {
        $id=requiredText($body,'id',true);
        $row=lockedRecord('sec','id_sec',$id);
        requireVersion($body,gekState($row));
        foreach(GEK_LINKS as [$table]) query("DELETE FROM $table WHERE id_sec=$1",[$id]);
        query('DELETE FROM sec WHERE id_sec=$1',[$id]);
        return ['deleted'=>true];
    });
}
