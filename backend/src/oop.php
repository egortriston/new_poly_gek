<?php
declare(strict_types=1);

const OOP_FIELDS = ['comp','plan_o','plan_oz','plan_z','calendar_o','calendar_oz','calendar_z','date_approved','protocol_approved','prorector','reviewer','date_considered','protocol_considered','r_phio','year','num_prof','num_org','num_sci'];
const OOP_LINKS = [
    'standards'=>['program_prof_standards','id_prof_standard'],
    'areas'=>['program_area_activities','id_aa'],
    'tasks'=>['program_prof_tasks','id_prof_task'],
    'objects'=>['program_prof_objects','id_prof_object'],
    'pk'=>['program_matrix_pk_suos','id_pk'],
];

function oopProgram(string $id): array
{
    if(!ctype_digit($id))throw new ApiError(422,'VALIDATION','Выберите образовательную программу.');
    return rows('SELECT * FROM program_list WHERE id_mep=$1',[$id])[0]??throw new ApiError(404,'NOT_FOUND','Образовательная программа не найдена.');
}

function oopMatrixRows(string $table,string $scope,string $id): array
{
    return rows("SELECT m.*,COALESCE(t.name_type_task,m.name_type_task,'') AS task_type,
        COALESCE(t.name_prof_task,'') AS task_name,COALESCE(o.name_prof_object,m.name_prof_object,'') AS object_name
        FROM $table m LEFT JOIN (SELECT p.*,tt.name_type_task FROM prof_tasks p LEFT JOIN types_task tt USING(id_type_task)) t ON t.id_prof_task=m.id_prof_task
        LEFT JOIN prof_objects o ON o.id_prof_object=m.id_prof_object
        WHERE m.$scope=$1 OR m.$scope IS NULL ORDER BY m.id_pk",[$id]);
}

function oopSnapshot(string $id): array
{
    $program=oopProgram($id);
    $direction=rows('SELECT * FROM direction_list WHERE id_direction=$1',[$program['id_direction']])[0]??[];
    $level=rows('SELECT * FROM levels WHERE id_level=$1',[$direction['id_level']??null])[0]??[];
    $details=rows('SELECT * FROM tasks_mep_3 WHERE id_mep=$1',[$id])[0]??[];
    $status=rows('SELECT * FROM mep_status WHERE id_mep=$1',[$id])[0]??[];
    $links=[];
    foreach(OOP_LINKS as $kind=>[$table,$key])$links[$kind]=array_column(rows("SELECT $key FROM $table WHERE id_mep=$1 ORDER BY $key",[$id]),$key);
    $forms=rows('SELECT e.*,f.period_education,f.extend FROM education_form e LEFT JOIN fact_program_education_form f ON f.id_ef=e.id_ef AND f.id_level=$1 ORDER BY e.id_ef',[$direction['id_level']??null]);
    $selectedForms=array_column(rows('SELECT id_ef FROM program_education_form WHERE id_mep=$1 ORDER BY id_ef',[$id]),'id_ef');
    $d=$program['id_direction'];
    $options=[
        'standards'=>rows('SELECT s.* FROM prof_standards s JOIN direction_prof_standards d USING(id_prof_standard) WHERE d.id_direction=$1 ORDER BY s.id_prof_standard',[$d]),
        'areas'=>rows('SELECT a.*,l.area_activity FROM area_activities a LEFT JOIN area_activities_list l USING(id_area_activity) WHERE a.id_direction=$1 ORDER BY a.id_aa',[$d]),
        'tasks'=>rows('SELECT p.*,t.name_type_task FROM prof_tasks p LEFT JOIN types_task t USING(id_type_task) WHERE p.id_direction=$1 ORDER BY p.id_prof_task',[$d]),
        'objects'=>rows('SELECT p.*,t.name_type_task FROM prof_objects p LEFT JOIN types_task t USING(id_type_task) WHERE p.id_direction=$1 ORDER BY p.id_prof_object',[$d]),
        'pk'=>oopMatrixRows('matrix_pk_suos','id_direction',$d),
    ];
    $matrices=[
        'uk'=>rows('SELECT * FROM matrix_universal WHERE id_level=$1 ORDER BY id_mu',[$direction['id_level']??null]),
        'opk'=>rows('SELECT * FROM matrix_opk WHERE id_direction=$1 ORDER BY id_mopk',[$d]),
        'oop'=>oopMatrixRows('matrix_pk_oop','id_mep',$id),
    ];
    $signature=rows('SELECT * FROM pr ORDER BY id_pr LIMIT 1')[0]??[];
    return compact('program','direction','level','details','status','links','forms','selectedForms','options','matrices','signature');
}

function oopPlain(?string $value): string
{
    return html_entity_decode(strip_tags(str_replace(['<br>','<br/>','<br />','</p>'],"\n",$value??'')),ENT_QUOTES|ENT_HTML5,'UTF-8');
}

function oopRow(array $row,string $key,array $columns,bool $shared=false): array
{
    return ['id'=>(string)$row[$key],'values'=>array_map(fn($c)=>oopPlain($row[$c]??''),$columns),'shared'=>$shared,
        'task'=>$row['id_prof_task']??'','object'=>$row['id_prof_object']??''];
}

function oopResponse(array $state): array
{
    $tables=[];$options=[];
    $schemas=[
        'standards'=>['id_prof_standard',['cod_prof_standard','name_prof_standard','approved']],
        'areas'=>['id_aa',['id_area_activity','area_activity','area']],
        'tasks'=>['id_prof_task',['name_type_task','name_prof_task']],
        'objects'=>['id_prof_object',['name_type_task','name_prof_object']],
        'pk'=>['id_pk',['task_type','task_name','object_name','category_prof','code_prof','indicator_prof','base']],
    ];
    foreach($schemas as $kind=>[$key,$columns]){
        $options[$kind]=array_map(fn($r)=>oopRow($r,$key,$columns),$state['options'][$kind]);
        $tables[$kind]=array_values(array_filter($options[$kind],fn($r)=>in_array($r['id'],$state['links'][$kind],true)));
        foreach(array_diff($state['links'][$kind],array_column($tables[$kind],'id')) as $missing)
            $tables[$kind][]=['id'=>$missing,'values'=>['Связанная запись недоступна (ID '.$missing.')'],'missing'=>true];
    }
    foreach(['uk'=>['id_mu',['category_mu','code_mu','indicator_mu']],'opk'=>['id_mopk',['category_opk','code_opk','indicator_opk']],'oop'=>$schemas['pk']] as $kind=>[$key,$columns])
        $tables[$kind]=array_map(fn($r)=>oopRow($r,$key,$columns,$kind==='oop'&&$r['id_mep']===null),$state['matrices'][$kind]);
    $tables['types']=[];
    foreach(array_unique(array_column(array_filter($state['options']['tasks'],fn($r)=>in_array($r['id_prof_task'],$state['links']['tasks'],true)),'name_type_task')) as $i=>$name)$tables['types'][]=['id'=>(string)$i,'values'=>[oopPlain($name)]];
    $values=[];foreach(OOP_FIELDS as $field)$values[$field]=$state['details'][$field]??'';
    foreach(['id_program','name_program','chief_program'] as $field)$values[$field]=$state['program'][$field]??'';
    foreach(['number_direction','name_direction'] as $field)$values[$field]=$state['direction'][$field]??'';
    return ['version'=>version($state),'program'=>$state['program'],'direction'=>$state['direction'],'level'=>$state['level'],
        'signature'=>$state['signature'],'options'=>$options,'educationForms'=>$state['forms'],
        'draft'=>['values'=>$values,'forms'=>array_values(array_map(fn($r)=>$r['name_education_form'],array_filter($state['forms'],fn($r)=>in_array($r['id_ef'],$state['selectedForms'],true)))),
        'tables'=>$tables,'display84'=>($state['details']['display']??'f')==='t','status'=>$state['status']['status']??'Черновик']];
}

function saveOop(array $body,array $user): array
{
    return transaction(function()use($body,$user){
        $id=requiredText($body,'id',true);oopProgram($id);
        // Shared matrices and per-program links are checked and written as one unit.
        query('LOCK TABLE program_list,direction_list,sec_program,levels,tasks_mep_3,mep_status,program_education_form,program_prof_standards,program_area_activities,program_prof_tasks,program_prof_objects,program_matrix_pk_suos,matrix_pk_oop,matrix_universal,matrix_opk IN SHARE ROW EXCLUSIVE MODE');
        $old=oopSnapshot($id);requireVersion($body,$old);
        $draft=$body['draft']??null;
        if(!is_array($draft)||!is_array($draft['values']??null)||!is_array($draft['tables']??null)||!is_array($draft['forms']??null)||!is_bool($draft['display84']??null))throw new ApiError(422,'VALIDATION','Неверный формат формы ООП.');
        $previous=oopResponse($old)['draft'];
        $status=requiredText($draft,'status',true);
        if($status!==$previous['status']&&!in_array($status,['Черновик','Утверждён'],true))throw new ApiError(422,'VALIDATION','Неизвестный статус ООП.');
        if($user['role']==='rop'&&$previous['status']==='Утверждён'){
            $before=$previous;$after=$draft;unset($before['status'],$after['status']);
            if($before!=$after)throw new ApiError(403,'APPROVED_OOP','Сначала верните утверждённую ООП в черновик.');
            if($old['status'])updateRecord('mep_status','id_mep',$id,['status'=>$status]);
            return oopResponse(oopSnapshot($id));
        }
        foreach(['program'=>['program_list','id_mep',['id_program','name_program','chief_program']], 'direction'=>['direction_list','id_direction',['number_direction','name_direction']]] as $entity=>[$table,$pk,$fields]){
            $updates=[];
            foreach($fields as $field){
                $value=requiredText($draft['values'],$field,$field!=='chief_program')??'';
                if($value!==($old[$entity][$field]??''))$updates[$field]=$value;
            }
            if($updates){
                if($entity==='direction'&&$user['role']!=='admin')throw new ApiError(403,'FORBIDDEN','Направление изменяет только администратор.');
                $code=$entity==='program'?'id_program':'number_direction';
                if(isset($updates[$code])){
                    if(rows("SELECT 1 FROM $table WHERE $code=$1 AND $pk<>$2",[$updates[$code],$old[$entity][$pk]]))throw new ApiError(409,'DUPLICATE','Запись с таким кодом уже существует.');
                    if($entity==='program')query('UPDATE sec_program SET id_program=$1 WHERE id_program=$2',[$updates[$code],$old['program']['id_program']]);
                }
                updateRecord($table,$pk,$old[$entity][$pk],$updates);
            }
        }
        $values=[];
        foreach(OOP_FIELDS as $field){
            $value=requiredText($draft['values'],$field)??'';
            if(in_array($field,['num_prof','num_org','num_sci'],true)&&$value!==''){
                if(!ctype_digit($value)||(int)$value>100)throw new ApiError(422,'VALIDATION','Кадровые показатели должны быть целыми числами от 0 до 100.');
            }
            $values[$field]=$value===''?null:$value;
        }
        $values['display']=$draft['display84']?'true':'false';
        if($old['details'])updateRecord('tasks_mep_3','id_mep',$id,$values);else insertRecord('tasks_mep_3',['id_mep'=>$id]+$values,'id_mep');
        if($old['status'])updateRecord('mep_status','id_mep',$id,['status'=>$status]);else insertRecord('mep_status',['id_mep'=>$id,'status'=>$status],'id_mep');
        foreach(OOP_LINKS as $kind=>[$table,$key]){
            $entries=$draft['tables'][$kind]??null;
            if(!is_array($entries)||count($entries)>2000)throw new ApiError(422,'VALIDATION','Некорректный состав таблицы.');
            $ids=array_column($entries,'id');
            $allowed=array_column($old['options'][$kind],$key);
            foreach($ids as $ref)if(!is_string($ref)||!in_array($ref,[...$allowed,...$old['links'][$kind]],true))throw new ApiError(422,'INVALID_REFERENCE','Запись не относится к направлению выбранной ООП.');
            // Preserve legacy link rows and their extra fields when selection did not change.
            foreach(array_diff($old['links'][$kind],$ids) as $ref)query("DELETE FROM $table WHERE id_mep=$1 AND $key=$2",[$id,$ref]);
            foreach(array_diff(array_unique($ids),$old['links'][$kind]) as $ref)query("INSERT INTO $table (id_mep,$key) VALUES ($1,$2)",[$id,$ref]);
        }
        $formIds=[];
        foreach($draft['forms'] as $name){
            $matches=array_values(array_filter($old['forms'],fn($r)=>$r['name_education_form']===$name));
            if(!$matches)throw new ApiError(422,'INVALID_REFERENCE','Форма обучения не найдена.');
            $formIds[]=$matches[0]['id_ef'];
        }
        foreach(array_diff($old['selectedForms'],$formIds) as $ref)query('DELETE FROM program_education_form WHERE id_mep=$1 AND id_ef=$2',[$id,$ref]);
        foreach(array_diff(array_unique($formIds),$old['selectedForms']) as $ref)query('INSERT INTO program_education_form (id_mep,id_ef) VALUES ($1,$2)',[$id,$ref]);
        oopSaveMatrices($id,$draft['tables'],$old,$user);
        return oopResponse(oopSnapshot($id));
    });
}

function oopSaveMatrices(string $id,array $tables,array $old,array $user): void
{
    $previous=oopResponse($old)['draft']['tables'];
    foreach(['uk','opk','oop'] as $kind){
        $entries=$tables[$kind]??null;
        if(!is_array($entries)||count($entries)>2000)throw new ApiError(422,'VALIDATION','Некорректная матрица компетенций.');
        if($entries==$previous[$kind])continue;
        if($kind!=='oop'&&$user['role']!=='admin')throw new ApiError(403,'FORBIDDEN','Общие матрицы изменяет только администратор.');
        [$table,$pk,$scope,$owner,$fields]=match($kind){
            'uk'=>['matrix_universal','id_mu','id_level',$old['direction']['id_level'],['category_mu','code_mu','indicator_mu']],
            'opk'=>['matrix_opk','id_mopk','id_direction',$old['program']['id_direction'],['category_opk','code_opk','indicator_opk']],
            'oop'=>['matrix_pk_oop','id_pk','id_mep',$id,['category_prof','code_prof','indicator_prof','base']],
        };
        $known=array_column($old['matrices'][$kind],null,$pk);$seen=[];
        foreach($entries as $entry){
            $entryId=$entry['id']??'';
            if(!is_string($entryId)||isset($seen[$entryId])||!is_array($entry['values']??null))throw new ApiError(422,'VALIDATION','Некорректная запись матрицы.');
            $seen[$entryId]=true;$existing=$known[$entryId]??null;
            if($kind==='oop'&&$existing&&$existing['id_mep']===null){
                $expected=array_values(array_filter($previous[$kind],fn($r)=>$r['id']===$entryId))[0];
                if($entry!=$expected)throw new ApiError(422,'SHARED_RECORD','Общая компетенция не изменяется в форме отдельной ООП.');
                continue;
            }
            if(!$existing&&!str_starts_with($entryId,'new-'))throw new ApiError(422,'INVALID_REFERENCE','Запись матрицы не принадлежит выбранной ООП.');
            $values=[];
            foreach($fields as $i=>$field){$index=$kind==='oop'?$i+3:$i;$values[$field]=requiredText([$field=>$entry['values'][$index]??null],$field)??'';}
            if($kind==='oop'){
                foreach(['task'=>['id_prof_task','tasks'],'object'=>['id_prof_object','objects']] as $input=>[$key,$options]){
                    $ref=requiredText($entry,$input)?:null;
                    if($ref&&!in_array($ref,array_column($old['options'][$options],$key),true)&&$ref!==($existing[$key]??null))throw new ApiError(422,'INVALID_REFERENCE','Выберите задачу и объект из направления программы.');
                    $values[$key]=$ref;
                }
            }
            // Unchanged rows retain original formatting and optional legacy columns.
            $before=array_values(array_filter($previous[$kind],fn($r)=>$r['id']===$entryId))[0]??null;
            if($before==$entry)continue;
            if($existing)updateRecord($table,$pk,$entryId,$values);else insertRecord($table,[$scope=>$owner]+$values,$pk);
        }
        foreach($known as $key=>$row)if(!isset($seen[$key])){
            if($kind==='oop'&&$row['id_mep']===null)throw new ApiError(422,'SHARED_RECORD','Общую компетенцию нельзя удалить из отдельной ООП.');
            query("DELETE FROM $table WHERE $pk=$1",[(string)$key]);
        }
    }
}
