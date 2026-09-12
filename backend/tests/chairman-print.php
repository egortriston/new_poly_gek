<?php
declare(strict_types=1);
require __DIR__ . '/catalog.php';
require dirname(__DIR__) . '/src/lists.php';
require dirname(__DIR__) . '/src/archive.php';
require dirname(__DIR__) . '/src/chairman-print.php';

foreach (['Бизнес'=>'chairmen', 'Образование'=>'complex'] as $sphere=>$category) {
    $person = savePeople('external', ['person'=>['name'=>'Тестов Иван Иванович', 'organization'=>'Организация <тест> & партнёры']])['id'];
    $id = savePeople($category, ['personId'=>'member:'.$person, 'sphere'=>$sphere, 'schoolIds'=>[$school],
        'values'=>['publications'=>'Публикации тест', 'career_activity'=>'Практика тест']])['id'];
    query('INSERT INTO sec_program(id_predsedatel_sc,id_program) VALUES($1,$2)', [$id, '01.03.05_02']);
    $input = ['id'=>$id, 'school'=>$school, 'academicYear'=>'2027/2028'];
    $document = chairmanPrint($category, $input);
    check(str_contains($document['html'], '2028 год'), 'Academic period controls printed year');
    check(str_contains($document['html'], 'Организация &lt;тест&gt; &amp; партнёры'), 'Data is escaped');
    check(str_contains($document['html'], '01.03.05_02'), 'Linked programs are printed');
    check(str_contains($document['html'], $sphere==='Бизнес'?'Практика тест':'Публикации тест'), 'Sphere-specific fields are printed');
    check(!str_contains($document['html'], '<script>'), 'No legacy navigation scripts');
    $pdf = chairmanPdf($document['html']);
    check(str_starts_with($pdf, '%PDF-'), 'mPDF produces a PDF');
    $folder = dirname(__DIR__) . '/var/print-tests';
    if (!is_dir($folder)) mkdir($folder, 0750, true);
    file_put_contents($folder.'/'.$category.'.pdf', $pdf);
    expectError('VALIDATION', fn()=>chairmanPrint($category, [...$input, 'school'=>$school2]));
    expectError('NOT_FOUND', fn()=>chairmanPrint($category==='chairmen'?'complex':'chairmen', $input));
}
echo "PASS: chairman print, two spheres, programs, year, escaping, school validation and PDF generation. Public DB unchanged.\n";
