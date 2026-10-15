<?php
$query = "select * from program_info where id_mep = $id_mep";
$result = oopPrintQuery($conn, $query);
$row = oopPrintRow($result);
$id_program = $row['id_program'];
$year_a=[];

$mpdf=gekPdfEngine(['margin_left'=>20,'margin_right'=>10,'margin_top'=>20,'margin_bottom'=>20]);
$mpdf->defaultfooterline = 0;

//$mpdf->setFooter('|{PAGENO}|');
$mpdf->SetHTMLFooter('<div style="text-align: right; color: grey ">{PAGENO}</div>');
$mpdf->charset_in = 'utf-8';
$mpdf->SetDisplayMode('fullpage','two');


$query_mep_3 = "select * from tasks_mep_3 where id_mep = $id_mep";
$result_mep_3 = oopPrintQuery($conn, $query_mep_3);
$row_mep_3 = oopPrintRow($result_mep_3);
if($row_mep_3)$row_mep_3 += array_fill_keys(OOP_FIELDS,'');
$pr = oopPrintRow(oopPrintQuery($conn, "SELECT * FROM pr"));
$costyl = $row['id_direction'] == 37 ? 'Специалист таможенного дела' : $row['level_name'];
if(!$row_mep_3){
$row_mep_3 = array();
$row_mep_3["date_approved"] = $row_mep_3["prorector"] = $row_mep_3["date_considered"] = "«____» _____________ 202_ г.";
$keys = array("comp" , "prof_act", "formed", "spec", "res",  "graduate", "name_prof_object",
"num_prof", "num_org", "num_sci", "plan_o", "plan_oz", "plan_z", "calendar_o", "calendar_oz", "calendar_z", "protocol_approved", "reviewer", "protocol_considered", "r_phio", "year");
$empty_mep_3 = array_fill_keys($keys, "");
$row_mep_3 += $empty_mep_3;
}
/*$row_mep_3 = insert_form($id_mep, $conn, ["protocol_approved", "reviewer", "protocol_considered", "r_phio", "year", "date_approved", "prorector", "date_considered"], 'tasks_mep_3', '0', ["date_approved", "prorector", "date_considered"]);*/
$html='
<html>
<head>
<meta charset="utf-8">
<style>
.page-break {
    page-break-after: always;
    }
p {
    text-indent: 40px;
    text-align: justify;
    margin: 10;
    }



li {
    list-style-type: none;
     }
li:before {
    content: "- ";
    }
ul {
    margin-left: -40px;
    margin-bottom: -5;
    }
    body{
        line-height: 1;
    }
</style>
    </head>
    <body>
<htmlpagefooter name="firstpage">First page</htmlpagefooter>
    <htmlpagefooter name="otherpages">Page {PAGENO} of {nb}</htmlpagefooter>

    <p align = "center"><strong><span>федеральное государственное автономное образовательное учреждение</span></strong><br>
    <strong><span>высшего образования</span></strong><br>
    <strong><span>&laquo;Санкт-Петербургский политехнический университет Петра Великого&raquo;</span></strong><br></p>
    <br>


<table width="725" cellspacing="8" cellpadding="8" style="margin-left:0pt;margin-right: 0pt;">
    <tbody>
        <tr valign="top">
            <td width = "360">
                <p>
                    УТВЕРЖДЕНА
                <br>
                    Решением Ученого совета СПбПУ<br>
                    от '.$row_mep_3['date_approved'].'<br>'.'(протокол №'. $row_mep_3['protocol_approved'].')<br>

                </p>
            </td>
            <td >
                <p>
                    УТВЕРЖДАЮ
                <br>
                    Проректор по образовательной
                    <br>
                    деятельности
                    _______ '.$pr['prorector_name'].'<br>'. $row_mep_3['prorector'].'
                </p>
            </td>
        </tr>
    </tbody>
</table>
<p>
<br>
</p>
<p>
<br>
</p><p>
<br>
</p>
<center>
    <p align = "center"><strong><span>ОСНОВНАЯ ОБРАЗОВАТЕЛЬНАЯ ПРОГРАММА&nbsp;</span></strong><br>
    <strong><span>ВЫСШЕГО ОБРАЗОВАНИЯ</span></strong></p>
    <br>
    <p align = "center"><span>по направлению подготовки (специальности)</span></p>
</center>
    <table width="98%" cellpadding="0" cellspacing="1">
        <tbody>
            <tr>
                <td style = "text-align:center">
                    <span>'.$row['number_direction']. ' '. $row['name_direction'].'</span>
                </td>
            </tr>
            <tr>
                <td style = "text-align:center; border-top: 1px solid #000000; border-bottom: none; border-left: none; border-right: none; padding: 0cm" valign="top">
                    <em style = "font-size: 8pt"><span>(код и наименование направления подготовки (специальности))</span></em><p class = "intro"></p>
                </td>
            </tr>
                       <tr><td><br></td></tr>
            <tr>
                <td style = "text-align:center">
                    <span>'.$row['id_program'].' '. $row['name_program'].'</span>
                </td>
            </tr>
            <tr>
                <td style = "text-align:center; border-top: 1px solid #000000; border-bottom: none; border-left: none; border-right: none; padding: 0cm" valign="top">
                    <em style = "font-size: 8pt"><span>Направленность(и) (профиль(и)/специализация (ии))</span></em><p class = "intro"></p>
                </td>
            </tr>
                        <tr><td><br></td></tr>
            <tr>
                <td style = "text-align:center">
                    <span>'.$costyl.'</span>
                </td>
            </tr>
            <tr>
                <td style = "text-align:center; border-top: 1px solid #000000; border-bottom: none; border-left: none; border-right: none; padding: 0cm" valign="top">
                    <em style = "font-size: 8pt"><span>квалификация выпускника</span></em><p class = "intro"></p>

                </td>
            </tr>
                        <tr><td><br></td></tr>
            <tr>
                <td style = "text-align:center">';
                    if(!is_null($row['name_education_form'])){
                    $ef=explode(';', ($row['name_education_form'] ?? ''));
                    if (in_array("очная", $ef) && in_array("очно-заочная", $ef)){
                    $ef[0]="очная";
                    $ef[1]="очно-заочная";
                    }
                        foreach ($ef as $n => $form) {
                        $html.= $form;
                        if ($n < count($ef) - 1) {
                        $html.= ", ";
                        }
                    }
                }
                else {
                    $ef=array();
                }
                
                $html.='</td>
            </tr>
            <tr>
                <td style = "text-align:center; border-top: 1px solid #000000; border-bottom: none; border-left: none; border-right: none; padding: 0cm" valign="top">
                    <em style = "font-size: 8pt"><span>форма(ы) обучения</span></em><p class = "intro"></p>
                    <p class = "intro"><em><span>&nbsp;</span></em></p>
                </td>
            </tr>
        </tbody>
    </table>


    <p><span>&nbsp;</span></p>
  

    <footer><p align="center"><span>Санкт-Петербург &ndash; '.$row_mep_3['year'].'&nbsp;</span></p></footer>
';        $mpdf->AddPage('P','','','','on');
        $mpdf->WriteHTML($html);
        $mpdf->AddPage('P','','','','on');
$html='
<p></p>
<table cellspacing="0" cellpadding="0">
    <tbody>
        <tr>
            <td width="400" valign="top">
                    Руководитель образовательной<br>
                    программы по направлению<br>
                    подготовки '.$row['number_direction'].'
            </td>
            <td width="20" valign="top">

            </td>
            <td width="140" valign="top">

            </td>
            <td width="14" valign="top">

            </td>
            <td width="172" valign="bottom" align="center">'.$row['chief_program'].'
            </td>
        </tr>
        <tr>
            <td width="230" valign="top">
            </td>
            <td width="14" valign="top">
                <p align="center">
                    <strong></strong>
                </p>
            </td>
            <td width="102" valign="top" style="font-size: 8pt; border-top: 1px solid #000000; border-bottom: none; border-left: none; border-right: none; text-align: center">
                    <em>(подпись)</em>
            </td>
            <td width="14" valign="top">
                <p align="center">
                    <strong></strong>
                </p>
            </td>
            <td width="172" valign="top" style="font-size: 8pt; border-top: 1px solid #000000; border-bottom: none; border-left: none; border-right: none; text-align: center">
                    <em>(инициалы, фамилия)</em>
            </td>
        </tr>
        <tr>
            <td width="230" height="20" valign="top">
            </td>
            <td width="14" height="20" valign="top">
            </td>
            <td width="102" height="20" valign="top">
            </td>
            <td width="14" height="20" valign="top">
            </td>
            <td width="172" height="20" valign="bottom">
            </td>
        </tr>
        <tr>
            <td width="230" valign="top">
                    Директор ИПМЭиТ
            </td>
            <td width="14" valign="top">

            </td>
            <td width="102" valign="top">

            </td>
            <td width="14" valign="top">

            </td>
            <td width="172" valign="bottom" align="center">
                    В.Э. Щепинин
            </td>
        </tr>
        <tr>
            <td width="230" valign="top">
            </td>
            <td width="14" valign="top">

            </td>
            <td width="102" valign="top" style="font-size: 8pt; border-top: 1px solid #000000; border-bottom: none; border-left: none; border-right: none; text-align: center">
                    <em>(подпись)</em>
            </td>
            <td width="14" valign="top">

            </td>
            <td width="172" valign="top" style="font-size: 8pt; border-top: 1px solid #000000; border-bottom: none; border-left: none; border-right: none; text-align: center">
                    <em>(инициалы, фамилия)</em>
            </td>
        </tr>
        <tr>
            <td width="230" height="20" valign="top">
            </td>
            <td width="14" height="20" valign="top">
            </td>
            <td width="102" height="20" valign="top">
            </td>
            <td width="14" height="20" valign="top">
            </td>
            <td width="172" height="20" valign="bottom">
            </td>
        </tr>
            <tr>
            <td width="230" valign="top">
                   '.$pr['chief_position'].'
            </td>
            <td width="14" valign="top">

            </td>
            <td width="102" valign="top">

            </td>
            <td width="14" valign="top">

            </td>
            <td width="172" valign="bottom" align="center">
                    '.$pr['chief'].'
            </td>
        </tr>
        <tr>
            <td width="230" valign="top">
            </td>
            <td width="14" valign="top">

            </td>
            <td width="102" valign="top" style="font-size: 8pt; border-top: 1px solid #000000; border-bottom: none; border-left: none; border-right: none; text-align: center">
                    <em>(подпись)</em>
            </td>
            <td width="14" valign="top">

            </td>
            <td width="172" valign="top" style="font-size: 8pt; border-top: 1px solid #000000; border-bottom: none; border-left: none; border-right: none; text-align: center">
                    <em>(инициалы, фамилия)</em>
            </td>
        </tr>
        <tr>
            <td width="230" height="20" valign="top">
            </td>
            <td width="14" height="20" valign="top">
            </td>
            <td width="102" height="20" valign="top">
            </td>
            <td width="14" height="20" valign="top">
            </td>
            <td width="172" height="20" valign="bottom">
            </td>
        </tr>
        <tr>
            <td width="230" valign="top">
                    Рецензент (работодатель)<br>'.$row_mep_3['reviewer'].'
            </td>
            <td width="14" valign="top">

            </td>
            <td width="102" valign="top">

            </td>
            <td width="14" valign="top">

            </td>
            <td width="172" valign="bottom" align="center">'.$row_mep_3['r_phio'].'
            </td>
        </tr>
        <tr>
           <td width="230" valign="top" style="font-size: 8pt; border-top: 1px solid #000000; border-bottom: none; border-left: none; border-right: none; text-align: center">
                    <em>(должность, место работы)</em>
            </td>
            <td width="14" valign="top">

            </td>
            <td width="102" valign="top" style="font-size: 8pt; border-top: 1px solid #000000; border-bottom: none; border-left: none; border-right: none; text-align: center">
                    <em>(подпись)</em>
            </td>
            <td width="14" valign="top">

            </td>
            <td width="172" valign="top" style="font-size: 8pt; border-top: 1px solid #000000; border-bottom: none; border-left: none; border-right: none; text-align: center">
                    <em>(инициалы, фамилия)</em>
            </td>
        </tr>

    </tbody>
</table>';

        $mpdf->WriteHTML($html);
$mpdf->AddPage('P','','','','off');
$mpdf->TOCpagebreakByArray(array(
    'tocfont' => '',
    'tocfontsize' => '',
    'tocindent' => '',
    'TOCusePaging' => true,
    'TOCuseLinking' => true,
    'toc_orientation' => '',
    'toc_mgl' => 20,
    'toc_mgr' => 10,
    'toc_mgt' => 20,
    'toc_mgb' => 0,
    'toc_mgh' => '',
    'toc_mgf' => '',
    'toc_ohname' => '',
    'toc_ehname' => '',
    'toc_ofname' => '',
    'toc_efname' => '',
    'toc_ohvalue' => 0,
    'toc_ehvalue' => 0,
    'toc_ofvalue' => 0,
    'toc_efvalue' => 0,
    'toc_preHTML' => '<p align = "center"><strong><span>СОДЕРЖАНИЕ</span></strong></p>',
    'toc_postHTML' => '<footer style="position: absolute;
  right: 40px;
  top: 1070px; color: grey">3</footer>',
    'toc_bookmarkText' => '',
    'resetpagenum' => '',
    'pagenumstyle' => '1',
    'suppress' => '',
    'orientation' => '',
    'mgl' => '',
    'mgr' => '',
    'mgt' => '',
    'mgb' => '',
    'mgh' => '',
    'mgf' => '',
    'ohname' => '',
    'ehname' => '',
    'ofname' => '',
    'efname' => '',
    'ohvalue' => 0,
    'ehvalue' => 0,
    'ofvalue' => 0,
    'efvalue' => 0,
    'toc_id' => 0,
    'pagesel' => '',
    'toc_pagesel' => '',
    'sheetsize' => '',
    'toc_sheetsize' => '',
));




    $html='

<div class="main text">';
    $mpdf->WriteHTML($html);

$html='<p align = "center"><strong><span>1. ОБЩИЕ ПОЛОЖЕНИЯ</span></strong><a name="_Toc265829304"></a></p>';
    $mpdf->TOC_Entry("1. Общие положения", 4);
    if($row['id_level']==2)
    {
        $html.= "<p>
    Назначение основной образовательной программы (далее – ООП): основная
    образовательная программа ".$row['id_program']." «".$row['name_program']."» регламентирует цели, ожидаемые результаты, содержание, условия и технологии
    реализации образовательного процесса, оценку качества подготовки выпускника
    по данному направлению подготовки<em>.</em>
</p>
<p>
    Структура ООП состоит из следующих компонентов:
</p>
<p>
    <em>Общенаучный модуль.</em>
</p>
<p>
    <em>Профессиональные модули:</em>
</p>
<p>
    - базовый модуль направления;
</p>
<p>
    - модуль профильной направленности.
</p>
<p>
    <em>Модуль мобильности.</em>
</p>
<p>
    <em>Модуль проектной деятельности.</em>
</p>
<p>
    <em>Модуль «Государственная итоговая аттестация»</em>
</p>
<p>
    <em>Факультативный модуль.</em>
</p>";
    }
else{

$html.='<p><span>Образовательная программа высшего образования (далее &ndash; ООП ВО) представляет собой систему учебно-методических документов, разработанных на основе образовательного стандарта высшего образования федерального государственного автономного образовательного учреждения высшего образования &laquo;Санкт-Петербургский политехнический университет Петра Великого&raquo; (далее &ndash; СУОС ВО СПбПУ) по направлению подготовки '. $row['number_direction']. ' '.'«'. $row['name_direction'].'», а также с учетом требований общероссийского и регионального рынка труда, потребностей абитуриентов и обучающихся, результатов научной, практической, методической, учебной и воспитательной работы школ СПбПУ.</span></p>
    <p><span>ООП ВО регламентирует цели, результаты освоения, содержание, условия и технологии реализации образовательного процесса, оценку качества подготовки выпускника по данному направлению подготовки и включает в себя: учебный план, рабочие программы учебных курсов, предметов, дисциплин (модулей), методические рекомендации по организации самостоятельной работы студентов, программы и фонды оценочных средств промежуточной и итоговой (государственной итоговой) аттестации студентов и другие материалы, обеспечивающие качество подготовки обучающихся, а также программы практик и методические материалы, обеспечивающие реализацию соответствующей образовательной технологии.</span></p>
    <p>Структура ООП состоит из следующих компонентов:
   <p><em><span>Обязательные унифицированные дисциплинарные модули:</span></em>
    <p>- Ядро Политеха;
    <p>- Ядро Полигруппы.

    <p><em><span>Профессиональные модули:</span></em>
    <p>- дисциплины УГСН/направления (специальности);
    <p>- дисциплины профиля, в том числе элективные модули направленности (специализации).
    
    <p><em><span>Элективный модуль:</span></em>
    <p>- модуль мобильности.

    <p><em><span>Модуль практической подготовки.&nbsp;</span></em></p>
    <p><em><span>Модуль государственной итоговой аттестации &ndash; ГИА.</span></em></p>
    <p><em><span>Факультативный модуль.</span></em></p>';
}
$mpdf->WriteHTML($html);

    $html='<p><span><p align = "center"><strong>2. НОРМАТИВНО-ПРАВОВАЯ БАЗА ДЛЯ РАЗРАБОТКИ<br><strong>ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ</p></span></strong>';
    $mpdf->TOC_Entry("2. Нормативно-правовая база для разработки основной образовательной
программы", 4);
    $html.='<p><span>При разработке ООП использовались следующие документы:</span>
    <p>- Федеральный закон от 29.12.2012 № 273-ФЗ &laquo;Об образовании в Российской Федерации&raquo;;&nbsp;
    <p>- Приказ Минобрнауки России&nbsp;от 06.04.2021 № 245 &laquo;Об утверждении Порядка организации и осуществления образовательной деятельности по образовательным программам высшего образования &ndash; программам бакалавриата, программам специалитета, программам магистратуры&raquo;;
    <p>- Приказ&nbsp;Минобрнауки России от 29.06.2015 № 636 &laquo;Об утверждении Порядка проведения государственной итоговой аттестации&nbsp;по образовательным программам высшего образования &ndash; программам бакалавриата, программам специалитета, программам магистратуры;
    <p>- Образовательный стандарт высшего образования федерального государственного автономного образовательного учреждения высшего образования &laquo;Санкт-Петербургский политехнический университет Петра Великого&raquo; (далее &ndash; СУОС) по направлению подготовки'.$row['level_name'].'ов '. $row['number_direction']. ' '.'«'. $row['name_direction'].'», утвержденный приказом СПбПУ от 30.07.2021 № 1609<sup>1</sup>;
        <div style="
        border-top: 1px solid #000000;
        position: absolute;
  left: 40px;
  top: 1070px;
  font-size: 10pt;"><sup style="font-size: 8pt;">1</sup> с изменениями, внесенными приказом СПБПУ от 24.08.2023 № 2026</div>
        <p>- Профессиональные стандарты: ';
         $aps = explode(';', ($row['approved_prof_standard'] ?? ''));
    for ($i = 0; $i < count($aps); ++$i) {
                        $html.= $aps[$i];
                        if ($i < count($aps) - 1) {
                        $html.= ', ';
                        }
                    }
    $html.=';
    <p>- локальные нормативные акты Университета.';
$mpdf->WriteHTML($html);


     $html='<p align = "center"><strong>3. ЦЕЛИ, ЗАДАЧИ И НАПРАВЛЕННОСТЬ<br><strong>ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ</strong></p>';
$mpdf->TOC_Entry("3. Цели, задачи и направленность основной образовательной программы", 4);
$row_purpose = $row_mep_3;
    $pa = preg_split("/\r\n|[\r\n]/", $row_purpose['comp']);
    for ($i = 0; $i < count($pa); ++$i) {
                        $html.='<p>'. $pa[$i];
                        if ($i < count($pa) - 1) {
                        $html.= "</p>";
                        }
                    }
$mpdf->WriteHTML($html);


     $html='<p><p align="center"><strong><span>4. СРОКИ ОСВОЕНИЯ<br>ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ</span></strong></p>';
     $mpdf->TOC_Entry("4. Сроки освоения основной образовательной программы", 4);
  if (!is_null($row['period_education'])) {$year_a=explode(';', ($row['period_education'] ?? ''));}
    $html.='<p><span>Срок получения образования по программе (вне зависимости от применяемых образовательных технологий):&nbsp;</span></p>';

    $key = 0;
    $stop_o = (count($ef) > 1) ? ";" : ".";
    $stop_oz = (count($ef) > 2) ? ";" : ".";
  if(in_array("очная", $ef))
   {
    
        $html.="<p><span>- в очной форме обучения, включая каникулы, предоставляемые после прохождения государственной итоговой аттестации, составляет ". $year_a[$key].$stop_o."</span></p>";
        $key++;

   }
    
  if(in_array("очно-заочная", $ef))
   {

        $html.= "<p><span>- в очно-заочной форме обучения составляет ".$year_a[$key].$stop_oz."</span></p>";
    }
  if(in_array("заочная", $ef))
   {

        $html.= "<p><span>- в заочной форме обучения составляет ".$year_a[$key].".</span></p>";
    }

    $html.='<p><span>при обучении по индивидуальному учебному плану, вне зависимости от формы обучения, составляет не более срока получения образования, установленного для соответствующей формы обучения, а при обучении по индивидуальному плану инвалидов и лиц с ОВЗ может быть увеличен по их заявлению не более чем на '.$row['extend'].' по сравнению со сроком получения образования для соответствующей формы обучения.&nbsp;</span></p>';


$mpdf->WriteHTML($html);


     $html='<p><p align="center"><strong><span>5. ТРУДОЕМКОСТЬ<br>ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ</span></strong></p>';
     $mpdf->TOC_Entry("5. Трудоемкость основной образовательной программы", 4);
    $html.='<p><span>Объем программы '.$row['level_rp'].' составляет '.$row['z'].' з.е., вне зависимости от формы обучения, применяемых образовательных технологий, реализации программы '.$row['level_rp'].' с использованием сетевой формы, реализации программы '. $row['level_rp'].' по индивидуальному учебному плану, в том числе ускоренному обучению.&nbsp;</span></p>
    <p><span>Объем программы '. $row['level_rp'].', реализуемый за один учебный год, составляет не более '.$row['z_year'].' з.е. вне зависимости от формы обучения, применяемых образовательных технологий, реализации программы '.$row['level_rp'].' с использованием сетевой формы, реализации программы '. $row['level_rp'].' по индивидуальному учебному плану (за исключением ускоренного обучения), а при ускоренном обучении &ndash; не более '. $row['z_speed'].' з.е.</span></p>';
    $mpdf->WriteHTML($html);


 $html='<p><p align="center"><strong>6. ТРЕБОВАНИЯ К УРОВНЮ ПОДГОТОВКИ,<br>НЕОБХОДИМОМУ ДЛЯ ОСВОЕНИЯ<br>ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ</strong></p>';
$mpdf->TOC_Entry("6. Требования к уровню подготовки, необходимому для освоения основной
образовательной программы", 4);
    $requirements =  preg_split("/\r\n|[\r\n]/", $row['requirements']); 
    for ($i = 0; $i < count($requirements); ++$i) {
                        $html.='<p align="justify">'. $requirements[$i];
                        if ($i < count($requirements) - 1) {
                        $html.= "</p>";
                        }
                    }
    //echo '<p style="white-space: pre-line; ">'.;
    $mpdf->WriteHTML($html);


   $html='<p><p align="center"><strong><span>7. ХАРАКТЕРИСТИКА ПРОФЕССИОНАЛЬНОЙ<br>ДЕЯТЕЛЬНОСТИ ВЫПУСКНИКА</span></strong></p>';
$mpdf->TOC_Entry("7. Характеристика профессиональной деятельности выпускника", 4);

    $html.='<p><span>Выпускники программы готовятся к осуществлению профессиональной деятельности в соответствии с требованиями профессиональных стандартов&nbsp;</span><em><span>';
 $ps = explode(';', ($row['prof_standard'] ?? ''));
    for ($i = 0; $i < count($ps); ++$i) {
                        $html.=$ps[$i];
                        if ($i < count($ps) - 1) {
                        $html.= "; ";
                        }
                    }
$html.='.</span></em></p>
    <p><span>Области профессиональной деятельности выпускников:</span></p>';
  if(!is_null($row['area'])){
    $area = explode(':', ($row['area'] ?? ''));
    for ($i = 0; $i < count($area); ++$i) {
                        $html.= "<p>". $area[$i];
                        if ($i < count($area) - 1) {
                        $html.= ";";
                        }
                    }
                    }

    $html.='.<p><span>В рамках освоения программы '. $row['level_rp'].' выпускники могут готовиться к решению задач профессиональной деятельности следующих типов:</span></p>';
 if(!is_null($row['name_type_task'])){
    $tt = explode(';', ($row['name_type_task'] ?? ''));
    for ($i = 0; $i < count($tt); ++$i) {
                        $html.= "<p>- ". $tt[$i];
            if ($i < count($tt) - 1) {
                        $html.= ";</p>";
                        }
                    }
}
$html.='.
    <p><span>Выпускник, освоивший программу должен быть готов решать следующие профессиональные задачи, структурированные по типам задач профессиональной деятельности:</span></p>   
 <table border="1" cellspacing="0"  style = "border-collapse: collapse;">
        <thead>
            <tr>
                <th style="font-size: 12pt;">
                    <p><strong><span>Виды ПД и (или) типы задач ПД</span></strong></p>
                </th>
                <th style="font-size: 12pt;">
                    <p><strong><span>Задачи профессиональной деятельности</span></strong></p>
                </th>
            </tr>
        </thead>
        <tbody>';

    
        if(!is_null($row['name_prof_task'])){
        $q_temp="SELECT name_type_task, name_prof_task
FROM program_prof_tasks JOIN prof_tasks ON program_prof_tasks.id_prof_task = prof_tasks.id_prof_task
JOIN types_task ON types_task.id_type_task = prof_tasks.id_type_task
WHERE id_mep = $id_mep";
    $r_temp=oopPrintQuery($conn, $q_temp);
    while ($row_prof_task = oopPrintRow($r_temp)) {
                  $type = $row_prof_task['name_type_task'];
                  $name = $row_prof_task['name_prof_task'];

                        $html.= "<tr><td style='font-size: 12pt;'>".$type."</td>"."<td style='font-size: 12pt;'>".$name."</td>";
            $html.= "</tr>";
                  }

    }

      $html.='  </tbody>
    </table>
    <p><span>Перечень основных объектов (или областей знания) профессиональной деятельности выпускников:&nbsp;</span></p>';

        if(!is_null($row['name_prof_object'])){
            $npo =  explode(";", ($row['name_prof_object'] ?? '')); 
    for ($i = 0; $i < count($npo); ++$i) {
                        $html.= '<p align="justify">- '. $npo[$i];
                        if ($i < count($npo) - 1) {
                        $html.= ";</p>";
                        }
                    }
               }

    $html.='.<p><p align="center"><strong><span>8. РЕЗУЛЬТАТЫ ОСВОЕНИЯ<br>ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ</span></strong></p>';
        $mpdf->WriteHTML($html);
    $mpdf->TOC_Entry("8. Результаты освоения основной образовательной программы", 4);
   $html='<p><span>В результате освоения программы у выпускника должны быть сформированы универсальные, общепрофессиональные и профессиональные компетенции.</span></p>
    <p><span>8.1. Универсальные компетенции выпускников (далее &ndash; УК) и индикаторы их достижения:</span></p>';



    $id_level = $row['id_level'];
    $q_comp = "select category_mu, code_mu, indicator_mu from matrix_universal where id_level = $id_level order by id_mu";
    $r_comp= oopPrintQuery($conn, $q_comp);
    $html .= oopPrintTable('', ['Категория универсальных компетенций','Код и наименование универсальной компетенции', 'Код и наименование индикатора достижения универсальной компетенции'], ['category_mu','code_mu', 'indicator_mu'], $r_comp, true);


     $html.='<br><p>8.2. Общепрофессиональные компетенции выпускников (далее &ndash; ОПК)&nbsp; и индикаторы их достижения:<p>';

    $q_opk = "select category_opk, code_opk, indicator_opk from matrix_opk JOIN direction_list ON matrix_opk.id_direction = direction_list.id_direction 
JOIN program_list ON direction_list.id_direction = program_list.id_direction 
WHERE program_list.id_mep = $id_mep order by code_opk";
    $r_opk = oopPrintQuery($conn, $q_opk);
    $html.= oopPrintTable('', ['Категория общепрофессиональных компетенций','Код и наименование общепрофессиональной компетенции', 'Код и наименование индикатора общепрофессиональной компетенции'], ['category_opk','code_opk', 'indicator_opk'], $r_opk, true);

$mpdf->WriteHTML($html);
    $html='
    <p><span> 8.3. Профессиональные компетенции выпускников (далее &ndash; ПК) и индикаторы их достижения, устанавливаемые СУОС по данному направлению подготовки (специальности) по соответствующему типу задач профессиональной деятельности:</span></p>';
$mpdf->AddPage('L','','','','',20,10,20,20);

$q_pk_suos = "SELECT types_task.name_type_task, prof_tasks.name_prof_task, prof_objects.name_prof_object, 
matrix_pk_suos.category_prof, matrix_pk_suos.code_prof, matrix_pk_suos.indicator_prof, matrix_pk_suos.base 
FROM program_matrix_pk_suos 
LEFT JOIN matrix_pk_suos ON program_matrix_pk_suos.id_pk = matrix_pk_suos.id_pk
LEFT JOIN prof_tasks ON matrix_pk_suos.id_prof_task = prof_tasks.id_prof_task 
LEFT JOIN types_task ON prof_tasks.id_type_task = types_task.id_type_task 
LEFT JOIN prof_objects ON matrix_pk_suos.id_prof_object = prof_objects.id_prof_object
LEFT JOIN direction_list ON matrix_pk_suos.id_direction = direction_list.id_direction
LEFT JOIN program_list ON program_matrix_pk_suos.id_mep = program_list.id_mep
WHERE program_matrix_pk_suos.id_mep = $id_mep OR program_matrix_pk_suos.id_mep IS NULL
ORDER BY SUBSTRING(matrix_pk_suos.code_prof FROM '([0-9]+)')::BIGINT ASC, matrix_pk_suos.code_prof";
    $r_pk_suos = oopPrintQuery($conn, $q_pk_suos);
    $html.= oopPrintTable('', ['Тип задачи профессиональной деятельности', 'Задача профессиональной деятельности', 'Объект или область знания', 'Категория профессиональных компетенций','Код и наименование профессиональной компетенции', 'Код и наименоаание индикатора профессиональной компетенции', 'Основание'], ['name_type_task', 'name_prof_task', 'name_prof_object', 'category_prof','code_prof', 'indicator_prof', 'base'], $r_pk_suos, true);


 $q_pk_mep = "SELECT types_task.name_type_task, prof_tasks.name_prof_task, prof_objects.name_prof_object, 
category_prof, code_prof, indicator_prof, base 
FROM matrix_pk_oop LEFT JOIN prof_tasks ON matrix_pk_oop.id_prof_task = prof_tasks.id_prof_task 
LEFT JOIN types_task ON prof_tasks.id_type_task = types_task.id_type_task 
LEFT JOIN prof_objects ON matrix_pk_oop.id_prof_object = prof_objects.id_prof_object
LEFT JOIN program_list ON matrix_pk_oop.id_mep = program_list.id_mep
LEFT JOIN direction_list ON program_list.id_direction = direction_list.id_direction
WHERE program_list.id_mep = $id_mep OR matrix_pk_oop.id_mep IS NULL
ORDER BY SUBSTRING(code_prof FROM '([0-9]+)')::BIGINT ASC, code_prof";
    $r_pk_mep = oopPrintQuery($conn, $q_pk_mep);
    $check_display = (oopPrintRow(oopPrintQuery($conn, "SELECT display FROM tasks_mep_3 WHERE id_mep = $id_mep"))['display'] ?? 'f');
    if($check_display == "t") {
        $html.='<div class="page-break"></div><p>8.4. Профессиональные компетенции выпускников и индикаторы их достижения, устанавливаемые разработчиком ООП:';
            $html.= oopPrintTable('', ['Тип задачи профессиональной деятельности', 'Задача профессиональной деятельности', 'Объект или область знания', 'Категория профессиональных компетенций','Код и наименование профессиональной компетенции', 'Код и наименоаание индикатора профессиональной компетенции', 'Основание'], ['name_type_task', 'name_prof_task', 'name_prof_object', 'category_prof','code_prof', 'indicator_prof', 'base'], $r_pk_mep, true);

                }
$mpdf->WriteHTML($html);
$mpdf->AddPage('P','','','','',20,10,20,20);

$html='<p><p align="center"><strong><span>
9. ХАРАКТЕРИСТИКА РЕСУРСНОГО ОБЕСПЕЧЕНИЯ<br>
ОСНОВНОЙ ОБРАЗОВАТЕЛЬНОЙ ПРОГРАММЫ
</span></strong></p>';

$mpdf->WriteHTML($html);

$mpdf->TOC_Entry(
    "9. Характеристика ресурсного обеспечения основной образовательной программы",
    4
);

    $html='<p></p>
    <p align="center"><strong><span>9.1. Образовательные технологии</span></strong></p>';
            $mpdf->WriteHTML($html);
$mpdf->TOC_Entry("9.1. Образовательные технологии", 4);

    $html='<p><span>Образовательная деятельность по образовательной программе проводится:</span></p>
    <p><span>- в форме контактной работы студентов с педагогическими работниками Университета (или) лицами, привлекаемыми к реализации образовательных программ на иных условиях (далее &ndash; контактная работа);</span></p>
    <p><span>- в форме самостоятельной работы студентов;</span></p>
    <p><span>- в иных формах, определяемых организацией.&nbsp;</span></p>
    <p><span>Контактная работа при проведении учебных занятий по дисциплинам (модулям) включает в себя:</span></p>
    <p><span>- занятия лекционного типа (лекции и иные учебные занятия, предусматривающие преимущественную передачу учебной информации педагогическими работниками организации и (или) лицами, привлекаемыми организацией к реализации образовательных программ на иных условиях, обучающимся) и (или) занятия семинарского типа (семинары, практические занятия, практикумы, лабораторные работы, коллоквиумы и иные аналогичные занятия), и (или) групповые консультации, и (или) индивидуальную работу обучающихся с педагогическими работниками Университета и (или) лицами, привлекаемыми Университетом к реализации образовательных программ на иных условиях (в том числе индивидуальные консультации);</span></p>
    <p><span>- иную контактную работу (при необходимости), предусматривающую групповую или индивидуальную работу студентов с педагогическими работниками Университета и (или) лицами, привлекаемыми Университетом к реализации образовательных программ на иных условиях, определяемую Университетом самостоятельно.</span></p>
    <p><span>Университет предусматривает применение инновационных форм учебных занятий, развивающих у обучающихся навыки командной работы, межличностной коммуникации, принятия решений, лидерские качества (включая, при необходимости, проведение интерактивных лекций, групповых дискуссий, ролевых игр, тренингов, анализ ситуаций и имитационных моделей, преподавание дисциплин (модулей)</span><span>&nbsp;&nbsp;</span><span>в</span><span>&nbsp;&nbsp;</span><span>форме</span><span>&nbsp;&nbsp;</span><span>курсов,</span><span>&nbsp;&nbsp;</span><span>составленных</span><span>&nbsp;&nbsp;</span><span>на</span><span>&nbsp;&nbsp;</span><span>основе</span><span>&nbsp;&nbsp;</span><span>результатов</span><span>&nbsp;&nbsp;</span><span>научных исследований,</span><span>&nbsp;&nbsp;</span><span>проводимых</span><span>&nbsp;&nbsp;</span><span>организацией,</span><span>&nbsp;&nbsp;</span><span>в</span><span>&nbsp;&nbsp;</span><span>том</span><span>&nbsp;&nbsp;</span><span>числе</span><span>&nbsp;&nbsp;</span><span>с</span><span>&nbsp;&nbsp;</span><span>учетом</span><span>&nbsp;&nbsp;</span><span>региональных особенностей профессиональной деятельности выпускников и потребностей работодателей.</span></p>

    <p align="center"><strong><span>9.2. Кадровое обеспечение</span></strong></p>';
            $mpdf->WriteHTML($html);
$mpdf->TOC_Entry("9.2. Кадровое обеспечение", 4);
$row_staffing = $row_mep_3;
    $html='<p><span>Реализация программы '. $row['level_rp'].' обеспечивается педагогическими работниками СПбПУ, а также лицами, привлекаемыми к реализации программы'. $row['level_rp'].' на иных условиях.</span></p>
    <p><span>Квалификация педагогических работников СПбПУ и представителей работодателей, обеспечивающих реализацию программы '. $row['level_rp'].', соответствует квалификационным требованиям, указанным в квалификационных справочниках, и (или) профессиональных стандартах (при наличии).</span></p>
    <p><span>Уровень квалификации педагогических работников, определяется установленным в СПбПУ порядком, в том числе в форме критериев и требований, предъявляемым к кандидатам при организации конкурсного отбора на замещения должностей педагогических работников. Уровень квалификации педагогических работников и представителей работодателей, привлекаемых к реализации конкретных дисциплин и междисциплинарных модулей, устанавливаются в образовательной программе с учетом содержания дисциплины (модуля) и языка, на котором реализуется данная дисциплина (модуль).</span></p>
    <p><span>Не менее '.$row_staffing["num_prof"].' процентов численности педагогических работников СПбПУ, участвующих в реализации программы '. $row['level_rp'].', и лиц, привлекаемых к реализации программы '.$row['level_rp'].' на иных условиях (исходя из количества замещаемых ставок, приведенного к целочисленным значениям), ведут научную, учебно-методическую и (или) практическую деятельность, соответствующую профилю преподаваемой дисциплины (модуля).</span></p>
    <p><span>К реализации программы'. $row['level_rp'].' на основе СУОС привлекаются педагогические работники, владеющие иностранным языком, если дисциплина (модуль) или образовательная программа реализуется на иностранном языке.</span></p>
    <p><span>Не менее '.$row_staffing["num_org"].' процентов численности педагогических работников СПбПУ, участвующих в реализации программы '. $row['level_rp'].', и лиц, привлекаемых к реализации программы '. $row['level_rp'].' на иных условиях (исходя из количества замещаемых ставок, приведенного к целочисленным значениям), являются руководителями и (или) работниками иных организаций, осуществляющими трудовую деятельность в профессиональной сфере, соответствующей ПД, к которой готовятся выпускники программы '. $row['level_rp'].' (имеют стаж работы в данной профессиональной сфере не менее</span><span>&nbsp;</span><span>3</span><span>&nbsp;</span><span>лет).</span></p>
    <p><span>Не менее '.$row_staffing["num_sci"].' процентов численности педагогических работников СПбПУ и лиц, привлекаемых к образовательной деятельности СПбПУ на иных условиях (исходя из количества замещаемых ставок, приведенного к целочисленным значениям), имеют ученую степень (в том числе ученую степень, полученную в иностранном государстве и признаваемую в Российской Федерации) и (или) ученое звание (в том числе ученое звание, полученное в иностранном государстве и признаваемое в Российской Федерации).&nbsp;</span></p>
    <p><span>Общее руководство разработкой и реализацией программы '. $row['level_rp'].' осуществляет руководитель образовательной программы, который назначается из числа педагогических работников, имеющий стаж научно-педагогической работы не менее 3 лет и удостоверение о повышении квалификации по соответствующей программе повышения квалификации, и утверждается локальным нормативным актом СПбПУ.</span></p>
    <p><span>Управление программой '. $row['level_rp'].' руководитель образовательной программы осуществляет в соответствии с утвержденными в установленном в СПбПУ порядке Требованиями к работе по руководству основной образовательной программой высшего образования.</span></p>
    <p align="center"><strong><span>9.3. Материально-техническое обеспечение</span></strong></p>';
        $mpdf->WriteHTML($html);
$mpdf->TOC_Entry("9.3. Материально-техническое обеспечение", 4);

    $html='<p><span>Помещения представляют собой учебные аудитории для проведения учебных занятий всех видов, предусмотренных программой '. $row['level_rp'].', оснащенные оборудованием и техническими средствами обучения, состав которых определяется в рабочих программах дисциплин (модулей).</span></p>
    <p><span>Помещения для самостоятельной работы обучающихся оснащены компьютерной техникой с возможностью подключения к информационно-телекоммуникационной сети &laquo;Интернет&raquo; и обеспечением доступа в ЭИОС СПбПУ.</span></p>
    <p><span>Допускается замена оборудования его виртуальными аналогами, позволяющими обучающимся получать запланированные результаты обучения по модулям (дисциплинам), предусмотренным программой <?php '. $row['level_rp'].'.</span></p>
    <p><span>Лабораторные занятия (лабораторные работы) проводятся в специально оборудованных учебных или научно-исследовательских лабораториях СПбПУ, а при необходимости &ndash; в производственных и исследовательских лабораториях организаций, участвующих в образовательном процессе СПбПУ.</span></p>
    <p><span>Помещения, предназначенные для проведения лабораторных занятий, а также расположенные в них лабораторные установки соответствуют действующим санитарно-гигиеническим нормам, требованиям техники безопасности и эргономики.</span></p>
    <p><span>Количество лабораторных установок (стендов) достаточно для обеспечения эффективной самостоятельной работы студентов одной учебной группы (подгруппы) и для достижения целей, определяемых содержанием лабораторных работ. Исключение могут составить научные и производственные установки, системы и устройства, уникальные в техническом или в каком-либо ином отношении.</span></p>
    <p><span>Материально-техническое обеспечение лабораторных работ соответствует современному уровню постановки и проведения научного эксперимента или производственного испытания.</span></p>
    <p align="center"><strong><span>9.4. Учебно-методическое обеспечение</span></strong></p>';
            $mpdf->WriteHTML($html);
$mpdf->TOC_Entry("9.4. Учебно-методическое обеспечение", 4);

    $html='<p><span>При использовании в образовательном процессе печатных изданий библиотечный фонд укомплектован печатными изданиями из расчета не менее 0,25 экземпляра каждого из изданий, указанных в рабочих программах дисциплин (модулей), практик, на одного обучающегося из числа лиц, одновременно осваивающих соответствующую дисциплину (модуль), проходящих соответствующую практику.</span></p>
    <p><span>Обучающимся обеспечен доступ (удаленный доступ), в том числе в случае применения электронного обучения, дистанционных образовательных технологий, к современным профессиональным базам данных и информационным справочным системам, состав которых определяется в рабочих программах дисциплин (модулей) и подлежит ежегодному обновлению (при необходимости).</span></p>
    <p><span>Обучающиеся из числа инвалидов и лиц с ОВЗ обеспечены печатными и (или) электронными образовательными ресурсами в формах, адаптированных к ограничениям их здоровья.</span></p>';
       $mpdf->WriteHTML($html);

    if(in_array("заочная", $ef) && !in_array("очно-заочная", $ef)){
    $html= '<p><p align="center"><strong><span>10. ОСОБЕННОСТИ ОРГАНИЗАЦИИ ОБУЧЕНИЯ<br>ПО ЗАОЧНОЙ ФОРМЕ</span></strong></p>';
    $mpdf->TOC_Entry("10. Особенности организации обучения по заочной форме", 4);
      $html.= "<p> По заочной форме обучения организация учебного процесса – сессионная. При сессионной форме организации на первом курсе, помимо обычных двух сессий – зимней и летней, обязательно проводится установочная сессия продолжительностью 5 – 10 дней. В период установочной сессии студент заочной формы обучения получает зачетную книжку, студенческий билет, учебный график на год, программы и методические указания, а также учебники и учебные пособия. На установочной сессии студенты-заочники знакомятся с организацией учебного процесса на заочной форме обучения, получают необходимые советы методического и организационного характера, прослушивают установочные лекции по дисциплинам, которые они должны изучать самостоятельно. На последующих сессиях студенты сдают зачеты, экзамены, слушают установочные лекции по дисциплинам, экзамены по которым им необходимо сдавать на следующей сессии. Учебные занятия во время сессий проводятся в соответствии с утвержденным расписанием не более 8 часов в день. В день проведения экзамена не должны планироваться другие виды учебной деятельности.  
Обучение по заочной форме осуществляется с увеличенной долей самостоятельной работы студентов в том числе с использованием дистанционных образовательных технологий, при наличии разработанных курсов, в соответствии с требованиями Положения об Электронном образовании и дистанционных образовательных технологиях СПбПУ.";
       $mpdf->WriteHTML($html);
    }

    else if(in_array("очно-заочная", $ef) && !in_array("заочная", $ef)){
    $html= '<p><p align="center"><strong><span>10. ОСОБЕННОСТИ ОРГАНИЗАЦИИ ОБУЧЕНИЯ<br>ПО ОЧНО-ЗАОЧНОЙ ФОРМЕ</span></strong></p>';
    $mpdf->TOC_Entry("10. Особенности организации обучения по очно-заочной форме", 4);
         $html.="<p>Обучение в очно-заочной форме осуществляется с использованием электронного обучения и дистанционных образовательных технологий. 
Обучение в очно-заочной форме осуществляется с увеличенной долей самостоятельной работы студентов в том числе с использованием дистанционных образовательных технологий, при наличии разработанных курсов, в соответствии с требованиями Положения об Электронном образовании и дистанционных образовательных технологиях СПбПУ.";
       $mpdf->WriteHTML($html);
    }

    else if(in_array("очно-заочная", $ef) || in_array("заочная", $ef)){
    $html= '<p><p align="center"><strong><span>10. ОСОБЕННОСТИ ОРГАНИЗАЦИИ ОБУЧЕНИЯ<br>ПО ОЧНО-ЗАОЧНОЙ И ЗАОЧНОЙ ФОРМАМ</span></strong></p>';
$mpdf->TOC_Entry("10. Особенности организации обучения <br> по очно-заочной и заочной формам", 4);
    $html.= "<p><span>Образовательный процесс по образовательным программам очно-заочной 
форме обучения организуется по семестрам (2 семестра в рамках курса).
<p>По заочной форме обучения организация учебного процесса– сессионная. При 
сессионной форме организации на первом курсе, помимо обычных двух сессий –
зимней и летней, обязательно проводится установочная сессия продолжительностью 
5 – 10 дней. В период установочной сессии студент заочной формы обучения 
получает зачетную книжку, студенческий билет, учебный график на год, программы 
и методические указания, а также учебники и учебные пособия. На установочной 
сессии студенты-заочники знакомятся с организацией учебного процесса на заочной 
форме обучения, получают необходимые советы методического и организационного 
характера, прослушивают установочные лекции по дисциплинам, которые они 
должны изучать самостоятельно. На последующих сессиях студенты сдают зачеты, 
экзамены, слушают установочные лекции по дисциплинам, экзамены по которым им 
необходимо сдавать на следующей сессии.
<p>Обучение по очно-заочной и заочной формам может осуществляться с 
использованием дистанционных образовательных технологий, при наличии 
разработанных курсов, в соответствии с требованиями Положения об ЭО и ДОТ.";
       $mpdf->WriteHTML($html);
    }

    $html='<div class="page-break"></div>
    <header><p align="right"><span>Приложение 1</span></p></header>
    <p align = "center"><strong><span>УЧЕБНЫЙ ПЛАН</span></strong></p>';
           $mpdf->WriteHTML($html);
    $mpdf->TOC_Entry("Приложение 1. Учебный план", 4);

    $html='<p><span>Учебный план как компонент основной образовательной программы формируется, утверждается и хранится в автоматизированной информационно-управляющей системе &laquo;Репозиторий образовательных программ СПбПУ&raquo;.</span></p>
    <ol type="1">';
  //$row_plan = insert_form($id_mep, $conn, ["plan_o", "plan_oz", "plan_z"], 'tasks_mep_3', 'plan');  
  if(in_array("очная", $ef))
   {
    $html.= "<li><a href='".$row_mep_3['plan_o']."'><u><span>".$row_mep_3['plan_o']."</span></u></a> - очная форма обучения</li>";
   }
    
  if(in_array("очно-заочная", $ef))
   {
    $html.=  "<li><a href='".$row_mep_3['plan_oz']."'><u><span>".$row_mep_3['plan_oz']."</span></u></a> - очно-заочная форма обучения</li>";
   }
  if(in_array("заочная", $ef))
   {
    $html.=  "<li><a href='".$row_mep_3['plan_z']."'><u><span>".$row_mep_3['plan_z']."</span></u></a> - заочная форма обучения</li>";
   }
 
    $html.='</ol>
    <div class="page-break"></div>
    <header><p align="right"><span>Приложение 2</span></p></header>
    <p align = "center"><strong><span>КАЛЕНДАРНЫЙ УЧЕБНЫЙ ГРАФИК</span></strong></p>';
    $mpdf->WriteHTML($html);
    $mpdf->TOC_Entry("Приложение 2. Календарный учебный график", 4);


    $html='<p><span>Календарный учебный график как компонент основной образовательной программы формируется, утверждается и хранится в автоматизированной информационно-управляющей системе &laquo;Репозиторий образовательных программ СПбПУ&raquo;.</span></p>
    <ol type="1">';
  //$row_calendar = insert_form($id_mep, $conn, ["calendar_o", "calendar_oz", "calendar_z"], 'tasks_mep_3', 'calendar');
  if(in_array("очная", $ef))
   {
    $html.= "<li><a href='".$row_mep_3['calendar_o']."'><u><span>".$row_mep_3['calendar_o']."</span></u></a> - очная форма обучения</li>";
   }
    
  if(in_array("очно-заочная", $ef))
   {
    $html.= "<li><a href='".$row_mep_3['calendar_oz']."'><u><span>".$row_mep_3['calendar_oz']."</span></u></a> - очно-заочная форма обучения</li>";
   }
  if(in_array("заочная", $ef))
   {
    $html.= "<li><a href='".$row_mep_3['calendar_z']."'><u><span>".$row_mep_3['calendar_z']."</span></u></a> - заочная форма обучения</li>";
   }

    $html.='</ol>
    <div class="page-break"></div>
    <header><p align="right"><span>Приложение 3</span></p></header>
    <p align = "center"><strong><span>РАБОЧИЕ ПРОГРАММЫ ДИСЦИПЛИН (МОДУЛЕЙ)</span></strong></p>';
    $mpdf->WriteHTML($html);
    $mpdf->TOC_Entry("Приложение 3. Рабочие программы дисциплин (модулей)", 4);
    $html='<p><span>Рабочие программы дисциплин (модулей) как компонент основной образовательной программы формируются, утверждаются и хранятся&nbsp;</span><br><span>в автоматизированной информационно-управляющей системе &laquo;Репозиторий образовательных программ СПбПУ&raquo;.</span></p>
    <div class="page-break"></div>
    <header><p align="right"><span>Приложение 4</span></p></header>
    <p align = "center"><strong><span>ФОНДЫ ОЦЕНОЧНЫХ СРЕДСТВ</span></strong></p>';
      $mpdf->WriteHTML($html);
    $mpdf->TOC_Entry("Приложение 4. Фонды оценочных средств", 4);
    $html='<p><span>Фонды оценочных средств как компонент основной образовательной программы формируются, утверждаются и хранятся в автоматизированной информационно-управляющей системе &laquo;Репозиторий образовательных программ СПбПУ&raquo;.</span></p>
    <div class="page-break"></div>
    <header><p align="right"><span>Приложение 5</span></p></header>
    <p align = "center"><strong><span>РАБОЧИЕ ПРОГРАММЫ ПРАКТИК</span></strong></p>';
    $mpdf->WriteHTML($html);
    $mpdf->TOC_Entry("Приложение 5. Рабочие программы практик", 4);
    $html='<p><span>Рабочие программы практик как компонент основной образовательной программы формируются, утверждаются и хранятся в автоматизированной информационно-управляющей системе &laquo;Репозиторий образовательных программ СПбПУ&raquo;.</span></p>
    <div class="page-break"></div>
    <header><p align="right"><span>Приложение 6</span></p></header>
    <p align = "center"><strong><span>ПРОГРАММА ГОСУДАРСТВЕННОЙ&nbsp;</span></strong><br><strong><span>ИТОГОВОЙ АТТЕСТАЦИИ</span></strong></p>';
    $mpdf->WriteHTML($html);
    $mpdf->TOC_Entry("Приложение 6. Программа государственной итоговой аттестации", 4);
    $html='<p><span>Программа государственной итоговой аттестации как компонент основной образовательной программы формируется, утверждается и хранится&nbsp;</span><br><span>в автоматизированной информационно-управляющей системе &laquo;Репозиторий образовательных программ СПбПУ&raquo;.</span></p>
    <div class="page-break"></div>
    <header><p align="right"><span>Приложение 7</span></p></header>
    <p align = "center"><strong><span>РАБОЧАЯ ПРОГРАММА ВОСПИТАНИЯ</span></strong></p>';
    $mpdf->WriteHTML($html);
    $mpdf->TOC_Entry("Приложение 7. Рабочая программа воспитания", 4);
    $html='<div class="page-break"></div>
    <header><p align="right"><span>Приложение 8</span></p></header>
    <p align = "center"><strong><span>КАЛЕНДАРНЫЙ ПЛАН ВОСПИТАТЕЛЬНОЙ РАБОТЫ&nbsp;</span></strong></p>';
    $mpdf->WriteHTML($html);
    $mpdf->TOC_Entry("Приложение 8. Календарный план воспитательной работы", 4);
    $html='<p><strong><span>&nbsp;</span></strong></p>
    <p><span>&nbsp;</span></p>
    <p><span>&nbsp;</span></p>
    <p><span>&nbsp;</span></p>
    <p><span>&nbsp;</span></p>
    <p><span>&nbsp;</span></p>
    <p><span>&nbsp;</span></p>
    <p><span>&nbsp;</span></p>
    <p>&nbsp;</p>
</div>
</body>
</html>';
    //echo $html;
    $mpdf->WriteHTML($html);
    $file_name = $id_program.'.pdf';
    return $mpdf->Output('', \Mpdf\Output\Destination::STRING_RETURN);
    ?>