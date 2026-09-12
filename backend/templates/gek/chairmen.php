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
?>


<html
xmlns:v="urn:schemas-microsoft-com:vml"
xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
xmlns="http://www.w3.org/TR/REC-html40"
lang="ru">
    
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
    /* Font Definitions */
    @font-face
        {font-family:Wingdings;
        panose-1:5 0 0 0 0 0 0 0 0 0;}
    @font-face
        {font-family:"Cambria Math";
        panose-1:2 4 5 3 5 4 6 3 2 4;}
    @font-face
        {font-family:Calibri;
        panose-1:2 15 5 2 2 2 4 3 2 4;}
    @font-face
        {font-family:"Segoe UI";
        panose-1:2 11 5 2 4 2 4 2 2 3;}
    /* Style Definitions */
    p.MsoNormal, li.MsoNormal, div.MsoNormal
        {margin-top:0cm;
        margin-right:0cm;
        margin-bottom:8.0pt;
        margin-left:0cm;
        line-height:107%;
        font-size:11.0pt;
        font-family:"Calibri",sans-serif;}
    p.MsoListParagraph, li.MsoListParagraph, div.MsoListParagraph
        {margin-top:0cm;
        margin-right:0cm;
        margin-bottom:8.0pt;
        margin-left:36.0pt;
        line-height:107%;
        font-size:11.0pt;
        font-family:"Calibri",sans-serif;}
    p.MsoListParagraphCxSpFirst, li.MsoListParagraphCxSpFirst, div.MsoListParagraphCxSpFirst
        {margin-top:0cm;
        margin-right:0cm;
        margin-bottom:0cm;
        margin-left:36.0pt;
        line-height:107%;
        font-size:11.0pt;
        font-family:"Calibri",sans-serif;}
    p.MsoListParagraphCxSpMiddle, li.MsoListParagraphCxSpMiddle, div.MsoListParagraphCxSpMiddle
        {margin-top:0cm;
        margin-right:0cm;
        margin-bottom:0cm;
        margin-left:36.0pt;
        line-height:107%;
        font-size:11.0pt;
        font-family:"Calibri",sans-serif;}
    p.MsoListParagraphCxSpLast, li.MsoListParagraphCxSpLast, div.MsoListParagraphCxSpLast
        {margin-top:0cm;
        margin-right:0cm;
        margin-bottom:8.0pt;
        margin-left:36.0pt;
        line-height:107%;
        font-size:11.0pt;
        font-family:"Calibri",sans-serif;}
    .MsoPapDefault
        {margin-bottom:8.0pt;
        line-height:107%;}
    /* Page Definitions */
    @page WordSection1
        {size:595.3pt 841.9pt;
        margin:42.55pt 42.55pt 2.0cm 3.0cm;}
    div.WordSection1
        {page:WordSection1;}
    /* List Definitions */
    ol
        {margin-bottom:0cm;}
    ul
        {margin-bottom:0cm;}


    </style>
</head>

<body  class="print-page" lang="RU" style="tab-interval:35.4pt;word-wrap:break-word;">

<div class="WordSection1">
<p class="MsoNormal" align="right" style="margin:0cm;text-align:right"><span style="font-size:12.0pt;line-height:107%;font-family:&quot;Times New Roman&quot;,serif">Приложение
3<o:p></o:p></span></p>
<p class="MsoNormal" align="right" style="padding:0; margin:0cm;text-align:right"><span style="font-size:12.0pt;line-height:107%;font-family:&quot;Times New Roman&quot;,serif">к
информационному письму<o:p></o:p></span></p>
<p class="MsoNormal" align="center" style="margin-top:0cm;margin-right:-14.2pt;
margin:0cm;margin-left:0cm;text-align:center;line-height:normal;
text-autospace:none"><b><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">Федеральное
государственное автономное образовательное учреждение</span></b></p>
<p class="MsoNormal" align="center" style="margin-top:0cm;margin-right:-14.2pt;
margin:0cm;margin-left:0cm;text-align:center;line-height:normal;
text-autospace:none"><b><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">высшего
образования</span></b></p>
<p class="MsoNormal" align="center" style="margin-top:0cm;margin-right:-14.2pt;
margin:0cm;margin-left:0cm;text-align:center;line-height:normal;
text-autospace:none"><b><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">«Санкт-Петербургский
политехнический университет Петра Великого»</span></b></p>
<p class="MsoNormal" align="center" style="margin:0cm;text-align:center;
line-height:normal;text-autospace:none"><span style="font-size:14.0pt;
font-family:&quot;Times New Roman&quot;,serif">&nbsp;</span></p>
<p class="MsoNormal" align="center" style="margin:0cm;text-align:center;
line-height:normal;text-autospace:none"><span style="font-size:14.0pt;
font-family:&quot;Times New Roman&quot;,serif">СОСТАВ</span></p>
<p class="MsoNormal" align="center" style="margin:0cm;text-align:center;
line-height:normal;text-autospace:none"><span style="font-size:14.0pt;
font-family:&quot;Times New Roman&quot;,serif">председателей ГЭК по образовательным
программам высшего образования</span></p>
<p class="MsoNormal" align="center" style="margin:0cm;text-align:center;
line-height:normal;text-autospace:none"><span style="font-size:14.0pt;
font-family:&quot;Times New Roman&quot;,serif">на <?php echo $printYear; ?> год</span></p>
<p class="MsoNormal" align="center" style="margin:0cm;text-align:center;
line-height:normal;text-autospace:none"><span style="font-size:14.0pt;
font-family:&quot;Times New Roman&quot;,serif">&nbsp;</span></p>
<p class="MsoNormal" align="center" style="margin:0cm;text-align:center;
line-height:normal;text-autospace:none"><b><span style="font-size:14.0pt;
font-family:&quot;Times New Roman&quot;,serif;color:black">ПО ИНСТИТУТУ ПРОМЫШЛЕННОГО
МЕНЕДЖМЕНТА, ЭКОНОМИКИ И ТОРГОВЛИ</span></b></p>
<table  align="center" class="MsoNormalTable" border="0" cellspacing="0" cellpadding="0" width="624" style="border-collapse:collapse;">
    <thead>
    <tr>
    <td  valign="top" style=" width: 38px; border:solid black 1.0pt;
    padding: 0;
    ">
    <p class="MsoNormal" align="center" style="margin: 0;text-align:center;
    line-height:normal"><i><span style="font-family:&quot;Times New Roman&quot;,serif;
    color:black; padding: 0;">№ п/п</span></i></p>
    </td>
    <td  style="border:solid black 1.0pt; border-left:
    none;padding: 0;">
    <p class="MsoNormal" align="center" style=" width: 284px; margin:0cm;text-align:center;
    line-height:normal padding: 0;padding-left: 5px;"><i><span style="font-family:&quot;Times New Roman&quot;,serif;
    color:black">Фамилия имя отчество председателя ГЭК</span></i></p>
    </td>
    <td  style="width: 297px;border:solid black 1.0pt; border-left:none;
    padding-left: 5px;">
    <p class="MsoNormal" align="center" style="margin:0; width: 297px; padding: 0;padding-left: 5px;
    text-align:center;
    line-height:normal"><i><span style="font-family:&quot;Times New Roman&quot;,serif;
    color:black">Направление подготовки</span></i></p>
    </td>
    </tr>
    </thead>
</table>
<?php // Сбросить результат для нового запроса
$counter = 1; // Инициализируем счетчик
foreach ($resultArray as $sm_name => $program_ids_string) {
    echo '<table  align="left" class="MsoNormalTable" border="0" cellspacing="0" cellpadding="0" width="624" style="border-collapse:collapse; border-top: 0px;">
    <thead>';
    echo '<tr>';
    echo ' <td  valign="top" style=" width: 38px; border:solid black 1.0pt; border-top: 0px;
    padding: 0;
    ">
    <p class="MsoNormal" align="center" style="margin: 0;text-align:center;
    line-height:normal"><span style="font-family:&quot;Times New Roman&quot;,serif;
    color:black; padding: 0;">' . $counter . '</span></p>
    </td>
    </td>'; // Выводим номер строки
    echo '<td  style="border:solid black 1.0pt; border-top: 0px;border-left:
    none;padding: 0;padding-left: 5px;">
    <p class="MsoNormal" align="left" style=" width: 284px; margin:0cm;text-align:left;
    line-height:normal padding: 0;"><span style="font-family:&quot;Times New Roman&quot;,serif;
    color:black; padding-left: 5px;">' . htmlspecialchars($sm_name) . '</span></p>
    </td>'; // Выводим sm_name
    echo '<td  style="width: 297px;border:solid black 1.0pt; border-top: 0px;border-left:none;
    padding-left: 5px;">
    <p class="MsoNormal" align="left" style="margin:0; width: 297px; padding: 0;padding-left: 5px;
    text-align:left; 
    line-height:normal"><span style="font-family:&quot;Times New Roman&quot;,serif;
    color:black;">' . nl2br(htmlspecialchars($program_ids_string)) . '</span>
    </td>'; // Выводим program_ids_string 
    echo '</tr>';
    echo '</thead></table>'; // Закрываем тело и таблицу
    $counter++; // Увеличиваем счетчик
}
?>


<p class="MsoNormal">&nbsp;</p>

<p class="MsoNormal" style="margin-top:0cm;padding-right: 14pt;margin-right:-14pt;margin:
0cm;margin-left:0cm;text-align:justify;text-indent:1.0cm;line-height:normal;
text-autospace:none"><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">Представленные
кандидаты в председатели ГЭК не состоят в трудовых отношениях с ФГАОУ ВО «Санкт-Петербургский
политехнический университет Петра Великого».</span><span style="font-size:14.0pt">
</span></p>

<p class="MsoNormal">&nbsp;</p>

<p class="MsoNormal" style="margin:0cm;text-align:justify;line-height:
normal;punctuation-wrap:simple;text-autospace:none;vertical-align:baseline"><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">Директор <span>ВИЭШ</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span style="font-size:13.0pt;font-family:&quot;Times New Roman&quot;,serif">___________</span>
<span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; /<span><?php echo getMemberName($conn,'ВИЭШ')?></span>/</span></p>

<p class="MsoNormal" style="margin:0cm;text-align:justify;line-height:
normal;punctuation-wrap:simple;text-autospace:none;vertical-align:baseline"><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">&nbsp;</span></p>

<p class="MsoNormal" style="margin-top:6.0pt;margin-right:0cm;margin:0cm;
margin-left:0cm;text-align:justify;line-height:normal;punctuation-wrap:simple;
text-autospace:none;vertical-align:baseline"><span style="font-size:14.0pt;
font-family:&quot;Times New Roman&quot;,serif">Директор <span >ВШПМ</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span>
<span style="font-size:13.0pt;font-family:&quot;Times New Roman&quot;,serif">___________</span>
<span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; /<span><?php echo getMemberName($conn,'ВШПМ')?></span>/</span></p>

<p class="MsoNormal" style="margin:0cm;text-align:justify;line-height:
normal;punctuation-wrap:simple;text-autospace:none;vertical-align:baseline"><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">&nbsp;</span></p>

<p class="MsoNormal" style="margin-top:6.0pt;margin-right:0cm;margin:0cm;
margin-left:0cm;text-align:justify;line-height:normal;punctuation-wrap:simple;
text-autospace:none;vertical-align:baseline"><span style="font-size:14.0pt;
font-family:&quot;Times New Roman&quot;,serif">И.о. директора <span style=
>ВШГУ</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span style="font-size:13.0pt;font-family:&quot;Times New Roman&quot;,serif">___________</span><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; /
<span><?php echo getMemberName($conn,'ВШГУ')?></span>/</span></p>

<p class="MsoNormal" style="margin:0cm;text-align:justify;line-height:
normal;punctuation-wrap:simple;text-autospace:none;vertical-align:baseline"><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">&nbsp;</span></p>

<p class="MsoNormal" style="margin-top:6.0pt;margin-right:0cm;margin:0cm;
margin-left:0cm;text-align:justify;line-height:normal;punctuation-wrap:simple;
text-autospace:none;vertical-align:baseline"><span style="font-size:14.0pt;
font-family:&quot;Times New Roman&quot;,serif">Директор <span >ВШБИ</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span style="font-size:13.0pt;font-family:&quot;Times New Roman&quot;,serif">___________</span><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; /
<span><?php echo getMemberName($conn,'ВШБИ')?></span>/</span></p>

<p class="MsoNormal" style="margin:0cm;text-align:justify;line-height:
normal;punctuation-wrap:simple;text-autospace:none;vertical-align:baseline"><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">&nbsp;</span></p>

<p class="MsoNormal" style="margin-top:6.0pt;margin-right:0cm;margin:0cm;
margin-left:0cm;text-align:justify;line-height:normal;punctuation-wrap:simple;
text-autospace:none;vertical-align:baseline"><span style="font-size:14.0pt;
font-family:&quot;Times New Roman&quot;,serif">Директор <span >ВШСТ</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 
</span><span style="font-size:13.0pt;font-family:&quot;Times New Roman&quot;,serif">___________</span><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; /
<span><?php echo getMemberName($conn,'ВШСТ')?></span>/</span></p>

<p class="MsoNormal" style="margin:0cm;text-align:justify;line-height:
normal;punctuation-wrap:simple;text-autospace:none;vertical-align:baseline"><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">&nbsp;</span></p>

<p class="MsoNormal" style="margin:0cm;text-align:justify;line-height:
normal;punctuation-wrap:simple;text-autospace:none;vertical-align:baseline"><b><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">СОГЛАСОВАНО:</span></b></p>

<p class="MsoNormal" style="margin:0cm;text-align:justify;line-height:
normal;punctuation-wrap:simple;text-autospace:none;vertical-align:baseline"><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">Директор института</span></p>

<p class="MsoNormal" style="margin:0cm;text-align:justify;line-height:
normal;punctuation-wrap:simple;text-autospace:none;vertical-align:baseline"><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">промышленного менеджмента,</span></p>

<p class="MsoNormal" style="margin:0cm;text-align:justify;line-height:
normal;punctuation-wrap:simple;text-autospace:none;vertical-align:baseline"><span style="font-size:14.0pt;font-family:&quot;Times New Roman&quot;,serif">экономики и
торговли&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; /В.Э. Щепинин/</span></p>

<p class="MsoNormal" align="right" style="margin-top:0cm;margin-right:9.0pt;
margin:0cm;margin-left:0cm;text-align:right;line-height:normal;
punctuation-wrap:simple;text-autospace:none;vertical-align:baseline"><span style="font-family:&quot;Times New Roman&quot;,serif">&nbsp;</span></p>

<p class="MsoNormal" align="right" style="margin-top:0cm;margin-right:9.0pt;
margin:0cm;margin-left:0cm;text-align:right;line-height:normal;
punctuation-wrap:simple;text-autospace:none;vertical-align:baseline"><span style="font-family:&quot;Times New Roman&quot;,serif">&nbsp;</span></p>

<p class="MsoNormal" align="right" style="margin-top:0cm;margin-right:9.0pt;
margin:0cm;margin-left:0cm;text-align:right;line-height:normal;
punctuation-wrap:simple;text-autospace:none;vertical-align:baseline"><span style="font-family:&quot;Times New Roman&quot;,serif">&nbsp;</span></p>

<p class="MsoNormal" align="right" style="margin-top:0cm;margin-right:9.0pt;
margin:0cm;margin-left:0cm;text-align:right;line-height:normal;
punctuation-wrap:simple;text-autospace:none;vertical-align:
baseline"><span style="font-family:&quot;Times New Roman&quot;,serif;color:black">«___»___________<?php echo $printYear; ?>
г.</span><i><span style="font-family:&quot;Times New Roman&quot;,serif;color:black"> </span></i></p>

</div>

</body>
</html>