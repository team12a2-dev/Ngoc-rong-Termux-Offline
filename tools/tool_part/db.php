<?php
/**
 * Database Connection for NRO Part Tool
 */

function get_db_config() {
    $configFile = __DIR__ . '/config.json';
    $defaultConfig = [
        'host' => '127.0.0.1',
        'port' => 3306,
        'user' => 'root',
        'pass' => '',
        'dbname' => 'ngocrong'
    ];

    // Check custom saved config
    if (file_exists($configFile)) {
        $json = @json_decode(file_get_contents($configFile), true);
        if (is_array($json)) {
            return array_merge($defaultConfig, $json);
        }
    }

    // Try reading Config.properties from parent directory or repo
    $possibleProps = [
        __DIR__ . '/../../Config.properties',
        'C:/Users/bimat/Downloads/Ngoc-rong-Termux-Offline-main/Config.properties'
    ];

    foreach ($possibleProps as $path) {
        if (file_exists($path)) {
            $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines) {
                foreach ($lines as $line) {
                    $line = trim($line);
                    if ($line === '' || str_starts_with($line, '#')) continue;
                    $parts = explode('=', $line, 2);
                    if (count($parts) === 2) {
                        $key = trim($parts[0]);
                        $val = trim($parts[1]);
                        if ($key === 'database.host') $defaultConfig['host'] = $val;
                        if ($key === 'database.port') $defaultConfig['port'] = (int)$val;
                        if ($key === 'database.name') $defaultConfig['dbname'] = $val;
                        if ($key === 'database.user') $defaultConfig['user'] = $val;
                        if ($key === 'database.pass') $defaultConfig['pass'] = $val;
                    }
                }
                break;
            }
        }
    }

    return $defaultConfig;
}

function get_pdo($customConfig = null) {
    $cfg = $customConfig ?: get_db_config();
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $cfg['host'], $cfg['port'], $cfg['dbname']);
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT => 5
    ];
    return new PDO($dsn, $cfg['user'], $cfg['pass'], $options);
}
