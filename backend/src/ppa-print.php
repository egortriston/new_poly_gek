<?php
declare(strict_types=1);

function ppaCoverRecord(bool $amendment, ?string $school = null): array
{
    $condition=$amendment?'spo IS FALSE AND ac IS NOT TRUE AND add_edit IS TRUE':'ppa IS TRUE AND add_edit IS NOT TRUE';
    $matches=rows("SELECT * FROM cover_page WHERE id_school IS NOT DISTINCT FROM $1::integer AND $condition ORDER BY id_cover",[$school]);
    if(count($matches)>1)throw new ApiError(409,'DUPLICATE_COVER','Найдено несколько титульных листов ППА. Требуется уточнение.');
    return $matches[0]??[];
}

function ppaCover(bool $amendment, ?string $school = null): array
{
    $school=ppaSchool($school);
    $row=ppaCoverRecord($amendment,$school);
    $result=['school'=>$school??'','amendment'=>$amendment,'version'=>version($row)];
    foreach(['num','cover_date','num_add','cover_date_add','cover_year','opt','dir'] as $field)$result[$field]=$row[$field]??'';
    return $result;
}

function ppaSchool(?string $school): ?string
{
    $school=$school ?: null;
    if($school && (!ctype_digit($school) || !rows('SELECT 1 FROM school WHERE id_school=$1',[$school])))
        throw new ApiError(422,'INVALID_REFERENCE','Высшая школа не найдена.');
    return $school;
}

function ppaAmendment(array $body): bool
{
    if(!is_bool($body['amendment']??null))throw new ApiError(422,'VALIDATION','Выберите основной документ или дополнение.');
    return $body['amendment'];
}

function savePpaCover(array $body): array
{
    return transaction(function()use($body){
        query('LOCK TABLE cover_page IN SHARE ROW EXCLUSIVE MODE');
        $amendment=ppaAmendment($body);
        $school=ppaSchool(requiredText($body,'school'));
        $old=ppaCoverRecord($amendment,$school);requireVersion($body,$old);
        $values=[];
        $fields=$amendment?($school?['num_add','cover_date_add','cover_year','opt']:['num','cover_date','num_add','cover_date_add','cover_year','opt','dir']):['num','cover_date','cover_year'];
        foreach($fields as $field){
            $value=trim(requiredText($body,$field,true));
            if(str_contains($field,'date')){
                $date=DateTimeImmutable::createFromFormat('!Y-m-d',$value);
                if(!$date||$date->format('Y-m-d')!==$value)throw new ApiError(422,'VALIDATION','Укажите корректную дату документа.');
            }
            $values[$field]=$value;
        }
        archiveYear($values['cover_year']);
        if($old)updateRecord('cover_page','id_cover',$old['id_cover'],$values);
        else {
            $caps=ppaCoverRecord(!$amendment,$school)['caps']??'';
            insertRecord('cover_page',$values+['id_school'=>$school,'caps'=>$caps,'spo'=>'false','ac'=>'false','ppa'=>$amendment?'false':'true','add_edit'=>$amendment?'true':'false'],'id_cover');
        }
        return ppaCover($amendment,$school);
    });
}

function ppaPrintQuery($connection,string $sql): PgSql\Result
{
    global $ppaPrintIds,$ppaPrintCover;
    if(str_contains($sql,'FROM cover_page'))return query('SELECT * FROM cover_page WHERE id_cover=$1',[$ppaPrintCover['id_cover']??null]);
    if($ppaPrintIds && str_contains($sql,'FROM certification_info')){
        $parts=preg_split('/\bORDER BY\b/i',$sql,2);
        $sql=$parts[0].(preg_match('/\bWHERE\b/i',$parts[0])?' AND ':' WHERE ').'id_cert IN ('.implode(',',$ppaPrintIds).')';
        if(isset($parts[1]))$sql.=' ORDER BY '.$parts[1];
    }
    return query($sql);
}

function ppaPrint(array $body): string
{
    global $ppaPrintIds,$ppaPrintCover;
    $amendment=ppaAmendment($body);$period=requiredText($body,'academicYear',true);archiveYear($period);
    $tableOnly=($body['tableOnly']??false)===true;
    $ids=$body['ids']??[];
    if(!is_array($ids)||count($ids)>1000)throw new ApiError(422,'VALIDATION','Некорректный список комиссий.');
    foreach($ids as $id)if(!is_string($id)||!ctype_digit($id))throw new ApiError(422,'VALIDATION','Некорректный идентификатор комиссии.');
    $schoolId=ppaSchool(requiredText($body,'school'));
    $ppaPrintIds=array_values(array_unique($ids));$ppaPrintCover=ppaCoverRecord($amendment,$schoolId);
    try {
        if(!$tableOnly){
            $fields=$amendment?($schoolId?['num_add','cover_date_add','opt']:['num','cover_date','num_add','cover_date_add','opt','dir']):['num','cover_date'];
            foreach($fields as $field)if(!trim($ppaPrintCover[$field]??''))throw new ApiError(422,'COVER_REQUIRED','Сначала заполните титульный лист выбранного документа.');
        }
        $schoolFilter=$schoolId?' AND id_school='.(int)$schoolId:'';
        $flag=$amendment?'TRUE':'FALSE';
        if((int)pg_fetch_result(ppaPrintQuery(database(),"SELECT count(*) FROM certification_info WHERE add_edit IS $flag $schoolFilter"),0,0)===0)throw new ApiError(422,'EMPTY_SELECTION','Нет комиссий ППА для печати.');
        $conn=database();
        ob_start();
        try{return require dirname(__DIR__).'/templates/ppa/'.($amendment?'amendment':'order').'.php';}
        finally{ob_end_clean();}
    }finally{$ppaPrintIds=[];$ppaPrintCover=[];}
}
