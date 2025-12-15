import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { EventConstraints, DayScore } from '../lib/scoring';
import { fetchLocationYearlyHistory, type WeatherStats } from '../lib/weather';
import { fetchHolidays } from '../lib/holidays';
import { calculateMonthScores } from '../lib/scoring';

export function useAnalysis(constraints: EventConstraints, conflictingEvents: any[] = []) {
    const { t } = useLanguage();

    // State
    const [scores, setScores] = useState<DayScore[]>([]); // Current month scores
    const [fullYearScores, setFullYearScores] = useState<DayScore[]>([]); // All 365 days

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');

    // Data Cache (Memory only for session lifetime)
    // We cache weather by "lat,lng,year" key to avoid refetching on month change.
    const weatherCache = useRef<Record<string, Record<string, WeatherStats>>>({});

    useEffect(() => {
        let mounted = true;

        async function analyze() {
            try {
                const year = constraints.targetMonth.getFullYear();
                const locationKey = `${constraints.location.lat},${constraints.location.lng},${year}`;

                // --- Step 1: Data Fetching (if needed) ---
                let weather = weatherCache.current[locationKey];

                if (!weather) {
                    setLoading(true);
                    setLoadingMessage('loading.fetching_history');

                    // Fetch Full Year Weather
                    weather = await fetchLocationYearlyHistory(
                        constraints.location.lat,
                        constraints.location.lng,
                        year,
                        (progressYear) => {
                            // Optional: could update message with specific year progress
                            // But simple is better for i18n keys usually
                        }
                    );

                    if (mounted) {
                        weatherCache.current[locationKey] = weather;
                    }
                }

                if (!mounted) return;

                // Fetch Holidays (Fast in-memory cache usually)
                const holidays = await fetchHolidays(year, constraints.stateCode);

                if (!mounted) return;

                // --- Step 2: Scoring Calculation (Sync) ---
                setLoading(true);
                setLoadingMessage('loading.analyzing_year');

                // 1. Calculate for TARGET Month (for Calendar View)
                const monthResults = calculateMonthScores(
                    constraints.targetMonth,
                    constraints,
                    holidays,
                    t,
                    weather,
                    conflictingEvents
                );

                // 2. Calculate for FULL YEAR (for Top 10 List)
                // We'll iterate Jan to Dec
                let allScores: DayScore[] = [];
                for (let m = 0; m < 12; m++) {
                    // Construct a 1st of Month date for this year
                    const mDate = new Date(year, m, 1);
                    const mScores = calculateMonthScores(
                        mDate,
                        { ...constraints, targetMonth: mDate }, // Update targetMonth context for scoring
                        holidays,
                        t,
                        weather,
                        conflictingEvents
                    );
                    allScores = allScores.concat(mScores);
                }

                if (mounted) {
                    setScores(monthResults);
                    setFullYearScores(allScores);
                }

            } catch (e) {
                console.error("Analysis failed", e);
            } finally {
                if (mounted) {
                    setLoading(false);
                    setLoadingMessage('');
                }
            }
        }

        analyze();

        return () => { mounted = false; };
    }, [
        // Re-run when dependencies change
        constraints.targetMonth.getTime(), // If month changes, we re-run scoring (fast), but cache keeps fetch skipped
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
        constraints.considerHolidays,
        constraints.persona,
        constraints.checkConflictingEvents,
        constraints.conflictRadius,
        conflictingEvents
    ]);

    return {
        scores,
        fullYearScores,
        loading,
        loadingMessage,
        weatherData: weatherCache.current[`${constraints.location.lat},${constraints.location.lng},${constraints.targetMonth.getFullYear()}`]
    };
}
