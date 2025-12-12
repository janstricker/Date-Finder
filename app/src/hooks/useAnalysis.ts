import { useState, useEffect } from 'react';
import type { EventConstraints, DayScore } from '../lib/scoring'; // Fix imports
import { fetchMonthHistory, type AverageWeather } from '../lib/weather';
import { fetchHolidays } from '../lib/holidays';
import { calculateMonthScores } from '../lib/scoring';

export function useAnalysis(constraints: EventConstraints) {
    const [scores, setScores] = useState<DayScore[]>([]);
    const [loading, setLoading] = useState(false);
    const [weatherData, setWeatherData] = useState<Record<string, AverageWeather>>({});

    useEffect(() => {
        let mounted = true;

        async function analyze() {
            setLoading(true);

            // 1. Fetch Weather Data (Async)
            const year = constraints.targetMonth.getFullYear();
            const month = constraints.targetMonth.getMonth();

            // Only fetch if location changed or uncached (simple optimization: fetch every time for MVP simplicity)
            const weather = await fetchMonthHistory(
                constraints.location.lat,
                constraints.location.lng,
                month,
                year
            );

            if (!mounted) return;
            // 2. Fetch Holidays (Async)
            const holidays = await fetchHolidays(year, constraints.stateCode);

            if (!mounted) return;
            setWeatherData(weather);

            // 3. Run Scoring (Sync)
            const results = calculateMonthScores(constraints, weather, holidays);
            setScores(results);
            setLoading(false);
        }

        analyze();

        return () => { mounted = false; };
    }, [
        constraints.targetMonth.getTime(),
        constraints.location.lat,
        constraints.location.lng,
        constraints.stateCode,
        constraints.minTrainingWeeks,
        constraints.raceStartTime,
        constraints.raceDurationHours,
        constraints.distance,
        constraints.negativeHolidayImpact,
        constraints.incorporateTrainingTime,
        constraints.allowWeekends,
        constraints.allowWeekdays,
        constraints.considerHolidays
    ]);

    return { scores, loading, weatherData };
}
