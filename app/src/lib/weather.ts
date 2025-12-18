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
        /** Explicit years for each data point */
        years?: number[];
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

/**
 * Fetches historical weather data from the self-hosted backend.
 * 
 * @param lat - Latitude of the location
 * @param lng - Longitude of the location
 * @param year - The target year (e.g. 2025)
 * @returns A map of "YYYY-MM-DD" -> WeatherStats
 */
export async function fetchLocationYearlyHistory(
    lat: number,
    lng: number,
    year: number,
    onProgress?: (msg: string) => void
): Promise<Record<string, WeatherStats>> {
    const start = performance.now();
    if (onProgress) onProgress('Fetching from Local Server...');

    try {
        // DEV MODE: Assume running PHP built-in server on port 8000
        // PROD MODE: This should be configurable or relative to domain
        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_BASE}/weather.php?lat=${lat}&lng=${lng}&year=${year}`);

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Server Error ${res.status}`);
        }

        const data = await res.json();
        console.log(`Backend Fetch took ${(performance.now() - start).toFixed(0)}ms`);

        return data as Record<string, WeatherStats>;
    } catch (e) {
        console.error('Backend API Failed', e);
        throw e;
    }
}
