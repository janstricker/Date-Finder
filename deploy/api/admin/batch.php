<?php
/**
 * Worker Script for Incremental DB Generation
 * 
 * Called by admin/index.html via AJAX.
 * Params: offset=0, limit=5
 */

header('Content-Type: application/json');
set_time_limit(120); // 2 mins max per batch

// --- CONFIGURATION ---
// Bounding Box: Bavaria (Generous)
// --- CONFIGURATION ---
// Region 1: Fichtelgebirge (Default - Small, fast test)
// $bounds = ['N' => 50.2, 'S' => 49.9, 'W' => 11.7, 'E' => 12.3];

// Region 2: All of Germany (Uncomment to use - Takes ~2-3 hours)
$bounds = ['N' => 55.1, 'S' => 47.2, 'W' => 5.8, 'E' => 15.1];

$kmResolution = 10;
$yearsBack = 10;
$dbPath = __DIR__ . '/../weather.db';
// ---------------------

try {
    $db = new SQLite3($dbPath);

    // Init Schema if first run
    $db->exec("
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            UNIQUE(lat, lng)
        );
        CREATE INDEX IF NOT EXISTS idx_locations_lat_lng ON locations(lat, lng);

        CREATE TABLE IF NOT EXISTS daily (
            loc_id INTEGER,
            date TEXT,
            t_max REAL,
            t_min REAL,
            t_app_max REAL,
            precip REAL,
            precip_h REAL,
            wind REAL,
            humid REAL,
            soil REAL,
            FOREIGN KEY(loc_id) REFERENCES locations(id)
        );
        CREATE INDEX IF NOT EXISTS idx_daily_loc_date ON daily(loc_id, date);
    ");

    // 1. Generate Virtual Grid in Memory (Deterministic)
    // We do this every time to know "what depends on offset"
    // Ideally we'd persist the grid, but calcing it is fast.

    $points = [];
    $latStep = $kmResolution / 111;

    for ($lat = $bounds['S']; $lat <= $bounds['N']; $lat += $latStep) {
        $lngStep = $kmResolution / (111 * cos(deg2rad($lat)));
        for ($lng = $bounds['W']; $lng <= $bounds['E']; $lng += $lngStep) {
            $points[] = ['lat' => round($lat, 4), 'lng' => round($lng, 4)];
        }
    }

    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 5;

    if ($offset >= count($points)) {
        echo json_encode(['status' => 'done', 'logs' => ["All " . count($points) . " points processed."]]);
        exit;
    }

    $batch = array_slice($points, $offset, $limit);
    $logs = [];
    $processed = 0;

    foreach ($batch as $pt) {
        $lat = $pt['lat'];
        $lng = $pt['lng'];

        // Check exist
        $stmt = $db->prepare("SELECT id FROM locations WHERE lat = :lat AND lng = :lng");
        $stmt->bindValue(':lat', $lat);
        $stmt->bindValue(':lng', $lng);
        $res = $stmt->execute();

        if ($res->fetchArray()) {
            $logs[] = "Skipping existing: $lat, $lng";
            $processed++;
            continue;
        }

        // Fetch
        $endStr = date('Y-m-d', strtotime('-5 days'));
        $startStr = date('Y-m-d', strtotime("-$yearsBack years"));

        $params = implode(',', [
            'temperature_2m_max',
            'temperature_2m_min',
            'apparent_temperature_max',
            'precipitation_sum',
            'precipitation_hours',
            'relative_humidity_2m_mean',
            'wind_speed_10m_max',
            'soil_moisture_0_to_7cm_mean'
        ]);

        $url = "https://archive-api.open-meteo.com/v1/archive?latitude=$lat&longitude=$lng&start_date=$startStr&end_date=$endStr&daily=$params&timezone=auto";

        // Simple CURL
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $json = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 429) {
            $logs[] = "⚠️ Rate Limited on $lat, $lng. Retrying next batch.";
            break; // Stop batch
        }

        if ($httpCode !== 200 || !$json) {
            $logs[] = "❌ API Error $httpCode for $lat, $lng";
            continue;
        }

        $data = json_decode($json, true);
        if (!isset($data['daily'])) {
            $logs[] = "❌ No Data for $lat, $lng";
            continue;
        }

        // Insert
        // Transaction manually for speed if batched, but here per point is fine
        $db->exec('BEGIN');

        $stmt = $db->prepare("INSERT INTO locations (lat, lng) VALUES (:lat, :lng)");
        $stmt->bindValue(':lat', $lat);
        $stmt->bindValue(':lng', $lng);
        $stmt->execute();
        $locId = $db->lastInsertRowID();

        $d = $data['daily'];
        $count = count($d['time']);

        $stmt = $db->prepare("
            INSERT INTO daily (loc_id, date, t_max, t_min, t_app_max, precip, precip_h, wind, humid, soil)
            VALUES (:id, :date, :tmax, :tmin, :tapp, :precip, :ph, :wind, :hum, :soil)
        ");

        for ($i = 0; $i < $count; $i++) {
            $stmt->bindValue(':id', $locId);
            $stmt->bindValue(':date', $d['time'][$i]);
            $stmt->bindValue(':tmax', $d['temperature_2m_max'][$i]);
            $stmt->bindValue(':tmin', $d['temperature_2m_min'][$i]);
            $stmt->bindValue(':tapp', $d['apparent_temperature_max'][$i]);
            $stmt->bindValue(':precip', $d['precipitation_sum'][$i]);
            $stmt->bindValue(':ph', $d['precipitation_hours'][$i]);
            $stmt->bindValue(':wind', $d['wind_speed_10m_max'][$i]);
            $stmt->bindValue(':hum', $d['relative_humidity_2m_mean'][$i]);
            $stmt->bindValue(':soil', $d['soil_moisture_0_to_7cm_mean'][$i]);
            $stmt->execute();
        }

        $db->exec('COMMIT');
        $logs[] = "✅ Processed $lat, $lng ($count days)";
        $processed++;

        // Small pause to be nice to API
        usleep(300000); // 300ms
    }

    echo json_encode([
        'status' => 'ok',
        'processed' => $processed,
        'total' => count($points),
        'logs' => $logs
    ]);

} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
