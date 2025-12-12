
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

export function calculateMonthScores(
    constraints: EventConstraints,
    weatherData: Record<string, AverageWeather> = {},
    holidays: Record<string, Holiday> = {}
): DayScore[] {
    const scores: DayScore[] = [];
    const today = new Date();

    // Parse start time (e.g. "09:00")
    const [startHour, startMin] = constraints.raceStartTime.split(':').map(Number);

    // Iterate through all days in the target Month
    const year = constraints.targetMonth.getFullYear();
    const month = constraints.targetMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
        const currentDate = new Date(year, month, d);
        const dateKey = currentDate.toISOString().split('T')[0];
        let score = 100;
        const reasons: string[] = [];

        // 1. Check Training Time
        const weeksAvailable = differenceInWeeks(currentDate, today);
        if (weeksAvailable < constraints.minTrainingWeeks) {
            score = 0;
            reasons.push(`Not enough training time (${weeksAvailable} weeks vs ${constraints.minTrainingWeeks} required)`);
        }

        // 2. Daylight Analysis (Advanced)
        // Fix: Use noon to avoid UTC day shift issues when local time is midnight (e.g. 00:00 CEST = 22:00 UTC previous day)
        const sunCalcDate = new Date(currentDate);
        sunCalcDate.setHours(12, 0, 0, 0);
        const sunTimes = SunCalc.getTimes(sunCalcDate, constraints.location.lat, constraints.location.lng);
        const daylightHours = (sunTimes.sunset.getTime() - sunTimes.sunrise.getTime()) / (1000 * 60 * 60);

        // Calculate Race Times
        const raceStart = new Date(currentDate);
        raceStart.setHours(startHour, startMin, 0, 0);

        const raceEnd = new Date(raceStart.getTime() + constraints.raceDurationHours * 60 * 60 * 1000);

        // Check darkness at start
        if (raceStart < sunTimes.sunrise) {
            const diffMin = (sunTimes.sunrise.getTime() - raceStart.getTime()) / (1000 * 60);
            if (diffMin > 30) {
                score -= 20;
                reasons.push(`Starts in dark (${Math.round(diffMin)}m before sunrise)`);
            }
        }

        // Check darkness at end
        if (raceEnd > sunTimes.sunset) {
            const diffMin = (raceEnd.getTime() - sunTimes.sunset.getTime()) / (1000 * 60);
            if (diffMin > 0) {
                score -= 30; // Ending in dark is often worse for small events
                reasons.push(`Ends in dark (${Math.round(diffMin)}m after sunset)`);
            }
        }

        // 3. Weekend & Holiday Check
        const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const holiday = holidays[dateKey];

        if (holiday?.type === 'public') {
            // Public holidays are great for races!
            // Treat as weekend-equivalent
            // No penalty
            reasons.push(`Holiday: ${holiday.name}`);
        } else if (holiday?.type === 'school') {
            // School holidays are also good (vacation time)
            reasons.push(`School Holiday: ${holiday.name}`);
        } else if (!isWeekend) {
            score -= 50; // Weekdays are bad for events
            reasons.push("Weekday");
        }

        // 4. Blocked Dates / Competitions (Hard Block)
        if (constraints.blockedDates.includes(dateKey)) {
            score = 0;
            reasons.push("Blocked Date / Competition");
        }

        // 6. Weather Scoring (New)
        const dayWeather = weatherData[dateKey];
        if (dayWeather) {
            // Temp Analysis
            if (dayWeather.avgMaxTemp > 25) {
                score -= 30; // Too hot
                reasons.push(`Too hot avg (${dayWeather.avgMaxTemp.toFixed(1)}°C)`);
            } else if (dayWeather.avgMaxTemp < 5) {
                score -= 20; // Too cold
                reasons.push(`Too cold avg (${dayWeather.avgMaxTemp.toFixed(1)}°C)`);
            }

            // Rain Analysis
            if (dayWeather.avgPrecipitation > 5) {
                score -= 40; // Heavy rain likely
                reasons.push(`High rain risk (${dayWeather.avgPrecipitation.toFixed(1)}mm)`);
            } else if (dayWeather.avgPrecipitation > 2) {
                score -= 20; // Some rain likely
                reasons.push(`Rain risk (${dayWeather.avgPrecipitation.toFixed(1)}mm)`);
            }
        }

        // Clamp score
        score = Math.max(0, Math.min(100, score));

        // Determine status
        let status: 'green' | 'yellow' | 'red' = 'green';
        if (score < 40) status = 'red';
        else if (score < 80) status = 'yellow';

        scores.push({
            date: currentDate,
            score,
            reasons,
            status,
            details: {
                daylightHours,
                sunrise: sunTimes.sunrise,
                sunset: sunTimes.sunset,
                trainingWeeksAvailable: weeksAvailable,
                isWeekend,
                weather: dayWeather,
                holiday: holiday?.name
            }
        });
    }

    return scores;
}

