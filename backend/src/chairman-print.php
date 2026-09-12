<?php
declare(strict_types=1);

function printEscape(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function chairmanPdf(string|array $documents): string
{
    require_once dirname(__DIR__) . '/vendor/autoload.php';
    $fontDir = configuration()['print_font_dir'] ?? 'C:/Windows/Fonts';
    $fonts = [
        'arial' => ['R'=>'arial.ttf', 'B'=>'arialbd.ttf', 'I'=>'ariali.ttf', 'BI'=>'arialbi.ttf'],
        'timesnewroman' => ['R'=>'times.ttf', 'B'=>'timesbd.ttf', 'I'=>'timesi.ttf', 'BI'=>'timesbi.ttf'],
        'calibri' => ['R'=>'calibri.ttf', 'B'=>'calibrib.ttf', 'I'=>'calibrii.ttf', 'BI'=>'calibriz.ttf'],
    ];
    foreach ($fonts as $variants) foreach ($variants as $file) {
        if (!is_file($fontDir . '/' . $file)) throw new ApiError(503, 'PRINT_FONT_MISSING', 'Не установлены шрифты печатного шаблона. Обратитесь к администратору.');
    }
    $pdf = new \Mpdf\Mpdf([
        'mode'=>'utf-8', 'format'=>[700 * 25.4 / 72, 980 * 25.4 / 72], 'orientation'=>'L',
        'margin_left'=>20 + 6 * 25.4 / 72, 'margin_right'=>20 + 6 * 25.4 / 72,
        'margin_top'=>48 * 25.4 / 72, 'margin_bottom'=>30 + 6 * 25.4 / 72,
        'fontDir'=>[$fontDir], 'fontdata'=>$fonts, 'default_font'=>'timesnewroman',
        'fonttrans'=>['arial'=>'arial', 'timesnewroman'=>'timesnewroman', 'times'=>'timesnewroman', 'calibri'=>'calibri'],
        'tempDir'=>dirname(__DIR__) . '/var/mpdf',
        'shrink_tables_to_fit'=>1,
        'normalLineheight'=>1.15,
    ]);
    $pdf->SetTitle('Обоснование кандидатуры председателя ГЭК');
    foreach ((array)$documents as $index => $html) {
    if ($index > 0) $pdf->AddPage();
    // mPDF uses the explicit millimetre settings above for the Word page size.
    $html = preg_replace('/@page\s+WordSection1\s*\{[^}]*\}/s', '', $html);
    $html = str_replace('windowtext', '#000000', $html);
    $html = preg_replace('/border:solid\s+#000000\s+([\d.]+pt)/', 'border:$1 solid #000000', $html);
    // Word-exported HTML contains duplicate head tags and malformed quotes.
    // Normalize syntax before mPDF parsing; retain the template's text and styles.
    $previousErrors = libxml_use_internal_errors(true);
    try {
        $dom = new DOMDocument();
        $dom->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NONET);
        $xpath = new DOMXPath($dom);
        foreach ($xpath->query('//*[@style]') as $element) {
            $style = $element->getAttribute('style');
            $style = preg_replace('/font-family\s*:\s*["\']?Times New Roman["\']?(?:,serif)?/i', 'font-family:timesnewroman', $style);
            $style = preg_replace('/font-family\s*:\s*["\']?Arial["\']?(?:,sans-serif)?/i', 'font-family:arial', $style);
            $element->setAttribute('style', $style);
        }
        // The zero-height Word sizing row conflicts with the actual percentage columns.
        foreach ($xpath->query('//tr[@height="0"]') as $sizingRow) $sizingRow->parentNode->removeChild($sizingRow);
        foreach ($xpath->query('//tr[count(td)=1]/td[@rowspan]') as $cell) {
            $row = $cell->parentNode;
            $next = $row->nextSibling;
            while ($next && !($next instanceof DOMElement)) $next = $next->nextSibling;
            if ($next && $next->nodeName === 'tr') {
                $cell->setAttribute('rowspan', (string)((int)$cell->getAttribute('rowspan') - 1));
                $next->insertBefore($cell, $next->firstChild);
                $row->parentNode->removeChild($row);
            }
        }
        foreach ($xpath->query('//table') as $table) {
            $table->setAttribute('align', 'center');
            $occupied = [0, 0, 0, 0, 0];
            $widths = [21.7, 11.34, 11.16, 12.88, 42.1];
            foreach ($xpath->query('.//tr', $table) as $row) {
                $column = 0;
                foreach ($xpath->query('./td', $row) as $cell) {
                    while ($column < 5 && $occupied[$column] > 0) $column++;
                    $span = max(1, (int)$cell->getAttribute('colspan'));
                    $width = array_sum(array_slice($widths, $column, $span)) / array_sum($widths) * 100;
                    $cell->setAttribute('width', $width . '%');
                    $cell->setAttribute('style', preg_replace('/width\s*:[^;]+;?/', '', $cell->getAttribute('style')) . ';width:' . $width . '%');
                    for ($col = $column; $col < min(5, $column + $span); $col++) $occupied[$col] = max(1, (int)$cell->getAttribute('rowspan'));
                    $column += $span;
                }
                $occupied = array_map(fn($remaining)=>max(0, $remaining - 1), $occupied);
            }
        }
        foreach ($xpath->query('//td') as $cell) {
            $paragraph = $xpath->query('.//p', $cell)->item(0);
            $alignment = 'left';
            if ($paragraph instanceof DOMElement) {
                $alignment = $paragraph->getAttribute('align') ?: 'left';
                if (preg_match('/text-align\s*:\s*(center|right|justify|left)/', $paragraph->getAttribute('style'), $match)) $alignment = $match[1];
            }
            $cell->setAttribute('style', $cell->getAttribute('style') . ';font-family:Arial;font-size:12pt;vertical-align:middle;text-align:' . $alignment);
        }
        $html = $dom->saveHTML();
    } finally {
        libxml_clear_errors();
        libxml_use_internal_errors($previousErrors);
    }
    $pdf->WriteHTML($html);
    }
    return $pdf->Output('', \Mpdf\Output\Destination::STRING_RETURN);
}

function chairmanPrintForms(string $category, array $input): array
{
    $id = requiredText($input, 'id', true);
    $chair = rows('SELECT * FROM sec_predsedatel_s WHERE id_predsedatel_sc=$1', [$id])[0] ?? null;
    if (!$chair || !in_array($category, ['chairmen', 'complex'], true) || ($chair['complex'] === 't') !== ($category === 'complex')) {
        throw new ApiError(404, 'NOT_FOUND', 'Карточка председателя не найдена.');
    }
    $schoolIds = array_unique(chairState($chair)['schools']);
    if (!$schoolIds) throw new ApiError(422, 'VALIDATION', 'Укажите высшую школу в карточке председателя.');
    return [chairmanPrint($category, $input)['html']];
}

/** Render the supplied legacy form without application styles or navigation. */
function chairmanPrint(string $category, array $input): array
{
    if (!in_array($category, ['chairmen', 'complex'], true)) {
        throw new ApiError(404, 'NOT_FOUND', 'Печатная форма не найдена.');
    }
    return readList(function () use ($category, $input) {
        $id = requiredText($input, 'id', true);
        $printYear = archiveYear(requiredText($input, 'academicYear', true));
        $chair = rows('SELECT * FROM sec_predsedatel_s WHERE id_predsedatel_sc=$1', [$id])[0] ?? null;
        if (!$chair || ($chair['complex'] === 't') !== ($category === 'complex')) {
            throw new ApiError(404, 'NOT_FOUND', 'Карточка председателя не найдена.');
        }
        $member = rows('SELECT * FROM sec_member WHERE sm_id=$1', [$chair['sm_id']])[0] ?? null;
        if (!$member) throw new ApiError(422, 'MISSING_PERSON', 'В карточке отсутствует связанный участник. Печать невозможна.');
        $schoolId = isset($input['school']) ? requiredText($input, 'school', true) : null;
        $schoolIds = array_values(array_unique(chairState($chair)['schools']));
        if ($schoolId !== null && !in_array($schoolId, array_map('strval', $schoolIds), true)) {
            throw new ApiError(422, 'VALIDATION', 'Выберите высшую школу из карточки председателя.');
        }
        $printSchools = [];
        foreach ($schoolId !== null ? [$schoolId] : $schoolIds as $selectedId) {
            $school = rows('SELECT * FROM school WHERE id_school=$1', [$selectedId])[0] ?? null;
            if (!$school) throw new ApiError(422, 'VALIDATION', 'Высшая школа не найдена.');
            $printSchools[] = $school;
        }
        if (!$printSchools) throw new ApiError(422, 'VALIDATION', 'Укажите высшую школу в карточке председателя.');
        $variant = match ($chair['area']) {
            'Бизнес' => 'business',
            'Образование' => 'education',
            default => throw new ApiError(422, 'VALIDATION', 'Укажите сферу деятельности в карточке председателя.'),
        };
        $name_school = implode(', ', array_column($printSchools, 'name_school'));
        [$surname, $first_name, $otchestvo] = array_pad(explode(' ', $member['sm_name']), 3, '');
        $memberValue = static function (string $field, string $table) use ($member, $chair): string {
            $primary = $table === 'sec_member' ? $member : $chair;
            $fallback = $table === 'sec_member' ? $chair : $member;
            return printEscape($primary[$field] ?? $fallback[$field] ?? '');
        };
        $signatureSchool = $printSchools[0];
        $schoolValue = static function (string $field) use (&$signatureSchool): string {
            return printEscape($signatureSchool[$field] ?? '');
        };
        $directions_with_levels = [];
        foreach (rows('SELECT p.id_program, p.name_program, d.number_direction, d.name_direction, l.level
            FROM sec_program s JOIN program_list p ON p.id_program=s.id_program
            JOIN direction_list d ON d.id_direction=p.id_direction
            LEFT JOIN levels l ON l.id_level=d.id_level
            WHERE s.id_predsedatel_sc=$1 ORDER BY d.number_direction, p.id_program', [$id]) as $program) {
            $number = $program['number_direction'];
            if (!isset($directions_with_levels[$number])) {
                $directions_with_levels[$number] = ['name'=>$program['name_direction'], 'number_direction'=>$number,
                    'level'=>$program['level'] ?? '', 'program_info'=>[]];
            }
            $directions_with_levels[$number]['program_info'][] = $program;
        }
        $count_d = count($directions_with_levels) * 2 + 1;
        ob_start();
        try {
            require dirname(__DIR__) . '/templates/chairman/' . $variant . '.php';
            $html = ob_get_contents();
        } finally {
            ob_end_clean();
        }
        return ['html'=>$html, 'name'=>$member['sm_name'], 'sphere'=>$chair['area']];
    });
}
