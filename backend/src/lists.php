<?php
declare(strict_types=1);

function readList(callable $read): array
{
    return transaction(function() use ($read) {
        // Count and rows belong to the same database snapshot within this request.
        query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
        return $read();
    });
}

function listText(array $input, string $key): string
{
    $value = $input[$key] ?? '';
    if (!is_string($value) || strlen($value) > 2000) throw new ApiError(422, 'VALIDATION', 'Неверные параметры поиска.');
    return trim($value);
}

// Cursor is tied to the search and filters. Identity ordering is unaffected by name edits.
function listPage(string $sql, string $key, array $params, array $scope, array $input): array
{
    $cursor = listText($input, 'cursor');
    $fingerprint = hash('sha256', json_encode($scope));
    $total=(int)pg_fetch_result(query("SELECT count(*) FROM ($sql) matched", $params),0,0);
    $where = '';
    if ($cursor !== '') {
        $decoded = json_decode(base64_decode($cursor, true) ?: '', true);
        if (!is_array($decoded) || ($decoded['scope'] ?? '') !== $fingerprint || !is_string($decoded['id'] ?? null))
            throw new ApiError(422, 'INVALID_CURSOR', 'Параметры списка изменились. Обновите таблицу.');
        $params[] = $decoded['id'];
        $where = "WHERE $key > $".count($params);
    }
    $result = rows("SELECT * FROM ($sql) listed $where ORDER BY $key LIMIT 51", $params);
    $more = count($result) > 50;
    if ($more) array_pop($result);
    return ['items' => $result, 'total'=>$total, 'nextCursor' => $more ? base64_encode(json_encode(['scope'=>$fingerprint,'id'=>(string)end($result)[$key]])) : null];
}

function likeText(string $query): string
{
    return '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $query).'%';
}

function searchWords(string $text): array
{
    $normalized = str_replace(['ё', '·', '•', '|'], ['е', ' ', ' ', ' '], mb_strtolower($text, 'UTF-8'));
    $words = preg_split('/\s+/u', trim($normalized), -1, PREG_SPLIT_NO_EMPTY);
    return array_values(array_unique($words));
}

function matchesSearch(string $text, string $query): bool
{
    $text = str_replace('ё', 'е', mb_strtolower($text, 'UTF-8'));
    foreach (searchWords($query) as $word) {
        if (!str_contains($text, $word)) return false;
    }
    return true;
}

// Apply every fragment before pagination so unloaded records remain searchable.
function searchCondition(string $expression, string $text, array &$params): string
{
    $words = searchWords($text);
    $conditions = [];
    foreach (array_unique($words) as $word) {
        $params[] = likeText($word);
        $conditions[] = "replace(lower($expression), 'ё', 'е') LIKE $".count($params);
    }
    return $conditions ? '('.implode(' AND ', $conditions).')' : 'TRUE';
}

function catalogList(string $kind, array $input): array
{
    $def = catalogDefinitions()[$kind] ?? throw new ApiError(404, 'NOT_FOUND', 'Справочник не найден.');
    $q = listText($input, 'q');
    $filterKey = match($kind) {'programs'=>'id_direction','teachers','disciplines'=>'id_school','directions'=>'id_level',default=>''};
    $filter = $filterKey ? listText($input, $filterKey) : '';
    $id = listText($input, 'id');
    $joins = ''; $extras = ''; $search = array_map(fn($f)=>'t.'.$f.'::text', $def['fields']);
    if (isset($def['refs']['id_school'])) {
        $joins .= ' LEFT JOIN school s ON s.id_school=t.id_school';
        $extras .= ", s.name_school AS _school"; $search[]='s.name_school';
    }
    if (isset($def['refs']['id_level'])) {
        $joins .= ' LEFT JOIN levels l ON l.id_level=t.id_level';
        $extras .= ', l.level AS _level'; $search[]='l.level';
    }
    if ($kind === 'programs') {
        $joins .= ' LEFT JOIN direction_list d ON d.id_direction=t.id_direction';
        $extras .= ", concat_ws(' · ',d.number_direction,d.name_direction) AS _direction";
        $search[]='d.number_direction'; $search[]='d.name_direction';
    }
    if ($kind === 'directions') $extras .= ', (SELECT count(*) FROM program_list p WHERE p.id_direction=t.id_direction) AS _program_count';
    if ($kind === 'teachers') $search[]='t.id_teacher';
    $params = [];
    $conditions = [searchCondition("concat_ws(' ', ".implode(',', $search).")", $q, $params)];
    foreach ([$filterKey=>$filter, $def['pk']=>$id] as $field=>$value) if ($field !== '' && $value !== '') {
        $params[]=$value; $conditions[]="t.$field=$".count($params);
    }
    $page = listPage("SELECT t.* $extras FROM {$def['table']} t $joins WHERE ".implode(' AND ', $conditions), $def['pk'], $params, [$kind,$q,$filter,$id], $input);
    $page['items'] = array_map(function($row) {
        $raw = array_filter($row, fn($key)=>!str_starts_with($key,'_'), ARRAY_FILTER_USE_KEY);
        return array_map(fn($v)=>$v??'', $row)+['version'=>version($raw)];
    }, $page['items']);
    return $page;
}

function peopleEntry(string $category, array $row): array
{
    $smId = $row['sm_id'];
    $member = rows('SELECT * FROM sec_member WHERE sm_id=$1', [$smId])[0] ?? null;
    $person = $member ? personFromMember($member) : [
        'id'=>'member:'.$smId, 'name'=>'Участник не найден', 'organization'=>'Нарушена связь в исходных данных',
        'position'=>'','degree'=>'','rank'=>'','kind'=>'external','color'=>'sage','initials'=>'?','missing'=>true,
    ];
    if ($category === 'external') return ['id'=>$row['sm_id'],'personId'=>$person['id'],'person'=>$person,'sphere'=>'Бизнес','schoolIds'=>[],'values'=>(object)[],'version'=>version($row)];
    $state = chairState($row); $values=[];
    foreach(CHAIR_FIELDS as $key=>$column) $values[$key]=$row[$column]??'';
    return ['id'=>$row['id_predsedatel_sc'],'personId'=>$person['id'],'person'=>$person,'sphere'=>$row['area']??'','schoolIds'=>$state['schools'],'programIds'=>$state['programs'],'directionIds'=>$state['directions'],'values'=>$values,'version'=>version($state)];
}

function peopleList(string $category, array $input): array
{
    if (!in_array($category,['external','chairmen','complex'],true)) throw new ApiError(404,'NOT_FOUND','Таблица не найдена.');
    $q=listText($input,'q'); $sphere=listText($input,'sphere'); $id=listText($input,'id'); $person=listText($input,'person');
    $external=$category==='external';
    $params=[];
    $expression=$external ? "concat_ws(' ',t.sm_name,t.organization,t.sm_position)"
        : "concat_ws(' ',coalesce(m.sm_name,'Участник не найден'),m.organization,m.sm_position)";
    $condition=searchCondition($expression,$q,$params);
    $sql=$external ? "SELECT t.* FROM sec_member t WHERE t.sm_outer=true AND $condition"
        : "SELECT t.* FROM sec_predsedatel_s t LEFT JOIN sec_member m ON m.sm_id=t.sm_id WHERE t.complex IS ".($category==='complex'?'TRUE':'NOT TRUE')." AND $condition";
    $key=$external?'sm_id':'id_predsedatel_sc';
    if ($sphere !== '' && !$external) {$params[]=$sphere; $sql.=' AND t.area=$'.count($params);}
    if ($id !== '') {$params[]=$id; $sql.=" AND t.$key=$".count($params);}
    if ($person !== '') {$params[]=str_starts_with($person,'member:')?substr($person,7):'-1'; $sql.=' AND t.sm_id=$'.count($params);}
    $page=listPage($sql,$key,$params,[$category,$q,$sphere,$id,$person],$input);
    $page['items']=array_map(fn($row)=>peopleEntry($category,$row),$page['items']);
    return $page;
}

function optionList(string $kind, array $input): array
{
    $sql=match($kind) {
        'programs'=>"SELECT id_mep::text AS value, concat_ws(' · ',id_program,name_program) AS label FROM program_list",
        'schools'=>"SELECT id_school::text AS value, name_school AS label FROM school",
        'directions'=>"SELECT id_direction::text AS value, concat_ws(' · ',number_direction,name_direction) AS label FROM direction_list",
        'levels'=>"SELECT id_level::text AS value, level AS label FROM levels",
        'people'=>"SELECT 'member:'||sm_id AS value, concat_ws(' · ',sm_name,organization) AS label FROM sec_member
            UNION ALL SELECT 'teacher:'||t.id_teacher AS value, concat_ws(' · ',t.name_teacher,s.name_school) AS label
            FROM teacher t LEFT JOIN school s ON s.id_school=t.id_school
            WHERE NOT EXISTS(SELECT 1 FROM sec_member m WHERE m.employee_number=t.id_teacher)",
        'chairmancandidates'=>"SELECT 'member:'||m.sm_id AS value, concat_ws(' · ',m.sm_name,m.organization) AS label FROM sec_member m
            WHERE NOT EXISTS(SELECT 1 FROM sec_predsedatel_s p WHERE p.sm_id=m.sm_id)
            UNION ALL SELECT 'teacher:'||t.id_teacher AS value, concat_ws(' · ',t.name_teacher,s.name_school) AS label
            FROM teacher t LEFT JOIN school s ON s.id_school=t.id_school
            WHERE NOT EXISTS(SELECT 1 FROM sec_member m WHERE m.employee_number=t.id_teacher)",
        default=>throw new ApiError(404,'NOT_FOUND','Справочник не найден.'),
    };
    $q=listText($input,'q'); $id=listText($input,'id');
    $params=[];
    $condition=searchCondition("label", $q, $params);
    $sql="SELECT * FROM ($sql) options WHERE $condition";
    if ($id !== '') {$params[]=$id; $sql.=' AND value=$'.count($params);}
    return listPage($sql,'value',$params,[$kind,$q,$id],$input);
}
