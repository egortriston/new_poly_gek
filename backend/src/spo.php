<?php
declare(strict_types=1);

const SPO_LINKS = [
    'members' => ['spo_teacher', 'id_teacher', 'teacher', 'id_teacher'],
    'directions' => ['spo_direction', 'id_direction', 'direction_list', 'id_direction'],
    'programs' => ['spo_mep', 'id_mep', 'program_list', 'id_mep'],
];

function spoState(array $row): array
{
    $state = ['record' => $row];
    foreach (SPO_LINKS as $key => [$table, $column]) {
        $state[$key] = array_column(rows("SELECT $column FROM $table WHERE id_spo=$1 ORDER BY $column", [$row['id_spo']]), $column);
    }
    return $state;
}

function spoRecord(array $state): array
{
    $row = $state['record'];
    return ['id' => $row['id_spo'], 'kind' => $row['ac']==='t'?'ac':'spo', 'special'=>acSpecial($row), 'number' => str_pad($row['id_com_spo'] ?? '', 3, '0', STR_PAD_LEFT),
        'school' => $row['id_school'] ?? '', 'chairman' => $row['chairman'] ?? '', 'secretary' => $row['secretary'] ?? '',
        'amendment' => false, 'disciplines' => [], 'members' => $state['members'], 'directions' => $state['directions'],
        'programs' => $state['programs'], 'version' => version($state)];
}

function spoContext(string $kind='spo'): array
{
    $catalog = [];
    foreach (catalogDefinitions() as $key => $definition) {
        $catalog[$key] = $key === 'disciplines' ? [] : rows('SELECT * FROM '.$definition['table'].' ORDER BY '.$definition['pk']);
    }
    $flag=$kind==='ac'?'TRUE':'FALSE';
    $records = array_map(fn($row) => spoRecord(spoState($row)), rows("SELECT * FROM spo WHERE ac IS $flag ORDER BY id_com_spo,id_spo"));
    return ['records' => $records, 'catalog' => $catalog];
}

function spoLocked(string $id, string $kind='spo'): array
{
    $row = lockedRecord('spo', 'id_spo', $id);
    if ($row['ac'] !== ($kind==='ac'?'t':'f')) throw new ApiError(404, 'NOT_FOUND', 'Комиссия СПО не найдена.');
    return $row;
}

function saveSpo(array $body, ?array $actor = null, string $kind='spo'): array
{
    $actor ??= requireUser();
    return transaction(function() use ($body, $actor, $kind) {
        query('LOCK TABLE spo IN SHARE ROW EXCLUSIVE MODE');
        $id = requiredText($body, 'id');
        $old = $id ? spoLocked($id,$kind) : null;
        if ($old) requireVersion($body, spoState($old));
        $school = requiredText($body, 'school', true);
        referenceExists('school', 'id_school', $school);
        $flag=$kind==='ac'?'TRUE':'FALSE';
        $number = trim(requiredText($body, 'number', true));
        if (!preg_match('/^[0-9]{1,6}$/D', $number) || (int)$number < 1) throw new ApiError(422, 'VALIDATION', 'Укажите положительный номер комиссии цифрами.');
        $number = str_pad((string)(int)$number, 3, '0', STR_PAD_LEFT);
        if (rows("SELECT 1 FROM spo WHERE ac IS $flag AND ltrim(id_com_spo,'0')=ltrim($1,'0') AND ($2::bigint IS NULL OR id_spo<>$2)", [$number, $id])) throw new ApiError(409, 'DUPLICATE', 'Номер комиссии уже используется.');
        // Preserve the default; only an administrator can change the assignment.
        $existingChairman = $old['chairman'] ?? '25011';
        $chairman = requiredText($body, 'chairman') ?? $existingChairman;
        if ($chairman !== $existingChairman && $actor['role'] !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Менять председателя может только администратор.');
        if ($chairman === '') throw new ApiError(422, 'VALIDATION', 'Выберите председателя.');
        referenceExists('teacher', 'id_teacher', $chairman);
        $secretary = requiredText($body, 'secretary') ?: null;
        referenceExists('teacher', 'id_teacher', $secretary);
        $links = [];
        foreach (SPO_LINKS as $key => [$table, $column, $ref, $pk]) {
            if (!is_array($body[$key] ?? null) || count($body[$key]) > 1000) throw new ApiError(422, 'VALIDATION', 'Проверьте состав и программы комиссии.');
            $links[$key] = [];
            foreach ($body[$key] as $value) {
                if (!is_string($value) || $value === '') throw new ApiError(422, 'VALIDATION', 'Выберите запись из справочника.');
                referenceExists($ref, $pk, $value);
                $links[$key][] = $value;
            }
            $links[$key] = array_values(array_unique($links[$key]));
        }
        if ($secretary === $chairman || in_array($chairman, $links['members'], true) || ($secretary && in_array($secretary, $links['members'], true))) throw new ApiError(422, 'DUPLICATE_ROLE', 'Председатель, секретарь и члены комиссии не должны повторяться.');
        foreach ($links['programs'] as $program) {
            $direction = rows('SELECT id_direction FROM program_list WHERE id_mep=$1', [$program])[0]['id_direction'];
            if (!in_array($direction, $links['directions'], true)) throw new ApiError(422, 'PROGRAM_DIRECTION', 'Добавьте направление каждой выбранной программы или уберите программу этого направления.');
        }
        $values = ['id_com_spo' => $number, 'id_school' => $school, 'chairman' => $chairman, 'secretary' => $secretary, 'ac' => $kind==='ac'?'true':'false'];
        if ($id) updateRecord('spo', 'id_spo', $id, $values);
        else $id = insertRecord('spo', $values, 'id_spo');
        foreach (SPO_LINKS as $key => [$table, $column]) {
            query("DELETE FROM $table WHERE id_spo=$1", [$id]);
            foreach ($links[$key] as $value) query("INSERT INTO $table(id_spo,$column) VALUES($1,$2)", [$id, $value]);
        }
        return spoRecord(spoState(rows('SELECT * FROM spo WHERE id_spo=$1', [$id])[0]));
    });
}

function deleteSpo(array $body, string $kind='spo'): array
{
    return transaction(function() use ($body, $kind) {
        $id = requiredText($body, 'id', true);
        $record=spoLocked($id,$kind);
        if(acSpecial($record)) throw new ApiError(403,'SPECIAL_COMMISSION','Удаление специальной комиссии недоступно.');
        requireVersion($body, spoState($record));
        foreach (SPO_LINKS as [$table]) query("DELETE FROM $table WHERE id_spo=$1", [$id]);
        query('DELETE FROM spo WHERE id_spo=$1', [$id]);
        return ['deleted' => true];
    });
}

function spoCover(?string $school, string $kind='spo'): array
{
    if ($school && (!ctype_digit($school) || !rows('SELECT 1 FROM school WHERE id_school=$1',[$school]))) throw new ApiError(422,'INVALID_REFERENCE','Высшая школа не найдена.');
    $flag=$kind==='ac'?'ac':'spo';
    $matches = rows("SELECT * FROM cover_page WHERE $flag IS TRUE AND id_school IS NOT DISTINCT FROM $1::integer ORDER BY id_cover", [$school ?: null]);
    if (count($matches) > 1) throw new ApiError(409, 'DUPLICATE_COVER', 'Для этой школы найдено несколько титульных листов. Требуется уточнить нужный.');
    $row = $matches[0] ?? [];
    return ['id' => $row['id_cover'] ?? null, 'school' => $school ?: '', 'num_add' => $row['num_add'] ?? '',
        'cover_date_add' => $row['cover_date_add'] ?? '', 'cover_year' => str_replace('-', '/', $row['cover_year'] ?? ''), 'version' => version($row)];
}

function saveSpoCover(array $body, string $kind='spo'): array
{
    return transaction(function() use ($body, $kind) {
        query('LOCK TABLE cover_page IN SHARE ROW EXCLUSIVE MODE');
        $school = requiredText($body, 'school') ?: null;
        $current = spoCover($school,$kind);
        if (($body['version'] ?? '') !== $current['version']) throw new ApiError(409, 'STALE_RECORD', 'Титульный лист уже изменён. Откройте его повторно.');
        $year = trim(requiredText($body, 'cover_year', true));
        archiveYear($year);
        $date = requiredText($body, 'cover_date_add', true);
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if (!$parsed || $parsed->format('Y-m-d') !== $date) throw new ApiError(422, 'VALIDATION', 'Укажите корректную дату документа.');
        $values = ['num_add' => trim(requiredText($body, 'num_add', true)), 'cover_date_add' => $date, 'cover_year' => $year];
        if ($current['id']) updateRecord('cover_page', 'id_cover', $current['id'], $values);
        else {
            $flag=$kind==='ac'?'ac':'spo';
            $caps = rows("SELECT caps FROM cover_page WHERE $flag IS TRUE AND id_school IS NULL")[0]['caps'] ?? '';
            if ($school) {
                $schoolName = rows('SELECT name_school FROM school WHERE id_school=$1', [$school])[0]['name_school'];
                $caps = '<p class="com_break school_1"><strong>'.htmlspecialchars(mb_strtoupper($schoolName), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'</strong></p>';
            }
            insertRecord('cover_page', $values + ['id_school' => $school, $flag => 'true', 'caps' => $caps], 'id_cover');
        }
        return spoCover($school,$kind);
    });
}

function acSpecial(array $row): ?string
{
    if (($row['ac']??'f')!=='t') return null;
    return match ((string)$row['id_spo']) {
        '60'=>'По направлениям подготовки бакалавров, магистров и специалистов, реализуемым в Институте промышленного менеджмента, экономики и торговли, контингент иностранных граждан из стран с визовым режимом очной формы обучения.',
        '61'=>'По направлениям подготовки бакалавров, магистров и специалистов, реализуемым в Институте промышленного менеджмента, экономики и торговли, для рассмотрения особых случаев.',
        default=>null,
    };
}
