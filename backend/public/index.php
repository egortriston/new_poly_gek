<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/catalog.php';
require dirname(__DIR__) . '/src/people.php';
ini_set('display_errors', '0');
$requestId = bin2hex(random_bytes(8));
header('X-Request-ID: ' . $requestId);
try {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $method = $_SERVER['REQUEST_METHOD'];
    if ($path === '/api/v1/health' && $method === 'GET') respond(['data' => ['status' => 'ok', 'version' => '1.0.0']]);
    startSession();
    if ($path === '/api/v1/auth/session' && $method === 'GET') respond(['data' => ['user' => currentUser(), 'csrfToken' => $_SESSION['csrf']]]);
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
        respond(['data' => ['user' => currentUser(), 'csrfToken' => $_SESSION['csrf']]]);
    }
    if ($path === '/api/v1/auth/logout' && $method === 'POST') {
        requireCsrf();
        $_SESSION = []; session_destroy();
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/api', 'secure' => configuration()['secure_cookie'], 'httponly' => true, 'samesite' => 'Lax']);
        respond(['data' => ['loggedOut' => true]]);
    }
    $user = requireUser();
    if($path==='/api/v1/catalog'&&$method==='GET')respond(['data'=>transaction(fn()=>catalogSnapshot())]);
    if($path==='/api/v1/people'&&$method==='GET')respond(['data'=>transaction(fn()=>peopleSnapshot())]);
    if(preg_match('#^/api/v1/(catalog|people)/([a-z]+)/(save|delete)$#',$path,$matches)&&$method==='POST'){
        requireCsrf();$body=readJson();
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
