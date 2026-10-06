<?php
declare(strict_types=1);

function selectedPrintYear(array $input, string $field, string $periodYear): string
{
    $year = $input[$field] ?? $periodYear;
    if (!is_string($year) || !preg_match('/^20\d{2}$/D', $year) || abs((int)$year - (int)$periodYear) > 5) {
        throw new ApiError(422, 'INVALID_PRINT_YEAR', 'Выберите год печати рядом с учебным периодом.');
    }
    return $year;
}
