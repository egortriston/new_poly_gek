<?php
declare(strict_types=1);

function oopGeneralDefinition(string $kind): array
{
    return match($kind){
        'areas'=>['table'=>'area_activities_list','pk'=>'id_area_activity','fields'=>['id_area_activity','area_activity'],'required'=>[0,1],'unique'=>'id_area_activity','refs'=>[['area_activities','id_area_activity'],['prof_standards','id_area_activity']]],
        'types'=>['table'=>'types_task','pk'=>'id_type_task','fields'=>['name_type_task'],'required'=>[0],'unique'=>'name_type_task','refs'=>[['prof_tasks','id_type_task'],['prof_objects','id_type_task']]],
        'standards'=>['table'=>'prof_standards','pk'=>'id_prof_standard','fields'=>['cod_prof_standard','name_prof_standard','approved'],'required'=>[0,1],'unique'=>'cod_prof_standard','refs'=>[['direction_prof_standards','id_prof_standard'],['program_prof_standards','id_prof_standard']]],
        'uk'=>['table'=>'matrix_universal','pk'=>'id_mu','fields'=>['category_mu','code_mu','indicator_mu'],'required'=>[1],'unique'=>null,'refs'=>[]],
        default=>throw new ApiError(404,'NOT_FOUND','Таблица не найдена.'),
    };
}

function oopGeneralList(string $kind,array $input): array
{
    $def=oopGeneralDefinition($kind);
    $q=listText($input,'q');$level=listText($input,'level');
    $params=[];
    $search=implode(',',array_map(fn($field)=>'t.'.$field,$def['fields']));
    $join=$kind==='uk'?' LEFT JOIN levels l ON l.id_level=t.id_level':'';
    $extra=$kind==='uk'?',l.level AS _level':'';
    $where=searchCondition("concat_ws(' ',$search".($kind==='uk'?',l.level':'').")",$q,$params);
    if($kind==='uk'&&$level!==''){$params[]=$level;$where.=' AND t.id_level::text=$'.count($params);}
    $page=listPage("SELECT t.* $extra FROM {$def['table']} t $join WHERE $where",$def['pk'],$params,['oop-general',$kind,$q,$level],$input);
    $page['items']=array_map(function($row)use($def){
        $label=$row['_level']??'';unset($row['_level']);
        return ['id'=>$row[$def['pk']],'level'=>$row['id_level']??'','levelName'=>$label,'version'=>version($row),'values'=>array_map(fn($field)=>oopPlain($row[$field]??''),$def['fields'])];
    },$page['items']);
    return $page;
}

function oopGeneralMutate(string $kind,array $body,bool $delete): array
{
    $def=oopGeneralDefinition($kind);
    return transaction(function()use($kind,$body,$delete,$def){
        $table=$def['table'];$pk=$def['pk'];
        query("LOCK TABLE $table IN SHARE ROW EXCLUSIVE MODE");
        $id=requiredText($body,'id')?:null;
        $old=$id?lockedRecord($table,$pk,$id):null;
        if($old)requireVersion($body,$old);
        if($delete){
            if(!$old)throw new ApiError(422,'VALIDATION','Выберите запись.');
            preventReferencedDelete($table,$pk,$id,$def['refs']);
            query("DELETE FROM $table WHERE $pk=$1",[$id]);
            return ['deleted'=>true];
        }
        $input=$body['values']??null;
        if(!is_array($input)||!array_is_list($input)||count($input)!==count($def['fields']))throw new ApiError(422,'VALIDATION','Неверный состав полей.');
        $values=[];
        foreach($def['fields'] as $index=>$field){
            $value=requiredText([$field=>$input[$index]],$field,in_array($index,$def['required'],true))??'';
            if(!$old||$value!==oopPlain($old[$field]??''))$values[$field]=$value;
        }
        if($kind==='uk'){
            $level=requiredText($body,'level',true);referenceExists('levels','id_level',$level);
            if(!$old||$old['id_level']!==$level)$values['id_level']=$level;
        }
        $unique=$def['unique'];
        if($unique&&isset($values[$unique])){
            if(rows("SELECT 1 FROM $table WHERE lower(trim($unique))=lower(trim($1)) AND ($2::text IS NULL OR $pk::text<>$2)",[$values[$unique],$id]))throw new ApiError(409,'DUPLICATE','Запись с таким кодом или наименованием уже существует.');
        }
        if($old&&isset($values[$pk])&&$values[$pk]!==$id)preventReferencedDelete($table,$pk,$id,$def['refs']);
        if($old){if($values)updateRecord($table,$pk,$id,$values);}
        else $id=insertRecord($table,$values,$pk);
        return ['id'=>$values[$pk]??$id];
    });
}
