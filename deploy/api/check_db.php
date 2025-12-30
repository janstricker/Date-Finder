<?php
/**
 * Diagnostic script to check SQLite database status and optimize structure.
 * Usage: 
 * - View Status: /api/check_db.php
 * - Optimize (Create Index): /api/check_db.php?optimize=true
 */

header('Content-Type: text/plain');

$dbPath = __DIR__ . '/weather.db';
echo "Database Path: " . $dbPath . "\n\n";

if (!file_exists($dbPath)) {
    echo "ERROR: Database file does not exist.\n";
    exit;
}

try {
    $db = new SQLite3($dbPath);

    // Check for Optimization Request
    if (isset($_GET['optimize']) && $_GET['optimize'] === 'true') {
        echo "--- OPTIMIZING DATABASE ---\n";
        $db->exec("CREATE INDEX IF NOT EXISTS idx_daily_loc_id ON daily(loc_id)");
        $db->exec("CREATE INDEX IF NOT EXISTS idx_locations_lat_lng ON locations(lat, lng)");
        echo "Indices created (if they didn't exist).\n";
        echo "VACUUM completed.\n";
        echo "---------------------------\n\n";
    }

    // LIST INDICES
    echo "--- INDICES ---\n";
    $res = $db->query("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND tbl_name IN ('daily', 'locations')");
    $hasIndices = false;
    while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
        echo "Table: " . $row['tbl_name'] . " | Index: " . $row['name'] . "\n";
        $hasIndices = true;
    }
    if (!$hasIndices) {
        echo "WARNING: No custom indices found. Performance may be slow.\n";
    }
    echo "---------------\n\n";

    // STATS
    $locCount = $db->querySingle("SELECT COUNT(*) FROM locations");
    $dailyCount = $db->querySingle("SELECT COUNT(*) FROM daily");

    echo "Stats:\n";
    echo "- Locations: " . $locCount . "\n";
    echo "- Daily Records: " . $dailyCount . "\n";

    if ($locCount > 0) {
        echo "- Avg Records per Location: " . round($dailyCount / $locCount) . "\n";
    }

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
