<?php





$id_result = ppaPrintQuery($conn, "SELECT * FROM school ORDER BY id_school_temp");
$cover_row = spoPrintRow(ppaPrintQuery($conn, "SELECT * FROM cover_page WHERE id_school IS NULL AND spo = false"));
$max_app = spoPrintRow(ppaPrintQuery($conn, "SELECT COUNT (DISTINCT id_school) FROM certification_info WHERE add_edit IS FALSE"))['count'];

if($schoolId){
  $id_school_get = $schoolId;
  $id_result = ppaPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get");
  $cover_row = spoPrintRow(ppaPrintQuery($conn, "SELECT * FROM cover_page WHERE id_school = $id_school_get AND spo = false"));
  $short = spoPrintRow(ppaPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['short'];
  
} 

$chief_role = !empty($id_school_get) ? spoPrintRow(ppaPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['chief_role'] : "Директор ИПМЭиТ";
  $chief = !empty($id_school_get) ? spoPrintRow(ppaPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['chief'] : "В.Э. Щепинин";
  $short = !empty($id_school_get) ? spoPrintRow(ppaPrintQuery($conn, "SELECT * FROM school WHERE id_school = $id_school_get"))['short'] : "";

$cover_row=$cover_row ?: array_fill_keys(['num','cover_date','num_add','cover_date_add','cover_year','caps','opt','dir'],'');
$num = $cover_row['num'];
$cover_date = $cover_row['cover_date'];
$num_add = $cover_row['num_add'];
$cover_date_add = $cover_row['cover_date_add'];

$cover_year = htmlspecialchars($period,ENT_QUOTES,'UTF-8');
$caps = $cover_row['caps'];

$mpdf=gekPdfEngine(['default_font_size'=>13,'margin_left'=>30,'margin_right'=>15,'margin_top'=>15,'margin_bottom'=>10]);
$mpdf->WriteHTML(file_get_contents(__DIR__.'/../spo/styles.css'),\Mpdf\HTMLParserMode::HEADER_CSS);
$mpdf->defaultfooterline = 0;
$mpdf->SetHTMLFooter('<div style="text-align: right; color: grey ">{PAGENO}</div>');
$mpdf->charset_in = 'utf-8';
$mpdf->SetDisplayMode('fullpage','two');


  $cover_date = ($cover_date ? DateTime::createFromFormat('Y-m-d',$cover_date)->format('d.m.Y') : '');
  $cover_date_add = ($cover_date_add ? DateTime::createFromFormat('Y-m-d',$cover_date_add)->format('d.m.Y') : '');
if(!$tableOnly){
$mpdf->AddPage('P','','','','on');
  $html = '<html>
<head>
<title>Аттестационные комиссии</title>
  
</head>
<body>
<p class="leftstr indent"><img src="'.__DIR__.'/../spo/title.jpg" width="300" height="298">';
$html.= !empty($id_school_get ) ? '<p class="rightstr">Директору ИПМЭиТ
<br>Щепинину В.Э' : '<p class="rightstr"></p></p>';
$html.=$caps;

$doc_type = empty($id_school_get) ? '<p class="com_break form-group rspr"><strong>РАСПОРЯЖЕНИЕ' : '<p class="com_break form-group indent"><strong>СЛУЖЕБНАЯ ЗАПИСКА';
$html.= $doc_type.'<p>'; 
  /*$date = new DateTime();
  $intlFormatter = new IntlDateFormatter('ru_RU', IntlDateFormatter::SHORT, IntlDateFormatter::SHORT);
  $intlFormatter->setPattern('dd.MM.Y');
  $date= $intlFormatter->format($date);*/

  $html.= "<p class='com_break school_1'><u>".$cover_date."</u>"." "."<strong>№</strong> <u>".$num."</u>";

$year = date("Y");
$year_n = $year + 1;
$year_str = $year."/".$year_n;





$html.= empty($id_school_get) ? "<p class='com_break'><p class='com'><strong>О составах комиссий для проведения
<p class='com'><strong>повторных аттестаций студентов 
<p class='com'><strong>ИПМЭиТ на ".$cover_year." уч. год</strong><p class='com_break'>

<p >Для проведения второй повторной промежуточной аттестации по основным образовательным программам бакалавриата, специалитета и магистратуры
<p ><strong>ОБЯЗЫВАЮ:" : "";

$html.= empty($id_school_get) ? "<p>Создать на ".$cover_year." учебный год комиссии для приема академических задолженностей студентов, в соответствии с представлениями директоров Высших школ (Приложения 1 – ".$max_app."). 
<p>Контроль за исполнением распоряжения возложить на заместителя директора по учебно-методической работе Краснова А.С." : "<p class='com_break'><p>Для проведения второй повторной промежуточной аттестации по основным образовательным программам бакалавриата, специалитета, магистратуры ".$short." просим согласовать на ".$cover_year." учебный год комиссии для приема академических задолженностей студентов в соответствии с Приложением.
";
$html.="<p class='com_break'>
<p class='com_break'>
<p class='com_break'>
<p class='com_break'><div class='leftstr'>".$chief_role." ".$short."</div><div class='rightstr'>".$chief."</div>";
$html.= empty($id_school_get) ? "<p class='com_break'><div class='leftstr'><u>Согласовано:</u></div>
<br><br><div class='leftstr'>Заместитель директора<br> по учебно-методической работе</div><div class='rightstr'>А.С. Краснов</div>" : "";
$mpdf->WriteHTML($html);
}
$mpdf->AddPage('P','','','','off');


$html='';
$num_app=1;
while ($row = spoPrintRow($id_result)) {
$id_school = $row['id_school'];
$id_school_temp=$row['id_school_temp'];
$name_school = $row['name_school'];
$rp = $row['rp'];
          //$date = date('j F Y');
  /*$date = new DateTime();
  $intlFormatter = new IntlDateFormatter('ru_RU', IntlDateFormatter::SHORT, IntlDateFormatter::SHORT);
  $intlFormatter->setPattern('«dd» MMMM Y');
  $date= $intlFormatter->format($date);
  $cover_date = DateTime::createFromFormat("d.m.Y", $cover_date)->format('«dd» MMMM Y');*/

  $cert_query = "SELECT * FROM certification_info WHERE id_school = $id_school AND add_edit IS FALSE ORDER BY id_com";
  $cert_result = ppaPrintQuery($conn, $cert_query);
  if(pg_num_rows($cert_result) == 0) continue;
//$id_com = 0; 

//if($id_school < $max_id && empty($id_school_get)) $html.='<div class="page-break"></div>';

  $html.= '<header><p align="right"><span>Приложение ';
  $html.= empty($id_school_get) ? $num_app.' к Распоряжению от '.$cover_date.' № '.$num.'</p></header>' : '</p></header>';
  $html.= empty($id_school_get) ? '<p class="school" ><strong>'.$name_school.'</strong></p>' : '<p class="school"><strong> Комиссии '.$rp.'<br> на '.$cover_year.' учебный год</strong></p>';

while ($cert_row = spoPrintRow($cert_result)) {
  $teachers = explode(';', $cert_row['name_teacher']);
  foreach ($teachers as &$tch) {
    $tch = implode(", ", array_filter(explode(':', $tch)));
  }
  $chairman = "";
  if(!empty($cert_row['name_chairman'])) {
    $chairman = "<p>Председатель комиссии - ".htmlspecialchars(implode(", ", array_filter(explode(':', $cert_row['name_chairman']))),ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
  }

  $id_cert=$cert_row['id_cert'];
  $id_com=$cert_row['id_com'];
  //$id_com++; 
  $direction = ($cert_row['name_direction'] != " - ") ? $cert_row['name_direction'] : "<p>";
  $program = ($cert_row['name_program'] != " - ") ? $cert_row['name_program'] : "<p>";
  $html.=  "<p><strong>Комиссия № ".$id_com.":</strong><p>";
  $html.=   $direction."<p>";
  $html.=   $program."<p>";
  if($cert_row['name_discipline'] != " ()"){
      $html.=  "По дисциплине(-ам): ";
      $html.=  $cert_row['name_discipline'].".<p>";
}
  $html.=  $chairman;
  if(!empty($teachers[0])) $html.=  "<p>Члены комиссии:<p>";
  foreach ($teachers as $t) {
    $html.= htmlspecialchars($t,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8')."<p>";
  }
  $html.='<p class="com_break">';

}
$num_app++;
$html.= empty($id_school_get) ? "<p class='com_break'>
<p class='com_break'>
<p class='com_break'>
<p class='com_break'>
<p class='leftstr'>Директор ИПМЭиТ
<p class='rightstr'>В.Э. Щепинин
<div class='page-break'></div>" : "<div class='page-break'></div>";
}

/*КОСТЫЛЬ*/
$html=preg_replace("/<div class='page-break'><\/div>$/",'',$html);

$html.= '</body>
</html>';
    $stylesheet = file_get_contents(__DIR__.'/../spo/styles.css');
    $mpdf->WriteHTML($stylesheet,\Mpdf\HTMLParserMode::HEADER_CSS);
    $mpdf->WriteHTML($html);
    $file_name = 'certification.pdf';

    return $mpdf->Output('',\Mpdf\Output\Destination::STRING_RETURN);

?>