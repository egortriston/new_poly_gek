<?php
declare(strict_types=1);

function oopDataDefinition(string $kind): array
{
    return match($kind){
        'matrix'=>['matrix_pk_oop','id_pk'],
        'forms'=>['program_education_form','id_mep_ef'],
        default=>throw new ApiError(404,'NOT_FOUND','Таблица не найдена.'),
    };
}

function oopDataList(string $kind,array $input): array
{
    [$table,$pk]=oopDataDefinition($kind);
    $q=listText($input,'q');$program=listText($input,'program');
    $joins=$kind==='matrix' ? ' LEFT JOIN prof_tasks t ON t.id_prof_task=r.id_prof_task LEFT JOIN types_task tt ON tt.id_type_task=t.id_type_task LEFT JOIN prof_objects o ON o.id_prof_object=r.id_prof_object' : ' LEFT JOIN education_form e ON e.id_ef=r.id_ef';
    $extra=$kind==='matrix' ? "COALESCE(tt.name_type_task,r.name_type_task,'') AS task_type,COALESCE(t.name_prof_task,'') AS task_name,COALESCE(o.name_prof_object,r.name_prof_object,'') AS object_name" : "e.name_education_form";
    $search=$kind==='matrix' ? 'tt.name_type_task,t.name_prof_task,o.name_prof_object,r.category_prof,r.code_prof,r.indicator_prof,r.base' : 'e.name_education_form';
    $params=[likeText($q)];$where="concat_ws(' ',p.id_program,p.name_program,$search) ILIKE $1";
    if($program!==''){$params[]=$program;$where.=' AND (r.id_mep::text=$2'.($kind==='matrix'?' OR r.id_mep IS NULL':'').')';}
    $page=listPage("SELECT r.*,p.id_program,p.name_program,$extra FROM $table r LEFT JOIN program_list p ON p.id_mep=r.id_mep $joins WHERE $where",$pk,$params,['oop-data',$kind,$q,$program],$input);
    foreach($page['items'] as &$row){
        $raw=$row;
        foreach(['id_program','name_program','task_type','task_name','object_name','name_education_form'] as $key)unset($raw[$key]);
        $row=['id'=>$row[$pk],'programId'=>$row['id_mep']??'','code'=>$row['id_program']??'','name'=>$row['name_program']??'Общая компетенция','version'=>version($raw),
            'task'=>$row['id_prof_task']??'','object'=>$row['id_prof_object']??'','form'=>$row['id_ef']??'',
            'values'=>array_map(fn($key)=>oopPlain($row[$key]??''),$kind==='matrix'?['task_type','task_name','object_name','category_prof','code_prof','indicator_prof','base']:['name_education_form'])];
    }
    return $page;
}

function oopDataMutate(string $kind,array $body,bool $delete,array $user): array
{
    [$table,$pk]=oopDataDefinition($kind);
    return transaction(function()use($kind,$body,$delete,$user,$table,$pk){
        query('LOCK TABLE program_list,tasks_mep_3,mep_status,program_education_form,matrix_pk_oop IN SHARE ROW EXCLUSIVE MODE');
        $id=requiredText($body,'id')?:null;
        $old=$id?lockedRecord($table,$pk,$id):null;
        if($old)requireVersion($body,$old);
        if($delete&&!$old)throw new ApiError(422,'VALIDATION','Выберите запись.');
        $program=requiredText($body,'programId',true);
        if($old&&$old['id_mep']!==$program)throw new ApiError(422,'INVALID_REFERENCE','Нельзя переносить запись между программами или изменять общую компетенцию здесь.');
        $state=oopSnapshot($program);
        if($user['role']==='rop'&&($state['status']['status']??'')==='Утверждён')throw new ApiError(403,'APPROVED_OOP','Сначала верните утверждённую ООП в черновик.');
        if($kind==='matrix'){
            $tables=oopResponse($state)['draft']['tables'];
            $entries=array_values(array_filter($tables['oop'],fn($r)=>$r['id']!==$id));
            if(!$delete){
                $values=$body['values']??null;
                if(!is_array($values)||count($values)!==7||array_filter($values,fn($v)=>!is_string($v)))throw new ApiError(422,'VALIDATION','Некорректные сведения матрицы.');
                if(!array_filter(array_slice($values,3),fn($v)=>trim($v)!==''))throw new ApiError(422,'VALIDATION','Заполните сведения компетенции.');
                $entries[]=['id'=>$id??'new-entry','values'=>$values,'task'=>requiredText($body,'task')??'','object'=>requiredText($body,'object')??'','shared'=>false];
            }
            $tables['oop']=$entries;oopSaveMatrices($program,$tables,$state,$user);
        }elseif($delete){query("DELETE FROM $table WHERE $pk=$1",[$id]);}
        else{
            $form=requiredText($body,'form',true);
            if(!in_array($form,array_column($state['forms'],'id_ef'),true))throw new ApiError(422,'INVALID_REFERENCE','Форма обучения не найдена.');
            if(rows('SELECT 1 FROM program_education_form WHERE id_mep=$1 AND id_ef=$2 AND id_mep_ef IS DISTINCT FROM $3::integer',[$program,$form,$id]))throw new ApiError(409,'DUPLICATE','Эта форма обучения уже добавлена к программе.');
            if($old)updateRecord($table,$pk,$id,['id_ef'=>$form]);else insertRecord($table,['id_mep'=>$program,'id_ef'=>$form],$pk);
        }
        return ['saved'=>true];
    });
}
