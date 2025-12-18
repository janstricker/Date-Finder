/**
 * @file weather.ts
 * @description This module handles interactions with the OpenMeteo Archive API to fetch and process 
 * historical weather data. It calculates probabilistic weather metrics (Runability Score inputs)
 * for a specific location and month, aggregating data from the past 10 years.
 */

import { isConsentGiven } from './consent';


/**
 * Represents the aggregated weather statistics for a specific calendar day
 * based on historical data.
 */
export interface WeatherStats {
    /** Average maximum daily temperature (°C) */
    avgMaxTemp: number;
    /** Average minimum daily temperature (°C) */
    avgMinTemp: number;
    /** Average relative humidity (%) */
    avgHumidity: number;
    /** Average of the maximum daily wind speeds (km/h) */
    maxWindSpeed: number;
    /** Average daily precipitation sum (mm) */
    avgPrecipitation: number;
    /** Average daily precipitation hours (h) */
    avgPrecipHours: number;
    /** Probability of experiencing >1mm of rain (%) */
    rainProbability: number; // % chance of >1mm rain
    /** Probability of experiencing >5mm of rain (%) */
    heavyRainProbability: number; // % chance of >5mm rain
    /** 
     * Computed "Mud Index" based on trailing 3-day rainfall averages.
     * Higher values indicate potentially muddy ground conditions.
     */
    mudIndex: number; // Avg 3-day trailing rainfall
    /** Average Apparent ("Feels Like") Max Temperature (°C) */
    avgApparentTemp: number;
    /** Raw historical data points used for these averages (aggregates from last 10 years) */
    history: {
        /** Daily max temperatures for each of the last 10 years */
        temps: number[];
        /** Daily min temperatures for each of the last 10 years */
        tempsMin: number[];
        /** Daily precipitation sums for each of the last 10 years */
        rain: number[];
        /** Daily mean humidities for each of the last 10 years */
        humidities: number[];
        /** Daily max wind speeds for each of the last 10 years */
        winds: number[];
        /** Daily apparent max temperatures */
        apparentTemps: number[];
        /** Daily precipitation hours */
        precipHours: number[];
    };
}



/**
 * Fetches historical weather data for the ENTIRE year to enable instant navigation
 * between months and full-year analysis.
 * 
 * Uses OpenMeteo Historical Weather API.
 * 
 * @param lat - Latitude of the location
 * @param lng - Longitude of the location
 * @param year - The target year for the generated keys (e.g. 2025)
 * @param onProgress - Optional callback for progress updates (e.g. "Fetching 2018...")
 * @returns A map of "YYYY-MM-DD" -> WeatherStats for all 365 days
 */
// ... keep existing fetchLocationYearlyHistory ...

/**
 * Fetches historical weather for multiple points and averages them.
 * Used for Route-based analysis.
 */
export async function fetchRouteYearlyHistory(
    points: { lat: number, lng: number }[],
    year: number,
    onProgress?: (msg: string) => void
): Promise<Record<string, WeatherStats>> {
    if (!isConsentGiven()) throw new Error('GDPR_CONSENT_REQUIRED');

    // 1. Fetch data for ALL points
    const allStats: Record<string, WeatherStats>[] = [];

    // Process sequentially to be kind to API rate limits, 
    // or arguably parallel with small delay. 
    // Open-Meteo allows concurrent, but let's be safe with strict sequential for now.

    for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        if (onProgress) onProgress(`Fetching point ${i + 1}/${points.length} for ${year}...`);

        // Reuse the single location fetcher
        // Note: caching logic inside fetchLocationYearlyHistory will handle caching per point!
        const stats = await fetchLocationYearlyHistory(pt.lat, pt.lng, year);
        allStats.push(stats);
    }

    // 2. Aggregate / Average
    const averaged: Record<string, WeatherStats> = {};
    // We assume all points return same keys (YYYY-MM-DD) for the requested year.

    // Iterate every day in the first result set
    Object.keys(allStats[0]).forEach(dateKey => {
        // Sum accumulators
        let sumMaxTemp = 0;
        let sumMinTemp = 0;
        let sumHumidity = 0;
        let sumMaxWind = 0;
        let sumPrecip = 0;
        let sumPrecipHours = 0;
        let sumRainProb = 0;
        let sumHeavyRainProb = 0;
        let sumMud = 0;
        let sumApparent = 0;
        let count = allStats.length;

        // History aggregation
        const histTemps: number[] = new Array(allStats[0][dateKey].history.temps.length).fill(0);
        const histTempsMin: number[] = new Array(allStats[0][dateKey].history.tempsMin.length).fill(0);
        const histRain: number[] = new Array(allStats[0][dateKey].history.rain.length).fill(0);
        const histHumid: number[] = new Array(allStats[0][dateKey].history.humidities.length).fill(0);
        const histWinds: number[] = new Array(allStats[0][dateKey].history.winds.length).fill(0);
        const histApparent: number[] = new Array(allStats[0][dateKey].history.apparentTemps ? allStats[0][dateKey].history.apparentTemps.length : 0).fill(0);
        const histPrecipHours: number[] = new Array(allStats[0][dateKey].history.precipHours ? allStats[0][dateKey].history.precipHours.length : 0).fill(0);

        allStats.forEach(statMap => {
            const day = statMap[dateKey];
            if (!day) return; // Should not happen

            sumMaxTemp += day.avgMaxTemp;
            sumMinTemp += day.avgMinTemp;
            sumHumidity += day.avgHumidity;
            sumMaxWind += day.maxWindSpeed;
            sumPrecip += day.avgPrecipitation;
            sumRainProb += day.rainProbability;
            sumHeavyRainProb += day.heavyRainProbability;
            sumMud += day.mudIndex;

            // New fields (safeguard against partial types if any)
            const dAny = day as any;
            const dApparent = dAny.avgApparentTemp !== undefined ? dAny.avgApparentTemp : day.avgMaxTemp;
            const dPrecipH = dAny.avgPrecipHours !== undefined ? dAny.avgPrecipHours : 0;

            sumApparent += dApparent;
            sumPrecipHours += dPrecipH;

            // History Summation
            day.history.temps.forEach((v, k) => histTemps[k] += v);
            day.history.tempsMin.forEach((v, k) => histTempsMin[k] += v);
            day.history.rain.forEach((v, k) => histRain[k] += v);
            day.history.humidities.forEach((v, k) => histHumid[k] += v);
            day.history.winds.forEach((v, k) => histWinds[k] += v);
            if (day.history.apparentTemps) day.history.apparentTemps.forEach((v, k) => histApparent[k] += v);
            if (day.history.precipHours) day.history.precipHours.forEach((v, k) => histPrecipHours[k] += v);
        });

        averaged[dateKey] = {
            avgMaxTemp: sumMaxTemp / count,
            avgMinTemp: sumMinTemp / count,
            avgHumidity: sumHumidity / count,
            maxWindSpeed: sumMaxWind / count, // Average representation of windiness across route
            avgPrecipitation: sumPrecip / count,
            avgPrecipHours: sumPrecipHours / count,
            avgApparentTemp: sumApparent / count,
            rainProbability: sumRainProb / count, // Avg risk
            heavyRainProbability: sumHeavyRainProb / count,
            mudIndex: sumMud / count,
            history: {
                temps: histTemps.map(v => v / count),
                tempsMin: histTempsMin.map(v => v / count),
                rain: histRain.map(v => v / count),
                humidities: histHumid.map(v => v / count),
                winds: histWinds.map(v => v / count),
                apparentTemps: histApparent.map(v => v / count),
                precipHours: histPrecipHours.map(v => v / count)
            }
        };
    });

    return averaged;
}

export async function fetchLocationYearlyHistory(
    lat: number,
    lng: number,
    year: number,
    onProgress?: (msg: string) => void
): Promise<Record<string, WeatherStats>> {
    if (!isConsentGiven()) throw new Error('GDPR_CONSENT_REQUIRED');

    // Cache Key: e.g. "weather_v6_50.1234_11.5678_2025"
    // Using 4 decimal places gives precision of ~11m, sufficient for weather grid
    const cacheKey = `weather_v6_${lat.toFixed(4)}_${lng.toFixed(4)}_${year}`;

    // 1. Try LocalStorage Cache
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            console.log('Weather Cache Hit:', cacheKey);
            return JSON.parse(cached);
        }
    } catch (e) {
        console.warn('Failed to read from localStorage', e);
    }

    const currentYear = year; // Base year (e.g. 2026)

    // We collect data for every possible day of the year (1-366 to cover leap years)
    // Key: "MM-DD" string (e.g. "01-01")
    const dailyStats: Record<string, {
        tempsMax: number[],
        tempsMin: number[],
        humidities: number[],
        winds: number[],
        rains: number[],
        trailingRains: number[], // We keep naming it 'trailingRains' for compatibility/laziness in struct but it stores mudIndex
        apparentTemps: number[],
        precipHours: number[]
    }> = {};

    // Helper to generate MM-DD keys
    const getDayKey = (date: Date) => {
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${m}-${d}`;
    };

    const getFullDateKey = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // Initialize dailyStats for all days in a leap year (just to be safe)
    // We iterate 2024 (a leap year) to get all 366 buckets
    const tempDate = new Date(2024, 0, 1);
    while (tempDate.getFullYear() === 2024) {
        dailyStats[getDayKey(tempDate)] = { tempsMax: [], tempsMin: [], humidities: [], winds: [], rains: [], trailingRains: [], apparentTemps: [], precipHours: [] };
        tempDate.setDate(tempDate.getDate() + 1);
    }

    // Config
    const leadDays = 5; // Buffer for Mud Index
    const windowSize = 2; // ±2 days smoothing

    // Fetch oldest to newest for chronological order (Limit 10 years back)
    for (let i = 10; i >= 1; i--) {
        const pastYear = currentYear - i;

        if (onProgress) onProgress(String(pastYear));

        // Construct start date: Jan 1 minus leadDays
        const startDate = new Date(pastYear, 0, 1 - leadDays);
        const startStr = getFullDateKey(startDate);

        // Open-Meteo Archive data is only reliable up to ~5 days ago.
        const currentRealYear = new Date().getFullYear();
        if (pastYear > currentRealYear) {
            continue; // Future years obviously explicitly skipped (though loop logic prevents this usually)
        }

        // Determine request End Date
        let endDate = new Date(pastYear, 11, 31);

        // If we are fetching the current year, we must cap the end date to avoid "future" errors
        if (pastYear === currentRealYear) {
            const safeEndDate = new Date();
            safeEndDate.setDate(safeEndDate.getDate() - 5); // 5 day lag buffer

            // If the year hasn't even started or is just starting (e.g. Jan 2), this might result in startDate > safeEndDate
            // In that case, we skip.
            if (startDate > safeEndDate) continue;

            if (safeEndDate < endDate) {
                endDate = safeEndDate;
            }
        }

        const endStr = getFullDateKey(endDate);
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_hours,relative_humidity_2m_mean,wind_speed_10m_max,soil_moisture_0_to_7cm_mean&timezone=auto`;

        // Sequential Fetch to respect API rate limits (avoid 429)
        const res = await fetch(url).then(async r => {
            if (r.status === 429) {
                console.warn('Rate limited, skipping year', pastYear);
                throw new Error('API Rate Limit Exceeded (429)');
            }
            if (!r.ok) {
                const text = await r.text();
                console.error(`API Error ${r.status} for year ${pastYear}:`, text);
                throw new Error(`API Error ${r.status}`);
            }
            return r.json();
        }).catch(err => {
            console.error('Failed to fetch weather year', pastYear, err);
            // Critical: Propagate Rate Limit errors so UI can show specific warning
            if (err.message && err.message.includes('Rate Limit')) {
                throw err;
            }
            return null;
        });

        if (res && res.daily) {
            const daily = res.daily;

            // Map the API response to our daily buckets
            // We need to align the API data (which starts at Jan 1 - leadDays) 
            // with the actual calendar days of that year.

            // Start iterating from the first ACTUAL day of the year (index = leadDays)
            // The API response has [leadDays] worth of data before Jan 1.

            const daysInPastYear = (new Date(pastYear, 11, 31).getTime() - new Date(pastYear, 0, 1).getTime()) / 86400000 + 1;

            for (let d = 0; d < daysInPastYear; d++) {
                // Actual Date we are processing
                const date = new Date(pastYear, 0, 1 + d); // Jan 1 + d days
                const key = getDayKey(date);

                // If key exists in our buckets (it should, unless pastYear is leap and buckets aren't?)
                // We initialized buckets with a leap year, so all valid MM-DD exist.
                if (!dailyStats[key]) continue;

                // Index in API response array
                const centerIdx = leadDays + d;

                // --- Smoothing Logic (Same as before) ---
                const getWindowAvg = (arr: number[]) => {
                    let sum = 0;
                    let count = 0;
                    let max = -Infinity;

                    for (let w = -windowSize; w <= windowSize; w++) {
                        const idx = centerIdx + w;
                        if (idx >= 0 && idx < arr.length && arr[idx] !== null && arr[idx] !== undefined) {
                            sum += arr[idx];
                            count++;
                            if (arr[idx] > max) max = arr[idx];
                        }
                    }
                    return count > 0 ? sum / count : null;
                };

                const tempMax = getWindowAvg(daily.temperature_2m_max);
                const tempMin = getWindowAvg(daily.temperature_2m_min);
                // New logic: Apparent Temp
                const apparentTemp = getWindowAvg(daily.apparent_temperature_max);
                const precipH = getWindowAvg(daily.precipitation_hours);

                const humidity = getWindowAvg(daily.relative_humidity_2m_mean);
                const wind = getWindowAvg(daily.wind_speed_10m_max);
                const rain = getWindowAvg(daily.precipitation_sum);

                // --- Mud Index: Use Real API Soil Moisture ---
                // Field: soil_moisture_0_to_7cm_mean (m³/m³)
                const mudValue = getWindowAvg(daily.soil_moisture_0_to_7cm_mean || []);

                // Push to aggregators
                if (tempMax !== null) dailyStats[key].tempsMax.push(tempMax);
                if (tempMin !== null) dailyStats[key].tempsMin.push(tempMin);
                if (apparentTemp !== null) dailyStats[key].apparentTemps.push(apparentTemp);
                if (precipH !== null) dailyStats[key].precipHours.push(precipH);
                if (humidity !== null) dailyStats[key].humidities.push(humidity);
                if (wind !== null) dailyStats[key].winds.push(wind);
                if (rain !== null) dailyStats[key].rains.push(rain);
                if (mudValue !== null) dailyStats[key].trailingRains.push(mudValue);

            }
        }

        // Polite delay
        await new Promise(r => setTimeout(r, 400));
    }

    // --- Final Aggregation ---
    try {
        const weatherMap: Record<string, WeatherStats> = {};

        // Iterate all days of the TARGET year (currentYear)
        // to construct the final map with YYYY-MM-DD keys
        const targetStart = new Date(currentYear, 0, 1);
        const targetEnd = new Date(currentYear, 11, 31);

        for (let d = new Date(targetStart); d <= targetEnd; d.setDate(d.getDate() + 1)) {
            const key = getDayKey(d);
            const stats = dailyStats[key];

            if (!stats || stats.tempsMax.length === 0) continue;

            const count = stats.tempsMax.length;
            const targetDateKey = getFullDateKey(d);

            // Averages
            const avgMaxTemp = stats.tempsMax.reduce((a, b) => a + b, 0) / count;
            const avgMinTemp = stats.tempsMin.length > 0 ? stats.tempsMin.reduce((a, b) => a + b, 0) / stats.tempsMin.length : avgMaxTemp - 10;
            const avgApparent = stats.apparentTemps.length > 0 ? stats.apparentTemps.reduce((a, b) => a + b, 0) / stats.apparentTemps.length : avgMaxTemp;
            const avgPrecipH = stats.precipHours.length > 0 ? stats.precipHours.reduce((a, b) => a + b, 0) / stats.precipHours.length : 0;
            const avgHumidity = stats.humidities.length > 0 ? stats.humidities.reduce((a, b) => a + b, 0) / stats.humidities.length : 50;
            const avgMaxWind = stats.winds.length > 0 ? stats.winds.reduce((a, b) => a + b, 0) / stats.winds.length : 0;
            const avgRain = stats.rains.reduce((a, b) => a + b, 0) / count;
            const avgMud = stats.trailingRains.reduce((a, b) => a + b, 0) / count;

            // Probabilities
            const rainDays = stats.rains.filter(r => r > 1.0).length;
            const heavyRainDays = stats.rains.filter(r => r > 5.0).length;

            weatherMap[targetDateKey] = {
                avgMaxTemp,
                avgMinTemp,
                avgApparentTemp: avgApparent,
                avgPrecipHours: avgPrecipH,
                avgHumidity,
                maxWindSpeed: avgMaxWind,
                avgPrecipitation: avgRain,
                rainProbability: (rainDays / count) * 100,
                heavyRainProbability: (heavyRainDays / count) * 100,
                mudIndex: avgMud,
                history: {
                    temps: stats.tempsMax,
                    tempsMin: stats.tempsMin,
                    rain: stats.rains,
                    humidities: stats.humidities,
                    winds: stats.winds,
                    apparentTemps: stats.apparentTemps,
                    precipHours: stats.precipHours
                }
            };
        }

        // 2. Save to Cache
        try {
            localStorage.setItem(cacheKey, JSON.stringify(weatherMap));
        } catch (e) {
            console.warn('Failed to save weather to localStorage (Quota?)', e);
        }

        return weatherMap;

    } catch (e) {
        console.error("Bulk weather fetch failed", e);
        // Rethrow so useAnalysis can handle it
        throw e;
    }
}
