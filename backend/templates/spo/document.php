<?php





$id_result = spoPrintQuery($conn, "SELECT * FROM school ORDER BY id_school_temp");
$cover_row = spoPrintRow(spoPrintQuery($conn, "SELECT * FROM cover_page WHERE id_school IS NULL AND spo = true"));



if(!empty($schoolId)){
  $id_school_get = $schoolId;
  $id_result = spoPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get");
  $cover_row = spoPrintRow(spoPrintQuery($conn, "SELECT * FROM cover_page WHERE id_school = $id_school_get AND spo = true"));
  $rp = spoPrintRow(spoPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['rp'];
  $dp = spoPrintRow(spoPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['dp'];
  $short = spoPrintRow(spoPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['short'];

} 

  $cover_row = $cover_row ?: array_fill_keys(['num','cover_date','num_add','cover_date_add','cover_year','caps'], '');
  $chief_role = !empty($id_school_get) ? spoPrintRow(spoPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['chief_role'] : "Директор ИПМЭиТ";
  $chief = !empty($id_school_get) ? spoPrintRow(spoPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['chief'] : "В.Э. Щепинин";
  $short = !empty($id_school_get) ? spoPrintRow(spoPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['short'] : "";
$num = $cover_row['num'];

$num = $cover_row['num'];
$cover_date = $cover_row['cover_date'];
$num_add = $cover_row['num_add'];
$cover_date_add = $cover_row['cover_date_add'];

$cover_year = htmlspecialchars($period,ENT_QUOTES,'UTF-8');
$caps = $cover_row['caps'];

$mpdf=gekPdfEngine(['default_font_size'=>13,'margin_left'=>30,'margin_right'=>15,'margin_top'=>15,'margin_bottom'=>10]);
$mpdf->WriteHTML(file_get_contents(__DIR__.'/styles.css'),\Mpdf\HTMLParserMode::HEADER_CSS);
$mpdf->defaultfooterline = 0;
$mpdf->setFooter('|{PAGENO}|');
$mpdf->charset_in = 'utf-8';
$mpdf->SetDisplayMode('fullpage','two');


if (!$tableOnly) {
$mpdf->AddPage('P','','','','on');
  $cover_date = ($cover_date ? DateTime::createFromFormat('Y-m-d', $cover_date)->format('d.m.Y') : '');
  $cover_date_add = ($cover_date_add ? DateTime::createFromFormat('Y-m-d', $cover_date_add)->format('d.m.Y') : '');
  $html = '<html>
<head>
<title>Аттестационные комиссии по СПО</title>
  
</head>
<body>
<p class="leftstr indent"><img src="'.__DIR__.'/title.jpg" width="300" height="298">';
$html.= !empty($id_school_get ) ? '<p class="rightstr">Директору ИПМЭиТ
<br>Щепинину В.Э' : '<p class="rightstr"></p></p>';
$html.=$caps;

$doc_type = empty($id_school_get) ? '<p class="com_break form-group rspr"><strong>РАСПОРЯЖЕНИЕ' : '<p class="com_break form-group indent"><strong>СЛУЖЕБНАЯ ЗАПИСКА';
$html.= $doc_type.'<p>'; 
  /*$date = new DateTime();
  $intlFormatter = new IntlDateFormatter('ru_RU', IntlDateFormatter::SHORT, IntlDateFormatter::SHORT);
  $intlFormatter->setPattern('dd.MM.Y');
  $date= $intlFormatter->format($date);*/

  $html.= "<p class='com_break com school_1'><u>".$cover_date_add."</u>"." "."№ <u>".$num_add."</u>";


$html.= empty($id_school_get) ? "
<p class='com'><strong>Об утверждении состава аттестационных
<p class='com'><strong> комиссий ИПМЭиТ для случаев перевода 
<p class='com'><strong>на ИУП на ".$cover_year." учебный год</strong><p class='com_break'>

<p>В целях организации учебного процесса и проведения процедуры зачета результатов обучения по отдельным дисциплинам (модулям) и (или) отдельным практикам, освоенным (пройденным) обучающимся при получении среднего профессионального образования (СПО) для перевода на индивидуальный учебный план (ИУП) с сокращенным сроком обучения лиц, обучающихся в ИПМЭиТ, в соответствии с Порядком зачета результатов освоения обучающимися курсов, дисциплин (модулей), практики, дополнительных образовательных программ, утвержденных приказом ФГАОУ ВО «СПбПУ» от 17.08.2021 № 1669.
<p><strong>ОБЯЗЫВАЮ:</strong>
<p>Создать аттестационные комиссии для случаев перевода на индивидуальный учебный план студентов, имеющих базовое среднее профессиональное образование, по переаттестации ранее изученных дисциплин по Институту промышленного менеджмента экономики и торговли в составе в соответствии с Приложением 1." : "<p class='com_break'><p>Для случаев перевода на индивидуальный учебный план (ИУП) обучающихся ".$rp.", имеющих базовое среднее профессиональное образование, просим утвердить на ".$cover_year." учебный год комиссии по переаттестации ранее изученных дисциплин в соответствии с Приложением.";



$html.="<p class='com_break'>
<p class='com_break'>
<p class='com_break'>
<p class='com_break'>
<p class='com_break'>
<p class='com_break'><p class='leftstr noindent'>".$chief_role." ".$short."<p class='rightstr'>".$chief;
$mpdf->WriteHTML($html);
}
$mpdf->AddPage('P','','','','off');


$html='';
$num_app=1;
  $app= empty($id_school_get) ? ' 1' : '';
  $html.= empty($id_school_get) ? '<header><p class="noindent "align="right">Приложение'.$app.'<p class="school">Составы аттестационных комиссий для случаев перевода на индивидуальный учебный план студентов, имеющих базовое среднее профессиональное образование, по переаттестации ранее изученных дисциплин по Институту промышленного менеджмента, экономики и торговли на '.$cover_year.' учебный год</p>'
   : '<p class="school">Составы аттестационных комиссий для случаев перевода на ИУП студентов, имеющих базовое среднее профессиональное образование, по переаттестации ранее изученных дисциплин по '.$dp.'<br> на '.$cover_year.' учебный год</p>';
 
  $cert_query = empty($id_school_get) ? "SELECT * FROM spo_info ORDER BY id_com_spo" : "SELECT * FROM spo_info WHERE id_school = $id_school_get ORDER BY id_com_spo";

  $cert_result = spoPrintQuery($conn, $cert_query);


while ($row = spoPrintRow($id_result)) {
$id_school = $row['id_school'];
$id_school_temp=$row['id_school_temp'];
$name_school = $row['name_school'];
  if(pg_num_rows($cert_result) == 0) continue;

while ($cert_row = spoPrintRow($cert_result)) {
  $teachers = explode(';', $cert_row['name_teacher']);

  $chairman = "";
  if(!empty($cert_row['name_chairman'])) {
    $chairman = explode(':', $cert_row['name_chairman']);
    $ch_name = array_shift($chairman);
    $ch_info = implode(", ", array_filter($chairman));
    $chairman = '<tr><td>'.htmlspecialchars($ch_name,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8').' (председатель)</td>
            <td>'.htmlspecialchars($ch_info,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8').'</td>
            </tr>';
  } 
  foreach ($teachers as &$tch) {
    $tch = explode(':', $tch);
    $tch_name = array_shift($tch);
    $tch_info = implode(", ", array_filter($tch));

    $tch = '<tr><td>'.htmlspecialchars($tch_name,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8').'</td>
        <td>'.htmlspecialchars($tch_info,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8').'</td>
        </tr>';
  }
  
array_pop($teachers);
  $secretary = "";
  if(!empty($cert_row['name_secretary'])) {
    $secretary = explode(':', $cert_row['name_secretary']);
    $sc_name = array_shift($secretary);
    $sc_info = implode(", ", array_filter($secretary));
    $secretary = '<tr><td>'.htmlspecialchars($sc_name,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8').' (секретарь)</td>
            <td>'.htmlspecialchars($sc_info,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8').'</td>
            </tr>';
  }

$nb_str = '<br><em>По направлениям подготовки бакалавров:</em>';
$nm_str = '<br><em>По направлениям подготовки магистров:</em>';
$ns_str = '<br><em>По направлениям подготовки специалистов:</em>';

$count_b = count(array_filter(explode(';', $cert_row['count_b'])));
switch ($count_b) {
  case 0:
    $nb_str = '';
    break;
  case 1:
  $nb_str = '<br><em>По направлению подготовки бакалавров:</em>';
}

$count_m = count(array_filter(explode(';', $cert_row['count_m'])));
switch ($count_m) {
  case 0:
    $nm_str = '';
    break;
  case 1:
  $nm_str = '<br><em>По направлению подготовки магистров:</em>';
}

$count_s = count(array_filter(explode(';', $cert_row['count_s'])));
switch ($count_s) {
  case 0:
    $ns_str = '';
    break;
  case 1:
  $ns_str = '<br><em>По направлению подготовки специалистов:</em>';
}


$dir_b = $cert_row['name_direction_b'] != '.' ? $cert_row['name_direction_b'] : '';
$dir_m = $cert_row['name_direction_m'] != '.' ? $cert_row['name_direction_m'] : '';
$dir_s = $cert_row['name_direction_s'] != '.' ? $cert_row['name_direction_s'] : '';

$dir_b = remove_dubs($dir_b);
$dir_m = remove_dubs($dir_m);
$dir_s = remove_dubs($dir_s);

  $id_cert=$cert_row['id_spo'];
  $id_com=sprintf('%03d', $cert_row['id_com_spo']);
  //$id_com++; 

  $html.=  "<strong>АК-СПО № ".$id_com.":</strong>";
  $html.=$nb_str.$dir_b.$nm_str.$dir_m.$ns_str.$dir_s.'<p class="com_break noindent"><table border="1" cellspacing="0" width="624">
    <colgroup width="205">
    <colgroup width="419">
        <thead>
            <tr>
                <th>
                        <em>ФИО члена <br>аттестационной <br>комиссии</em>
                </th>
                <th>
                        <em>Информация о члене аттестационной комиссии</em>
                </th>
            </tr>
        </thead>
        <tbody>' .$chairman;
        foreach($teachers as $t){
          $html.=$t;
        }

$html.=$secretary.'</tbody></table><br>';
}
$num_app++;

}





$html.= empty($id_school_get) ? "<p class='com_break'>

<p class='com_break'>
<p class='leftstr noindent'>Зам. директора ИПМЭиТ             
<br>по учебно-методической работе          
<br>«___» __________ ".$printYear." г.
<p class='rightstr'><br>/Краснов А.С./ 
" : "";
$html.= '</body>
</html>';
  
    $stylesheet = file_get_contents(__DIR__.'/styles.css');
    $mpdf->WriteHTML($stylesheet,\Mpdf\HTMLParserMode::HEADER_CSS);
    $mpdf->WriteHTML($html);
    $file_name = 'spo.pdf';
    // $mpdf->debug = true;
    return $mpdf->Output('', \Mpdf\Output\Destination::STRING_RETURN);

?>
