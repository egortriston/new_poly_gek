<?php






$id_result = gekPrintQuery($conn, "SELECT * FROM school ORDER BY id_school_temp");
//$max_id = pg_fetch_assoc(gekPrintQuery($conn, "SELECT MAX(id_school) FROM school"))['max'];
$num = pg_fetch_assoc(gekPrintQuery($conn, "SELECT * FROM cover_page"))['num'];


if($schoolId){
  $id_school_get = $schoolId;
  $id_result = gekPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get");
  $name_school = pg_fetch_assoc(gekPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['name_school'];
  $chief_role =  pg_fetch_assoc(gekPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['chief_role'] ;
  $chief =  pg_fetch_assoc(gekPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['chief'];
  $short =  pg_fetch_assoc(gekPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['short'];
} 



$mpdf = gekPdfEngine();
$mpdf->defaultfooterline = 0;
$mpdf->setFooter('|{PAGENO}|');
$mpdf->charset_in = 'utf-8';
$mpdf->SetDisplayMode('fullpage','two');


$mpdf->AddPage('P','','','','on');


$header = empty($id_school_get) ? '<header>
    Приложение  5
<br>
    к  информационному письму
</header>' : '';
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
    Государственной  экзаменационной комиссии по образовательным программам
    высшего образования <u></u>
<br>
    на '.$printYear.' год
</p>
<p class="center">
    <strong>
        ПО ИНСТИТУТУ ПРОМЫШЛЕННОГО МЕНЕДЖМЕНТА, 
<br>ЭКОНОМИКИ И ТОРГОВЛИ</strong>';
$appr = ' (по согласованию)';
  $sec_query = "SELECT * FROM sec_info ORDER BY id_com_sec";
  if(!empty($id_school_get)){
       $caps = mb_strtoupper($name_school);
   $html.='<br><strong>'.$caps.':</strong>
</p>';
  $sec_query = "SELECT * FROM sec_info WHERE id_school = $id_school_get";
  }
  $sec_result= gekPrintQuery($conn, $sec_query);
  $chief_str = '';
while ($row = pg_fetch_assoc($id_result)) {

   if(pg_num_rows($sec_result) == 0) continue;
           if ($row['id_school'] < 6) $chief_str.='<p class = "leftstr">'.$row['chief_role'].' '.$row['short'].'</p>
<p class = "rightstr">__________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/'.$row['chief'].'/</p>';
   while ($sec_row = pg_fetch_assoc($sec_result)) {
    // Проверяем и инициализируем переменные для избежания null значений
    $name_teacher_inner = $sec_row['name_teacher_inner'] ?? '';
    $teachers_inner = explode(';', $name_teacher_inner);
  foreach ($teachers_inner as &$tch_in) {
    $tch_in = explode(':', $tch_in);
    $in_name = array_shift($tch_in);
    $in_em_num = array_pop($tch_in);
    $in_info = implode(", ", array_filter($tch_in));
    // Схлопываем повторяющиеся запятые и пробелы, убираем висячие разделители
    $in_info = preg_replace('/(?:\s*,\s*)+/', ', ', $in_info);
    $in_info = trim($in_info, " ,");

    $tch_in = '<tr><td>'.$in_name.'</td>
        <td>'.$in_info.'</td>
        <td>'.$in_em_num.'</td>
        </tr>';
  }
  
array_pop($teachers_inner);






$name_teacher_outer = $sec_row['name_teacher_outer'] ?? '';
$teachers_outer = explode(';', $name_teacher_outer);


foreach ($teachers_outer as &$tch_ot) {
    $tch_ot = explode(':', $tch_ot);
    $ot_name = array_shift($tch_ot);
    $ot_info = implode(", ", array_filter($tch_ot));
    // Схлопываем повторяющиеся запятые и пробелы, убираем висячие разделители
    $ot_info = preg_replace('/(?:\s*,\s*)+/', ', ', $ot_info);
    $ot_info = trim($ot_info, " ,");
    if ($ot_info !== '') {
    $ot_info .= $appr;
    }
    $tch_ot = '<tr><td>' . $ot_name . '</td>
        <td>' . $ot_info . '</td>
        <td></td>
        </tr>';
}

array_shift($teachers_outer);

  $chairman = "";
  $name_chairman = $sec_row['name_chairman'] ?? '';
  if(!empty($name_chairman)) {
    $chairman = explode(':', $name_chairman);
    $ch_name = array_shift($chairman);
    $ch_info = implode(", ", array_filter($chairman));
    // Схлопываем повторяющиеся запятые и пробелы, убираем висячие разделители
    $ch_info = preg_replace('/(?:\s*,\s*)+/', ', ', $ch_info);
    $ch_info = trim($ch_info, " ,");
    if ($ch_info !== '') {
        $ch_info .= $appr;
    }
    $chairman = '<tr><td>'.$ch_name.' (председатель)</td>
            <td>'.$ch_info.'</td>
            <td></td>
            </tr>';
  } 

  
$html.='
    <p class="zero"><strong>ГЭК № '.$sec_row['generated_number'].'</strong>';

$nb_str = '<br><strong>По направлениям подготовки бакалавров:</strong>';
$nm_str = '<br><strong>По направлениям подготовки магистров:</strong>';
$ns_str = '<br><strong>По направлениям подготовки специалистов:</strong>';

$count_b_value = $sec_row['count_b'] ?? '';
$count_b = count(array_filter(explode(';', $count_b_value)));
switch ($count_b) {
  case 0:
      $nb_str = ''; // Нет направлений
      break;
  case 1:
      $nb_str = '<br><strong>По направлению подготовки бакалавров:</strong>'; // Одно направление
      break;
  default:
      $nb_str = '<br><strong>По направлениям подготовки бакалавров:</strong>'; // Более одного направления
      break;
}

$count_m_value = $sec_row['count_m'] ?? '';
$count_m = count(array_filter(explode(';', $count_m_value)));
switch ($count_m) {
  case 0:
      $nm_str = ''; // Нет направлений
      break;
  case 1:
      $nm_str = '<br><strong>По направлению подготовки магистров:</strong>'; // Одно направление
      break;
  default:
      $nm_str = '<br><strong>По направлениям подготовки магистров:</strong>'; // Более одного направления
      break;
}

$count_s_value = $sec_row['count_s'] ?? '';
$count_s = count(array_filter(explode(';', $count_s_value)));
switch ($count_s) {
  case 0:
      $ns_str = ''; // Нет направлений
      break;
  case 1:
      $ns_str = '<br><strong>По направлению подготовки специалистов:</strong>'; // Одно направление
      break;
  default:
      $ns_str = '<br><strong>По направлениям подготовки специалистов:</strong>'; // Более одного направления
      break;
}



$dir_b = $sec_row['name_direction_b'] != '.' ? $sec_row['name_direction_b'] : '';
$dir_m = $sec_row['name_direction_m'] != '.' ? $sec_row['name_direction_m'] : '';
$dir_s = $sec_row['name_direction_s'] != '.' ? $sec_row['name_direction_s'] : '';

$dir_b = remove_dubs($dir_b);
$dir_m = remove_dubs($dir_m);
$dir_s = remove_dubs($dir_s);

if ($count_b === 1) {
    $dir_b = str_replace('<br>-', '<br>', $dir_b);
}
if ($count_m === 1) {
    $dir_m = str_replace('<br>-', '<br>', $dir_m);
}
if ($count_s === 1) {
    $dir_s = str_replace('<br>-', '<br>', $dir_s);
}
if (!empty($dir_b)) {
    $dir_b = preg_replace('/(?<!^)(<br>-)/','<br>$1', $dir_b);
    $dir_b .= '<br>'; // Добавляем <br> если dir_b не пустой
}
if (!empty($dir_m)) {
    $dir_m = preg_replace('/(?<!^)(<br>-)/','<br>$1', $dir_m);
    $dir_m .= '<br>'; // Добавляем <br> если dir_m не пустой
}
if (!empty($dir_s)) {
    $dir_s = preg_replace('/(?<!^)(<br>-)/','<br>$1', $dir_s);
    $dir_s .= '<br>'; // Добавляем <br> если dir_s не пустой
}

    $html.=$nb_str.$dir_b
    .$nm_str.$dir_m.$ns_str.$dir_s.'</p><br>
    <table border="1" cellspacing="0" width="699">
    <colgroup width="189">
    <colgroup width="417">
    <colgroup width="93">
        <thead>
            <tr>
                <th>
                        <strong><em>ФИО члена ГЭК</em></strong>
                </th>
                <th>
                        <strong><em>Информация о члене ГЭК</em></strong>
                </th>
                <th class="employee_number">
                        <strong>
                            <em>Табельный номер сотрудника СПбПУ</em>
                        </strong>
                </th>
            </tr>
        </thead>
        <tbody>'.$chairman;
        foreach($teachers_inner as $ti){
          $html.=$ti;
        }
        foreach($teachers_outer as $to){
          $html.=$to;
        }
$html.='
        </tbody>
    </table><br>
';
}

}
$html.='<br><br>';
if(!empty($id_school_get)){
       $html.='<p class = "leftstr">'.$chief_role.' '.$short.'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;__________</p>
<p class = "rightstr">/'.$chief.'/
</p>';
}

else{
    $html.=$chief_str;
}

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
    // $mpdf->debug = 'true';
    return $mpdf->Output('', \Mpdf\Output\Destination::STRING_RETURN);

?>
