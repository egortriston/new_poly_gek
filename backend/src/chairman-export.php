<?php
declare(strict_types=1);

function chairmanExportDate(?string $value): string
{
    if (!$value) return '';
    $time=strtotime($value);
    return $time===false ? $value : date('d.m.Y',$time);
}

function chairmanExport(): never
{
    if (!class_exists(ZipArchive::class)) throw new ApiError(503,'EXPORT_UNAVAILABLE','Для выгрузки требуется расширение PHP zip.');
    $headers=['Фамилия','Имя','Отчество','ПОЛ (М/Ж)','Дата рождения','ИНН организации','Название организации','Должность','Почта','Номер телефона','Название вуза','Серия и Номер диплома об образовании','Направление подготовки','Дата диплома об образовании','Специализация','Квалификация','Ученая степень','Серия и номер диплома об ученой степени','Дата диплома об ученой степени','Ученое звание','Серия и номер диплома об ученом звании','Дата диплома об ученом звании','Академическое звание','Почетное звание','Образовательные программы'];
    $sheetRows=[$headers];
    foreach (rows("SELECT c.*,m.* FROM sec_predsedatel_s c JOIN sec_member m ON m.sm_id=c.sm_id WHERE c.area IS NOT NULL AND btrim(c.area)<>'' ORDER BY m.sm_name,c.id_predsedatel_sc") as $row) {
        [$surname,$first,$patronymic]=chairmanPrintNameParts((string)$row['sm_name']);
        $programs=rows('SELECT p.id_program,p.name_program FROM sec_program s JOIN program_list p ON p.id_program=s.id_program WHERE s.id_predsedatel_sc=$1 ORDER BY p.id_program',[$row['id_predsedatel_sc']]);
        $sheetRows[]=[
            $surname,$first,$patronymic,($row['gender']??null)===null?'':($row['gender']==='t'?'Ж':'М'),chairmanExportDate($row['birth_date']??null),
            $row['organization_inn']??'',$row['organization']??'',$row['sm_position']??'',$row['email']??'',$row['phone']??'',
            $row['education_university']??'',trim(implode(' ',array_filter([$row['education_diploma_series']??'',$row['education_diploma_number']??'']))),
            $row['education_name']??'',chairmanExportDate($row['education_diploma_date']??null),$row['education_specialization']??'',
            preg_replace('/^\s*квалификация\s*[—:-]\s*/iu','',trim((string)($row['education_speciality']??''))),$row['academic_degree']??'',
            trim(implode(' ',array_filter([$row['diploma_series']??'',$row['diploma_nu']??'']))),chairmanExportDate($row['diploma_date']??null),
            $row['academic_rank']??'',trim(implode(' ',array_filter([$row['at_series']??'',$row['at_nu']??'']))),
            chairmanExportDate($row['at_date']??null),$row['academic_title']??'',$row['honorary_title']??'',
            implode('; ',array_map(fn($p)=>trim($p['id_program'].' '.$p['name_program']),$programs)),
        ];
    }
    $xml='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
    foreach($sheetRows as $index=>$cells){$xml.='<row r="'.($index+1).'">';foreach($cells as $value){$safe=htmlspecialchars((string)$value,ENT_XML1|ENT_QUOTES,'UTF-8');$xml.='<c t="inlineStr"><is><t xml:space="preserve">'.$safe.'</t></is></c>';}$xml.='</row>';}
    $xml.='</sheetData></worksheet>';
    $file=tempnam(sys_get_temp_dir(),'chair-export-');
    if($file===false)throw new RuntimeException('Export temp file unavailable');
    $zip=new ZipArchive();
    if($zip->open($file,ZipArchive::OVERWRITE)!==true){unlink($file);throw new RuntimeException('Export archive unavailable');}
    $zip->addFromString('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
    $zip->addFromString('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    $zip->addFromString('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Председатели ГЭК" sheetId="1" r:id="rId1"/></sheets></workbook>');
    $zip->addFromString('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
    $zip->addFromString('xl/worksheets/sheet1.xml',$xml);$zip->close();
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="chairmen-gek.xlsx"');
    header('Cache-Control: no-store');
    readfile($file);unlink($file);exit;
}
