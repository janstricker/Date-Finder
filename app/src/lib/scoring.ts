
import SunCalc from 'suncalc';
import { differenceInWeeks } from 'date-fns';
import type { WeatherStats } from './weather';

export interface EventConstraints {
    targetMonth: Date; // The first day of the target month
    location: {
        lat: number;
        lng: number;
        name?: string;
    };
    stateCode: string; // "BY", "BE", etc.
    minTrainingWeeks: number;
    // minDaylightHours?: number; // Deprecated by specific timing
    raceStartTime: string; // "09:00"
    raceDurationHours: number; // e.g. 6.5
    distance: number; // in km
    blockedDates: string[]; // ["2026-09-27"]
    // New Configs
    negativeHolidayImpact: boolean;
    incorporateTrainingTime: boolean;
    allowWeekends: boolean;
    allowWeekdays: boolean;
    considerHolidays: boolean;
}

export interface DayScore {
    date: Date;
    score: number; // 0-100
    reasons: string[]; // "Too dark", "Conflict with Berlin Marathon"
    breakdown: { label: string; value: number }[]; // [{ label: "Base Score", value: 100 }, { label: "Holiday", value: -30 }]
    status: 'green' | 'yellow' | 'red';
    details: {
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
    };
}



import type { Holiday } from './holidays';

import { formatDuration } from './utils';

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
            // This should ideally not happen if loop is correct, but as a safeguard
            score = 0;
            // reasons.push("Wrong Month"); // Implicit
        }

        // 1. Check Training Time (Optional)
        const weeksAvailable = differenceInWeeks(currentDate, today);
        if (constraints.incorporateTrainingTime) {
            if (weeksAvailable < constraints.minTrainingWeeks) {
                // If checking prep time, this is critical
                const penalty = -100;
                score = 0;
                reasons.push(`Not enough training time (${weeksAvailable} weeks vs ${constraints.minTrainingWeeks} required)`);
                breakdown.push({ label: 'Insufficient Training Time', value: penalty });
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
        // We need to calculate how much of the race is in DARKNESS.

        // Parse start time to get hours relative to currentDate
        const [startH, startM] = constraints.raceStartTime.split(':').map(Number);
        const raceStart = new Date(currentDate);
        raceStart.setHours(startH, startM, 0, 0);

        const raceEnd = new Date(raceStart);
        raceEnd.setMinutes(raceEnd.getMinutes() + constraints.raceDurationHours * 60);

        // Get Sun times
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
                // Wait, reviewing previous code... lines 182-183 were commented out.
                // Ah, line 184 just pushed reason.
                reasons.push(`${formatDuration(darknessHours)} Night`);
                // Calculate penalty proportional to hours, e.g. -5 per hour?
                // For now, sticking to previous behavior (likely implicitly penalizing via other means or just warning)
                // But let's separate "reason" from "score impact".
                // If existing logic doesn't penalize, we push 0.
                breakdown.push({ label: 'Night Hours', value: 0 });
            } else {
                breakdown.push({ label: 'Night Hours', value: 0 });
            }
        } else {
            breakdown.push({ label: 'Night Hours', value: 0 });
        }

        // 5. Weather check (Historical)
        if (weatherData) {
            // Check weather for this specific day (YYYY-MM-DD key)
            const dayWeather = weatherData[dateKey];

            if (dayWeather) {
                // Temp Analysis (Ultra Specific: 50k-100k)
                // Ideal: 5°C - 12°C
                // Acceptable: 0°C - 18°C
                // Poor: > 18°C or < 0°C
                // Critical: > 25°C or < -5°C

                const temp = dayWeather.avgMaxTemp;
                const humidity = dayWeather.avgHumidity;
                const wind = dayWeather.maxWindSpeed;

                // Humidity Adjustment: High humidity (>70%) lowers heat tolerance by ~3°C
                // Effectively, if humid, we treat the temp as 3°C higher for penalty calculation context (Heat Index proxy)
                const effectiveTemp = (humidity > 70) ? temp + 3 : temp;

                let tempPenalty = 0;
                let tempLabel = 'Ideal Temp';

                if (effectiveTemp >= 5 && effectiveTemp <= 12) {
                    // Note: using effectiveTemp might shift a 10°C (Ideal) to 13°C (Warm) if humid.
                    // But humidity usually affects "Feels Like" mainly in heat.
                    // The requirement says: reduce "Hot" threshold by 3°C.
                    // So let's stick to the specific thresholds for simplicity and clarity.
                    // Actually, using effectiveTemp for the check is the cleanest way to "shift thresholds".
                }

                // Refined Logic using specific thresholds per plan to avoid over-penalizing ideal range
                // Use 'temp' for cold checks, 'effectiveTemp' for heat checks?
                // Let's keep it simple:
                // >18 is Poor. If humid, >15 is Poor.
                // >25 is Critical. If humid, >22 is Critical.

                // Let's re-eval strictly:

                if (temp >= 5 && temp <= 12) {
                    tempPenalty = 0;
                    tempLabel = `Ideal Temp (${temp.toFixed(1)}°C)`;
                } else if (temp > 12) {
                    // Heat Side
                    // Check strict thresholds modified by humidity
                    const limitWarm = (humidity > 70) ? 15 : 18; // Above this is Hot/Poor
                    const limitHot = (humidity > 70) ? 22 : 25;  // Above this is Critical

                    if (temp <= limitWarm) {
                        // 12-18 (or 12-15 if humid)
                        tempPenalty = -10;
                        tempLabel = `Warm (${temp.toFixed(1)}°C)`;
                    } else if (temp <= limitHot) {
                        // 18-25 (or 15-22 if humid)
                        tempPenalty = -20;
                        tempLabel = (humidity > 70) ? `Humid & Hot (${temp.toFixed(1)}°C)` : `Hot (${temp.toFixed(1)}°C)`;
                    } else {
                        // >25 (or >22 if humid)
                        tempPenalty = -30;
                        tempLabel = `Very Hot (${temp.toFixed(1)}°C)`;
                    }
                } else {
                    // Cold Side (< 5)
                    // Windchill Factor
                    const isWindy = wind > 20; // 20km/h threshold
                    let windPenalty = 0;

                    if (temp >= 0) {
                        tempPenalty = -10;
                        tempLabel = `Chilly (${temp.toFixed(1)}°C)`;
                        if (isWindy) {
                            windPenalty = -10;
                            tempLabel += ' + Windchill';
                        }
                    } else if (temp >= -5) {
                        tempPenalty = -20;
                        tempLabel = `Freezing (${temp.toFixed(1)}°C)`;
                        if (isWindy) {
                            windPenalty = -15; // Stronger windchill penalty in freezing
                            tempLabel += ' + Severe Windchill';
                        }
                    } else {
                        tempPenalty = -30;
                        tempLabel = `Deep Freeze (${temp.toFixed(1)}°C)`;
                    }

                    tempPenalty += windPenalty;
                }

                if (tempPenalty !== 0) {
                    score += tempPenalty;
                    reasons.push(tempLabel);
                    breakdown.push({ label: tempLabel, value: tempPenalty });
                } else {
                    // It's ideal, maybe show it in breakdown as +0?
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


        // Clamp Score
        score = Math.max(0, Math.min(100, score));

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
                raceDuration: constraints.raceDurationHours
            }
        });
    }

    return scores;
}

