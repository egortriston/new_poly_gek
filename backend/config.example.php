<?php
declare(strict_types=1);
return [
    'db' => ['host' => '127.0.0.1', 'port' => '5432', 'dbname' => 'legacy_poly', 'user' => 'postgres', 'password' => ''],
    // Exact existing usernames only. Unmapped accounts cannot sign in.
    'roles' => [], // 'username' => 'admin' or 'rop'
    'secure_cookie' => false, // true on the HTTPS deployment
    'idle_seconds' => 1800,
    'absolute_seconds' => 28800,
];
