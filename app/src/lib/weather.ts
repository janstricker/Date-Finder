/**
 * @file weather.ts
 * @description This module handles interactions with the OpenMeteo Archive API to fetch and process 
 * historical weather data. It calculates probabilistic weather metrics (Runability Score inputs)
 * for a specific location and month, aggregating data from the past 10 years.
 */


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
    /** Probability of experiencing >1mm of rain (%) */
    rainProbability: number; // % chance of >1mm rain
    /** Probability of experiencing >5mm of rain (%) */
    heavyRainProbability: number; // % chance of >5mm rain
    /** 
     * Computed "Mud Index" based on trailing 3-day rainfall averages.
     * Higher values indicate potentially muddy ground conditions.
     */
    mudIndex: number; // Avg 3-day trailing rainfall
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
    };
}



/**
 * Fetches historical weather data for a specific month across the last 10 years
 * to construct a statistical forecast for that month in the target year.
 * 
 * Uses OpenMeteo Historical Weather API.
 * 
 * @param lat - Latitude of the location
 * @param lng - Longitude of the location
 * @param month - 0-indexed month (0 = January, 11 = December)
 * @param year - The target year for the generated keys (e.g. 2025)
 * @returns A map of "YYYY-MM-DD" -> WeatherStats
 */
export async function fetchMonthHistory(lat: number, lng: number, month: number, year: number): Promise<Record<string, WeatherStats>> {
    const currentYear = year; // Base year for the 10-year lookback (e.g. look back from 2025).

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // We fetch a buffer before the month starts to calculate trailing rain (Mud Index)
    // Month is 0-indexed.
    // Let's go back 5 days from the 1st of the month.
    // We only need 3 days for the Mud Index, but 5 provides a safe buffer against index errors.
    const leadDays = 5;
    // Buffer after the month for rolling window (±2 days)
    const trailDays = 2;

    // Storage for daily aggregation
    // Key: Day of Month (1-31)
    // We collect data for each day of the month across all 10 years.
    const dailyStats: Record<number, {
        tempsMax: number[],
        tempsMin: number[],
        humidities: number[],
        winds: number[],
        rains: number[],
        trailingRains: number[]
    }> = {};
    // Initialize dailyStats for all days of the month
    for (let d = 1; d <= daysInMonth; d++) {
        dailyStats[d] = { tempsMax: [], tempsMin: [], humidities: [], winds: [], rains: [], trailingRains: [] };
    }

    // Fetch oldest to newest for chronological order (Limit 10 years back)
    for (let i = 10; i >= 1; i--) {
        const pastYear = currentYear - i;

        // Construct start date: 1st of month minus leadDays
        const startDate = new Date(pastYear, month, 1 - leadDays);
        const startStr = startDate.toISOString().split('T')[0];

        // Construct end date: last day of month plus trailDays
        const endDate = new Date(pastYear, month, daysInMonth + trailDays);
        const endStr = endDate.toISOString().split('T')[0];

        // API Request: fetch daily metrics. 
        // Parameters:
        // - temperature_2m_max/min: Daily extremes at 2m height (standard runner perception).
        // - precipitation_sum: Total rain/snow in mm.
        // - relative_humidity_2m_mean: Daily average humidity (critical for heat index).
        // - wind_speed_10m_max: Maximum gust/sustained wind (10m height) - key for "runability" impact (Gusts).
        // - timezone=auto: Essential to align "daily" breaks with the local day of the event location.
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max&timezone=auto`;

        // Sequential Fetch to respect API rate limits (avoid 429)
        const res = await fetch(url).then(async r => {
            if (r.status === 429) {
                console.warn('Rate limited, skipping year', pastYear);
                return null;
            }
            return r.json();
        }).catch(err => {
            console.error('Failed to fetch weather year', pastYear, err);
            return null;
        });

        if (res) {
            // Process response
            const daily = res.daily;
            // daily.time array matches daily.temperature_2m_max etc.

            // We iterate strictly through the days of the target month (1..daysInMonth)
            // But we access the data relative to the fetched start date.

            const windowSize = 2; // ±2 days

            for (let d = 1; d <= daysInMonth; d++) {
                // The index in the API response for day 'd' of the month (center of window).
                const centerIdx = leadDays + (d - 1);

                // Helper to get average over ±windowSize
                const getWindowAvg = (arr: number[]) => {
                    let sum = 0;
                    let count = 0;
                    let max = -Infinity; // For wind, we might want max? User said "Rolling Window... to smooth". Avg is safer for noise.
                    // For wind gusts: if we want "risk", maybe max is better? 
                    // But user complained about "noise" from one extreme day. Averaging smoothes that.
                    // "Average of the maximum daily wind speeds" is the metric.
                    // So we average the daily maxes.

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

                // For wind, usually we want to know the *potential* for wind. 
                // Averaging gusts reduces the peak. 
                // However, "Avg Max Wind" (current UI) implies average.
                // If I average 100, 20, 20, 20, 20 -> 36. This is a "smoother" representation of that week's windiness.

                const tempMax = getWindowAvg(daily.temperature_2m_max);
                const tempMin = getWindowAvg(daily.temperature_2m_min);
                const humidity = getWindowAvg(daily.relative_humidity_2m_mean);
                const wind = getWindowAvg(daily.wind_speed_10m_max);
                const rain = getWindowAvg(daily.precipitation_sum);

                // Trailing rain (Mud Index) - Keep logic on the CENTER day to respect causality?
                // Or smooth it? 
                // Mud index is "3 day trailing sum". 
                // If we smooth the input days, we implicitly smooth mud.
                // Let's calculate Mud Index for the *center* day strictly, as that's the physical state on the race day.
                // UNLESS the user wants "Risk of mud".
                // Let's stick to Center Day logic for Mud Index to keep it physically grounded to the "target date", 
                // but since we average everything else, maybe average mud index too?
                // Let's stick to center day for Mud to be precise on "what if the race is today".
                // Actually, if we smooth rain, we should probably smooth the mud index too so they correlate.
                // Let's calculate trailing rain for each day in window and average?
                // No, simple is best. Calculate trailing rain for center day.
                const getTrailingRain = (idx: number, arr: number[]) => {
                    let sum = 0;
                    for (let k = 1; k <= 3; k++) {
                        sum += (arr[idx - k] || 0);
                    }
                    return sum / 3;
                };
                // We'll use a smoothed trailing rain? 
                // Let's just average the trailing rain stat over the window too.
                let trailingSum = 0;
                let trailingCount = 0;
                for (let w = -windowSize; w <= windowSize; w++) {
                    const idx = centerIdx + w;
                    // Calculate trailing rain for this specific day in the window
                    const tVal = getTrailingRain(idx, daily.precipitation_sum);
                    trailingSum += tVal;
                    trailingCount++;
                }
                const trailing = trailingCount > 0 ? trailingSum / trailingCount : 0;


                if (tempMax !== null) dailyStats[d].tempsMax.push(tempMax);
                if (tempMin !== null) dailyStats[d].tempsMin.push(tempMin);
                if (humidity !== null) dailyStats[d].humidities.push(humidity);
                if (wind !== null) dailyStats[d].winds.push(wind);
                if (rain !== null) dailyStats[d].rains.push(rain);
                dailyStats[d].trailingRains.push(trailing);
            }
        }

        // Polite delay to prevent hitting the OpenMeteo rate limit (approx 100 req/min free tier).
        await new Promise(r => setTimeout(r, 200));
    }

    try {
        const weatherMap: Record<string, WeatherStats> = {};

        Object.keys(dailyStats).forEach(dayKey => {
            const day = parseInt(dayKey);
            const d = dailyStats[day];
            const count = d.tempsMax.length;

            if (count > 0) {
                // Key format: YYYY-MM-DD (target year)
                const targetDateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                // Calculate Averages across the 10 years of data for this specific day
                const avgMaxTemp = d.tempsMax.reduce((a, b) => a + b, 0) / count;
                // Fallback for min temp if missing is to estimate it (though API usually provides it)
                const avgMinTemp = d.tempsMin.length > 0 ? d.tempsMin.reduce((a, b) => a + b, 0) / d.tempsMin.length : avgMaxTemp - 10;
                // Default to 50% humidity if data is missing (neutral value)
                const avgHumidity = d.humidities.length > 0 ? d.humidities.reduce((a, b) => a + b, 0) / d.humidities.length : 50;


                // Actually avg of "daily max wind" is better for general conditions.
                const avgMaxWind = d.winds.length > 0 ? d.winds.reduce((a, b) => a + b, 0) / d.winds.length : 0;

                const avgRain = d.rains.reduce((a, b) => a + b, 0) / count;
                const avgMud = d.trailingRains.reduce((a, b) => a + b, 0) / count;

                // Calculate Probabilities:
                // Count how many years had rain > 1mm (significant rain)
                const rainDays = d.rains.filter(r => r > 1.0).length;
                // Count how many years had rain > 5mm (heavy rain)
                const heavyRainDays = d.rains.filter(r => r > 5.0).length;

                weatherMap[targetDateKey] = {
                    avgMaxTemp,
                    avgMinTemp,
                    avgHumidity,
                    maxWindSpeed: avgMaxWind,
                    avgPrecipitation: avgRain,
                    rainProbability: (rainDays / count) * 100,
                    heavyRainProbability: (heavyRainDays / count) * 100,
                    mudIndex: avgMud,
                    history: {
                        temps: d.tempsMax, // Keep for backward compat for now, or update interface
                        tempsMin: d.tempsMin,
                        rain: d.rains,
                        humidities: d.humidities,
                        winds: d.winds
                    }
                };
            }
        });

        return weatherMap;

    } catch (e) {
        console.error("Bulk weather fetch failed", e);
        // Return empty object so the app doesn't crash; UI should handle missing weather data gracefully.
        return {};
    }
}
