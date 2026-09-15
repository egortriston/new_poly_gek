<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/catalog.php';
require dirname(__DIR__) . '/src/people.php';
require dirname(__DIR__) . '/src/lists.php';
require dirname(__DIR__) . '/src/archive.php';
require dirname(__DIR__) . '/src/chairman-print.php';
require dirname(__DIR__) . '/src/gek.php';
require dirname(__DIR__) . '/src/gek-print.php';
require dirname(__DIR__) . '/src/spo.php';
require dirname(__DIR__) . '/src/spo-print.php';
require dirname(__DIR__) . '/src/ppa.php';
require dirname(__DIR__) . '/src/ppa-print.php';
require dirname(__DIR__) . '/src/oop-status.php';
require dirname(__DIR__) . '/src/oop.php';
require dirname(__DIR__) . '/src/oop-general.php';
require dirname(__DIR__) . '/src/oop-directions.php';
require dirname(__DIR__) . '/src/oop-print.php';
require dirname(__DIR__) . '/src/oop-program-data.php';
ini_set('display_errors', '0');
$requestId = bin2hex(random_bytes(8));
header('X-Request-ID: ' . $requestId);
try {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $method = $_SERVER['REQUEST_METHOD'];
    if ($path === '/api/v1/health' && $method === 'GET') respond(['data' => ['status' => 'ok', 'version' => '2.0.0']]);
    startSession();
    if ($path === '/api/v1/auth/session' && $method === 'GET') respond(['data' => ['user' => currentUser(), 'csrfToken' => $_SESSION['csrf'], 'databases'=>databaseSession()]]);
    if ($path === '/api/v1/auth/login' && $method === 'POST') {
        requireCsrf(); loginThrottle();
        $body = readJson();
        $username = is_string($body['username'] ?? null) ? trim($body['username']) : '';
        $password = is_string($body['password'] ?? null) ? $body['password'] : '';
        if (!$username || !$password || strlen($username) > 200 || strlen($password) > 1024) throw new ApiError(422, 'VALIDATION', 'Введите логин и пароль.');
        $result = query('SELECT user_id, username, password FROM user_list WHERE username = $1', [$username]);
        $row = pg_num_rows($result) === 1 ? pg_fetch_assoc($result) : false;
        $stored = $row ? (string)$row['password'] : '';
        $hashed = password_get_info($stored)['algo'] !== null;
        $valid = $row && ($hashed ? password_verify($password, $stored) : hash_equals($stored, $password));
        if (!$valid) { loginThrottle(true); throw new ApiError(401, 'INVALID_CREDENTIALS', 'Неверный логин или пароль.'); }
        $role = configuration()['roles'][$row['username']] ?? null;
        if (!in_array($role, ['admin', 'rop'], true)) throw new ApiError(403, 'ROLE_NOT_ASSIGNED', 'Доступ не настроен. Обратитесь к администратору.');
        session_regenerate_id(true);
        $_SESSION = ['user_id' => $row['user_id'], 'created' => time(), 'last_seen' => time(), 'csrf' => bin2hex(random_bytes(32))];
        respond(['data' => ['user' => currentUser(), 'csrfToken' => $_SESSION['csrf'], 'databases'=>databaseSession()]]);
    }
    if ($path === '/api/v1/auth/logout' && $method === 'POST') {
        requireCsrf();
        $_SESSION = []; session_destroy();
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/api', 'secure' => configuration()['secure_cookie'], 'httponly' => true, 'samesite' => 'Lax']);
        respond(['data' => ['loggedOut' => true]]);
    }
    $user = requireUser();
    databaseSession();
    if($method!=='GET'||isset($_SERVER['HTTP_X_DATABASE_CONTEXT']))requireDatabaseContext();
    if($path==='/api/v1/databases/switch'&&$method==='POST'){requireCsrf();respond(['data'=>switchDatabase(readJson(),$user)]);}
    if($path==='/api/v1/databases/choices'&&$method==='GET')respond(['data'=>databaseSession()]);
    if($path==='/api/v1/databases'&&$method==='GET'){requireAdmin($user);respond(['data'=>databaseRegistryStatus()]);}
    if($path==='/api/v1/databases/default'&&$method==='POST'){requireAdmin($user);requireCsrf();respond(['data'=>defaultDatabase(requiredText(readJson(),'id',true))]);}
    if($path==='/api/v1/databases/create'&&$method==='POST'){requireAdmin($user);requireCsrf();respond(['data'=>createDatabaseCopy(readJson())],202);}
    $_GET['academicYear']=selectedDatabase()['academicYear'];
    if(preg_match('#^/api/v1/oop/directions/([^/]+)/(list|save|delete|options/([0-9]+))$#D',$path,$match)){
        requireAdmin($user);
        if($method==='GET'&&isset($match[3]))respond(['data'=>readList(fn()=>oopDirectionOptions($match[1],$match[3],$_GET))]);
        if($method==='GET'&&$match[2]==='list')respond(['data'=>readList(fn()=>oopDirectionList($match[1],$_GET))]);
        if($method==='POST'&&in_array($match[2],['save','delete'],true)){
            requireCsrf();respond(['data'=>oopDirectionMutate($match[1],readJson(),$match[2]==='delete')]);
        }
    }
    if(preg_match('#^/api/v1/oop/general/([^/]+)/(list|save|delete)$#D',$path,$match)){
        requireAdmin($user);
        if($method==='GET'&&$match[2]==='list')respond(['data'=>readList(fn()=>oopGeneralList($match[1],$_GET))]);
        if($method==='POST'&&in_array($match[2],['save','delete'],true)){
            requireCsrf();respond(['data'=>oopGeneralMutate($match[1],readJson(),$match[2]==='delete')]);
        }
    }
    if($path==='/api/v1/oop/print' && $method==='POST'){requireCsrf();$body=readJson();respond(['data'=>readList(fn()=>['pdf'=>base64_encode(oopPrint($body))])]);}
    if(preg_match('#^/api/v1/oop/program-data/(matrix|forms)/(list|save|delete)$#D',$path,$match)){
        if($method==='GET'&&$match[2]==='list')respond(['data'=>readList(fn()=>oopDataList($match[1],$_GET))]);
        if($method==='POST'&&in_array($match[2],['save','delete'],true)){
            requireCsrf();respond(['data'=>oopDataMutate($match[1],readJson(),$match[2]==='delete',$user)]);
        }
    }
    if ($path==='/api/v1/oop/formation' && $method==='GET') respond(['data'=>readList(fn()=>oopResponse(oopSnapshot(listText($_GET,'program'))))]);
    if ($path==='/api/v1/oop/formation' && $method==='POST') {
        requireCsrf();respond(['data'=>saveOop(readJson(),$user)]);
    }
    if (preg_match('#^/api/v1/oop/status(/|$)#',$path)) {
        requireAdmin($user);
        if($path==='/api/v1/oop/status' && $method==='GET')respond(['data'=>readList(fn()=>oopStatusList($_GET))]);
    }
    if ($path === '/api/v1/gek/print' && $method === 'POST') {
        requireCsrf();
        respond(['data'=>['pdf'=>base64_encode(gekPrint(readJson()))]]);
    }
    if (preg_match('#^/api/v1/ppa/(context|save|delete|cover|print)$#D',$path,$match)) {
        $action=$match[1];
        if($method==='GET' && $action==='context')respond(['data'=>readList(fn()=>ppaContext())]);
        if($method==='GET' && $action==='cover')respond(['data'=>readList(fn()=>ppaCover(($_GET['amendment']??'false')==='true',$_GET['school']??null))]);
        if($method==='POST' && in_array($action,['save','delete','cover','print'],true)){
            requireCsrf();$body=readJson();
            $data=match($action){'save'=>savePpa($body),'delete'=>deletePpa($body),'cover'=>savePpaCover($body),'print'=>readList(fn()=>['pdf'=>base64_encode(ppaPrint($body))])};
            respond(['data'=>$data]);
        }
    }
    if (preg_match('#^/api/v1/(spo|ac)/(context|save|delete|cover|print)$#D', $path, $match)) {
        $kind=$match[1];$action=$match[2];
        if ($method==='GET' && $action==='context') respond(['data'=>readList(fn()=>spoContext($kind))]);
        if ($method==='GET' && $action==='cover') respond(['data'=>readList(fn()=>spoCover($_GET['school']??null,$kind))]);
        if ($method==='POST' && in_array($action,['save','delete','cover','print'],true)) {
            requireCsrf();$body=readJson();
            $data=match($action) {
                'save'=>saveSpo($body,null,$kind),
                'delete'=>deleteSpo($body,$kind),
                'cover'=>saveSpoCover($body,$kind),
                'print'=>readList(fn()=>['pdf'=>base64_encode(spoPrint($body,$kind))]),
            };
            respond(['data'=>$data]);
        }
    }
    if ($path === '/api/v1/gek/context' && $method === 'GET') respond(['data'=>readList(fn()=>gekSnapshot($_GET['academicYear']??'2026/2027'))]);
    if ($path === '/api/v1/gek/numbering' && $method === 'POST') {
        requireCsrf();$body=readJson();
        $start=filter_var($body['start']??null,FILTER_VALIDATE_INT);
        if($start===false) throw new ApiError(422,'VALIDATION','Введите первый номер ГЭК.');
        respond(['data'=>['start'=>gekNumbering(requiredText($body,'academicYear',true),$start)]]);
    }
    if ($method === 'POST' && in_array($path, ['/api/v1/gek/save','/api/v1/gek/delete'], true)) {
        requireCsrf();
        respond(['data'=>$path === '/api/v1/gek/save' ? saveGek(readJson()) : deleteGek(readJson())]);
    }
    if ($method === 'GET' && preg_match('#^/api/v1/people/(chairmen|complex)/print$#', $path, $matches)) {
        respond(['data' => ['pdf' => base64_encode(chairmanPdf(chairmanPrintForms($matches[1], $_GET)))]]);
    }
    if($path==='/api/v1/archive/list' && $method==='GET')respond(['data'=>archiveList($_GET)]);
    if($path==='/api/v1/archive/context' && $method==='GET')respond(['data'=>archiveContext(listText($_GET,'folder'))]);
    if($path==='/api/v1/archive/download' && $method==='GET')archiveDownload(listText($_GET,'id'));
    if($path==='/api/v1/archive/upload' && $method==='POST'){
        requireCsrf();
        respond(['data'=>archiveUpload($_POST,$_FILES['file']??[])]);
    }
    if($method==='POST' && preg_match('#^/api/v1/archive/(mkdir|rename|delete)$#',$path,$matches)){
        requireCsrf();respond(['data'=>archiveMutate($matches[1],readJson())]);
    }
    if($method==='GET' && preg_match('#^/api/v1/(catalog|people)/([a-z]+)/list$#',$path,$matches))
        respond(['data'=>readList(fn()=>$matches[1]==='catalog'?catalogList($matches[2],$_GET):peopleList($matches[2],$_GET))]);
    if($method==='GET' && preg_match('#^/api/v1/options/([a-z]+)$#',$path,$matches))
        respond(['data'=>readList(fn()=>optionList($matches[1],$_GET))]);
    if($path==='/api/v1/catalog/context' && $method==='GET')
        respond(['data'=>[
            'schools'=>rows('SELECT id_school, name_school FROM school ORDER BY id_school'),
            'directions'=>rows('SELECT id_direction::text AS id_direction, number_direction, name_direction FROM direction_list ORDER BY number_direction,id_direction'),
            'programs'=>rows('SELECT id_mep::text AS id_mep, id_program, name_program, id_direction::text AS id_direction FROM program_list ORDER BY id_program,id_mep'),
        ]]);
    if($path==='/api/v1/catalog'&&$method==='GET')respond(['data'=>transaction(fn()=>catalogSnapshot())]);
    if($path==='/api/v1/people'&&$method==='GET')respond(['data'=>transaction(fn()=>peopleSnapshot())]);
    if(preg_match('#^/api/v1/people/([a-z]+)/archive$#',$path,$matches)&&$method==='POST'){
        requireCsrf();$body=readJson();
        archiveYear(requiredText($body,'academicYear',true));
        respond(['data'=>chairmanArchiveFolder($matches[1],$body)]);
    }
    if(preg_match('#^/api/v1/(catalog|people)/([a-z]+)/(save|delete)$#',$path,$matches)&&$method==='POST'){
        requireCsrf();$body=readJson();
        if($matches[1]==='people' && $matches[3]==='save' && $matches[2]!=='external' && empty($body['id']))
            archiveYear(requiredText($body,'academicYear',true));
        $handler=$matches[1]==='catalog'?($matches[3]==='save'?'saveCatalog':'deleteCatalog'):($matches[3]==='save'?'savePeople':'deletePeople');
        respond(['data'=>$handler($matches[2],$body)]);
    }
    if ($path === '/api/v1/health/database' && $method === 'GET') {
        requireAdmin($user); query('SELECT 1'); respond(['data' => ['status' => 'ok']]);
    }
    // Applied before dispatch, including future handlers and all HTTP methods.
    if (preg_match('#^/api/v1/oop/(directions|general)(/|$)#', $path)) {
        requireAdmin($user);
        throw new ApiError(501, 'NOT_IMPLEMENTED', 'Серверные операции этого раздела ещё не подключены.');
    }
    throw new ApiError(404, 'NOT_FOUND', 'Запрошенный ресурс не найден.');
} catch (Throwable $error) {
    $status = $error instanceof ApiError ? $error->status : 500;
    // Do not log request bodies, SQL, passwords or connection strings.
    error_log(json_encode(['requestId' => $requestId, 'status' => $status, 'code' => $error instanceof ApiError ? $error->errorCode : 'INTERNAL_ERROR']));
    respond(['error' => ['code' => $error instanceof ApiError ? $error->errorCode : 'INTERNAL_ERROR', 'message' => $error instanceof ApiError ? $error->getMessage() : 'Не удалось выполнить операцию. Повторите попытку позже.', 'fields' => $error instanceof ApiError ? $error->fields : [], 'requestId' => $requestId]], $status);
}
