<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/chairman-print.php';

$cases = [
    ['Сафаров Гасан Гусейн оглы', ['Сафаров', 'Гасан', 'Гусейн оглы']],
    ["  Сафаров\tГасан  Гусейн\u{00A0}оглы  ", ['Сафаров', 'Гасан', 'Гусейн оглы']],
    ['Иванов Иван Иванович', ['Иванов', 'Иван', 'Иванович']],
    ['Иванов Иван', ['Иванов', 'Иван', '']],
    ['', ['', '', '']],
];
foreach ($cases as [$input, $expected]) {
    if (chairmanPrintNameParts($input) !== $expected) {
        throw new RuntimeException('Incorrect printed name: ' . $input);
    }
}
echo "PASS: compound patronymic, whitespace, ordinary and incomplete names.\n";
