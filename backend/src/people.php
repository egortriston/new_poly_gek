<?php
declare(strict_types=1);
const CHAIR_FIELDS=[
    'university'=>'education_university','education'=>'education_name','qualification'=>'education_speciality',
    'diplomaSeries'=>'diploma_series','diplomaNumber'=>'diploma_nu','diplomaDate'=>'diploma_date',
    'department'=>'by_department','speciality'=>'by_speciality','certificateSeries'=>'at_series',
    'certificateNumber'=>'at_nu','certificateDate'=>'at_date','honoraryTitle'=>'honorary_title',
    'publications'=>'publications','lectures'=>'lectures','type_activity'=>'type_activity','career_activity'=>'career_activity','candidate_is'=>'candidate_is',
];
function personFromMember(array $row): array
{
    return ['id'=>'member:'.$row['sm_id'],'name'=>$row['sm_name']??'','organization'=>$row['organization']??'',
        'position'=>$row['sm_position']??'','degree'=>$row['academic_degree']??'','rank'=>$row['academic_rank']??'',
        'kind'=>$row['sm_outer']==='t'?'external':'internal','color'=>'sage','initials'=>mb_substr($row['sm_name']??'',0,1)];
}
function chairState(array $row): array
{
    $complex=$row['complex']==='t';
    $schools=$complex?rows('SELECT id_school FROM sec_complex_sc WHERE id_predsedatel_sc=$1 ORDER BY id_school',[$row['id_predsedatel_sc']]):rows('SELECT id_school FROM sec_helper WHERE chairman=$1 ORDER BY id_school',[$row['sm_id']]);
    $programs=rows('SELECT p.id_mep::text AS id_mep, p.id_direction::text AS id_direction FROM sec_program s JOIN program_list p ON p.id_program=s.id_program WHERE s.id_predsedatel_sc=$1 ORDER BY p.id_program,p.id_mep',[$row['id_predsedatel_sc']]);
    return ['record'=>$row,'schools'=>array_column($schools,'id_school'),'programs'=>array_column($programs,'id_mep'),'directions'=>array_values(array_unique(array_column($programs,'id_direction')))];
}
function peopleSnapshot(): array
{
    $members=rows('SELECT * FROM sec_member ORDER BY sm_name, sm_id');
    $people=array_map('personFromMember',$members);$external=[];$chairmen=[];$complex=[];
    foreach($members as $member)if($member['sm_outer']==='t')$external[]=['id'=>(string)$member['sm_id'],'personId'=>'member:'.$member['sm_id'],'sphere'=>'Бизнес','schoolIds'=>[],'values'=>[],'version'=>version($member)];
    foreach(rows('SELECT t.*, s.name_school FROM teacher t LEFT JOIN school s ON s.id_school=t.id_school ORDER BY t.name_teacher') as $teacher){
        if(array_filter($members,fn($m)=>$m['employee_number']!==null&&$m['employee_number']===$teacher['id_teacher']))continue;
        $people[]=['id'=>'teacher:'.$teacher['id_teacher'],'name'=>$teacher['name_teacher']??'','organization'=>$teacher['name_school']??'', 'position'=>$teacher['position_teacher']??'','degree'=>$teacher['academic_degree']??'','rank'=>$teacher['academic_rank']??'','kind'=>'internal','color'=>'sage','initials'=>mb_substr($teacher['name_teacher']??'',0,1)];
    }
    foreach(rows('SELECT * FROM sec_predsedatel_s ORDER BY id_predsedatel_sc') as $row){
        if(!array_filter($people,fn($person)=>$person['id']==='member:'.$row['sm_id'])){
            $people[]=['id'=>'member:'.$row['sm_id'],'name'=>'Участник не найден','organization'=>'Нарушена связь в исходных данных','position'=>'','degree'=>'','rank'=>'','kind'=>'external','color'=>'sage','initials'=>'?','missing'=>true];
        }
        $state=chairState($row);$values=[];foreach(CHAIR_FIELDS as $key=>$column)$values[$key]=$row[$column]??'';
        $entry=['id'=>(string)$row['id_predsedatel_sc'],'personId'=>'member:'.$row['sm_id'],'sphere'=>$row['area']??'','schoolIds'=>$state['schools'],'programIds'=>$state['programs'],'directionIds'=>$state['directions'],'values'=>$values,'version'=>version($state)];
        if($row['complex']==='t')$complex[]=$entry;else $chairmen[]=$entry;
    }
    return ['people'=>$people,'entries'=>['external'=>$external,'chairmen'=>$chairmen,'complex'=>$complex]];
}
function memberId(string $key): string
{
    if(str_starts_with($key,'member:')){$id=substr($key,7);lockedRecord('sec_member','sm_id',$id);return $id;}
    if(!str_starts_with($key,'teacher:'))throw new ApiError(422,'INVALID_PERSON','Выберите человека из справочника.');
    $id=substr($key,8);$teacher=lockedRecord('teacher','id_teacher',$id);
    $existing=rows('SELECT sm_id FROM sec_member WHERE employee_number=$1',[$id]);
    if(count($existing)>1)throw new ApiError(409,'AMBIGUOUS_PERSON','Для преподавателя найдено несколько записей участников. Обратитесь к администратору.');
    if($existing)return (string)$existing[0]['sm_id'];
    $school=rows('SELECT name_school FROM school WHERE id_school=$1',[$teacher['id_school']]);
    return insertRecord('sec_member',['employee_number'=>$id,'sm_name'=>$teacher['name_teacher'],'sm_outer'=>'f','academic_degree'=>$teacher['academic_degree'],'academic_rank'=>$teacher['academic_rank'],'organization'=>$school[0]['name_school']??null,'sm_position'=>$teacher['position_teacher']],'sm_id');
}
function savePeople(string $category,array $body): array
{
    if(!in_array($category,['external','chairmen','complex'],true))throw new ApiError(404,'NOT_FOUND','Таблица не найдена.');
    return transaction(function()use($category,$body){
        $id=requiredText($body,'id');
        if($category==='external'){
            $old=$id?lockedRecord('sec_member','sm_id',$id):null;
            if($old){if($old['sm_outer']!=='t')throw new ApiError(409,'INVALID_PERSON','Это внутренний участник.');requireVersion($body,$old);}
            $person=$body['person']??[];if(!is_array($person))throw new ApiError(422,'VALIDATION','Неверные сведения участника.');
            $values=['sm_outer'=>'t'];foreach(['name'=>'sm_name','organization'=>'organization','position'=>'sm_position','degree'=>'academic_degree','rank'=>'academic_rank'] as $key=>$column)$values[$column]=requiredText($person,$key,$key==='name');
            if($id)updateRecord('sec_member','sm_id',$id,$values);else $id=insertRecord('sec_member',$values,'sm_id');
            return ['id'=>$id];
        }
        $old=$id?lockedRecord('sec_predsedatel_s','id_predsedatel_sc',$id):null;
        if($old){if(($old['complex']==='t')!==($category==='complex'))throw new ApiError(409,'WRONG_CATEGORY','Неверный тип карточки.');requireVersion($body,chairState($old));}
        $sphere=requiredText($body,'sphere',true);
        if(!in_array($sphere,['Образование','Бизнес'],true))throw new ApiError(422,'VALIDATION','Выберите сферу деятельности.');
        $schools=$body['schoolIds']??null;
        if(!is_array($schools)||count($schools)>100||count($schools)!==count(array_unique($schools)))throw new ApiError(422,'VALIDATION','Некорректный список школ.');
        if($category==='chairmen'&&count($schools)!==1)throw new ApiError(422,'VALIDATION','Выберите одну высшую школу.');
        foreach($schools as $school){if(!is_string($school))throw new ApiError(422,'VALIDATION','Неверная школа.');referenceExists('school','id_school',$school);}
        $smId=$old?(string)$old['sm_id']:memberId(requiredText($body,'personId',true));
        if($old && !pg_num_rows(query('SELECT 1 FROM sec_member WHERE sm_id=$1',[$smId])))
            throw new ApiError(409,'MISSING_PERSON','Связанный участник отсутствует. Сначала нужно уточнить и восстановить связь карточки.');
        // The legacy system allows one professional card per member across both kinds.
        if(!$old && pg_num_rows(query('SELECT 1 FROM sec_predsedatel_s WHERE sm_id=$1',[$smId])))throw new ApiError(409,'DUPLICATE','Карточка этого председателя уже существует.');
        $values=['sm_id'=>$smId,'area'=>$sphere,'complex'=>$category==='complex'?'t':'f'];
        $fields=$body['values']??[];if(!is_array($fields))throw new ApiError(422,'VALIDATION','Неверные поля карточки.');
        $programs=$body['programIds']??[];
        if(!is_array($programs)||count($programs)>300||count($programs)!==count(array_unique($programs)))throw new ApiError(422,'VALIDATION','Некорректный список образовательных программ.');
        $directions=[];
        $programCodes=[];
        foreach($programs as $program){
            if(!is_string($program))throw new ApiError(422,'VALIDATION','Неверная образовательная программа.');
            $programRow=rows('SELECT id_program,id_direction FROM program_list WHERE id_mep=$1',[$program])[0]??throw new ApiError(422,'INVALID_REFERENCE','Образовательная программа не найдена.');
            $directions[]=(string)$programRow['id_direction'];
            $programCodes[]=(string)$programRow['id_program'];
        }
        foreach(CHAIR_FIELDS as $key=>$column){if(array_key_exists($key,$fields))$values[$column]=requiredText($fields,$key);}
        if($old)updateRecord('sec_predsedatel_s','id_predsedatel_sc',$id,$values);else $id=insertRecord('sec_predsedatel_s',$values,'id_predsedatel_sc');
        query('DELETE FROM sec_program WHERE id_predsedatel_sc=$1',[$id]);
        foreach($programCodes as $programCode)query('INSERT INTO sec_program(id_predsedatel_sc,id_program) VALUES($1,$2)',[$id,$programCode]);
        if($category==='complex'){
            if(!$old)insertRecord('sec_complex',['chairman'=>$smId],'id_complex');
            query('DELETE FROM sec_complex_sc WHERE id_predsedatel_sc=$1',[$id]);
            foreach($schools as $school)insertRecord('sec_complex_sc',['id_predsedatel_sc'=>$id,'id_school'=>$school],'id');
        }else{
            query('DELETE FROM sec_helper WHERE chairman=$1',[$smId]);
            insertRecord('sec_helper',['chairman'=>$smId,'id_school'=>$schools[0]],'id_sec');
        }
        $result=['id'=>$id];
        if(!$old && isset($body['academicYear'])){
            $member=rows('SELECT sm_name FROM sec_member WHERE sm_id=$1',[$smId])[0];
            $result['archiveFolder']=archiveEnsureChairman($smId,requiredText($body,'academicYear',true),(string)$member['sm_name']);
        }
        return $result;
    });
}

function chairmanArchiveFolder(string $category,array $body): array
{
    if(!in_array($category,['chairmen','complex'],true))throw new ApiError(404,'NOT_FOUND','Таблица не найдена.');
    return transaction(function()use($category,$body){
        $id=requiredText($body,'id',true);
        $row=lockedRecord('sec_predsedatel_s','id_predsedatel_sc',$id);
        if(($row['complex']==='t')!==($category==='complex'))throw new ApiError(409,'WRONG_CATEGORY','Неверный тип карточки.');
        requireVersion($body,chairState($row));
        $member=rows('SELECT sm_name FROM sec_member WHERE sm_id=$1',[$row['sm_id']])[0]??null;
        if(!$member)throw new ApiError(409,'MISSING_PERSON','Связанный участник отсутствует. Сначала нужно уточнить и восстановить связь карточки.');
        return ['folder'=>archiveEnsureChairman((string)$row['sm_id'],requiredText($body,'academicYear',true),(string)$member['sm_name'])];
    });
}
function deletePeople(string $category,array $body): array
{
    return transaction(function()use($category,$body){
        $id=requiredText($body,'id',true);
        if($category==='external'){
            $row=lockedRecord('sec_member','sm_id',$id);requireVersion($body,$row);
            if($row['sm_outer']!=='t')throw new ApiError(409,'INVALID_PERSON','Это внутренний участник.');
            preventReferencedDelete('sec_member','sm_id',$id,[['sec_sm','sm_id'],['sec_predsedatel_s','sm_id'],['sec_complex','chairman'],['sec_helper','chairman']]);
            query('DELETE FROM sec_member WHERE sm_id=$1',[$id]);
        }else{
            if(!in_array($category,['chairmen','complex'],true))throw new ApiError(404,'NOT_FOUND','Таблица не найдена.');
            $row=lockedRecord('sec_predsedatel_s','id_predsedatel_sc',$id);requireVersion($body,chairState($row));
            if(($row['complex']==='t')!==($category==='complex'))throw new ApiError(409,'WRONG_CATEGORY','Неверный тип карточки.');
            if(pg_num_rows(query('SELECT 1 FROM sec WHERE chairman=$1',[$row['sm_id']]))||pg_num_rows(query('SELECT 1 FROM sec_as WHERE id_predsedatel_sc=$1',[$id])))throw new ApiError(409,'IN_USE','Председатель используется в комиссии или документе. Удаление невозможно.');
            query('DELETE FROM sec_program WHERE id_predsedatel_sc=$1',[$id]);
            query('DELETE FROM sec_complex_sc WHERE id_predsedatel_sc=$1',[$id]);
            if($category==='complex')query('DELETE FROM sec_complex WHERE chairman=$1',[$row['sm_id']]);
            else query('DELETE FROM sec_helper WHERE chairman=$1',[$row['sm_id']]);
            query('DELETE FROM sec_predsedatel_s WHERE id_predsedatel_sc=$1',[$id]);
        }
        return ['deleted'=>true];
    });
}
