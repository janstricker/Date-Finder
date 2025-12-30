<?php
/**
 * Date Finder Weather API (PHP + SQLite)
 * 
 * Serves aggregated weather statistics from a local SQLite database file.
 * Usage: GET /weather.php?lat=50.12&lng=11.56&year=2025
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow CORS for dev/prod

try {
    $lat = isset($_GET['lat']) ? floatval($_GET['lat']) : null;
    $lng = isset($_GET['lng']) ? floatval($_GET['lng']) : null;
    $year = isset($_GET['year']) ? intval($_GET['year']) : null;

    if ($lat === null || $lng === null || $year === null) {
        throw new Exception("Missing lat, lng, or year parameters");
    }

    $dbPath = __DIR__ . '/weather.db';
    if (!file_exists($dbPath)) {
        throw new Exception("Database not found. Please upload weather.db");
    }

    $db = new SQLite3($dbPath);

    // 1. Find Nearest Neighbor (Euclidean Distance squared)
    // SQLite doesn't have SQRT, but minimizing (dx*dx + dy*dy) is same as minimizing SQRT(...)
    // We restrict search to a rough bounding box first for speed (± 0.2 deg ~ 20km)

    $stmt = $db->prepare('
        SELECT id, lat, lng, 
               ((lat - :lat) * (lat - :lat) + (lng - :lng) * (lng - :lng)) as dist_sq
        FROM locations 
        WHERE lat BETWEEN :lat_min AND :lat_max 
          AND lng BETWEEN :lng_min AND :lng_max
        ORDER BY dist_sq ASC 
        LIMIT 1
    ');

    $searchRadius = 0.2;
    $stmt->bindValue(':lat', $lat, SQLITE3_FLOAT);
    $stmt->bindValue(':lng', $lng, SQLITE3_FLOAT);
    $stmt->bindValue(':lat_min', $lat - $searchRadius, SQLITE3_FLOAT);
    $stmt->bindValue(':lat_max', $lat + $searchRadius, SQLITE3_FLOAT);
    $stmt->bindValue(':lng_min', $lng - $searchRadius, SQLITE3_FLOAT);
    $stmt->bindValue(':lng_max', $lng + $searchRadius, SQLITE3_FLOAT);

    $locResult = $stmt->execute();
    $location = $locResult->fetchArray(SQLITE3_ASSOC);

    if (!$location) {
        $newLocId = fetchAndStoreLocation($lat, $lng, $db);
        if ($newLocId) {
            $locId = $newLocId;
        } else {
            throw new Exception("NO_DATA_FOUND_AND_FETCH_FAILED");
        }
    } else {
        $locId = $location['id'];
    }

    // 2. Fetch History
    $histStmt = $db->prepare('SELECT * FROM daily WHERE loc_id = :loc_id ORDER BY date ASC');
    $histStmt->bindValue(':loc_id', $locId, SQLITE3_INTEGER);
    $histResult = $histStmt->execute();

    $dailyBuckets = []; // Key: "MM-DD"
    while ($row = $histResult->fetchArray(SQLITE3_ASSOC)) {
        $date = $row['date']; // YYYY-MM-DD
        $parts = explode('-', $date); // [YYYY, MM, DD]
        $key = $parts[1] . '-' . $parts[2]; // MM-DD

        if (!isset($dailyBuckets[$key])) {
            $dailyBuckets[$key] = [];
        }
        $dailyBuckets[$key][] = $row;
    }

    // 3. Aggregate Stats for Target Year
    $response = [];
    $startDate = new DateTime("$year-01-01");
    $endDate = new DateTime("$year-12-31");
    $windowSize = 2; // ±2 days

    // Helper function to calculate average
    function array_avg($arr)
    {
        return count($arr) > 0 ? array_sum($arr) / count($arr) : 0;
    }

    // Iterate every day of target year
    $currentDate = clone $startDate;
    while ($currentDate <= $endDate) {
        $targetKey = $currentDate->format('Y-m-d');

        // Collect data from window
        $windowData = [];
        for ($w = -$windowSize; $w <= $windowSize; $w++) {
            $d = clone $currentDate;
            if ($w > 0)
                $d->add(new DateInterval("P{$w}D"));
            if ($w < 0)
                $d->sub(new DateInterval("P" . abs($w) . "D"));

            $k = $d->format('m-d');
            if (isset($dailyBuckets[$k])) {
                foreach ($dailyBuckets[$k] as $item) {
                    $windowData[] = $item;
                }
            }
        }

        if (count($windowData) > 0) {
            // Group window data by YEAR to produce a clean yearly history
            // e.g. 2015 -> avg of (Dec 30,31, Jan 1,2,3)
            $yearlyStats = [];
            foreach ($windowData as $row) {
                // Extract year safely
                $y = substr($row['date'], 0, 4);
                if (!isset($yearlyStats[$y])) {
                    $yearlyStats[$y] = [
                        'count' => 0,
                        't_max' => 0,
                        't_min' => 0,
                        'precip' => 0,
                        'wind' => 0,
                        'humid' => 0,
                        't_app_max' => 0,
                        'precip_h' => 0
                    ];
                }
                $yearlyStats[$y]['count']++;
                $yearlyStats[$y]['t_max'] += $row['t_max'];
                $yearlyStats[$y]['t_min'] += $row['t_min'];
                $yearlyStats[$y]['precip'] += $row['precip'];
                $yearlyStats[$y]['wind'] += $row['wind'];
                $yearlyStats[$y]['humid'] += $row['humid'];
                $yearlyStats[$y]['t_app_max'] += $row['t_app_max'];
                $yearlyStats[$y]['precip_h'] += $row['precip_h'];
            }

            // Sort by year just in case
            ksort($yearlyStats);

            // Build History Arrays
            $hYears = [];
            $hTemps = [];
            $hTempsMin = [];
            $hRain = [];
            $hWinds = [];
            $hHumid = [];
            $hApp = [];
            $hPrecipH = [];

            foreach ($yearlyStats as $y => $agg) {
                $c = $agg['count'];
                $hYears[] = intval($y);
                $hTemps[] = $agg['t_max'] / $c;
                $hTempsMin[] = $agg['t_min'] / $c;
                $hRain[] = $agg['precip'] / $c;
                $hWinds[] = $agg['wind'] / $c;
                $hHumid[] = $agg['humid'] / $c;
                $hApp[] = $agg['t_app_max'] / $c;
                $hPrecipH[] = $agg['precip_h'] / $c;
            }

            // Overall Averages (derived from the window data, effectively same as avg of aggregated years)
            $temps = array_column($windowData, 't_max');
            $tempsMin = array_column($windowData, 't_min');
            $rains = array_column($windowData, 'precip');
            $winds = array_column($windowData, 'wind');
            $humids = array_column($windowData, 'humid');
            $appTemps = array_column($windowData, 't_app_max');
            $precipHs = array_column($windowData, 'precip_h');
            $muds = array_column($windowData, 'soil');

            $count = count($windowData); // Total raw points for stats

            // Probabilities
            $rainDays = count(array_filter($rains, function ($r) {
                return $r > 1.0;
            }));
            $heavyRainDays = count(array_filter($rains, function ($r) {
                return $r > 5.0;
            }));

            $stats = [
                'avgMaxTemp' => array_avg($temps),
                'avgMinTemp' => array_avg($tempsMin),
                'avgApparentTemp' => array_avg($appTemps),
                'avgPrecipHours' => array_avg($precipHs),
                'avgHumidity' => array_avg($humids),
                'maxWindSpeed' => array_avg($winds),
                'avgPrecipitation' => array_avg($rains),
                'rainProbability' => ($rainDays / $count) * 100,
                'heavyRainProbability' => ($heavyRainDays / $count) * 100,
                'mudIndex' => array_avg($muds),
                'history' => [
                    'years' => $hYears, // Explicit years
                    'temps' => $hTemps, // Averaged per year
                    'tempsMin' => $hTempsMin,
                    'rain' => $hRain,
                    'humidities' => $hHumid,
                    'winds' => $hWinds,
                    'apparentTemps' => $hApp,
                    'precipHours' => $hPrecipH
                ]
            ];

            $response[$targetKey] = $stats;
        }

        $currentDate->add(new DateInterval('P1D'));
    }

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

/**
 * Fetches data from Open-Meteo and stores it in SQLite.
 */
function fetchAndStoreLocation($lat, $lng, $db)
{
    $yearsBack = 10;
    $end = new DateTime();
    $end->modify('-5 days');
    $start = new DateTime();
    $start->modify("-{$yearsBack} years");

    $startStr = $start->format('Y-m-d');
    $endStr = $end->format('Y-m-d');

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

    $url = "https://archive-api.open-meteo.com/v1/archive?latitude={$lat}&longitude={$lng}&start_date={$startStr}&end_date={$endStr}&daily={$params}&timezone=auto";

    // Use file_get_contents or curl
    $json = @file_get_contents($url);
    if ($json === false) {
        return null;
    }

    $data = json_decode($json, true);
    if (!$data || !isset($data['daily'])) {
        return null;
    }

    // Insert Location
    $stmt = $db->prepare('INSERT INTO locations (lat, lng) VALUES (:lat, :lng)');
    $stmt->bindValue(':lat', $lat, SQLITE3_FLOAT);
    $stmt->bindValue(':lng', $lng, SQLITE3_FLOAT);
    $stmt->execute();

    $locId = $db->lastInsertRowID();

    // Prepare Bulk Insert
    // SQLite doesn't support massive single INSERT with thousands of values in all versions easily via binding, 
    // but binding in a loop within transaction is fast enough.

    $db->exec('BEGIN TRANSACTION');
    $stmtDaily = $db->prepare('
        INSERT OR IGNORE INTO daily 
        (loc_id, date, t_max, t_min, t_app_max, precip, precip_h, wind, humid, soil)
        VALUES (:loc_id, :date, :t_max, :t_min, :t_app_max, :precip, :precip_h, :wind, :humid, :soil)
    ');

    $daily = $data['daily'];
    $count = count($daily['time']);

    for ($i = 0; $i < $count; $i++) {
        $stmtDaily->bindValue(':loc_id', $locId, SQLITE3_INTEGER);
        $stmtDaily->bindValue(':date', $daily['time'][$i], SQLITE3_TEXT);
        $stmtDaily->bindValue(':t_max', $daily['temperature_2m_max'][$i], SQLITE3_FLOAT);
        $stmtDaily->bindValue(':t_min', $daily['temperature_2m_min'][$i], SQLITE3_FLOAT);
        $stmtDaily->bindValue(':t_app_max', $daily['apparent_temperature_max'][$i], SQLITE3_FLOAT);
        $stmtDaily->bindValue(':precip', $daily['precipitation_sum'][$i], SQLITE3_FLOAT);
        $stmtDaily->bindValue(':precip_h', $daily['precipitation_hours'][$i], SQLITE3_FLOAT);
        $stmtDaily->bindValue(':wind', $daily['wind_speed_10m_max'][$i], SQLITE3_FLOAT);
        $stmtDaily->bindValue(':humid', $daily['relative_humidity_2m_mean'][$i], SQLITE3_FLOAT);
        $stmtDaily->bindValue(':soil', $daily['soil_moisture_0_to_7cm_mean'][$i], SQLITE3_FLOAT);
        $stmtDaily->execute();
    }

    $db->exec('COMMIT');

    return $locId;
}
