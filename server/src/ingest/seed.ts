import { db, initDB } from '../db';
import { generateGermanyGrid } from './grid';
import dotenv from 'dotenv';
dotenv.config();

// Configuration
const YEARS_BACK = 10;
const RESOLUTION_KM = 15; // Coarser for testing/beta. 10km is production.
const DELAY_MS = 300; // Rate limit respect (Open-Meteo polite limit)

async function fetchHistoryForLocation(lat: number, lng: number) {
    const end = new Date();
    end.setDate(end.getDate() - 5); // 5 days delay
    const start = new Date();
    start.setFullYear(start.getFullYear() - YEARS_BACK);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    // Params match the fields we need in schema
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

    try {
        const res = await fetch(url);
        if (res.status === 429) throw new Error('RATE_LIMIT');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (e) {
        console.error(`Fetch failed for ${lat},${lng}`, e);
        return null;
    }
}

async function seed() {
    await initDB();

    console.log('Generating grid...');
    const grid = generateGermanyGrid(RESOLUTION_KM);
    console.log(`Grid contains ${grid.length} points.`);

    for (const [i, pt] of grid.entries()) {
        const { lat, lng } = pt;

        // 1. Check if location exists (by proximity)
        // using PostGIS <-> operator to find any point within ~100m
        const existsRes = await db.query(
            `SELECT id FROM locations WHERE geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) < 0.001 LIMIT 1`,
            [lng, lat]
        );

        if (existsRes.rows.length > 0) {
            console.log(`Skipping existing point ${i}/${grid.length}: ${lat}, ${lng}`);
            continue;
        }

        // 2. Fetch Data
        console.log(`Fetching ${i}/${grid.length}: ${lat}, ${lng}...`);
        const data = await fetchHistoryForLocation(lat, lng);

        if (!data || !data.daily) {
            console.warn('No data returned, skipping.');
            continue;
        }

        // 3. Insert Location
        const locRes = await db.query(
            `INSERT INTO locations (geom) VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326)) RETURNING id`,
            [lng, lat]
        );
        const locId = locRes.rows[0].id;

        // 4. Batch Insert Daily Data
        // Constructing a massive VALUES string is faster than 3650 inserts
        const daily = data.daily;
        const rows: any[] = [];
        const len = daily.time.length;

        for (let j = 0; j < len; j++) {
            rows.push(`(
                ${locId}, 
                '${daily.time[j]}', 
                ${daily.temperature_2m_max[j] || 'NULL'}, 
                ${daily.temperature_2m_min[j] || 'NULL'}, 
                ${daily.apparent_temperature_max[j] || 'NULL'}, 
                ${daily.precipitation_sum[j] || 0}, 
                ${daily.precipitation_hours[j] || 0}, 
                ${daily.wind_speed_10m_max[j] || 0}, 
                ${daily.relative_humidity_2m_mean[j] || 0}, 
                ${daily.soil_moisture_0_to_7cm_mean[j] || 0}
            )`);
        }

        if (rows.length > 0) {
            await db.query(`
                INSERT INTO daily_weather 
                (location_id, date, temp_max, temp_min, temp_apparent_max, precipitation_sum, precipitation_hours, wind_speed_max, humidity_mean, soil_moisture_mean)
                VALUES ${rows.join(',')}
                ON CONFLICT (location_id, date) DO NOTHING
            `);
        }

        // Polite Rate Limit
        await new Promise(r => setTimeout(r, DELAY_MS));
    }

    console.log('Seeding Complete!');
    process.exit(0);
}

seed();
