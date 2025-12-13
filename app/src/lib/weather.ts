export interface WeatherStats {
    avgMaxTemp: number;
    avgPrecipitation: number;
    rainProbability: number; // % chance of >1mm rain
    heavyRainProbability: number; // % chance of >5mm rain
    mudIndex: number; // Avg 3-day trailing rainfall
    history: {
        temps: number[];
        rain: number[];
    };
}

// Cache to prevent spamming API
const weatherCache: Record<string, WeatherStats> = {};

// Helper to get previous 3 days rainfall sum from a daily dataset
function getTrailingRain(timeIdx: number, precipArray: number[]): number {
    let sum = 0;
    // We want d-1, d-2, d-3
    for (let i = 1; i <= 3; i++) {
        const idx = timeIdx - i;
        if (idx >= 0) {
            sum += precipArray[idx] || 0;
        }
    }
    return sum;
}

export async function fetchMonthHistory(lat: number, lng: number, month: number, year: number): Promise<Record<string, WeatherStats>> {
    const currentYear = year; // Changed from new Date().getFullYear() to use the target year
    const requests = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // We fetch a buffer before the month starts to calculate trailing rain (Mud Index)
    // Month is 0-indexed.
    // Let's go back 5 days from the 1st of the month.
    const leadDays = 5;

    // Storage for daily aggregation
    // Key: Day of Month (1-31)
    const dailyStats: Record<number, {
        temps: number[],
        rains: number[],
        trailingRains: number[]
    }> = {};
    // Initialize dailyStats for all days of the month
    for (let d = 1; d <= daysInMonth; d++) {
        dailyStats[d] = { temps: [], rains: [], trailingRains: [] };
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

        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startStr}&end_date=${endStr}&daily=temperature_2m_max,precipitation_sum&timezone=auto`;

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

                const temp = daily.temperature_2m_max[dataIdx];
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

                if (temp !== null && temp !== undefined) dailyStats[d].temps.push(temp);
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
            const count = d.temps.length;

            if (count > 0) {
                // Key format: YYYY-MM-DD (target year)
                const targetDateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                // Averages
                const avgTemp = d.temps.reduce((a, b) => a + b, 0) / count;
                const avgRain = d.rains.reduce((a, b) => a + b, 0) / count;
                const avgMud = d.trailingRains.reduce((a, b) => a + b, 0) / count;

                // Probabilities
                const rainDays = d.rains.filter(r => r > 1.0).length;
                const heavyRainDays = d.rains.filter(r => r > 5.0).length;

                weatherMap[targetDateKey] = {
                    avgMaxTemp: avgTemp,
                    avgPrecipitation: avgRain,
                    rainProbability: (rainDays / count) * 100,
                    heavyRainProbability: (heavyRainDays / count) * 100,
                    mudIndex: avgMud,
                    history: {
                        temps: d.temps,
                        rain: d.rains
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
