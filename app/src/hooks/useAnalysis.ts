import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { EventConstraints, DayScore } from '../lib/scoring';
import { fetchLocationYearlyHistory, fetchRouteYearlyHistory, type WeatherStats } from '../lib/weather';
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
    // We cache weather by "lat,lng,year" (or "route_hash,year") key to avoid refetching.
    const weatherCache = useRef<Record<string, Record<string, WeatherStats>>>({});

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function analyze() {
            try {
                setError(null); // Clear previous errors
                const year = constraints.targetMonth.getFullYear();

                // Determine Cache Key
                let locationKey = '';
                let shouldFetch = true;

                if (constraints.gpxData && constraints.gpxData.sampledPoints.length > 0) {
                    // Route Weather Mode
                    if (!constraints.gpxData.ready) {
                        // Waiting for user confirmation (manual trigger)
                        // Don't fetch yet.
                        shouldFetch = false;
                        console.log("Analysis skipped: GPX data not ready");
                    } else {
                        // Create stable key from points
                        const ptStr = constraints.gpxData.sampledPoints
                            .map(p => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`)
                            .join('|');
                        locationKey = `route_${ptStr}_${year}`;
                    }
                } else {
                    // Single Point Mode
                    locationKey = `${constraints.location.lat},${constraints.location.lng},${year},v2`;
                }


                // If skipping fetch, we might just return early or keep existing data
                if (!shouldFetch) {
                    setLoading(false);
                    return;
                }

                console.log('Analyzing for:', locationKey);

                // --- Step 1: Data Fetching (if needed) ---
                let weather = weatherCache.current[locationKey];

                if (!weather) {
                    setLoading(true);
                    setLoadingMessage('loading.fetching_history');

                    // Fetch Logic
                    if (constraints.gpxData && constraints.gpxData.sampledPoints.length > 0) {
                        // Multi-point fetch
                        weather = await fetchRouteYearlyHistory(
                            constraints.gpxData.sampledPoints,
                            year,
                            (msg) => { console.log(msg); /* Optional UI update */ }
                        );
                    } else {
                        // Standard Single Location Fetch
                        weather = await fetchLocationYearlyHistory(
                            constraints.location.lat,
                            constraints.location.lng,
                            year,
                            (_) => {
                                // Optional: could update message with specific year progress
                            }
                        );
                    }

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

            } catch (e: any) {
                console.error("Analysis failed - check network or rate limits", e);
                if (mounted) {
                    if (e.message && e.message.includes('Rate Limit')) {
                        setError('error.rateLimit');
                    } else {
                        setError('error.analysis_failed');
                    }
                }
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
        conflictingEvents,
        // Add dependency on GPX data changes (specifically sampled points)
        // Ideally use deep compare or simple length/first-point check to avoid excessive loops
        // JSON stringify is a cheap way for small arrays of points
        constraints.gpxData ? JSON.stringify(constraints.gpxData.sampledPoints) : null,
        constraints.gpxData?.ready // Re-run when ready flag toggles
    ]);

    return {
        scores,
        fullYearScores,
        loading,
        loadingMessage,
        error,
        weatherData: weatherCache.current[
            // Re-derive key for return value (bit simplified, potentially risky if key derivation logic duplicates)
            constraints.gpxData && constraints.gpxData.sampledPoints.length > 0
                ? `route_${constraints.gpxData.sampledPoints.map(p => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`).join('|')}_${constraints.targetMonth.getFullYear()}`
                : `${constraints.location.lat},${constraints.location.lng},${constraints.targetMonth.getFullYear()},v2`
        ]
    };
}
