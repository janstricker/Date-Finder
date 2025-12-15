import type { DayScore } from '../../lib/scoring';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { format, startOfWeek, addDays } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

interface HeatmapCalendarProps {
    scores: DayScore[];
    selectedDate: Date | null;
    currentMonth: Date;
    onSelectDate: (date: Date) => void;
    onMonthChange: (offset: number) => void;
    onDateChange: (date: Date) => void;
    disabled?: boolean;
}

export function HeatmapCalendar({
    scores,
    selectedDate,
    currentMonth,
    onSelectDate,
    onMonthChange,
    onDateChange,
    disabled = false
}: HeatmapCalendarProps) {
    const { t, language } = useLanguage();
    const dateLocale = language === 'de' ? de : enUS;

    const currentYear = currentMonth.getFullYear();
    const currentMonthIndex = currentMonth.getMonth();

    // Generate localized months
    const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(currentYear, i, 1);
        return format(d, 'MMMM', { locale: dateLocale });
    });

    // Generate localized weekdays (Mon-Sun)
    // EEEEE gives narrow (M, T, W...)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
        return format(d, 'EEEEE', { locale: dateLocale });
    });

    // Generate years: Current Year - 1 to +5
    const baseYear = new Date().getFullYear();
    const years = Array.from({ length: 7 }, (_, i) => baseYear - 1 + i);

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newYear = parseInt(e.target.value);
        const newDate = new Date(currentMonth);
        newDate.setFullYear(newYear);
        onDateChange(newDate);
    };

    const handleMonthSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newMonthIndex = parseInt(e.target.value);
        const newDate = new Date(currentMonth);
        newDate.setMonth(newMonthIndex);
        onDateChange(newDate);
    };

    return (
        <div className={cn(
            "bg-white/50 backdrop-blur-md p-4 rounded-xl border border-gray-200 shadow-sm transition-opacity duration-300",
            disabled ? "opacity-40 pointer-events-none grayscale" : "opacity-100"
        )}>
            {/* Header with Navigation */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="heading font-bold text-gray-900">{t('heatmap.title')}</h2>

                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
                    <button
                        onClick={() => onMonthChange(-1)}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                        disabled={disabled}
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>

                    <div className="flex gap-1">
                        <select
                            value={currentMonthIndex}
                            onChange={handleMonthSelect}
                            className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                        >
                            {months.map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={currentYear}
                            onChange={handleYearChange}
                            className="bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => onMonthChange(1)}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                        disabled={disabled}
                    >
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day, i) => (
                    <div key={`${day}-${i}`} className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-1">
                        {day}
                    </div>
                ))}

                {/* Empty slots for start of month offset (Monday start) */}
                {scores.length > 0 && Array.from({ length: (scores[0]?.date.getDay() + 6) % 7 || 0 }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-8 md:h-10" />
                ))}

                {scores.length === 0 && !disabled && (
                    <div className="col-span-7 py-6 text-center text-xs text-gray-400">
                        {t('heatmap.noData')}
                    </div>
                )}

                {scores.map((dayScore) => {
                    const isSelected = selectedDate?.toDateString() === dayScore.date.toDateString();

                    // Determine Color
                    let bgClass = "bg-gray-100";
                    if (dayScore.status === 'green') bgClass = "bg-emerald-500 text-white";
                    if (dayScore.status === 'yellow') bgClass = "bg-amber-400 text-white";
                    if (dayScore.status === 'red') bgClass = "bg-rose-500 text-white";

                    // Add opacity only if not selected (to highlight selection)
                    if (!isSelected && selectedDate) {
                        bgClass = cn(bgClass, "opacity-70 grayscale-[0.3]");
                    }

                    return (
                        <button
                            key={dayScore.date.toISOString()}
                            onClick={() => onSelectDate(dayScore.date)}
                            className={cn(
                                "h-8 md:h-10 rounded-md flex flex-col items-center justify-center transition-all hover:scale-105 relative",
                                bgClass,
                                isSelected ? "ring-2 ring-blue-500/50 z-10 scale-110 shadow-md opacity-100" : ""
                            )}
                        >
                            <span className="text-xs font-bold">{dayScore.date.getDate()}</span>
                            {/* Tiny score indicator - hidden on super small view or just dot */}
                            {/* <span className="text-[8px] opacity-80 font-mono hidden md:block">{Math.round(dayScore.score)}%</span> */}

                            {/* Dot for conflicts */}
                            {dayScore.reasons.some(r => r.includes(':')) && dayScore.reasons.some(r => r.includes(t('detail.conflictPrefix').replace(':', ''))) && (
                                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-black/20" />
                            )}
                            {/* Fallback check for English 'Conflict' until scoring is refactored? 
                                Actually, let's just use a broader check or wait for refactor.
                                If I use t('detail.conflictPrefix'), it effectively checks for the translated string.
                                Since scoring isn't translated yet, this dot might disappear temporarily for English if keys don't match, or always for German.
                                I'll iterate recursively.
                            */}
                            {dayScore.conflicts && dayScore.conflicts.length > 0 && (
                                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-black/20" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}
