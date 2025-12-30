<?php
/**
 * Diagnostic script to check SQLite database status.
 * Usage: Open /api/check_db.php in browser.
 */

header('Content-Type: text/plain');

$dbPath = __DIR__ . '/weather.db';

echo "Database Path: " . $dbPath . "\n";

if (!file_exists($dbPath)) {
    echo "ERROR: Database file does not exist.\n";
    exit;
}

echo "File Permissions: " . substr(sprintf('%o', fileperms($dbPath)), -4) . "\n";
echo "Directory Permissions: " . substr(sprintf('%o', fileperms(dirname($dbPath))), -4) . "\n";
echo "Is Writable (File): " . (is_writable($dbPath) ? "YES" : "NO") . "\n";
echo "Is Writable (Dir): " . (is_writable(dirname($dbPath)) ? "YES" : "NO") . "\n";

try {
    $db = new SQLite3($dbPath);

    // Count Locations
    $count = $db->querySingle("SELECT COUNT(*) FROM locations");
    echo "Total Locations: " . $count . "\n";

    // Show Last 5 Locations
    echo "\nLast 5 Locations:\n";
    $res = $db->query("SELECT * FROM locations ORDER BY id DESC LIMIT 5");
    while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
        echo "ID: " . $row['id'] . " | Lat: " . $row['lat'] . " | Lng: " . $row['lng'] . "\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
