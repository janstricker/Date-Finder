
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
        sunrise: Date;
        sunset: Date;
        trainingWeeksAvailable: number;
        isWeekend: boolean;
        weather?: WeatherStats;
        holiday?: string; // Name of holiday if any
    };
}



import type { Holiday } from './holidays';

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
            // score -= Math.round(darknessHours * 5); // 5 points per hour
            // reasons.push(`${Math.round(darknessHours * 10) / 10}h Darkness`);
            if (darknessHours > 0.5) {
                // Approximate penalty?
                // Let's explicitly calculate it or reuse logic
                // Previous logic wasn't deducting points explicitly here in original code?
                // Wait, reviewing previous code... lines 182-183 were commented out.
                // Ah, line 184 just pushed reason.
                reasons.push(`${Math.round(darknessHours * 10) / 10}h Night`);
                // If no points deduction, value is 0
                // breakdown.push({ label: 'Night Hours', value: 0 }); 
            }
        }

        // 5. Weather check (Historical)
        if (weatherData) {
            // Check weather for this specific day (YYYY-MM-DD key)
            const dayWeather = weatherData[dateKey];

            if (dayWeather) {
                // Temp Analysis
                if (dayWeather.avgMaxTemp > 25) {
                    const penalty = -30;
                    score += penalty; // Too hot
                    reasons.push(`Hot (${dayWeather.avgMaxTemp.toFixed(1)}°C)`);
                    breakdown.push({ label: `Hot (${dayWeather.avgMaxTemp.toFixed(1)}°C)`, value: penalty });
                } else if (dayWeather.avgMaxTemp < 5) {
                    const penalty = -20;
                    score += penalty; // Too cold
                    reasons.push(`Cold (${dayWeather.avgMaxTemp.toFixed(1)}°C)`);
                    breakdown.push({ label: `Cold (${dayWeather.avgMaxTemp.toFixed(1)}°C)`, value: penalty });
                }

                // Rain Risk Analysis (Probability)
                if (dayWeather.rainProbability > 50) {
                    const penalty = -40;
                    score += penalty;
                    reasons.push(`High Rain Risk (${Math.round(dayWeather.rainProbability)}%)`);
                    breakdown.push({ label: 'High Rain Risk', value: penalty });
                } else if (dayWeather.rainProbability > 20) {
                    const penalty = -15;
                    score += penalty;
                    reasons.push(`Rain Risk (${Math.round(dayWeather.rainProbability)}%)`);
                    breakdown.push({ label: 'Rain Risk', value: penalty });
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
                sunrise: times.sunrise,
                sunset: times.sunset,
                trainingWeeksAvailable: weeksAvailable,
                isWeekend,
                holiday: holiday?.name,
                weather: weatherData ? weatherData[dateKey] : undefined
            }
        });
    }

    return scores;
}

