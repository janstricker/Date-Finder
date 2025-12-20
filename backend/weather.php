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
        // --- HYBRID MODE: LAZY FETCH ---
        // If not in DB, fetch from Open-Meteo, Cache it, and Use it.

        // 1. Fetch from API
        $yearsBack = 10;
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

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        $json = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$json) {
            throw new Exception("Live Fetch Failed: HTTP $httpCode");
        }

        $data = json_decode($json, true);
        if (!isset($data['daily'])) {
            throw new Exception("Live Fetch: No Data");
        }

        // 2. Cache to DB
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

        // 3. Continue with this new Location ID
    } else {
        $locId = $location['id'];
    }

    // 2. Fetch History (Standard Path)
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
