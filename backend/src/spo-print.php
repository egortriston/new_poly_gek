<?php
declare(strict_types=1);

function spoPrintQuery($connection, string $sql): PgSql\Result
{
    global $spoPrintIds;
    if ($spoPrintIds && preg_match('/\b(?:spo_info|ac_info)\b/i', $sql)) {
        $parts = preg_split('/\bORDER BY\b/i', $sql, 2);
        $sql = $parts[0].(preg_match('/\bWHERE\b/i', $parts[0]) ? ' AND ' : ' WHERE ').'id_spo IN ('.implode(',', $spoPrintIds).')';
        if (isset($parts[1])) $sql .= ' ORDER BY '.$parts[1];
    }
    return query($sql);
}

function spoPrintRow(PgSql\Result $result): array|false
{
    $row = pg_fetch_assoc($result);
    if (!$row) return false;
    foreach ($row as $key => &$value) {
        if ($value === null || in_array($key,['name_teacher','name_chairman','name_secretary'],true)) continue;
        if ($key === 'caps') {
            $value=preg_replace_callback('/<[^>]*>/', function($m) {
                if(preg_match('/^<\s*(\/?)\s*(p|br|b|strong|em)\b([^>]*)>/i',$m[0],$tag)) {
                    $class='';
                    if(!$tag[1] && preg_match('/class=[\"\']([a-zA-Z0-9_ -]+)[\"\']/',$tag[3],$c)) $class=' class="'.$c[1].'"';
                    return '<'.$tag[1].strtolower($tag[2]).$class.'>';
                }
                return '';
            },$value);
            continue;
        }
        $value = htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        if ($key === 'caps' || str_starts_with($key, 'name_direction_')) {
            $value = preg_replace_callback('/&lt;(\/?)(br|p|strong|em|b)\s*\/?&gt;/i', fn($m) => '<'.$m[1].strtolower($m[2]).'>', $value);
        }
    }
    return $row;
}

function spoPrint(array $body, string $kind='spo'): string
{
    global $spoPrintIds;
    $period = requiredText($body, 'academicYear', true);
    $printYear = archiveYear($period);
    $schoolId = requiredText($body, 'school') ?: null;
    if ($schoolId && (!ctype_digit($schoolId) || !rows('SELECT 1 FROM school WHERE id_school=$1',[$schoolId]))) throw new ApiError(422,'INVALID_REFERENCE','Высшая школа не найдена.');
    $tableOnly = ($body['tableOnly'] ?? false) === true;
    $ids = $body['ids'] ?? [];
    if (!is_array($ids) || count($ids) > 1000) throw new ApiError(422, 'VALIDATION', 'Некорректный список комиссий.');
    foreach ($ids as $id) if (!is_string($id) || !ctype_digit($id)) throw new ApiError(422, 'VALIDATION', 'Некорректный идентификатор комиссии.');
    $spoPrintIds = array_values(array_unique($ids));
    try {
        $cover = spoCover($schoolId,$kind);
        if (!$tableOnly && (!$cover['id'] || !$cover['num_add'] || !$cover['cover_date_add'])) throw new ApiError(422, 'COVER_REQUIRED', 'Сначала заполните номер и дату в титульном листе этого документа.');
        $view=$kind==='ac'?'ac_info':'spo_info';
        $countSql = 'SELECT count(*) FROM '.$view.($schoolId ? ' WHERE id_school='.(int)$schoolId : '');
        if ((int)pg_fetch_result(spoPrintQuery(database(), $countSql), 0, 0) === 0) throw new ApiError(422, 'EMPTY_SELECTION', 'Нет комиссий для печати.');
        $conn = database();
        ob_start();
        try { return require dirname(__DIR__).'/templates/'.($kind==='ac'?'ac':'spo').'/document.php'; }
        finally { ob_end_clean(); }
    } finally { $spoPrintIds = []; }
}
