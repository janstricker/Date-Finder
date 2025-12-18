import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { WeatherStats } from '../types'; // Definition below (inline for now)

// Replicating the Interface from frontend
interface WeatherStatsResponse {
    avgMaxTemp: number;
    avgMinTemp: number;
    avgApparentTemp: number;
    avgPrecipHours: number;
    avgHumidity: number;
    maxWindSpeed: number;
    avgPrecipitation: number;
    rainProbability: number;
    heavyRainProbability: number;
    mudIndex: number;
    history: {
        temps: number[];
        tempsMin: number[];
        rain: number[];
        humidities: number[];
        winds: number[];
        apparentTemps: number[];
        precipHours: number[];
    };
}

export async function weatherRoutes(fastify: FastifyInstance) {
    fastify.get('/', async (request, reply) => {
        const { lat, lng, year } = request.query as { lat: string, lng: string, year: string };

        if (!lat || !lng || !year) {
            return reply.status(400).send({ error: "Missing lat/lng/year" });
        }

        const targetYear = parseInt(year);
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        // 1. Find Nearest Neighbor
        // PostGIS <-> operator sorts by distance.
        const locRes = await db.query(
            `SELECT id, ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as dist 
             FROM locations 
             ORDER BY geom <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) 
             LIMIT 1`,
            [lngNum, latNum]
        );

        if (locRes.rows.length === 0) {
            return reply.status(404).send({ error: "No weather data found for this region." });
        }

        const locationId = locRes.rows[0].id;
        const distanceDeg = locRes.rows[0].dist;

        // Rough check: If nearest point is > 50km away (approx 0.5 deg), maybe warn?
        // But for now we just return it.

        // 2. Fetch History
        const weatherRes = await db.query(
            `SELECT * FROM daily_weather WHERE location_id = $1 ORDER BY date ASC`,
            [locationId]
        );
        const rawRows = weatherRes.rows;

        // 3. Process Data (Aggregation Logic)
        // Groups rows by "MM-DD"
        const dailyBuckets: Record<string, any[]> = {};

        rawRows.forEach(row => {
            const d = new Date(row.date);
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const key = `${m}-${day}`;

            if (!dailyBuckets[key]) dailyBuckets[key] = [];
            dailyBuckets[key].push(row);
        });

        // Result Map
        const responseMap: Record<string, WeatherStatsResponse> = {};

        // Iterate through the TARGET year (e.g. 2025)
        const startDate = new Date(targetYear, 0, 1);
        const endDate = new Date(targetYear, 11, 31);
        const windowSize = 2; // ±2 days smoothing

        // Helper: Get data from bucket for a specific date key (MM-DD)
        const getItemsInWindow = (centerDate: Date) => {
            const items: any[] = [];
            for (let w = -windowSize; w <= windowSize; w++) {
                const searchDate = new Date(centerDate);
                searchDate.setDate(searchDate.getDate() + w);

                const m = String(searchDate.getMonth() + 1).padStart(2, '0');
                const d = String(searchDate.getDate()).padStart(2, '0');
                const k = `${m}-${d}`;

                if (dailyBuckets[k]) {
                    items.push(...dailyBuckets[k]);
                }
            }
            return items;
        };

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const targetKey = d.toISOString().split('T')[0];
            const windowData = getItemsInWindow(d);

            if (windowData.length === 0) continue;

            const count = windowData.length;

            // Arrays for history
            const temps = windowData.map(r => r.temp_max).filter(x => x !== null);
            const tempsMin = windowData.map(r => r.temp_min).filter(x => x !== null);
            const rains = windowData.map(r => r.precipitation_sum).filter(x => x !== null);
            const winds = windowData.map(r => r.wind_speed_max).filter(x => x !== null);
            const humids = windowData.map(r => r.humidity_mean).filter(x => x !== null);
            const apparents = windowData.map(r => r.temp_apparent_max).filter(x => x !== null);
            const precipHs = windowData.map(r => r.precipitation_hours).filter(x => x !== null);
            const muds = windowData.map(r => r.soil_moisture_mean).filter(x => x !== null);

            // Averages
            const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

            const stats: WeatherStatsResponse = {
                avgMaxTemp: avg(temps),
                avgMinTemp: avg(tempsMin),
                avgApparentTemp: avg(apparents),
                avgPrecipHours: avg(precipHs),
                avgHumidity: avg(humids),
                maxWindSpeed: avg(winds),
                avgPrecipitation: avg(rains),
                rainProbability: (rains.filter(r => r > 1.0).length / rains.length) * 100,
                heavyRainProbability: (rains.filter(r => r > 5.0).length / rains.length) * 100,
                mudIndex: avg(muds), // Simply avg of soil moisture for now
                history: {
                    temps,
                    tempsMin,
                    rain: rains,
                    humidities: humids,
                    winds,
                    apparentTemps: apparents,
                    precipHours: precipHs
                }
            };

            responseMap[targetKey] = stats;
        }

        return responseMap;
    });
}
