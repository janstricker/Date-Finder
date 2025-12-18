import Database from 'better-sqlite3';
import { generateGermanyGrid } from '../server/src/ingest/grid'; // Reuse the grid logic
import path from 'path';
import fs from 'fs';

// Config
const YEARS_BACK = 10;
const DELAY_MS = 250; // Polite rate limit
const DB_PATH = path.join(__dirname, '../backend/weather.db');

// Ensure clean slate
if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
}

const db = new Database(DB_PATH);

// Schema
console.log('Initializing Database...');
db.exec(`
    CREATE TABLE locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lat REAL NOT NULL,
        lng REAL NOT NULL
    );
    CREATE INDEX idx_locations_lat_lng ON locations(lat, lng);

    CREATE TABLE daily (
        loc_id INTEGER,
        date TEXT, -- YYYY-MM-DD
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
    CREATE INDEX idx_daily_loc_date ON daily(loc_id, date);
`);

const insertLoc = db.prepare('INSERT INTO locations (lat, lng) VALUES (?, ?)');
const insertDaily = db.prepare(`
    INSERT INTO daily (loc_id, date, t_max, t_min, t_app_max, precip, precip_h, wind, humid, soil)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

async function fetchHistory(lat: number, lng: number) {
    const end = new Date();
    end.setDate(end.getDate() - 5);
    const start = new Date();
    start.setFullYear(start.getFullYear() - YEARS_BACK);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const params = [
        'temperature_2m_max',
        'temperature_2m_min',
        'apparent_temperature_max',
        'precipitation_sum',
        'precipitation_hours',
        'relative_humidity_2m_mean',
        'wind_speed_10m_max',
        'soil_moisture_0_to_7cm_mean'
    ].join(',');

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startStr}&end_date=${endStr}&daily=${params}&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
}

async function run() {
    const grid = generateGermanyGrid(15); // 15km for test run
    console.log(`Grid size: ${grid.length} points`);

    let count = 0;

    // Wrap in transaction for speed (though we commit per chunk to be safe? No, big transaction is faster)
    // Actually, let's transaction per location

    for (const pt of grid) {
        count++;
        process.stdout.write(`Processing ${count}/${grid.length}: ${pt.lat}, ${pt.lng} ... `);

        try {
            const data = await fetchHistory(pt.lat, pt.lng);
            if (!data || !data.daily) {
                console.log('Skipped (No data)');
                continue;
            }

            db.transaction(() => {
                const info = insertLoc.run(pt.lat, pt.lng);
                const locId = info.lastInsertRowid;

                const d = data.daily;
                for (let i = 0; i < d.time.length; i++) {
                    insertDaily.run(
                        locId,
                        d.time[i],
                        d.temperature_2m_max[i],
                        d.temperature_2m_min[i],
                        d.apparent_temperature_max[i],
                        d.precipitation_sum[i],
                        d.precipitation_hours[i],
                        d.wind_speed_10m_max[i],
                        d.relative_humidity_2m_mean[i],
                        d.soil_moisture_0_to_7cm_mean[i]
                    );
                }
            })();

            console.log('Done');
        } catch (e) {
            console.log('Error', e);
        }

        await new Promise(r => setTimeout(r, DELAY_MS));
    }
}

run();
