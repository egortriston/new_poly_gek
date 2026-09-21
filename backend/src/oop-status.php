<?php
declare(strict_types=1);

function oopStatusList(array $input): array
{
    $q=listText($input,'q');
    $direction=listText($input,'direction');
    $status=listText($input,'status');
    $params=[];
    $where=searchCondition("concat_ws(' ',p.id_program,p.name_program)",$q,$params);
    if($direction!==''){
        $params[]=$direction;
        $where.=' AND p.id_direction::text=$'.count($params);
    }
    // Missing status stays explicit; approval is never inferred from completeness.
    $sql="SELECT p.id_mep,p.id_program,p.name_program,p.id_direction,
        COALESCE(NULLIF(trim(s.status),''),'Не указан') AS status
        FROM program_list p LEFT JOIN mep_status s ON s.id_mep=p.id_mep WHERE $where";
    $counts=rows("SELECT status,count(*)::integer AS count FROM ($sql) matched GROUP BY status ORDER BY status",$params);
    if($status!==''){
        $params[]=$status;
        $sql='SELECT * FROM ('.$sql.') filtered WHERE status=$'.count($params);
    }
    return listPage($sql,'id_mep',$params,['oop-status',$q,$direction,$status],$input)+[
        'statuses'=>$counts,
        'directions'=>rows('SELECT id_direction,number_direction,name_direction FROM direction_list ORDER BY number_direction,id_direction'),
    ];
}
