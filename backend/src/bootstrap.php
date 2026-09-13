<?php
declare(strict_types=1);

final class ApiError extends RuntimeException
{
    public function __construct(public int $status, public string $errorCode, string $message, public array $fields = [])
    {
        parent::__construct($message);
    }
}

function configuration(): array
{
    static $config;
    if ($config === null) {
        $path = getenv('POLYTECH_CONFIG') ?: dirname(__DIR__) . '/config.local.php';
        if (!is_file($path)) throw new ApiError(503, 'NOT_CONFIGURED', 'Сервер не настроен. Обратитесь к администратору.');
        $config = array_replace(require dirname(__DIR__) . '/config.example.php', require $path);
    }
    return $config;
}

function respond(array $body, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

function databaseNamed(string $name): PgSql\Connection
{
    static $connections = [];
    if (!isset($connections[$name])) {
        $parts = [];
        foreach (array_replace(configuration()['db'], ['dbname'=>$name]) as $key=>$value) {
            if (!in_array($key, ['host','port','dbname','user','password'], true)) continue;
            $parts[]=$key."='".str_replace(['\\', "'"], ['\\\\', "\\'"], (string)$value)."'";
        }
        $connection=@pg_connect(implode(' ', $parts).' connect_timeout=5', PGSQL_CONNECT_FORCE_NEW);
        if (!$connection) throw new ApiError(503,'DATABASE_UNAVAILABLE','База данных временно недоступна.');
        $connections[$name]=$connection;
    }
    return $connections[$name];
}

function database(): PgSql\Connection
{
    return databaseNamed(PHP_SAPI==='cli' ? configuration()['db']['dbname'] : selectedDatabase()['database']);
}

function query(string $sql, array $params = []): PgSql\Result
{
    return queryConnection(database(),$sql,$params);
}

function queryConnection(PgSql\Connection $connection,string $sql,array $params=[]): PgSql\Result
{
    if(!@pg_send_query_params($connection,$sql,$params))throw new RuntimeException('Database query failed');
    $result=pg_get_result($connection);
    while (pg_get_result($connection) !== false) { /* Drain the single-statement result stream. */ }
    $status=pg_result_status($result);
    if(!in_array($status,[PGSQL_COMMAND_OK,PGSQL_TUPLES_OK],true)){
        $code=pg_result_error_field($result,PGSQL_DIAG_SQLSTATE);
        if($code==='23505')throw new ApiError(409,'DUPLICATE','Запись с таким идентификатором или кодом уже существует.');
        if($code==='23503')throw new ApiError(409,'IN_USE','Запись связана с другими данными или связанная запись больше не существует.');
        if(in_array($code,['22001','22P02','23502','23514'],true))throw new ApiError(422,'VALIDATION','Проверьте значения и длину заполненных полей.');
        if(in_array($code,['40P01','40001','55P03'],true))throw new ApiError(409,'CONCURRENT_CHANGE','Данные изменяются другим пользователем. Повторите действие.');
        throw new RuntimeException('Database query failed');
    }
    return $result;
}

function startSession(): void
{
    $directory = dirname(__DIR__) . '/var/sessions';
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) throw new RuntimeException('Session storage unavailable');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_save_path($directory);
    session_name('polytech_session');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/api', 'secure' => configuration()['secure_cookie'], 'httponly' => true, 'samesite' => 'Lax']);
    if (!session_start()) throw new RuntimeException('Session unavailable');
    $now = time();
    if (isset($_SESSION['user_id']) && ($now - ($_SESSION['last_seen'] ?? 0) > configuration()['idle_seconds'] || $now - ($_SESSION['created'] ?? 0) > configuration()['absolute_seconds'])) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
}

function requireCsrf(): void
{
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!$token || !hash_equals($_SESSION['csrf'], $token)) throw new ApiError(403, 'CSRF_INVALID', 'Сеанс обновился. Обновите страницу и повторите действие.');
}

function currentUser(): ?array
{
    if (!isset($_SESSION['user_id'])) return null;
    $row = pg_fetch_assoc(query('SELECT user_id, username FROM user_list WHERE user_id = $1', [$_SESSION['user_id']]));
    $role = $row ? (configuration()['roles'][$row['username']] ?? null) : null;
    if (!$row || !in_array($role, ['admin', 'rop'], true)) {
        unset($_SESSION['user_id']);
        return null;
    }
    $_SESSION['last_seen'] = time();
    return ['id' => (string)$row['user_id'], 'username' => $row['username'], 'role' => $role];
}

function requireUser(): array
{
    return currentUser() ?? throw new ApiError(401, 'AUTH_REQUIRED', 'Войдите в систему.');
}

function requireAdmin(array $user): void
{
    if ($user['role'] !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Нет доступа к этому разделу.');
}

function readJson(): array
{
    if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) throw new ApiError(415, 'JSON_REQUIRED', 'Ожидается запрос JSON.');
    $raw = file_get_contents('php://input', false, null, 0, 1048577);
    if (strlen($raw) > 1048576) throw new ApiError(413, 'REQUEST_TOO_LARGE', 'Слишком большой запрос.');
    try { $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
    catch (JsonException) { throw new ApiError(400, 'INVALID_JSON', 'Неверный формат запроса.'); }
    if (!is_array($body)) throw new ApiError(400, 'INVALID_JSON', 'Неверный формат запроса.');
    if (PHP_SAPI!=='cli' && isset($_SESSION['user_id']) && array_key_exists('academicYear',$body)) $body['academicYear']=selectedDatabase()['academicYear'];
    return $body;
}

// Shared across sessions; opening a fresh browser session cannot reset the limit.
function loginThrottle(bool $failed = false): void
{
    $path = dirname(__DIR__) . '/var/login-' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'local') . '.json';
    $file = fopen($path, 'c+');
    if (!$file || !flock($file, LOCK_EX)) throw new RuntimeException('Login limiter unavailable');
    try {
        $events = json_decode(stream_get_contents($file), true) ?: [];
        $events = array_values(array_filter($events, fn($stamp) => $stamp > time() - 300));
        if (!$failed && count($events) >= 10) throw new ApiError(429, 'TOO_MANY_ATTEMPTS', 'Слишком много попыток входа. Повторите через пять минут.');
        if ($failed) $events[] = time();
        ftruncate($file, 0); rewind($file); fwrite($file, json_encode($events));
    } finally { flock($file, LOCK_UN); fclose($file); }
}

require_once __DIR__.'/databases.php';
