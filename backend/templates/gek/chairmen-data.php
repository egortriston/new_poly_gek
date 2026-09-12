<?php



$query = "SELECT sec_member.sm_name, sec_predsedatel_s.id_predsedatel_sc FROM sec_predsedatel_s
JOIN sec_member ON sec_predsedatel_s.sm_id = sec_member.sm_id";
$result = pg_query($conn, $query);
$resultArray = array();

if ($result === false) {
    echo "Ошибка выполнения запроса: " . pg_last_error($conn);
    exit;
}


while ($row = pg_fetch_array($result)) {
    $sm_name = $row['sm_name']; // Извлекаем sm_name
    $id_predsedatel_sc = $row['id_predsedatel_sc']; // Извлекаем id_predsedatel_sc

    $query_directions = "
    SELECT direction_list.number_direction, direction_list.name_direction 
    FROM sec_program 
    JOIN program_list ON sec_program.id_program = program_list.id_program 
    JOIN direction_list ON program_list.id_direction = direction_list.id_direction
    WHERE sec_program.id_predsedatel_sc = \$1
    ORDER BY direction_list.name_direction ASC"; // Используем id_predsedatel_sc вместо sm_name
    
    $result_directions = pg_query_params($conn, $query_directions, array($id_predsedatel_sc));
    
    if ($result_directions === false) {
        echo "Ошибка выполнения запроса: " . pg_last_error($conn);
        continue; // Переход к следующей итерации 
        }

    $program_directions = []; // Инициализируем массив для хранения направлений
    while ($program_row = pg_fetch_array($result_directions)) {
        // Сохраняем номер и имя направления в массив
        $program_directions[] = $program_row['number_direction'] . ' ' . $program_row['name_direction'];
    }
    $program_directions = array_unique($program_directions);
    // Преобразуем массив направлений в строку, разделённую "\n"
    sort($program_directions);

    $program_directions_string = implode("\n", $program_directions);

    // Сохраняем sm_name и связанные направления в результирующий массив 
    $resultArray[$sm_name] = $program_directions_string;
}
setlocale(LC_COLLATE, 'ru_RU.UTF-8');
ksort($resultArray, SORT_STRING | SORT_FLAG_CASE);
function getMemberName($conn, $member_id) {
    $query2 = "SELECT chief FROM school WHERE short = '$member_id'";
    $result2 = pg_query($conn, $query2);

    if ($row = pg_fetch_assoc($result2)) {
        return $row['chief']; // Вернуть значение позиции
    }
    return null; // Если ничего не найдено
}

