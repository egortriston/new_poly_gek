<?php
// The query and ordering remain those of the approved legacy list.
require __DIR__.($schoolId===null?'/chairmen-data.php':'/chairmen-school-data.php');
$escape=fn($value)=>htmlspecialchars((string)$value,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
?>
<html><head><style>
body {font-family:times11;font-size:13.82pt;line-height:1.18;color:#000;}
p {margin:0;}
.heading {text-align:center;line-height:1.18;}
.appendix {font-size:11.85pt;text-align:right;line-height:1.06;}
.gap {height:16.29pt;}
table.list {border-collapse:collapse;width:163mm;font-size:10.86pt;line-height:1.18;table-layout:fixed;}
table.list td {border:0.5pt solid black;padding:0 5.5pt;vertical-align:middle;}
table.list .index {padding:0;text-align:center;vertical-align:top;width:19pt;}
table.list .name {width:214pt;}
table.list .direction {width:228pt;}
table.signatures {width:100%;border-collapse:collapse;font-size:13.82pt;}
table.signatures td {padding:0;vertical-align:bottom;}
</style></head><body>
<p class="appendix">Приложение 3<br>к информационному письму</p>
<p class="heading"><b>Федеральное государственное автономное образовательное учреждение<br>высшего образования<br>«Санкт-Петербургский политехнический университет Петра Великого»</b></p>
<div class="gap"></div>
<p class="heading">СОСТАВ<br>председателей ГЭК по образовательным программам высшего образования<br>на <?= $escape($printYear) ?> год</p>
<div class="gap"></div>
<p class="heading"><b><?= $schoolId===null?'ПО ИНСТИТУТУ ПРОМЫШЛЕННОГО МЕНЕДЖМЕНТА,<br>ЭКОНОМИКИ И ТОРГОВЛИ':$escape(mb_strtoupper(getMemberName($conn,'name_school'))) ?></b></p>
<table class="list"><tbody><tr><td class="index"><i>№<br>п/п</i></td><td class="name" style="text-align:center"><i>Фамилия имя отчество председателя ГЭК</i></td><td class="direction" style="text-align:center"><i>Направление подготовки</i></td></tr>
<?php $counter=1; foreach($resultArray as $name=>$directions): ?>
<tr><td class="index"><?= $counter++ ?></td><td class="name"><?= $escape($name) ?></td><td class="direction"><?= nl2br($escape($directions)) ?></td></tr>
<?php endforeach; ?></tbody></table>
<div class="gap"></div>
<p style="text-align:justify;text-indent:28pt">Представленные кандидаты в председатели ГЭК не состоят в трудовых отношениях с ФГАОУ ВО «Санкт-Петербургский политехнический университет Петра Великого».</p>
<div class="gap"></div>
<?php
$signatures=$schoolId===null ? rows("SELECT short,chief_role,chief FROM school WHERE short IN ('ВИЭШ','ВШПМ','ВШГУ','ВШБИ','ВШСТ') ORDER BY CASE short WHEN 'ВИЭШ' THEN 1 WHEN 'ВШПМ' THEN 2 WHEN 'ВШГУ' THEN 3 WHEN 'ВШБИ' THEN 4 ELSE 5 END") : rows('SELECT short,chief_role,chief FROM school WHERE id_school=$1',[$schoolId]);
foreach($signatures as $signature): ?>
<table class="signatures"><tr><td style="width:44%"><?= $escape($signature['chief_role']?:'Директор') ?> <?= $escape($signature['short']) ?></td><td style="width:18%">___________</td><td style="text-align:right">/<?= $escape($signature['chief']) ?>/</td></tr></table><div class="gap"></div>
<?php endforeach; ?>
<p><b>СОГЛАСОВАНО:</b><br>Директор института<br>промышленного менеджмента,</p>
<table class="signatures"><tr><td>экономики и торговли</td><td style="text-align:right">/В.Э. Щепинин/</td></tr></table>
<div style="height:38pt"></div><p style="text-align:right;font-size:10.86pt">«___»___________<?= $escape($printYear) ?> г.</p>
</body></html>
