export interface WeatherStats {
    avgMaxTemp: number;
    avgPrecipitation: number;
    rainProbability: number; // % chance of >1mm rain
    heavyRainProbability: number; // % chance of >5mm rain
    mudIndex: number; // Avg 3-day trailing rainfall
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
    const currentYear = new Date().getFullYear();
    const requests = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // We fetch a buffer before the month starts to calculate trailing rain (Mud Index)
    // Month is 0-indexed.
    // Let's go back 5 days from the 1st of the month.
    const leadDays = 5;

    for (let i = 1; i <= 10; i++) {
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

        if (res) requests.push(res);

        // Small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Storage for daily aggregation
    // Key: Day of Month (1-31)
    const dailyStats: Record<number, {
        temps: number[],
        rains: number[],
        trailingRains: number[]
    }> = {};

    try {
        const results = requests; // already awaited and resolved

        results.forEach((res: any) => {
            if (!res || !res.daily || !res.daily.time) return;

            const timeArray: string[] = res.daily.time;
            const tempArray: number[] = res.daily.temperature_2m_max;
            const rainArray: number[] = res.daily.precipitation_sum;

            timeArray.forEach((tStr, idx) => {
                const date = new Date(tStr);
                // We only care about the target month days (exclude the lead buffer days for the primary stats)
                if (date.getMonth() !== month) return;

                const day = date.getDate();
                if (!dailyStats[day]) dailyStats[day] = { temps: [], rains: [], trailingRains: [] };

                const temp = tempArray[idx];
                const rain = rainArray[idx];

                // Calculate trailing rain (Mud Index) using the buffer data
                const trailing = getTrailingRain(idx, rainArray);

                if (temp !== null && temp !== undefined) dailyStats[day].temps.push(temp);
                if (rain !== null && rain !== undefined) dailyStats[day].rains.push(rain);
                dailyStats[day].trailingRains.push(trailing);
            });
        });

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
                    mudIndex: avgMud
                };
            }
        });

        return weatherMap;

    } catch (e) {
        console.error("Bulk weather fetch failed", e);
        return {};
    }
}
