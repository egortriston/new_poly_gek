<?php
declare(strict_types=1);

function remove_dubs(?string $value): string
{
    return $value ? implode('<br>', array_unique(explode('<br>', $value))) : '';
}

function gekPdfEngine(array $options=[]): \Mpdf\Mpdf
{
    require_once dirname(__DIR__).'/vendor/autoload.php';
    $fontDir=configuration()['print_font_dir']??'C:/Windows/Fonts';
    foreach(['times.ttf','timesi.ttf','timesbd.ttf','timesbi.ttf'] as $file) {
        if(!is_file($fontDir.'/'.$file)) throw new ApiError(503,'PRINT_FONT_MISSING','Не установлены шрифты печатного шаблона.');
    }
    return new \Mpdf\Mpdf($options + [
        'mode'=>'utf-8','format'=>'A4','default_font_size'=>14,
        'margin_left'=>25,'margin_right'=>15,'margin_top'=>10,'margin_bottom'=>20,
        'fontDir'=>[$fontDir], 'fontdata'=>['times11'=>['R'=>'times.ttf','I'=>'timesi.ttf','B'=>'timesbd.ttf','BI'=>'timesbi.ttf']],
        'default_font'=>'times11','tempDir'=>dirname(__DIR__).'/var/mpdf',
    ]);
}

/** Apply a validated selection without changing the database's printed numbering. */
function gekPrintQuery($connection, string $sql): \PgSql\Result
{
    global $gekPrintIds, $gekPrintPrefix, $gekPrintStart;
    if ($gekPrintIds && preg_match('/\b(?:public\.)?sec_info\b/i',$sql)) {
        $condition='id_sec IN ('.implode(',',$gekPrintIds).')';
        $parts=preg_split('/\bORDER BY\b/i',$sql,2);
        $sql=rtrim($parts[0]).(preg_match('/\bWHERE\b/i',$parts[0])?' AND ':' WHERE ').$condition;
        if(isset($parts[1])) $sql.=' ORDER BY '.$parts[1];
    }
    if (preg_match('/\b(?:public\.)?sec_info\b/i',$sql)) {
 $expr="('".$gekPrintPrefix."' || CASE WHEN number+".($gekPrintStart-1)." < 10 THEN '0' ELSE '' END || (number+".($gekPrintStart-1).")::text)";
 $sql=preg_replace('/\b(?:public\.)?sec_info\b/i',"(SELECT original.*, $expr AS generated_number FROM sec_info original) sec_info",$sql);
 $sql=str_replace('number_format_year','generated_number',$sql);
 }
 return query($sql);
}

function gekPrint(array $input): string
{
    global $gekPrintIds, $gekSchoolId, $gekPrintPrefix, $gekPrintStart;
    $kind=requiredText($input,'kind',true);
    if(!in_array($kind,['commissions','secretaries','chairmen'],true)) throw new ApiError(422,'VALIDATION','Выберите документ.');
    $schoolId=requiredText($input,'school') ?: null;
    if($schoolId!==null && !ctype_digit($schoolId)) throw new ApiError(422,'VALIDATION','Некорректная высшая школа.');
    referenceExists('school','id_school',$schoolId);
    $printYear=archiveYear(requiredText($input,'academicYear',true));
    $gekPrintStart=gekNumbering($input['academicYear']);
    $gekPrintPrefix='37'.substr($printYear,-2);
    $ids=$input['ids']??[];
    if(!is_array($ids) || count($ids)>1000) throw new ApiError(422,'VALIDATION','Некорректный список комиссий.');
    foreach($ids as $id) if(!is_string($id)||!ctype_digit($id)) throw new ApiError(422,'VALIDATION','Некорректный номер комиссии.');
    $gekPrintIds=array_values(array_unique($ids));
    $countSql='SELECT count(*) FROM sec_info'.($schoolId!==null?' WHERE id_school='.(int)$schoolId:'');
    if($kind!=='chairmen' && (int)pg_fetch_result(gekPrintQuery(database(),$countSql),0,0)===0) throw new ApiError(422,'EMPTY_SELECTION','Нет комиссий для печати.');
    $conn=database();
    if ($kind === 'chairmen') {
        $gekSchoolId=$schoolId;
        $template='chairmen-list';
        ob_start();
        try { require dirname(__DIR__).'/templates/gek/'.$template.'.php'; $html=ob_get_contents(); }
        finally { ob_end_clean(); }
        $pdf=gekPdfEngine(['margin_left'=>32,'margin_right'=>17,'margin_top'=>17.2,'margin_bottom'=>20]);
        $pdf->shrink_tables_to_fit=1;
        $html=preg_replace('/@page\s+WordSection1\s*\{[^}]*\}/s','',$html);
        $html=str_replace(['&quot;Times New Roman&quot;,serif','windowtext'],['times11','#000000'],$html);
        $pdf->WriteHTML($html);
        return $pdf->Output('',\Mpdf\Output\Destination::STRING_RETURN);
    }
    $template=$kind==='secretaries' && $schoolId!==null ? 'secretaries-school' : $kind;
    ob_start();
    try { return require dirname(__DIR__).'/templates/gek/'.$template.'.php'; }
    finally { ob_end_clean(); $gekPrintIds=[]; }
}
