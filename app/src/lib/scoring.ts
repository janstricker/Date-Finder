
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
    /** Check for conflicting events within this radius (km) */
    checkConflictingEvents: boolean;
    /** Radius in km to search for conflicting events (default 50) */
    conflictRadius: number;

    /** Optional Custom Route Data (GPX) */
    gpxData?: {
        sampledPoints: { lat: number, lng: number, ele: number }[];
        track: { lat: number, lng: number, ele: number }[];
        stats: {
            distance: number;
            elevationGain: number;
        };
        /** If true, data is confirmed and ready for analysis */
        ready: boolean;
    };
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
    /** List of conflicting events found */
    conflicts: { name: string; url: string; distance: number }[];
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

import type { TranslationKey } from './i18n';

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
 * @param t - Translation function
 * @param weatherData - (Optional) Historical weather map
 * @param conflictingEvents - (Optional) List of other sport events to check against
 */
export function calculateMonthScores(
    month: Date,
    constraints: EventConstraints,
    holidays: Holiday[],
    t: (key: TranslationKey, params?: Record<string, string | number>) => string,
    weatherData?: Record<string, WeatherStats>,
    conflictingEvents?: any[] // We can define a stricter type if needed
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
        const conflicts: { name: string; url: string; distance: number }[] = [];
        const breakdown: { label: string; value: number }[] = [];
        breakdown.push({ label: t('breakdown.base'), value: 100 });

        // 1. Constraints Check (Blocking) - Ensure we are in the target month
        if (currentDate.getMonth() !== constraints.targetMonth.getMonth()) {
            score = 0;
        }

        // 1. Check Training Time (Optional)
        // If the user needs X weeks to train, and the date is sooner than that -> Fail.
        // 1. Check Training Time (Improved Logic v03)
        // If the user needs X weeks to train, and the date is sooner than that.
        const weeksAvailable = differenceInWeeks(currentDate, today);
        if (constraints.incorporateTrainingTime) {

            // A. Seasonality Factor (Winter Training Hardship)
            // If the 3 months leading up to the race include Jan/Feb, we need more buffer.
            // Simplified: If race is in Mar/Apr/May, training was in Winter.
            const raceMonth = currentDate.getMonth(); // 0-11
            let adjustedRequiredWeeks = constraints.minTrainingWeeks;
            let seasonalityPenaltyApplied = false;

            if (raceMonth >= 2 && raceMonth <= 4) { // Mar, Apr, May
                adjustedRequiredWeeks = Math.ceil(constraints.minTrainingWeeks * 1.15);
                seasonalityPenaltyApplied = true;
            }

            if (weeksAvailable < adjustedRequiredWeeks) {
                // We have a shortage. Calculate ratio based on adjusted needs.
                const ratio = Math.max(0, weeksAvailable / adjustedRequiredWeeks);

                // B. Non-Linear Penalty Curve
                // 85% - 100% -> No Penalty (Tapering Buffer / Flexibility)
                // 50% - 85%  -> Quadratic Penalty
                // < 50%      -> Crash Course (Severe Penalty but not 0)

                if (ratio >= 0.85) {
                    // Buffer Zone: No penalty, but maybe a small note if it was winter adjusted?
                    if (seasonalityPenaltyApplied) {
                        reasons.push(t('reason.training.winter'));
                        breakdown.push({ label: t('breakdown.training.winter'), value: 0 });
                    } else {
                        breakdown.push({ label: t('breakdown.training'), value: 0 });
                    }
                } else if (ratio >= 0.5) {
                    // Stress Zone: Quadratic Penalty
                    // Range 0.5 to 0.85 (span 0.35) maps to Penalty.
                    // Normalized dist from 0.85: (0.85 - ratio) / 0.35
                    // e.g. ratio 0.85 -> 0
                    // e.g. ratio 0.50 -> 1.0
                    const normalized = (0.85 - ratio) / 0.35;
                    const penalty = -Math.round(50 * (normalized * normalized)); // Max -50

                    score += penalty;
                    // Add explanation
                    if (seasonalityPenaltyApplied) {
                        reasons.push(t('reason.training.winter'));
                        reasons.push(t('reason.training.short', { percent: Math.round(ratio * 100) }));
                        breakdown.push({ label: t('breakdown.training.winter'), value: penalty });
                    } else {
                        reasons.push(t('reason.training.short', { percent: Math.round(ratio * 100) }));
                        breakdown.push({ label: t('breakdown.shortTraining'), value: penalty });
                    }

                } else {
                    // C. Crash Course Zone (< 50%)
                    // User Review: "Don't forbid it, but warn heavily."
                    const penalty = -80; // Severe, but allows score ~20 if everything else is perfect.
                    score += penalty;

                    reasons.push(t('reason.training.crashCourse'));

                    if (seasonalityPenaltyApplied) {
                        breakdown.push({ label: t('breakdown.training.winter'), value: penalty });
                    } else {
                        breakdown.push({ label: t('breakdown.training.crash'), value: penalty });
                    }
                }

            } else {
                // Even if we have enough time, if it was winter adjusted, maybe show we considered it?
                // Not strictly necessary if score is 100.
                breakdown.push({ label: t('breakdown.training'), value: 0 });
            }
        }

        // 2. Blocked Dates (Manual Block)
        const yearStr = currentDate.getFullYear();
        const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(currentDate.getDate()).padStart(2, '0');
        const dateString = `${yearStr}-${monthStr}-${dayStr}`;
        if (constraints.blockedDates.includes(dateString)) {
            const penalty = -100; // Treat as full penalty for breakdown visualization
            score = 0;
            reasons.push(t('reason.blocked'));
            breakdown.push({ label: t('breakdown.blocked'), value: penalty });
        }

        // 2b. Conflicting Events Check
        if (constraints.checkConflictingEvents && conflictingEvents) {
            // Find events on this date
            const eventsOnDate = conflictingEvents.filter(e => e.date === dateString);

            // Use configured radius or default 50
            const radius = constraints.conflictRadius || 50;

            for (const event of eventsOnDate) {
                if (!event.coords) continue;

                // Haversine formula for distance
                const R = 6371; // km
                const dLat = (event.coords.lat - constraints.location.lat) * Math.PI / 180;
                const dLon = (event.coords.lng - constraints.location.lng) * Math.PI / 180;
                const lat1 = constraints.location.lat * Math.PI / 180;
                const lat2 = event.coords.lat * Math.PI / 180;

                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const d = R * c;

                if (d <= radius) {
                    const penalty = -30;
                    score += penalty;
                    reasons.push(t('reason.conflict', { name: event.name, distance: Math.round(d) }));
                    conflicts.push({
                        name: event.name,
                        url: event.url,
                        distance: d
                    });
                    breakdown.push({ label: t('breakdown.conflict'), value: penalty });

                    // We only apply one penalty per day, but we might want to list all?
                    // For now, break after first conflict to avoid score nuking.
                    break;
                }
            }
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
                reasons.push(t('reason.holiday.negative', { name: holiday!.name }));
                breakdown.push({ label: t('breakdown.holiday', { name: holiday!.name }), value: penalty });
            } else {
                // Positive: Day off, good for race
                // No penalty, effectively treats as weekend
                reasons.push(t('reason.holiday', { name: holiday!.name }));
                breakdown.push({ label: t('breakdown.holiday', { name: holiday!.name }), value: 0 });
            }
        } else if (isWeekend) {
            if (!constraints.allowWeekends) {
                const penalty = -100;
                score = 0; // Hard fail
                reasons.push(t('reason.weekend.notAllowed'));
                breakdown.push({ label: t('breakdown.weekend'), value: penalty });
            }
        } else {
            // It's a weekday
            if (!constraints.allowWeekdays) {
                const penalty = -50;
                score += penalty;
                reasons.push(t('reason.weekday.preferred'));

                // If strictly not allowed (e.g. checkbox off)
                const strictPenalty = -100;
                score = 0;
                reasons.pop(); // remove "Weekday (Preferred Weekend)"
                reasons.push(t('reason.weekday.notAllowed'));
                breakdown.push({ label: t('breakdown.weekday'), value: strictPenalty });
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
                reasons.push(t('reason.darkness.headlamp', { duration: formatDuration(darknessHours) }));
                breakdown.push({ label: t('breakdown.darkness'), value: 0 });
            } else {
                // For very short darkness (e.g. < 30m), maybe just "Twilight"? 
                // Sticking to user request for "Headlamp required" if notable night hours.
                // Let's treat >.5h as the threshold for the note.
                // If less, maybe just "Low light" or ignore.
                breakdown.push({ label: t('breakdown.darkness'), value: 0 });
            }
        } else {
            breakdown.push({ label: t('breakdown.darkness'), value: 0 });
        }

        // 5. Weather check (Historical)
        // Checks historical averages for the specific day to predict likely conditions.
        // Penalties are applied for extreme heat, cold, wind, or rain risk.
        if (weatherData) {
            // Check weather for this specific day (YYYY-MM-DD key)
            const dayWeather = weatherData[dateKey];

            if (dayWeather) {
                // v03 Update: Use Apparent Temperature (Feels Like) for all checks
                const temp = dayWeather.avgApparentTemp;
                // Fallback if not available (during migration) handled in weather.ts, but safe to assume here.

                // Humidity is implicitly handled by Apparent Temp now.

                let tempPenalty = 0;
                let tempLabel = t('reason.temp.ideal', { temp: temp.toFixed(1) });

                // --- PERSONA BASED LOGIC ---
                const isCompetition = constraints.persona === 'competition';

                if (isCompetition) {
                    // Competition Mode (Performance Focus)
                    // Ideal: 5 - 12°C (Apparent)
                    // Warm: > 12
                    // Hot: > 18
                    // Very Hot: > 25
                    if (temp >= 5 && temp <= 12) {
                        tempPenalty = 0;
                        tempLabel = t('reason.temp.ideal', { temp: temp.toFixed(1) });
                    } else if (temp > 12) {
                        if (temp <= 18) {
                            tempPenalty = -10;
                            tempLabel = t('reason.temp.warm', { temp: temp.toFixed(1) });
                        } else if (temp <= 25) {
                            tempPenalty = -20;
                            tempLabel = t('reason.temp.hot', { temp: temp.toFixed(1) });
                        } else {
                            tempPenalty = -30;
                            tempLabel = t('reason.temp.veryHot', { temp: temp.toFixed(1) });
                        }
                    } else {
                        // Cold side
                        if (temp >= 0) {
                            tempPenalty = -10;
                            tempLabel = t('reason.temp.chilly', { temp: temp.toFixed(1) });
                        } else if (temp >= -5) {
                            tempPenalty = -20;
                            tempLabel = t('reason.temp.freezing', { temp: temp.toFixed(1) });
                        } else {
                            tempPenalty = -30;
                            tempLabel = t('reason.temp.deepFreeze', { temp: temp.toFixed(1) });
                        }
                    }
                } else {
                    // Experience Mode (Comfort Focus)
                    // Ideal: 15 - 22°C (Apparent)
                    // Cool: 10 - 15
                    // Cold: < 10
                    // Hot: > 26
                    if (temp >= 15 && temp <= 22) {
                        tempPenalty = 0;
                        tempLabel = t('reason.temp.expIdeal', { temp: temp.toFixed(1) });
                    } else if (temp > 22) {
                        if (temp <= 26) {
                            tempPenalty = -10;
                            tempLabel = t('reason.temp.warm', { temp: temp.toFixed(1) });
                        } else {
                            tempPenalty = -30;
                            tempLabel = t('reason.temp.veryHot', { temp: temp.toFixed(1) });
                        }
                    } else {
                        // Cold Side
                        if (temp >= 10 && temp < 15) {
                            tempPenalty = -10;
                            tempLabel = t('reason.cool', { temp: temp.toFixed(1) });
                        } else if (temp >= 5 && temp < 10) {
                            tempPenalty = -20;
                            tempLabel = t('reason.temp.chilly', { temp: temp.toFixed(1) });
                        } else {
                            tempPenalty = -40;
                            tempLabel = t('reason.tooCold', { temp: temp.toFixed(1) });
                        }
                    }
                }

                // Apply Temp Penalty
                if (tempPenalty !== 0) {
                    score += tempPenalty;
                    reasons.push(tempLabel);
                    breakdown.push({ label: tempLabel, value: tempPenalty });
                } else {
                    breakdown.push({ label: tempLabel, value: 0 });
                }

                // Temp Stability Analysis (Diurnal Range)
                const tempSwing = dayWeather.avgMaxTemp - dayWeather.avgMinTemp; // Keep using Air Temp for swing
                if (tempSwing > 15) {
                    const stabilityPenalty = -15;
                    score += stabilityPenalty;
                    reasons.push(t('reason.tempSwing', { swing: tempSwing.toFixed(1) }));
                    breakdown.push({ label: t('breakdown.stability'), value: stabilityPenalty });
                } else {
                    breakdown.push({ label: t('breakdown.stability'), value: 0 });
                }

                // --- Rain / Hypothermia Logic (Review v03) ---

                // 1. Hypothermia Risk ("Killer Combo")
                // Rule: Cold (< 5°C Apparent) AND Wet (> 40% Chance)
                const isCold = temp < 5;
                const isWetRisk = dayWeather.rainProbability > 40;

                let rainPenalty = 0;
                let rainLabel = '';

                if (isCold && isWetRisk) {
                    rainPenalty = -50; // Massive Penalty
                    rainLabel = t('reason.hypothermia');
                    breakdown.push({ label: t('breakdown.hypothermia'), value: rainPenalty });
                    score += rainPenalty;
                    reasons.push(rainLabel);
                } else {
                    // 2. Standard Rain Logic (Nuanced)
                    // Check for Washout vs Showers

                    const pDuration = dayWeather.avgPrecipHours || 0;
                    const pAmount = dayWeather.avgPrecipitation;
                    const pProb = dayWeather.rainProbability;

                    // Washout Condition:
                    // Duration > 4 hours OR Amount > 5mm (regardless of probability? No, likely if probability is significant)
                    // Let's assume High Probability for Washout check is implicit if we rely on averages, 
                    // but we should check probability too to avoid penalizing a "rare tropical storm" risk heavily if it's 10%.
                    // Actually averages include the 0s. 

                    // Logic from plan:
                    // Showers: High Prob (>50%) AND (Low Duration < 3h OR Low Amount < 5mm)
                    // Washout: High Duration (>4h) OR High Amount (>5mm)

                    // Actually, if avgAmount is > 5mm, that implies it rains A LOT on average. That's bad.

                    if (pAmount > 5 || pDuration > 4) {
                        // WASHOUT
                        // Only apply full penalty if probability is distinct? 
                        // If avg is high, it rains often.
                        rainPenalty = -40;
                        rainLabel = t('reason.rain.washout');
                        score += rainPenalty;
                        reasons.push(rainLabel);
                        breakdown.push({ label: t('breakdown.washout'), value: rainPenalty });
                    } else if (pProb > 40) { // Lowered threshold slightly for "Showers" to capture more risks, or keep 50?
                        // SHOWERS
                        // It's likely to rain (40%+), but amount/duration are low (otherwise caught above).

                        // Scale penalty for "Showers" to be linear(ish)?
                        // 40% -> -5
                        // 60% -> -10
                        // 100% -> -20
                        // Formula: -5 - (pProb - 40) * 0.25 ?

                        // Plan said: "High Prob -> Low Penalty (-10)".
                        // Let's stick to -15 max for showers to differentiate from washout (-40).
                        rainPenalty = -15;
                        rainLabel = t('reason.rain.showers');
                        score += rainPenalty;
                        reasons.push(rainLabel);
                        breakdown.push({ label: t('breakdown.rain'), value: rainPenalty });
                    } else {
                        breakdown.push({ label: t('breakdown.rain'), value: 0 });
                    }

                    // Hypothermia breakdown entry handled in else block? No, if we didn't enter hypothermia block.
                    breakdown.push({ label: t('breakdown.hypothermia'), value: 0 });
                }

                // Mud / Trail Conditions Analysis
                // v04: Volumetric Soil Moisture (m³/m³) from OpenMeteo
                // Saturation is typically around 0.45-0.50.
                if (dayWeather.mudIndex > 0.40) {
                    const penalty = -30;
                    score += penalty;
                    reasons.push(t('reason.mud.very', { index: dayWeather.mudIndex.toFixed(2) }));
                    breakdown.push({ label: t('breakdown.mud'), value: penalty });
                } else if (dayWeather.mudIndex > 0.35) {
                    const penalty = -10;
                    score += penalty;
                    reasons.push(t('reason.mud'));
                    breakdown.push({ label: t('breakdown.mud'), value: penalty });
                } else {
                    breakdown.push({ label: t('breakdown.mud'), value: 0 });
                }

                // Acclimatization Risk (Seasonality)
                // Apparent Temp logic for acclim
                const month = currentDate.getMonth();
                if (month >= 3 && month <= 5) { // Spring
                    if (temp > 15) { // Sudden Heat
                        score -= 10;
                        reasons.push(t('reason.accum.heat'));
                        breakdown.push({ label: t('breakdown.acclimatization'), value: -10 });
                    }
                } else if (month >= 8 && month <= 10) { // Autumn
                    if (temp < 5) { // Sudden Cold
                        score -= 10;
                        reasons.push(t('reason.accum.cold'));
                        breakdown.push({ label: t('breakdown.acclimatization'), value: -10 });
                    } else {
                        breakdown.push({ label: t('breakdown.acclimatization'), value: 0 });
                    }
                } else {
                    breakdown.push({ label: t('breakdown.acclimatization'), value: 0 });
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
            conflicts,
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
