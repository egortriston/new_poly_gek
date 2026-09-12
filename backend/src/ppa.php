<?php
declare(strict_types=1);

const PPA_LINKS = [
 'members'=>['certification_teacher','id_teacher','teacher','id_teacher'],
 'directions'=>['certification_direction','id_direction','direction_list','id_direction'],
 'programs'=>['certification_oop','id_mep','program_list','id_mep'],
 'disciplines'=>['certification_discipline','id_discipline','discipline','id_discipline'],
];

function ppaState(array $row): array
{
    $state = ['record' => $row];
    foreach (PPA_LINKS as $key => [$table, $column]) {
        $state[$key] = array_column(rows("SELECT $column FROM $table WHERE id_cert=$1 ORDER BY $column", [$row['id_cert']]), $column);
    }
    return $state;
}

function ppaRecord(array $state): array
{
    $row = $state['record'];
    return ['id'=>$row['id_cert'],'kind'=>'ppa','number'=>(string)$row['id_com'],
        'school'=>$row['id_school']??'','chairman'=>$row['chairman']??'','secretary'=>'',
        'amendment'=>$row['add_edit']==='t','disciplines'=>$state['disciplines'],'members'=>$state['members'],
        'directions'=>$state['directions'],'programs'=>$state['programs'],'version'=>version($state)];
}

function ppaContext(): array
{
    $catalog = [];
    foreach (catalogDefinitions() as $key => $definition) {
        $catalog[$key] = rows('SELECT * FROM '.$definition['table'].' ORDER BY '.$definition['pk']);
    }
    $records = array_map(fn($row) => ppaRecord(ppaState($row)), rows("SELECT * FROM certification ORDER BY id_school,add_edit,id_com,id_cert"));
    return ['records' => $records, 'catalog' => $catalog];
}

function ppaLocked(string $id): array
{
    $row = lockedRecord('certification', 'id_cert', $id);
    return $row;
}

function savePpa(array $body): array
{
    return transaction(function() use ($body) {
        query('LOCK TABLE certification IN SHARE ROW EXCLUSIVE MODE');
        $id = requiredText($body, 'id');
        $old = $id ? ppaLocked($id) : null;
        if ($old) requireVersion($body, ppaState($old));
        $school = requiredText($body, 'school', true);
        referenceExists('school', 'id_school', $school);
            if(!is_bool($body['amendment']??null))throw new ApiError(422,'VALIDATION','Выберите основной состав или изменения.');
        $amendment=$body['amendment']?'true':'false';
        if($old && ($old['add_edit']==='t')!==$body['amendment'])throw new ApiError(422,'VALIDATION','Нельзя переносить комиссию между основными составами и изменениями.');
        $number = trim(requiredText($body, 'number', true));
        if (!preg_match('/^[0-9]{1,6}$/D', $number) || (int)$number < 1) throw new ApiError(422, 'VALIDATION', 'Укажите положительный номер комиссии цифрами.');
        $number=(string)(int)$number;
        if(rows('SELECT 1 FROM certification WHERE id_school=$1 AND add_edit=$2 AND id_com=$3 AND ($4::bigint IS NULL OR id_cert<>$4)',[$school,$amendment,$number,$id]))throw new ApiError(409,'DUPLICATE','Номер комиссии уже используется в этой школе и списке.');
        $chairman=requiredText($body,'chairman')?:null;
        referenceExists('teacher','id_teacher',$chairman);
        $links = [];
        foreach (PPA_LINKS as $key => [$table, $column, $ref, $pk]) {
            if (!is_array($body[$key] ?? null) || count($body[$key]) > 1000) throw new ApiError(422, 'VALIDATION', 'Проверьте состав и программы комиссии.');
            $links[$key] = [];
            foreach ($body[$key] as $value) {
                if (!is_string($value) || $value === '') throw new ApiError(422, 'VALIDATION', 'Выберите запись из справочника.');
                referenceExists($ref, $pk, $value);
                $links[$key][] = $value;
            }
            $links[$key] = array_values(array_unique($links[$key]));
        }
        if($chairman && in_array($chairman,$links['members'],true))throw new ApiError(422,'DUPLICATE_ROLE','Председатель уже входит в состав членов комиссии.');
        foreach ($links['programs'] as $program) {
            $direction = rows('SELECT id_direction FROM program_list WHERE id_mep=$1', [$program])[0]['id_direction'];
            if (!in_array($direction, $links['directions'], true)) throw new ApiError(422, 'PROGRAM_DIRECTION', 'Добавьте направление каждой выбранной программы или уберите программу этого направления.');
        }
        $values = ['id_com' => $number, 'id_school' => $school, 'chairman' => $chairman, 'add_edit' => $amendment];
        if ($id) updateRecord('certification', 'id_cert', $id, $values);
        else $id = insertRecord('certification', $values, 'id_cert');
        foreach (PPA_LINKS as $key => [$table, $column]) {
            query("DELETE FROM $table WHERE id_cert=$1", [$id]);
            foreach ($links[$key] as $value) query("INSERT INTO $table(id_cert,$column) VALUES($1,$2)", [$id, $value]);
        }
        return ppaRecord(ppaState(rows('SELECT * FROM certification WHERE id_cert=$1', [$id])[0]));
    });
}

function deletePpa(array $body): array
{
    return transaction(function() use ($body) {
        $id = requiredText($body, 'id', true);
        requireVersion($body, ppaState(ppaLocked($id)));
        foreach (PPA_LINKS as [$table]) query("DELETE FROM $table WHERE id_cert=$1", [$id]);
        query('DELETE FROM certification WHERE id_cert=$1', [$id]);
        return ['deleted' => true];
    });
}

