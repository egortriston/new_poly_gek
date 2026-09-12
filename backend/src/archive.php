<?php
declare(strict_types=1);

const ARCHIVE_INTERNAL = '.polytech-storage';

function archiveRoot(): string
{
    $configured = getenv('POLYTECH_ARCHIVE_ROOT') ?: (configuration()['archive_root'] ?? '');
    if (!$configured) throw new ApiError(503, 'ARCHIVE_NOT_CONFIGURED', 'Хранилище архива ещё не настроено.');
    if (!is_dir($configured) && !@mkdir($configured, 0750, true) && !is_dir($configured))
        throw new ApiError(503, 'ARCHIVE_NOT_CONFIGURED', 'Хранилище архива ещё не настроено.');
    $root = realpath($configured);
    if (!$root || !is_dir($root)) throw new ApiError(503, 'ARCHIVE_NOT_CONFIGURED', 'Хранилище архива ещё не настроено.');
    $root = str_replace('\\', '/', $root);
    if(strlen($root)<=3 || dirname($root)===$root)throw new ApiError(503,'ARCHIVE_LOCATION','Укажите отдельную папку для архива.');
    $project = str_replace('\\', '/', realpath(dirname(__DIR__, 2)));
    if (str_starts_with(strtolower($root.'/'), strtolower($project.'/')) &&
        !str_starts_with(strtolower($root.'/'), strtolower($project.'/storage/')))
        throw new ApiError(503, 'ARCHIVE_LOCATION', 'В проекте архив должен находиться внутри storage.');
    return rtrim($root, '/');
}

function archiveName(string $name): string
{
    if ($name === '' || !mb_check_encoding($name,'UTF-8') || $name !== trim($name) || mb_strlen($name) > 180 ||
        preg_match('/[\\\\\/:*?"<>|\x00-\x1f]/u', $name) ||
        in_array(mb_strtolower($name), ['.', '..', ARCHIVE_INTERNAL], true) || str_ends_with($name, '.') ||
        preg_match('/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i', $name))
        throw new ApiError(422, 'INVALID_NAME', 'Укажите корректное имя без служебных символов, точки или пробела в конце.');
    return $name;
}

function archiveId(string $relative): string { return rtrim(strtr(base64_encode($relative), '+/', '-_'), '='); }
function archiveRelative(string $id): string
{
    if ($id === '') return '';
    $value = base64_decode(strtr($id, '-_', '+/'), true);
    if ($value === false || archiveId($value) !== $id || strlen($value)>6000)
        throw new ApiError(422, 'INVALID_PATH', 'Некорректный путь архива.');
    foreach(explode('/', $value) as $part) archiveName($part);
    return $value;
}
function archivePath(string $relative): string
{
    $root = archiveRoot();
    $path = $root;
    foreach($relative === '' ? [] : explode('/', $relative) as $part) {
        archiveName($part); $path .= '/'.$part;
        if (is_link($path)) throw new ApiError(403, 'ARCHIVE_LINK', 'Переход по ссылкам файловой системы недоступен.');
        $resolved = realpath($path);
        if (!$resolved) throw new ApiError(404, 'NOT_FOUND', 'Файл или папка не найдены. Обновите архив.');
        if (strtolower(str_replace('\\','/',$resolved)) !== strtolower($path))
            throw new ApiError(403, 'ARCHIVE_LINK', 'Путь выходит за границы хранилища или содержит ссылку.');
    }
    return $path;
}
function archiveLocked(callable $operation): mixed
{
    $root=archiveRoot(); $system=$root.'/'.ARCHIVE_INTERNAL;
    if(is_link($system)) throw new ApiError(503,'ARCHIVE_STORAGE','Неверный служебный каталог архива.');
    if(!is_dir($system) && !@mkdir($system,0700)) throw new ApiError(503,'ARCHIVE_STORAGE','Нет доступа к хранилищу архива.');
    if(strtolower(str_replace('\\','/',realpath($system)?:''))!==strtolower($system))
        throw new ApiError(503,'ARCHIVE_STORAGE','Неверный служебный каталог архива.');
    $handle=@fopen($system.'/lock','c+');
    if(!$handle || !flock($handle,LOCK_EX)) throw new ApiError(503,'ARCHIVE_BUSY','Архив временно недоступен.');
    try { clearstatcache(); return $operation(); }
    finally {flock($handle,LOCK_UN);fclose($handle);}
}
function archiveRevision(): string
{
    return @file_get_contents(archiveRoot().'/'.ARCHIVE_INTERNAL.'/revision') ?: '0';
}
function archiveChanged(): void
{
    if(@file_put_contents(archiveRoot().'/'.ARCHIVE_INTERNAL.'/revision',bin2hex(random_bytes(16)))===false)
        throw new ApiError(503,'ARCHIVE_STORAGE','Не удалось обновить состояние архива. Обновите список перед повторным действием.');
    clearstatcache();
}
function archiveItem(string $relative): array
{
    $path=archivePath($relative);$stat=@stat($path);
    if(!$stat) throw new ApiError(503,'ARCHIVE_READ','Не удалось прочитать сведения о файле.');
    $parent=dirname($relative);
    return ['id'=>archiveId($relative),'parent'=>$parent==='.'?null:archiveId($parent),'name'=>basename($relative),
        'kind'=>is_dir($path)?'folder':'file','updated'=>$stat['mtime']*1000,'size'=>is_file($path)?$stat['size']:0,
        'version'=>hash('sha256',json_encode([$relative,$stat['mtime'],$stat['ctime'],$stat['size'],archiveRevision()]))];
}
function archiveCheckVersion(array $body, string $relative): void
{
    if($relative==='')throw new ApiError(403,'ARCHIVE_ROOT','Корневую папку изменять нельзя.');
    $item=archiveItem($relative);
    if(!is_string($body['version']??null) || !hash_equals($item['version'],$body['version']))
        throw new ApiError(409,'STALE_RECORD','Архив изменился. Обновите список и повторите действие.');
}
function archiveContext(string $id): array
{
    return archiveLocked(function()use($id){
        $relative=archiveRelative($id);$path=archivePath($relative);
        if(!is_dir($path))throw new ApiError(404,'NOT_FOUND','Папка не найдена.');
        $parents=[];$prefix='';
        foreach($relative===''?[]:explode('/',$relative) as $part){$prefix= $prefix===''?$part:$prefix.'/'.$part;$parents[]=archiveItem($prefix);}
        return ['folder'=>$id,'parents'=>$parents,'current'=>$parents?end($parents):null,
            'maxFileBytes'=>archiveUploadLimit()];
    });
}
function archiveList(array $input): array
{
    return archiveLocked(function()use($input){
        $folder=listText($input,'folder');$relative=archiveRelative($folder);$path=archivePath($relative);
        if(!is_dir($path))throw new ApiError(404,'NOT_FOUND','Папка не найдена.');
        $q=mb_strtolower(listText($input,'q'));$sort=listText($input,'sort');
        $names=@scandir($path);
        if($names===false)throw new ApiError(503,'ARCHIVE_READ','Нет доступа к содержимому папки.');
        $items=[];
        foreach($names as $name) {
            if(in_array($name,['.','..',ARCHIVE_INTERNAL],true))continue;
            if($q!==''&&!str_contains(mb_strtolower($name),$q))continue;
            $items[]=archiveItem($relative===''?$name:$relative.'/'.$name);
        }
        usort($items,fn($a,$b)=>($b['kind']==='folder')<=>($a['kind']==='folder') ?:
            ($sort==='date'?$b['updated']<=>$a['updated']:strcmp(mb_strtolower($a['name']),mb_strtolower($b['name']))) ?: strcmp($a['id'],$b['id']));
        $signature=hash('sha256',json_encode([$folder,$q,$sort,array_column($items,'version')]));
        $cursor=listText($input,'cursor');$offset=0;
        if($cursor!=='') {
            $decoded=json_decode(base64_decode($cursor,true)?:'',true);
            if(!is_array($decoded)||($decoded['signature']??'')!==$signature||!is_int($decoded['offset']??null)||$decoded['offset']<0)
                throw new ApiError(409,'ARCHIVE_CHANGED','Содержимое папки изменилось. Обновите список.');
            $offset=$decoded['offset'];
        }
        $more=$offset+50<count($items);
        return ['items'=>array_slice($items,$offset,50),'total'=>count($items),
            'nextCursor'=>$more?base64_encode(json_encode(['signature'=>$signature,'offset'=>$offset+50])):null];
    });
}
function archiveAvailableName(string $directory,string $name,bool $number): string
{
    archiveName($name);
    $names=array_map('mb_strtolower',scandir($directory)?:[]);
    if(!in_array(mb_strtolower($name),$names,true))return $name;
    if(!$number)throw new ApiError(409,'DUPLICATE','Такое имя уже есть в папке.');
    $dot=strrpos($name,'.');$stem=$dot!==false&&$dot>0?substr($name,0,$dot):$name;$ext=$dot!==false&&$dot>0?substr($name,$dot):'';
    for($i=1;$i<10000;$i++){ $candidate=$stem.' ('.$i.')'.$ext; if(!in_array(mb_strtolower($candidate),$names,true))return archiveName($candidate); }
    throw new ApiError(409,'DUPLICATE','Слишком много файлов с одинаковым именем.');
}
function archiveMutate(string $action,array $body): array
{
    return archiveLocked(function()use($action,$body){
        if($action==='mkdir'){
            $relative=archiveRelative(requiredText($body,'folder')??'');$parent=archivePath($relative);
            if(!is_dir($parent))throw new ApiError(404,'NOT_FOUND','Папка не найдена.');
            $name=archiveAvailableName($parent,requiredText($body,'name',true),false);
            if(!@mkdir($parent.'/'.$name,0750))throw new ApiError(503,'ARCHIVE_WRITE','Не удалось создать папку. Проверьте доступ и свободное место.');
            archiveChanged();return ['id'=>archiveId($relative===''?$name:$relative.'/'.$name)];
        }
        $relative=archiveRelative(requiredText($body,'id',true));archiveCheckVersion($body,$relative);$path=archivePath($relative);
        if($action==='rename'){
            $name=archiveName(requiredText($body,'name',true));
            if($name===basename($path))return ['id'=>archiveId($relative)];
            archiveAvailableName(dirname($path),$name,false);
            if(!@rename($path,dirname($path).'/'.$name))throw new ApiError(503,'ARCHIVE_WRITE','Не удалось переименовать объект. Возможно, файл открыт другим приложением.');
            archiveChanged();$parent=dirname($relative);
            return ['id'=>archiveId($parent==='.'?$name:$parent.'/'.$name)];
        }
        if($action==='delete'){
            // Remove from the visible archive atomically, then clean the private staging area.
            $target=archiveRoot().'/'.ARCHIVE_INTERNAL.'/deleted-'.bin2hex(random_bytes(12));
            if(!@rename($path,$target))throw new ApiError(503,'ARCHIVE_WRITE','Не удалось удалить объект. Возможно, файл открыт другим приложением.');
            archiveChanged();
            archivePurge($target,archiveRoot().'/'.ARCHIVE_INTERNAL);
            return ['deleted'=>true];
        }
        throw new ApiError(404,'NOT_FOUND','Операция не найдена.');
    });
}
function archivePurge(string $path,string $privateRoot): void
{
    $real=realpath($path);
    if(!$real||is_link($path)||!str_starts_with(strtolower(str_replace('\\','/',$real)),strtolower($privateRoot.'/')))return;
    if(is_dir($path)){foreach(scandir($path)?:[] as $name)if($name!=='.'&&$name!=='..')archivePurge($path.'/'.$name,$privateRoot);@rmdir($path);}
    else @unlink($path);
}
function archiveUpload(array $input,array $file): array
{
    return archiveLocked(function()use($input,$file){
        if(($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)
            throw new ApiError(422,'UPLOAD_FAILED','Файл не загружен. Проверьте его размер и повторите попытку.');
        if(!is_string($file['tmp_name']??null)||!is_uploaded_file($file['tmp_name']))throw new ApiError(422,'UPLOAD_FAILED','Некорректная загрузка файла.');
        $size=filesize($file['tmp_name']);
        if($size>archiveUploadLimit())throw new ApiError(413,'FILE_TOO_LARGE','Файл превышает допустимый размер.');
        $relative=archiveRelative(listText($input,'folder'));$parent=archivePath($relative);
        if(!is_dir($parent))throw new ApiError(404,'NOT_FOUND','Папка не найдена.');
        $name=archiveAvailableName($parent,is_string($file['name']??null)?$file['name']:'',true);
        if(!@move_uploaded_file($file['tmp_name'],$parent.'/'.$name))throw new ApiError(503,'ARCHIVE_WRITE','Не удалось сохранить файл. Проверьте доступ и свободное место.');
        archiveChanged();return ['id'=>archiveId($relative===''?$name:$relative.'/'.$name),'name'=>$name];
    });
}
function archiveDownload(string $id): never
{
    [$handle,$name,$size]=archiveLocked(function()use($id){
        $relative=archiveRelative($id);$path=archivePath($relative);
        if(!is_file($path))throw new ApiError(404,'NOT_FOUND','Файл не найден.');
        $handle=@fopen($path,'rb');
        if(!$handle)throw new ApiError(503,'ARCHIVE_READ','Не удалось открыть файл.');
        return [$handle,basename($path),filesize($path)];
    });
    session_write_close();
    header('Content-Type: application/octet-stream');header('X-Content-Type-Options: nosniff');
    header("Content-Disposition: attachment; filename=\"download\"; filename*=UTF-8''".rawurlencode($name));
    header('Content-Length: '.$size);header('Cache-Control: no-store');
    fpassthru($handle);fclose($handle);exit;
}

function archiveUploadLimit(): int
{
    $limits=[(int)configuration()['archive_max_file_bytes']];
    foreach(['upload_max_filesize','post_max_size'] as $setting){
        $value=ini_parse_quantity(ini_get($setting));
        if($value>0)$limits[]=$setting==='post_max_size'?max(0,$value-65536):$value;
    }
    return min($limits);
}
function archiveYear(string $period): string
{
    if(!preg_match('#^(\d{4})/(\d{4})$#D',$period,$years)||(int)$years[2] !== (int)$years[1]+1)
        throw new ApiError(422,'INVALID_PERIOD','Выберите учебный период.');
    return $years[2];
}
function archiveEnsureChairman(string $memberId,string $period,string $fullName): string
{
    $year=archiveYear($period);
    if(!preg_match('/^\d+$/D',$memberId))throw new ApiError(422,'INVALID_PERSON','Некорректный участник.');
    $safeName=preg_replace('/[\\\\\/:*?"<>|\x00-\x1f]/u',' ',$fullName);
    $safeName=trim(preg_replace('/\s+/u',' ',$safeName??''));
    if($safeName==='')throw new ApiError(422,'INVALID_PERSON','Укажите ФИО председателя.');
    $folderName=archiveName(rtrim(mb_substr($memberId.' — '.$safeName,0,180),'. '));
    return archiveLocked(function()use($folderName,$year){
        $relative='Председатели ГЭК '.$year;$root=archiveRoot();$changed=false;
        foreach([$relative,$relative.'/'.$folderName] as $folder){
            if(file_exists($root.'/'.$folder)){
                if(!is_dir(archivePath($folder)))throw new ApiError(409,'DUPLICATE','На месте папки председателя уже существует файл.');
            }else{
                if(!@mkdir($root.'/'.$folder,0750))throw new ApiError(503,'ARCHIVE_WRITE','Не удалось создать папку председателя. Карточка не сохранена.');
                $changed=true;
            }
        }
        if($changed)archiveChanged();
        return archiveId($relative.'/'.$folderName);
    });
}
