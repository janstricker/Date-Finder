export interface DailyWeather {
    date: string;
    maxTemp: number;
    precipitation: number;
}

export interface AverageWeather {
    avgMaxTemp: number;
    avgPrecipitation: number;
}

// Cache to prevent spamming API
const weatherCache: Record<string, AverageWeather> = {};

export async function fetchHistoricalWeather(lat: number, lng: number, date: Date): Promise<AverageWeather> {
    const dateKey = `${lat}-${lng}-${date.toISOString().split('T')[0]}`;
    if (weatherCache[dateKey]) return weatherCache[dateKey];

    // We want to fetch the same day for the last 5 years
    // OpenMeteo Archive API allows ranges.
    // Strategy: Fetch the last 5 years for this specific day?
    // Efficient Strategy: Fetch the whole month for last 5 years and aggregate locally?
    // Let's stick to simple day-specific fetch but aggregated. 
    // Actually, fetching specific non-contiguous dates is hard in one request.
    // Better: Fetch the target month for the last ONE year as a proxy? No, user asked for 5 year average.

    // Alternative: Fetch start_date=2020-MM-DD & end_date=2024-MM-DD and just pick the matching days?
    // That returns too much data.

    // Let's approximate: Just use the last year's data for MVP speed?
    // User explicitly asked for "average of the last 5 years".
    // Okay, we can perform 5 parallel requests. It's fine for client-side MVP.

    const years = 5;
    const currentYear = new Date().getFullYear();
    let totalTemp = 0;
    let totalRain = 0;
    let count = 0;

    const requests = [];

    for (let i = 1; i <= years; i++) {
        const pastYear = currentYear - i;
        const dateStr = `${pastYear}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        // OpenMeteo Archive
        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${dateStr}&end_date=${dateStr}&daily=temperature_2m_max,precipitation_sum&timezone=auto`;
        requests.push(fetch(url).then(res => res.json()));
    }

    try {
        const results = await Promise.all(requests);
        results.forEach((data: any) => {
            if (data.daily && data.daily.temperature_2m_max && data.daily.temperature_2m_max[0] !== null) {
                totalTemp += data.daily.temperature_2m_max[0];
                totalRain += data.daily.precipitation_sum[0] || 0;
                count++;
            }
        });

        if (count === 0) return { avgMaxTemp: 0, avgPrecipitation: 0 };

        const avg: AverageWeather = {
            avgMaxTemp: totalTemp / count,
            avgPrecipitation: totalRain / count
        };

        weatherCache[dateKey] = avg;
        return avg;

    } catch (err) {
        console.error("Weather fetch failed", err);
        return { avgMaxTemp: 0, avgPrecipitation: 0 };
    }
}

// Bulk fetch for a whole month?
// To avoid 30 * 5 = 150 requests, we should fetch the FULL month for the last 5 years.
// 5 Requests.
export async function fetchMonthHistory(lat: number, lng: number, month: number, year: number): Promise<Record<string, AverageWeather>> {
    // Returns Map: "DD" -> AverageWeather

    const currentYear = new Date().getFullYear();
    const requests = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= 5; i++) {
        const pastYear = currentYear - i;
        const start = `${pastYear}-${String(month + 1).padStart(2, '0')}-01`;
        const end = `${pastYear}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`;

        const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${start}&end_date=${end}&daily=temperature_2m_max,precipitation_sum&timezone=auto`;
        requests.push(fetch(url).then(res => res.json()));
    }

    const dailySums: Record<number, { temp: number, rain: number, count: number }> = {};

    try {
        const results = await Promise.all(requests);

        results.forEach((res: any) => {
            if (!res.daily || !res.daily.time) return;

            res.daily.time.forEach((t: string, idx: number) => {
                const day = parseInt(t.split('-')[2]);
                if (!dailySums[day]) dailySums[day] = { temp: 0, rain: 0, count: 0 };

                const temp = res.daily.temperature_2m_max[idx];
                const rain = res.daily.precipitation_sum[idx];

                if (temp !== null) {
                    dailySums[day].temp += temp;
                    dailySums[day].rain += (rain || 0);
                    dailySums[day].count++;
                }
            });
        });

        const averages: Record<string, AverageWeather> = {};

        Object.keys(dailySums).forEach(dayKey => {
            const d = dailySums[parseInt(dayKey)];
            // Key format: YYYY-MM-DD of the TARGET year
            const targetDateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayKey).padStart(2, '0')}`;

            if (d.count > 0) {
                averages[targetDateKey] = {
                    avgMaxTemp: d.temp / d.count,
                    avgPrecipitation: d.rain / d.count
                };
            }
        });

        return averages;

    } catch (e) {
        console.error("Bulk weather fetch failed", e);
        return {};
    }
}
