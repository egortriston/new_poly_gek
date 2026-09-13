<?php
declare(strict_types=1);

function oopDirectionDefinition(string $kind): array
{
    $type = ['types_task', 'id_type_task', 'name_type_task'];
    return match ($kind) {
        'areas' => ['table'=>'area_activities', 'pk'=>'id_aa', 'fields'=>['id_area_activity','area'], 'refs'=>[0=>['area_activities_list','id_area_activity',"concat_ws(' · ',id_area_activity,area_activity)"]], 'required'=>[0,1], 'uses'=>[['program_area_activities','id_aa']]],
        'tasks' => ['table'=>'prof_tasks', 'pk'=>'id_prof_task', 'fields'=>['id_type_task','name_prof_task'], 'refs'=>[0=>$type], 'required'=>[0,1], 'uses'=>[['program_prof_tasks','id_prof_task'],['matrix_pk_suos','id_prof_task'],['matrix_pk_oop','id_prof_task']]],
        'objects' => ['table'=>'prof_objects', 'pk'=>'id_prof_object', 'fields'=>['id_type_task','name_prof_object'], 'refs'=>[0=>$type], 'required'=>[0,1], 'uses'=>[['program_prof_objects','id_prof_object'],['matrix_pk_suos','id_prof_object'],['matrix_pk_oop','id_prof_object']]],
        'standards' => ['table'=>'direction_prof_standards', 'pk'=>'id_direction_prof_standard', 'fields'=>['id_prof_standard'], 'refs'=>[0=>['prof_standards','id_prof_standard',"concat_ws(' · ',cod_prof_standard,name_prof_standard)"]], 'required'=>[0], 'uses'=>[]],
        'pk' => ['table'=>'matrix_pk_suos', 'pk'=>'id_pk', 'fields'=>['id_prof_task','id_prof_object','category_prof','code_prof','indicator_prof','base'], 'refs'=>[0=>['prof_tasks','id_prof_task','name_prof_task'],1=>['prof_objects','id_prof_object','name_prof_object']], 'required'=>[3], 'uses'=>[['program_matrix_pk_suos','id_pk']]],
        'opk' => ['table'=>'matrix_opk', 'pk'=>'id_mopk', 'fields'=>['category_opk','code_opk','indicator_opk'], 'refs'=>[], 'required'=>[1], 'uses'=>[]],
        default => throw new ApiError(404,'NOT_FOUND','Таблица не найдена.'),
    };
}

function oopDirectionOptions(string $kind, string $index, array $input): array
{
    $ref=oopDirectionDefinition($kind)['refs'][(int)$index]??throw new ApiError(404,'NOT_FOUND','Поле не найдено.');
    [$table,$pk,$label]=$ref;
    $q=listText($input,'q');$direction=listText($input,'direction');$id=listText($input,'id');
    $params=[likeText($q)];$where="$label ILIKE $1";
    if(in_array($table,['prof_tasks','prof_objects'],true)){
        $params[]=$direction;$where.=' AND id_direction::text=$2';
    }
    if($id!==''){$params[]=$id;$where.=" AND $pk::text=$".count($params);}
    $page=listPage("SELECT $pk,$pk::text AS value,$label AS label FROM $table WHERE $where",$pk,$params,[$kind,$index,$q,$direction,$id],$input);
    return $page;
}

function oopDirectionList(string $kind,array $input): array
{
    $def=oopDirectionDefinition($kind);$params=[likeText(listText($input,'q'))];
    $labels=[];
    foreach($def['fields'] as $index=>$field){
        if(isset($def['refs'][$index])){
            [$table,$pk,$label]=$def['refs'][$index];
            $labels[]="COALESCE((SELECT $label FROM $table r WHERE r.$pk=t.$field),t.$field::text,'')";
        }else $labels[]="t.$field";
    }
    $direction="concat_ws(' · ',d.number_direction,d.name_direction)";
    $where="concat_ws(' ',$direction,".implode(',',$labels).') ILIKE $1';
    if(listText($input,'direction')!==''){$params[]=listText($input,'direction');$where.=' AND t.id_direction::text=$2';}
    $extra='';foreach($labels as $index=>$label)$extra.=",$label AS _label$index";
    $page=listPage("SELECT t.*,$direction AS _direction $extra FROM {$def['table']} t LEFT JOIN direction_list d USING(id_direction) WHERE $where",$def['pk'],$params,[$kind,listText($input,'q'),listText($input,'direction')],$input);
    $page['items']=array_map(function($row)use($def){
        $raw=array_filter($row,fn($key)=>!str_starts_with($key,'_'),ARRAY_FILTER_USE_KEY);
        return ['id'=>$raw[$def['pk']],'directionId'=>$raw['id_direction']??'','directionName'=>$row['_direction'],'version'=>version($raw),'level'=>'','levelName'=>'','values'=>array_map(fn($field)=>oopPlain($raw[$field]??''),$def['fields']),'labels'=>array_map(fn($i)=>oopPlain($row['_label'.$i]??''),array_keys($def['fields']))];
    },$page['items']);
    return $page;
}

function oopDirectionCheckUse(array $def, array $row): void
{
    preventReferencedDelete($def['table'],$def['pk'],$row[$def['pk']],$def['uses']);
    if($def['table']==='direction_prof_standards' && rows('SELECT 1 FROM program_prof_standards s JOIN program_list p USING(id_mep) WHERE p.id_direction=$1 AND s.id_prof_standard=$2',[$row['id_direction'],$row['id_prof_standard']]))
        throw new ApiError(409,'IN_USE','Стандарт используется образовательными программами направления.');
}

function oopDirectionMutate(string $kind,array $body,bool $delete): array
{
    $def=oopDirectionDefinition($kind);
    return transaction(function()use($def,$kind,$body,$delete){
        $table=$def['table'];$pk=$def['pk'];
        query("LOCK TABLE $table IN SHARE ROW EXCLUSIVE MODE");
        $id=requiredText($body,'id')?:null;
        if($id!==null&&!ctype_digit($id))throw new ApiError(422,'VALIDATION','Неверный идентификатор.');
        $old=$id?lockedRecord($table,$pk,$id):null;
        if($old)requireVersion($body,$old);
        if($delete){
            if(!$old)throw new ApiError(422,'VALIDATION','Выберите запись.');
            oopDirectionCheckUse($def,$old);query("DELETE FROM $table WHERE $pk=$1",[$id]);return ['deleted'=>true];
        }
        $direction=requiredText($body,'directionId',true);referenceExists('direction_list','id_direction',$direction);
        if($old&&$old['id_direction']!==$direction)oopDirectionCheckUse($def,$old);
        $input=$body['values']??null;
        if(!is_array($input)||!array_is_list($input)||count($input)!==count($def['fields']))throw new ApiError(422,'VALIDATION','Неверный состав полей.');
        $values=['id_direction'=>$direction];
        foreach($def['fields'] as $i=>$field){
            $value=requiredText([$field=>$input[$i]],$field,in_array($i,$def['required'],true))??'';
            $changed=!$old||$value!==oopPlain($old[$field]??'');
            if(isset($def['refs'][$i])&&($changed||!$old||$old['id_direction']!==$direction)){
                [$refTable,$refPk]=$def['refs'][$i];
                if($value!==''){
                    $ref=rows("SELECT * FROM $refTable WHERE $refPk::text=$1 FOR KEY SHARE",[$value])[0]??throw new ApiError(422,'VALIDATION','Связанная запись не найдена.');
                    if(isset($ref['id_direction'])&&$ref['id_direction']!==$direction)throw new ApiError(422,'VALIDATION','Задача и объект должны относиться к выбранному направлению.');
                }
                if($changed)$values[$field]=$value===''?null:$value;
            }elseif($changed)$values[$field]=$value;
        }
        if($kind==='standards'){
            if($old&&$old['id_prof_standard']!==$input[0])oopDirectionCheckUse($def,$old);
            if(rows("SELECT 1 FROM $table WHERE id_direction=$1 AND id_prof_standard=$2 AND ($3::text IS NULL OR $pk::text<>$3)",[$direction,$input[0],$id]))throw new ApiError(409,'DUPLICATE','Стандарт уже связан с направлением.');
        }
        if($old)updateRecord($table,$pk,$id,$values);else $id=insertRecord($table,$values,$pk);
        return ['id'=>$id];
    });
}
