<?php
declare(strict_types=1);

function oopPrintQuery($connection,string $sql): PgSql\Result { return query($sql); }

function oopPrintRow(PgSql\Result $result): array|false
{
    $row=pg_fetch_assoc($result);
    if(!$row)return false;
    foreach($row as &$value)if($value!==null)$value=oopPrintMarkup($value);
    return $row;
}

// Preserve legacy inline formatting, but never load images, stylesheets or embedded resources from database text.
function oopPrintMarkup(string $text): string
{
    $text=preg_replace('~<(script|style|iframe|object)\b[^>]*>.*?</\1\s*>~is','',$text);
    $text=strip_tags($text,'<p><br><b><strong><i><em><u><span><sup><sub><ul><ol><li><table><thead><tbody><tr><td><th>');
    return preg_replace_callback('~<(/?)([a-z]+)\b[^>]*>~i',function($match){
        return '<'.$match[1].strtolower($match[2]).'>';
    },$text);
}

function oopPrint(array $body): string
{
    $id_mep=requiredText($body,'program',true);
    oopProgram($id_mep);
    $conn=database();
    ob_start();
    try { return require dirname(__DIR__).'/templates/oop/document.php'; }
    finally { ob_end_clean(); }
}

function oopPrintTable($table_name_rus, $headers_list, $column_names_list, $res, $matrix = false, $edit = false, $col_edit = '') {

  if($matrix){
    $html='<table border="1" cellspacing="0" style = "border-collapse: collapse;" id = "myTable" border="1" width=100%><thead>';
    $size = 'font-size: 9pt';
  }
  else{
    $html='<table border="1" cellspacing="0" style = "border-collapse: collapse;" id = "myTable" border="1" width=80%><thead>';
    $size = 'font-size: 12pt';
  }
  if($table_name_rus!=''){
    $num_h = count($headers_list);
  $html.='<tr class="header"><th colspan="'.$num_h.'"><h2>'.$table_name_rus.'</h2></th></tr>';
  }
  $html.='<tr class="header">';
  foreach($headers_list as $hl) {
      $html.='<th style="'.$size.';">'.$hl.' </th>';      
    }

   $html.=  '</tr></thead>';
  while ($row = oopPrintRow($res)) {
    $html.='<tr valign="top">';
  foreach($column_names_list as $n => $cnl) {
    $width = !$matrix ? 'width="170"': '';
     $str_cnl= !is_null(($row[$cnl] ?? '')) ? str_replace('ИД', '<br>ИД', ($row[$cnl] ?? '')) : ($row[$cnl] ?? '');
     $html.='<td '.$width.'style="white-space: pre-line; '.$size.';">'.$str_cnl.'</td>';
  }
    $html.='</tr>';
  }
    $html.='</table>';
  return $html;
}


