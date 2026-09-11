<?php
declare(strict_types=1);

function catalogDefinitions(): array
{
    return [
        'schools' => ['table'=>'school','pk'=>'id_school','fields'=>['name_school','short','chief','chief_role','rp','dp'],'required'=>['name_school','short'],'refs'=>[], 'manual'=>true],
        'teachers' => ['table'=>'teacher','pk'=>'id_teacher','fields'=>['id_school','name_teacher','academic_degree','academic_rank','position_teacher'],'required'=>['name_teacher','id_school'],'refs'=>['id_school'=>['school','id_school']], 'manual'=>true],
        'directions' => ['table'=>'direction_list','pk'=>'id_direction','fields'=>['number_direction','name_direction','id_level'],'required'=>['number_direction','name_direction','id_level'],'refs'=>['id_level'=>['levels','id_level']], 'unique'=>'number_direction'],
        'programs' => ['table'=>'program_list','pk'=>'id_mep','fields'=>['id_program','name_program','id_direction','chief_program','scient_position','staff_position'],'required'=>['id_program','name_program','id_direction'],'refs'=>['id_direction'=>['direction_list','id_direction']], 'unique'=>'id_program'],
        'disciplines' => ['table'=>'discipline','pk'=>'id_discipline','fields'=>['id_school','name_discipline','id_level'],'required'=>['id_school','name_discipline','id_level'],'refs'=>['id_school'=>['school','id_school'],'id_level'=>['levels','id_level']]],
    ];
}

function transaction(callable $operation): mixed
{
    query('BEGIN');
    try { $result = $operation(); query('COMMIT'); return $result; }
    catch (Throwable $error) { @pg_query(database(), 'ROLLBACK'); throw $error; }
}

function rows(string $sql, array $params=[]): array { return pg_fetch_all(query($sql,$params)) ?: []; }
function version(array $row): string { return hash('sha256', json_encode($row, JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)); }
function requireVersion(array $body, array $row): void
{
    if (!is_string($body['version']??null) || !hash_equals(version($row),$body['version'])) throw new ApiError(409,'STALE_RECORD','Запись уже изменена. Закройте форму, обновите таблицу и повторите изменение.');
}
function requiredText(array $body, string $key, bool $required=false): ?string
{
    $value=$body[$key]??null;
    if ($value!==null && !is_string($value)) throw new ApiError(422,'VALIDATION','Неверный формат поля.',[$key=>'Ожидается текст.']);
    if ($required && ($value===null || trim($value)==='')) throw new ApiError(422,'VALIDATION','Заполните обязательные поля.',[$key=>'Обязательное поле.']);
    if ($value!==null && strlen($value)>50000) throw new ApiError(422,'VALIDATION','Значение слишком длинное.',[$key=>'Сократите текст.']);
    return $value;
}
function referenceExists(string $table,string $pk,?string $id): void
{
    if ($id===null || $id==='') return;
    if ($pk!=='id_teacher' && !preg_match('/^\d+$/D',$id)) throw new ApiError(422,'INVALID_REFERENCE','Выберите значение из справочника.');
    if (!pg_num_rows(query("SELECT 1 FROM $table WHERE $pk=$1 FOR KEY SHARE",[$id]))) throw new ApiError(422,'INVALID_REFERENCE','Связанная запись не найдена. Обновите справочник.');
}
function insertRecord(string $table, array $values, string $pk): string
{
    $columns=implode(',',array_keys($values));
    $slots=implode(',',array_map(fn($i)=>'$'.$i,range(1,count($values))));
    return (string)pg_fetch_result(query("INSERT INTO $table ($columns) VALUES ($slots) RETURNING $pk",array_values($values)),0,0);
}
function updateRecord(string $table,string $pk,string $id,array $values): void
{
    $sets=[];$params=[];
    foreach($values as $column=>$value){$params[]=$value;$sets[]=$column.'=$'.count($params);}
    $params[]=$id;
    query("UPDATE $table SET ".implode(',',$sets)." WHERE $pk=$".count($params),$params);
}
function lockedRecord(string $table,string $pk,string $id): array
{
    $row=pg_fetch_assoc(query("SELECT * FROM $table WHERE $pk=$1 FOR UPDATE",[$id]));
    if (!$row) throw new ApiError(404,'NOT_FOUND','Запись не найдена. Возможно, она была удалена.');
    return $row;
}

// Check even ON DELETE CASCADE references before allowing deletion.
function preventReferencedDelete(string $table,string $pk,string $id,array $extra=[]): void
{
    $references=rows("SELECT ns.nspname AS schema_name, cls.relname AS table_name, a.attname AS column_name
        FROM pg_constraint c JOIN pg_class cls ON cls.oid=c.conrelid JOIN pg_namespace ns ON ns.oid=cls.relnamespace
        JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
        WHERE c.contype='f' AND c.confrelid=to_regclass($1) AND cardinality(c.conkey)=1",[$table]);
    foreach($references as $reference){
        $target=pg_escape_identifier($reference['schema_name']).'.'.pg_escape_identifier($reference['table_name']);
        $column=pg_escape_identifier($reference['column_name']);
        if(pg_num_rows(query("SELECT 1 FROM $target WHERE $column=$1 LIMIT 1",[$id]))) throw new ApiError(409,'IN_USE','Запись используется в других данных. Сначала измените связанные записи.');
    }
    foreach($extra as [$target,$column]){
        if(pg_num_rows(query("SELECT 1 FROM $target WHERE $column=$1 LIMIT 1",[$id]))) throw new ApiError(409,'IN_USE','Запись используется в комиссиях, карточках или программах. Удаление невозможно.');
    }
}
function catalogExtras(string $kind): array
{
    return match($kind){
        'schools'=>[['sec_helper','id_school'],['sec_complex_sc','id_school']],
        'teachers'=>[['sec_member','employee_number'],['sec_teacher','id_teacher'],['sec','secretary'],['spo','chairman'],['spo','secretary'],['certification','chairman']],
        'programs'=>[['sec_mep','id_mep'],['spo_mep','id_mep'],['mep_status','id_mep'],['tasks_mep_3','id_mep']],
        default=>[],
    };
}
function catalogSnapshot(): array
{
    $snapshot=[];
    foreach(catalogDefinitions() as $kind=>$def){
        $snapshot[$kind]=array_map(function($row){$token=version($row);return array_map(fn($v)=>$v??'',$row)+['version'=>$token];},rows("SELECT * FROM {$def['table']} ORDER BY {$def['pk']}"));
    }
    $snapshot['levels']=array_map(fn($row)=>['id'=>(string)$row['id_level'],'name'=>$row['level']],rows('SELECT id_level, level FROM levels ORDER BY id_level'));
    return $snapshot;
}
function saveCatalog(string $kind,array $body): array
{
    $def=catalogDefinitions()[$kind]??throw new ApiError(404,'NOT_FOUND','Справочник не найден.');
    return transaction(function()use($kind,$body,$def){
        $id=requiredText($body,'id');$table=$def['table'];$pk=$def['pk'];
        $old=$id ? lockedRecord($table,$pk,$id) : null;
        if($old) requireVersion($body,$old);
        $values=[];
        foreach($def['fields'] as $field){
            if(!array_key_exists($field,$body)&&$old) continue;
            $value=requiredText($body,$field,in_array($field,$def['required'],true));
            if(isset($def['refs'][$field])){referenceExists(...[...$def['refs'][$field],$value]);$value=$value===''?null:$value;}
            $values[$field]=$value;
        }
        if(isset($def['unique'])){
            $column=$def['unique'];
            query("LOCK TABLE $table IN SHARE ROW EXCLUSIVE MODE");
            if(pg_num_rows(query("SELECT 1 FROM $table WHERE $column=$1 AND ($2::text IS NULL OR $pk::text<>$2)",[$values[$column]??$old[$column],$id]))) throw new ApiError(409,'DUPLICATE','Запись с таким кодом уже существует.');
        }
        if($old) {
            updateRecord($table,$pk,$id,$values);
            // This legacy relation stores a program code, not id_mep.
            if($kind==='programs' && isset($values['id_program']) && $values['id_program']!==$old['id_program'])
                query('UPDATE sec_program SET id_program=$1 WHERE id_program=$2',[$values['id_program'],$old['id_program']]);
        }
        else {
            if($kind==='teachers') $values[$pk]=requiredText($body,'id_teacher',true);
            if($kind==='schools') {query('LOCK TABLE school IN SHARE ROW EXCLUSIVE MODE');$values[$pk]=(string)pg_fetch_result(query('SELECT COALESCE(MAX(id_school),0)+1 FROM school'),0,0);}
            $id=insertRecord($table,$values,$pk);
        }
        return ['id'=>$id];
    });
}
function deleteCatalog(string $kind,array $body): array
{
    $def=catalogDefinitions()[$kind]??throw new ApiError(404,'NOT_FOUND','Справочник не найден.');
    return transaction(function()use($kind,$body,$def){
        $id=requiredText($body,'id',true);$row=lockedRecord($def['table'],$def['pk'],$id);requireVersion($body,$row);
        preventReferencedDelete($def['table'],$def['pk'],$id,catalogExtras($kind));
        if($kind==='programs' && pg_num_rows(query('SELECT 1 FROM sec_program WHERE id_program=$1',[$row['id_program']])))throw new ApiError(409,'IN_USE','Программа используется в карточке председателя.');
        query("DELETE FROM {$def['table']} WHERE {$def['pk']}=$1",[$id]);return ['deleted'=>true];
    });
}
