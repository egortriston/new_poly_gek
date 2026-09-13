<?php
declare(strict_types=1);
return [
    'db' => ['host' => '127.0.0.1', 'port' => '5432', 'dbname' => 'legacy_poly', 'user' => 'postgres', 'password' => ''],
    // Exact existing usernames only. Unmapped accounts cannot sign in.
    'database_registry' => __DIR__.'/var/databases.json',
    'initial_academic_year' => '2026/2027',
    'postgres_bin' => '', // Directory containing pg_dump and pg_restore; auto-detected on Windows.
    'php_cli' => '', // Optional path to CLI php.exe for background database copies.
    'roles' => [], // 'username' => 'admin' or 'rop'
    'secure_cookie' => false, // true on the HTTPS deployment
    'idle_seconds' => 1800,
    'absolute_seconds' => 28800,
    'archive_root' => dirname(__DIR__).'/storage/archive', // Private files, ignored by Git.
    'archive_max_file_bytes' => 52428800, // Also configure PHP upload_max_filesize / post_max_size.
];
