
/**
 * @file scoring.ts
 * @description Core logic for the "Vibe Coding" algorithm. This module evaluates every day of a target month
 * against a set of user-defined constraints and historical weather data to produce a "Runability Score".
 */
import SunCalc from 'suncalc';
import { differenceInWeeks } from 'date-fns';
import type { WeatherStats } from './weather';

/**
 * User-configurable constraints and preferences for the event.
 */
export interface EventConstraints {
    /** The first day of the target month (e.g. 2025-09-01) */
    targetMonth: Date;
    /** Geographic location for daylight and weather lookups */
    location: {
        lat: number;
        lng: number;
        name?: string;
    };
    /** ISO-3166-2 state code for holiday lookup (e.g. "DE-BY") */
    stateCode: string;
    /** Minimum weeks required for training before the event */
    minTrainingWeeks: number;
    // minDaylightHours?: number; // Deprecated by specific timing
    /** Scheduled start time of the race (HH:MM) */
    raceStartTime: string;
    /** Expected duration of the race in hours */
    raceDurationHours: number;
    /** Race distance in km (informational for now, used for "Ultra" context) */
    distance: number;
    /** ISO Dates manually blocked by the user */
    blockedDates: string[];

    // --- Boolean Toggles ---
    /** If true, holidays are treated as negative (crowds) instead of positive (free time) */
    negativeHolidayImpact: boolean;
    /** If true, penalizes dates that don't allow enough training weeks */
    incorporateTrainingTime: boolean;
    /** Allow Saturdays and Sundays */
    allowWeekends: boolean;
    /** Allow Mon-Fri */
    allowWeekdays: boolean;
    /** Check for public holidays */
    considerHolidays: boolean;

    /** Scoring Mode / Persona */
    persona: 'competition' | 'experience';
}

/**
 * The result object for a single evaluated day.
 */
export interface DayScore {
    /** The actual calendar date evaluated */
    date: Date;
    /** Final calculated score (0-100), where 100 is ideal */
    score: number;
    /** Human-readable strings explaining penalties or specific conditions */
    reasons: string[];
    /** Detailed breakdown of score components for visualization */
    breakdown: { label: string; value: number }[];
    /** Traffic light status based on score thresholds */
    status: 'green' | 'yellow' | 'red';
    /** Raw data used for the specific day's calculation */
    details: {
        /** Total hours between sunrise and sunset */
        daylightHours: number;
        dawn: Date;
        sunrise: Date;
        sunset: Date;
        dusk: Date;
        trainingWeeksAvailable: number;
        isWeekend: boolean;
        weather?: WeatherStats;
        holiday?: string; // Name of holiday if any
        raceStartTime: string;
        raceDuration: number;
        persona: 'competition' | 'experience';
    };
}



import type { Holiday } from './holidays';

import { formatDuration } from './utils';

/**
 * Calculates a suitability score for every day in the target month.
 * 
 * Score Formulation:
 * - Start with Base Score: 100
 * - Apply Hard Constraints (Training Time, Manual Blocks, Allowed Days) -> Sets score to 0 on fail.
 * - Apply Soft Constraints (Holidays) -> Penalties or no impact.
 * - Apply Daylight Analysis -> Penalties for darkness during race hours.
 * - Apply Weather Analysis (if data available) -> Penalties for Temp/Rain/Wind/Mud.
 * 
 * @param month - The target month to evaluate
 * @param constraints - User preferences and event specs
 * @param holidays - List of public/school holidays for the region
 * @param weatherData - (Optional) Historical weather map
 */
export function calculateMonthScores(
    month: Date,
    constraints: EventConstraints,
    holidays: Holiday[],
    weatherData?: Record<string, WeatherStats>
): DayScore[] {
    const scores: DayScore[] = [];

    // Helper: get month days
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const today = new Date();

    // Map holidays for fast lookup: "YYYY-MM-DD"
    const holidayMap = new Map<string, Holiday>();
    holidays.forEach(h => {
        holidayMap.set(h.date, h);
    });

    for (let day = 1; day <= daysInMonth; day++) {
        // Create date in LOCAL time to match calendar (important!)
        const currentDate = new Date(constraints.targetMonth.getFullYear(), constraints.targetMonth.getMonth(), day, 12, 0, 0);

        // -----------------------------
        // SCORING LOGIC
        // -----------------------------
        let score = 100;
        const reasons: string[] = [];
        const breakdown: { label: string; value: number }[] = [];
        breakdown.push({ label: 'Base Score', value: 100 });

        // 1. Constraints Check (Blocking) - Ensure we are in the target month
        if (currentDate.getMonth() !== constraints.targetMonth.getMonth()) {
            score = 0;
        }

        // 1. Check Training Time (Optional)
        // If the user needs X weeks to train, and the date is sooner than that -> Fail.
        const weeksAvailable = differenceInWeeks(currentDate, today);
        if (constraints.incorporateTrainingTime) {
            if (weeksAvailable < constraints.minTrainingWeeks) {
                const ratio = Math.max(0, weeksAvailable / constraints.minTrainingWeeks);

                if (ratio < 0.5) {
                    // Critical Failure (< 50% time)
                    const penalty = -100;
                    score = 0;
                    reasons.push(`Not enough training time (${weeksAvailable} weeks vs ${constraints.minTrainingWeeks} required)`);
                    breakdown.push({ label: 'Insufficient Training Time (< 50%)', value: penalty });
                } else {
                    // Soft Fail (50% - 99% time)
                    // Linear penalty: -10 pts per 10% missing? 
                    // Formula: Penalty = (1 - ratio) * 200 => 0.5 ratio -> 100 penalty? Too harsh.
                    // User wants "visible comparable". 
                    // Let's do: Penalty = - (1 - ratio) * 100.
                    // Example: 90% time (ratio 0.9) -> -10 pts.
                    // Example: 50% time (ratio 0.5) -> -50 pts.
                    const penalty = Math.round(-(1 - ratio) * 100);
                    score += penalty;
                    reasons.push(`Short Training Prep (${Math.round(ratio * 100)}% of recommended)`);
                    breakdown.push({ label: 'Short Training Prep', value: penalty });
                }
            }
        }

        // 2. Blocked Dates (Manual Block)
        const dateString = currentDate.toISOString().split('T')[0];
        if (constraints.blockedDates.includes(dateString)) {
            const penalty = -100; // Treat as full penalty for breakdown visualization
            score = 0;
            reasons.push("Blocked Date");
            breakdown.push({ label: 'Blocked Date', value: penalty });
        }

        // 3. Weekend & Holiday Check & Weekdays
        // Priority Order: Holiday > Weekend > Weekday
        // We evaluate strictly in this hierarchy to ensure special days (like Holidays) 
        // aren't accidentally penalized as "Weekdays" if they fall on a Monday, 
        // or allowed as "Weekends" if holidays are banned.
        const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Ensure "dateKey" matches the holiday yyyy-mm-dd format strictly
        // We use local year/month/day
        const y = currentDate.getFullYear();
        const m = String(currentDate.getMonth() + 1).padStart(2, '0');
        const d = String(currentDate.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${d}`;

        const holiday = constraints.considerHolidays ? holidayMap.get(dateKey) : undefined;
        const isHoliday = !!holiday;

        if (isHoliday) {
            // How does holiday affect score?
            if (constraints.negativeHolidayImpact) {
                // Negative: Crowds, closed roads, etc.
                const penalty = -30;
                score += penalty;
                reasons.push(`Holiday (Negative Impact): ${holiday!.name}`);
                breakdown.push({ label: `Holiday (${holiday!.name})`, value: penalty });
            } else {
                // Positive: Day off, good for race
                // No penalty, effectively treats as weekend
                reasons.push(`Holiday: ${holiday!.name}`);
                breakdown.push({ label: `Holiday (${holiday!.name})`, value: 0 });
            }
        } else if (isWeekend) {
            if (!constraints.allowWeekends) {
                const penalty = -100;
                score = 0; // Hard fail
                reasons.push("Weekend (Not allowed)");
                breakdown.push({ label: 'Weekend Not Allowed', value: penalty });
            }
        } else {
            // It's a weekday
            if (!constraints.allowWeekdays) {
                const penalty = -50;
                score += penalty;
                reasons.push("Weekday (Preferred Weekend)");

                // If strictly not allowed (e.g. checkbox off)
                const strictPenalty = -100;
                score = 0;
                reasons.pop(); // remove "Weekday (Preferred Weekend)"
                reasons.push("Weekday (Not allowed)");
                breakdown.push({ label: 'Weekday Not Allowed', value: strictPenalty });
            } else {
                // Weekdays are allowed
                // Maybe a small penalty vs weekends? Or equal?
                // Let's assume equal if checked.
            }
        }


        // 4. Daylight Analysis
        // Race Start: constraints.raceStartTime (e.g. "07:00")
        // Duration: constraints.raceDurationHours (e.g. 12)
        // We calculate the overlap between the Race Window [Start, End] and Daylight Window [Sunrise, Sunset].
        // Any race time outside sunlight is counted as "Darkness".

        // Parse start time to get hours relative to currentDate
        const [startH, startM] = constraints.raceStartTime.split(':').map(Number);
        const raceStart = new Date(currentDate);
        raceStart.setHours(startH, startM, 0, 0);

        const raceEnd = new Date(raceStart);
        raceEnd.setMinutes(raceEnd.getMinutes() + constraints.raceDurationHours * 60);

        // Get Sun times via SunCalc
        const times = SunCalc.getTimes(currentDate, constraints.location.lat, constraints.location.lng);
        // "nightEnd" ~ sunrise ends (civil dawn or similar, usually stick to sunrise/sunset for general use)
        // or actually "sunrise" and "sunset".

        // Let's count hours of darkness during the race window
        // Race window: [raceStart, raceEnd]
        // Daylight window: [times.sunrise, times.sunset]

        // Overlap of Race and Daylight
        const overlapStart = new Date(Math.max(raceStart.getTime(), times.sunrise.getTime()));
        const overlapEnd = new Date(Math.min(raceEnd.getTime(), times.sunset.getTime()));

        let daylightMinutes = 0;
        if (overlapEnd > overlapStart) {
            daylightMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / 60000;
        }

        const raceMinutes = constraints.raceDurationHours * 60;
        const darknessMinutes = Math.max(0, raceMinutes - daylightMinutes);

        // Penalty for darkness (e.g. headlamp needed)
        // Maybe -1 point per minute of darkness? or -10 per hour?
        if (darknessMinutes > 0) {
            const darknessHours = darknessMinutes / 60;
            if (darknessHours > 0.5) {
                // Modified: Append specific "Headlamp required" note
                reasons.push(`${formatDuration(darknessHours)} Darkness (Headlamp required)`);
                breakdown.push({ label: 'Darkness Hours', value: 0 });
            } else {
                // For very short darkness (e.g. < 30m), maybe just "Twilight"? 
                // Sticking to user request for "Headlamp required" if notable night hours.
                // Let's treat >.5h as the threshold for the note.
                // If less, maybe just "Low light" or ignore.
                breakdown.push({ label: 'Darkness Hours', value: 0 });
            }
        } else {
            breakdown.push({ label: 'Darkness Hours', value: 0 });
        }

        // 5. Weather check (Historical)
        // Checks historical averages for the specific day to predict likely conditions.
        // Penalties are applied for extreme heat, cold, wind, or rain risk.
        if (weatherData) {
            // Check weather for this specific day (YYYY-MM-DD key)
            const dayWeather = weatherData[dateKey];

            if (dayWeather) {
                // Temp Analysis
                const temp = dayWeather.avgMaxTemp;
                const humidity = dayWeather.avgHumidity;
                const wind = dayWeather.maxWindSpeed;

                // Humidity Adjustment
                // const effectiveTemp = (humidity > 70) ? temp + 3 : temp; // Unused in new logic, removed to fix lint.

                let tempPenalty = 0;
                let tempLabel = 'Ideal Temp';
                let windPenalty = 0; // Lifted scope

                // --- PERSONA BASED LOGIC ---
                const isCompetition = constraints.persona === 'competition';

                if (isCompetition) {
                    // Default Scenarios (Competition)
                    // Ideal: 5 - 12
                    // Warm > 12 -> 18
                    // Hot > 18 -> 25
                    // Very Hot > 25
                    if (temp >= 5 && temp <= 12) {
                        tempPenalty = 0;
                        tempLabel = `Ideal Temp (${temp.toFixed(1)}°C)`;
                    } else if (temp > 12) {
                        const limitWarm = (humidity > 70) ? 15 : 18;
                        const limitHot = (humidity > 70) ? 22 : 25;

                        if (temp <= limitWarm) {
                            tempPenalty = -10;
                            tempLabel = `Warm (${temp.toFixed(1)}°C)`;
                        } else if (temp <= limitHot) {
                            tempPenalty = -20;
                            tempLabel = (humidity > 70) ? `Humid & Hot (${temp.toFixed(1)}°C)` : `Hot (${temp.toFixed(1)}°C)`;
                        } else {
                            tempPenalty = -30;
                            tempLabel = `Very Hot (${temp.toFixed(1)}°C)`;
                        }
                    } else {
                        // Cold side (stays same for now for competition)
                        const isWindy = wind > 20;
                        if (temp >= 0) {
                            tempPenalty = -10;
                            tempLabel = `Chilly (${temp.toFixed(1)}°C)`;
                            if (isWindy) { windPenalty = -10; tempLabel += ' + Windchill'; }
                        } else if (temp >= -5) {
                            tempPenalty = -20;
                            tempLabel = `Freezing (${temp.toFixed(1)}°C)`;
                            if (isWindy) { // Fix: windPenalty logic inside block
                                windPenalty = -15;
                                tempLabel += ' + Severe Windchill';
                            }
                        } else {
                            tempPenalty = -30;
                            tempLabel = `Deep Freeze (${temp.toFixed(1)}°C)`;
                        }
                    }
                } else {
                    // EXPERIENCE Mode Scenarios
                    // Ideal: 15 - 20 (Warmer is better)
                    // Cool: 10 - 15 (Acceptable)
                    // Cold: < 10 (Penalty)
                    // Hot: > 25 (Still bad)

                    if (temp >= 15 && temp <= 22) { // Expanding slightly to 22 as "nice warm"
                        tempPenalty = 0;
                        tempLabel = `Ideal Experience Temp (${temp.toFixed(1)}°C)`;
                    } else if (temp > 22) {
                        // const limitHot = 28; // Unused, removed.

                        if (temp <= 26) {
                            tempPenalty = -10;
                            tempLabel = `Warm (${temp.toFixed(1)}°C)`;
                        } else {
                            tempPenalty = -30;
                            tempLabel = `Very Hot (${temp.toFixed(1)}°C)`;
                        }
                    } else {
                        // Cold Side
                        if (temp >= 10 && temp < 15) {
                            tempPenalty = -10;
                            tempLabel = `Cool (${temp.toFixed(1)}°C)`;
                        } else if (temp >= 5 && temp < 10) {
                            tempPenalty = -20;
                            tempLabel = `Chilly (${temp.toFixed(1)}°C)`;
                        } else {
                            tempPenalty = -40; // Experience hikers hate freezing
                            tempLabel = `Too Cold (${temp.toFixed(1)}°C)`;
                        }
                    }

                    // Apply wind penalty for experience mode
                    if (temp < 15 && wind > 20) {
                        windPenalty = -10;
                        tempLabel += ' + Wind';
                    }
                }

                // Apply wind penalty
                tempPenalty += windPenalty;


                if (tempPenalty !== 0) {
                    score += tempPenalty;
                    reasons.push(tempLabel);
                    breakdown.push({ label: tempLabel, value: tempPenalty });
                } else {
                    breakdown.push({ label: tempLabel, value: 0 });
                }

                // Temp Stability Analysis (Diurnal Range)
                const tempSwing = dayWeather.avgMaxTemp - dayWeather.avgMinTemp;
                if (tempSwing > 15) {
                    const stabilityPenalty = -15;
                    score += stabilityPenalty;
                    reasons.push(`High Temp Swing (${tempSwing.toFixed(1)}°C)`);
                    breakdown.push({ label: 'Temp Stability', value: stabilityPenalty });
                } else {
                    breakdown.push({ label: 'Temp Stability', value: 0 });
                }

                // Rain Risk Analysis (Probability)
                if (dayWeather.rainProbability > 50) {
                    const penalty = -40;
                    score += penalty;
                    reasons.push(`High Rain Risk (${Math.round(dayWeather.rainProbability)}%)`);
                    breakdown.push({ label: 'High Rain Risk', value: penalty });
                }

                // Acclimatization Risk (Seasonality Heuristic)
                // "If preparation was in cold season and event is warm -> Penalty"
                // "If preparation was in warm season and event is cold -> Penalty"
                const month = currentDate.getMonth(); // 0 = Jan

                // Heat Shock Risk: Event in Spring (Apr-Jun), implies Prep in Winter/Early Spring
                if (month >= 3 && month <= 5) { // Apr, May, Jun
                    if (temp > 15) {
                        score -= 10;
                        reasons.push('Acclimatization Risk (Sudden Heat)');
                        breakdown.push({ label: 'Heat Shock Risk', value: -10 });
                    }
                }

                // Cold Shock Risk: Event in Autumn (Sep-Nov), implies Prep in Summer
                if (month >= 8 && month <= 10) { // Sep, Oct, Nov
                    if (temp < 5) {
                        score -= 10;
                        reasons.push('Acclimatization Risk (Sudden Cold)');
                        breakdown.push({ label: 'Cold Shock Risk', value: -10 });
                    } else {
                        breakdown.push({ label: 'Cold Shock Risk', value: 0 });
                    }
                } else {
                    breakdown.push({ label: 'Cold Shock Risk', value: 0 });
                }

                // Mud / Trail Conditions Analysis
                if (dayWeather.mudIndex > 15) {
                    const penalty = -30;
                    score += penalty;
                    reasons.push(`Very Muddy Trails (Index: ${dayWeather.mudIndex.toFixed(1)})`);
                    breakdown.push({ label: 'Very Muddy', value: penalty });
                } else if (dayWeather.mudIndex > 5) {
                    const penalty = -10;
                    score += penalty;
                    reasons.push(`Muddy Trails`);
                    breakdown.push({ label: 'Muddy', value: penalty });
                } else {
                    breakdown.push({ label: 'Muddy', value: 0 });
                }
            }
        }


        // 6. Final Score Aggregation
        // Clamp the score to ensure it stays within the 0-100 generic range.
        score = Math.max(0, Math.min(100, score));

        // Determine Traffic Light Status:
        // - Green (80-100): Excellent conditions.
        // - Yellow (40-79): Acceptable but imperfect (e.g. slight chance of rain, or early sunset).
        // - Red (0-39): Major dealbreakers (e.g. Darkness, Extreme Weather, Conflict).
        let status: 'green' | 'yellow' | 'red' = 'green';
        if (score < 40) status = 'red';
        else if (score < 80) status = 'yellow';

        scores.push({
            date: currentDate,
            score,
            reasons,
            breakdown,
            status,
            details: {
                daylightHours: (times.sunset.getTime() - times.sunrise.getTime()) / 3600000,
                dawn: times.dawn,
                sunrise: times.sunrise,
                sunset: times.sunset,
                dusk: times.dusk,
                trainingWeeksAvailable: weeksAvailable,
                isWeekend,
                holiday: holiday?.name,
                weather: weatherData ? weatherData[dateKey] : undefined,
                raceStartTime: constraints.raceStartTime,
                raceDuration: constraints.raceDurationHours,
                persona: constraints.persona
            }
        });
    }

    return scores;
}
