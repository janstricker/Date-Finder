export interface WeatherStats {
    avgMaxTemp: number;
    avgMinTemp: number;
    avgHumidity: number;
    maxWindSpeed: number;
    avgPrecipitation: number;
    rainProbability: number; // % chance of >1mm rain
    heavyRainProbability: number; // % chance of >5mm rain
    mudIndex: number; // Avg 3-day trailing rainfall
    history: {
        temps: number[];
        tempsMin: number[];
        rain: number[];
        humidities: number[];
        winds: number[];
    };
}



// Cache to prevent spamming API


// Helper to get previous 3 days rainfall sum from a daily dataset


export async function fetchMonthHistory(lat: number, lng: number, month: number, year: number): Promise<Record<string, WeatherStats>> {
    const currentYear = year; // Changed from new Date().getFullYear() to use the target year

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // We fetch a buffer before the month starts to calculate trailing rain (Mud Index)
    // Month is 0-indexed.
    // Let's go back 5 days from the 1st of the month.
    const leadDays = 5;

    // Storage for daily aggregation
    // Key: Day of Month (1-31)
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

        // Construct end date: last day of month
        const endDate = new Date(pastYear, month, daysInMonth);
        const endStr = endDate.toISOString().split('T')[0];

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

            // We need to map dates to day-of-month
            // Note: Data includes lead days.
            // We iterate strictly through the days of the target month (1..daysInMonth)
            // But we access the data relative to the fetched start date.

            // The API returns daily arrays.
            // StartDate is "1 - leadDays".
            // So index 0 is (1 - leadDays).
            // Index 'leadDays' is Day 1.

            for (let d = 1; d <= daysInMonth; d++) {
                // The index in the API response for day 'd'
                // Lead days are before d=1.
                // data[0] -> d = 1 - 5 = -4
                // data[5] -> d = 1
                const dataIdx = leadDays + (d - 1);

                const tempMax = daily.temperature_2m_max[dataIdx];
                const tempMin = daily.temperature_2m_min[dataIdx];
                const humidity = daily.relative_humidity_2m_mean[dataIdx];
                const wind = daily.wind_speed_10m_max[dataIdx];
                const rain = daily.precipitation_sum[dataIdx];

                // Trailing rain: sum of previous 3 days (dataIdx - 1, -2, -3)
                const getTrailingRain = (idx: number, arr: number[]) => {
                    let sum = 0;
                    for (let k = 1; k <= 3; k++) {
                        sum += (arr[idx - k] || 0);
                    }
                    return sum / 3; // Average of trailing 3 days
                };
                const trailing = getTrailingRain(dataIdx, daily.precipitation_sum);

                if (tempMax !== null && tempMax !== undefined) dailyStats[d].tempsMax.push(tempMax);
                if (tempMin !== null && tempMin !== undefined) dailyStats[d].tempsMin.push(tempMin);
                if (humidity !== null && humidity !== undefined) dailyStats[d].humidities.push(humidity);
                if (wind !== null && wind !== undefined) dailyStats[d].winds.push(wind);
                if (rain !== null && rain !== undefined) dailyStats[d].rains.push(rain);
                dailyStats[d].trailingRains.push(trailing);
            }
        }

        // Polite delay
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

                // Averages
                const avgMaxTemp = d.tempsMax.reduce((a, b) => a + b, 0) / count;
                const avgMinTemp = d.tempsMin.length > 0 ? d.tempsMin.reduce((a, b) => a + b, 0) / d.tempsMin.length : avgMaxTemp - 10; // Fallback if missing
                const avgHumidity = d.humidities.length > 0 ? d.humidities.reduce((a, b) => a + b, 0) / d.humidities.length : 50;

                // Actually avg of "daily max wind" is better for general conditions.
                const avgMaxWind = d.winds.length > 0 ? d.winds.reduce((a, b) => a + b, 0) / d.winds.length : 0;

                const avgRain = d.rains.reduce((a, b) => a + b, 0) / count;
                const avgMud = d.trailingRains.reduce((a, b) => a + b, 0) / count;

                // Probabilities
                const rainDays = d.rains.filter(r => r > 1.0).length;
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
        return {};
    }
}
