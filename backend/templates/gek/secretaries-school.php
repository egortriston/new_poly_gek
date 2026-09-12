<?php




if (!isset($schoolId) || empty($schoolId)) {
    die('ID школы не указан или пустой');
}
$id_school = $schoolId;




$mpdf = gekPdfEngine();
$mpdf->defaultfooterline = 0;
$mpdf->setFooter('|{PAGENO}|');
$mpdf->charset_in = 'utf-8';
$mpdf->SetDisplayMode('fullpage','two');


$mpdf->AddPage('P','','','','on');

$query = "SELECT number_format_year, name_chairman, name_direction_sc_b, name_direction_sc_m, name_direction_sc_s, name_secretary, secretary 
          FROM public.sec_info
          WHERE id_school =  '$id_school'
          "; 
$result = gekPrintQuery($conn, $query);

$selectedSchool=rows('SELECT name_school, chief_role, chief FROM school WHERE id_school=$1',[$schoolId])[0];
$header = '<header style="font-size:12PT">
    Приложение  4
<br>
    к  информационному письму
</header>';
  $html = '<html>
<head>
<title>ГЭК</title>
  
</head>
<body>'.$header.'
<p class="zero center">
    <strong>
        Федеральное государственное автономное образовательное учреждение
    </strong>

<br>
    <strong>высшего образования</strong>
<br>
    <strong>
        «Санкт-Петербургский политехнический университет Петра Великого»
    </strong>
<p class="center">
    СОСТАВ
<br>
секретарей ГЭК по образовательным программам высшего образования
<u></u>
<br>
    на '.$printYear.' год
</p>
<p class="center">
    <strong>
        ПО ИНСТИТУТУ ПРОМЫШЛЕННОГО МЕНЕДЖМЕНТА, 
<br>ЭКОНОМИКИ И ТОРГОВЛИ</strong>
</p>';
$html .= '<p class="center" style="text-transform: uppercase;">
    <strong>'. htmlspecialchars($selectedSchool['name_school'] ?? '',ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8') .
    ':</strong></p>';
$html .= '<table border="1" cellpadding="5" cellspacing="0" width="100%">
    <tr>
        <th width="74">№ ГЭК</th>
                <th width="229">Направление подготовки/ специальность/
образовательная программа</th>
        <th width="116">Председатель ГЭК</th>
        <th width="182">Секретарь ГЭК</th>
        <th width="89" style="font-size: 10pt">Табельный 
номер 
сотрудника СПбПУ
</th>
    </tr>';

        while ($row = pg_fetch_assoc($result)) {
            $chairman = '';
            if (!is_null($row['name_chairman']) && !empty($row['name_chairman'])) {
                $chairman = strpos($row['name_chairman'], ':') !== false 
                    ? substr($row['name_chairman'], 0, strpos($row['name_chairman'], ':'))
                    : $row['name_chairman'];
                
                // Форматирование имени председателя
                if (!empty($chairman)) {
                    $chairman_parts = explode(' ', $chairman);
                    if (count($chairman_parts) > 1) {
                        $formatted_chairman = $chairman_parts[0]; // Первое слово остается полным
                        for ($i = 1; $i < count($chairman_parts); $i++) {
                            $formatted_chairman .= ' ' . mb_substr($chairman_parts[$i], 0, 1) . '.';
                        }
                        $chairman = $formatted_chairman;
                    }
                }
            }
    
        // Объединяем все направления подготовки с переносом строки
        $directions = array();
        if (!empty($row['name_direction_sc_b']) && $row['name_direction_sc_b'] !== '.') {
            $direction_b = str_replace(['<em>', '</em>'], '', $row['name_direction_sc_b']);
            $direction_b = preg_replace('/<br>-\s*(\S+)/', '<br><br><strong>$1</strong>', $direction_b);
            $directions[] = $direction_b; // Добавляем без удаления <br><br> в начале
        }
        if (!empty($row['name_direction_sc_m']) && $row['name_direction_sc_m'] !== '.') {
            $direction_m = str_replace(['<em>', '</em>'], '', $row['name_direction_sc_m']);
            $direction_m = preg_replace('/<br>-\s*(\S+)/', '<br><br><strong>$1</strong>', $direction_m);
            $directions[] = $direction_m;
        }
        if (!empty($row['name_direction_sc_s']) && $row['name_direction_sc_s'] !== '.') {
            $direction_s = str_replace(['<em>', '</em>'], '', $row['name_direction_sc_s']);
            $direction_s = preg_replace('/<br>-\s*(\S+)/', '<br><br><strong>$1</strong>', $direction_s);
            $directions[] = $direction_s;
        }
        
        // Удаляем <br><br> в начале массива $directions, если оно есть
        if (!empty($directions) && strpos($directions[0], '<br><br>') === 0) {
            $directions[0] = substr($directions[0], 8);
        }
        
        // Объединяем направления с переносом строки
        $directionsHtml = implode('', $directions);
        
    
        $html .= '<tr>
        <td>' . htmlspecialchars($row['generated_number'] ?? '') . '</td>
        <td>' . $directionsHtml . '</td>
        <td>' . htmlspecialchars($chairman)  . '</td>
        <td>' . $row['name_secretary'] . '</td>
        <td><strong>' . htmlspecialchars($row['secretary'] ?? '') . '</strong></td>
        </tr>';
    }

$html .= '</table> <br>';
$html .= '
<style>
.signature-block {
    margin: 0cm;
    text-align: justify;
    line-height: normal;
    font-family: "Times New Roman", serif;
}
.director-title {
    font-size: 14pt;
}
.signature-line {
    font-size: 14pt;
}
.spacer {
    margin: 15px 0;
}
</style>



<div class="signature-block">
<p class = "leftstr">
    <span class="director-title">' . htmlspecialchars($selectedSchool['chief_role'] ?? '',ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8') . '</span>
    </p><p class = "rightstr"> <span class="signature-line">___________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
    <span class="director-title">/' . htmlspecialchars($selectedSchool['chief'] ?? '',ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8') . '/</span></p>
</div>

<div class="spacer"></div>'
;
$html.='<p class = "leftstr">
    <strong>СОГЛАСОВАНО:</strong>
<br>
    Директор Института
<br>
    промышленного менеджмента,
<br>
    экономики и торговли
 
</p>
<p class = "rightstr">
<br>
__________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/В.Э. Щепинин/
<br>
<br>
   «___»___________'.$printYear.' г.
</p><p class="center"></body>
</html>';

    $stylesheet = file_get_contents(__DIR__.'/styles_sec.css');
    $mpdf->WriteHTML($stylesheet,\Mpdf\HTMLParserMode::HEADER_CSS);
    $mpdf->WriteHTML($html);
    $file_name = 'state_com.pdf';
    $mpdf->debug = true;
    return $mpdf->Output('', \Mpdf\Output\Destination::STRING_RETURN);

?>
