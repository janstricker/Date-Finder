
import SunCalc from 'suncalc';
import { differenceInWeeks } from 'date-fns';
import type { AverageWeather } from './weather';

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
    status: 'green' | 'yellow' | 'red';
    details: {
        daylightHours: number;
        sunrise: Date;
        sunset: Date;
        trainingWeeksAvailable: number;
        isWeekend: boolean;
        weather?: AverageWeather;
        holiday?: string; // Name of holiday if any
    };
}


import type { Holiday } from './holidays';

import type { Holiday } from './holidays';
import type { WeatherStats } from './weather';

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

        // 1. Check Training Time (Optional)
        const weeksAvailable = differenceInWeeks(currentDate, today);
        if (constraints.incorporateTrainingTime) {
            if (weeksAvailable < constraints.minTrainingWeeks) {
                // If checking prep time, this is critical
                score = 0;
                reasons.push(`Not enough training time (${weeksAvailable} weeks vs ${constraints.minTrainingWeeks} required)`);
            }
        }

        // 2. Blocked Dates (Manual Block)
        const dateString = currentDate.toISOString().split('T')[0];
        if (constraints.blockedDates.includes(dateString)) {
            score = 0;
            reasons.push("Blocked Date");
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
                score -= 30;
                reasons.push(`Holiday (Negative Impact): ${holiday!.name}`);
            } else {
                // Positive: Day off, good for race
                // No penalty, effectively treats as weekend
                reasons.push(`Holiday: ${holiday!.name}`);
            }
        } else if (isWeekend) {
            if (!constraints.allowWeekends) {
                score = 0;
                reasons.push("Weekend (Not allowed)");
            }
        } else {
            // It's a weekday
            if (!constraints.allowWeekdays) {
                score -= 50;
                reasons.push("Weekday (Preferred Weekend)");

                // If strictly not allowed (e.g. checkbox off), maybe make it 0? 
                // Context: Users usually prefer weekends but might do weekdays.
                // Screenshot implies "Event Day: Weekends / Weekdays". 
                // If "Weekdays" is unchecked, it probably implies they are NOT viable.
                score = 0;
                reasons.pop(); // remove "Weekday (Preferred Weekend)"
                reasons.push("Weekday (Not allowed)");
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
            if (darknessHours > 0.5) reasons.push(`${Math.round(darknessHours * 10) / 10}h Night`);
        }

        // 5. Weather check (Historical)
        if (weatherData) {
            // Check weather for this specific day (YYYY-MM-DD key)
            const dayWeather = weatherData[dateKey];

            if (dayWeather) {
                // Temp Analysis
                if (dayWeather.avgMaxTemp > 25) {
                    score -= 30; // Too hot
                    reasons.push(`Hot (${dayWeather.avgMaxTemp.toFixed(1)}°C)`);
                } else if (dayWeather.avgMaxTemp < 5) {
                    score -= 20; // Too cold
                    reasons.push(`Cold (${dayWeather.avgMaxTemp.toFixed(1)}°C)`);
                }

                // Rain Risk Analysis (Probability)
                if (dayWeather.rainProbability > 50) {
                    score -= 40;
                    reasons.push(`High Rain Risk (${Math.round(dayWeather.rainProbability)}%)`);
                } else if (dayWeather.rainProbability > 20) {
                    score -= 15;
                    reasons.push(`Rain Risk (${Math.round(dayWeather.rainProbability)}%)`);
                }

                // Mud / Trail Conditions Analysis
                if (dayWeather.mudIndex > 15) {
                    score -= 30;
                    reasons.push(`Very Muddy Trails (Index: ${dayWeather.mudIndex.toFixed(1)})`);
                } else if (dayWeather.mudIndex > 5) {
                    score -= 10;
                    reasons.push(`Muddy Trails`);
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
            status,
            details: {
                daylightHours: (times.sunset.getTime() - times.sunrise.getTime()) / 3600000,
                sunrise: times.sunrise,
                sunset: times.sunset,
                trainingWeeksAvailable: weeksAvailable,
                isWeekend,
                holiday: holiday?.name
            }
        });
    }

    return scores;
}

