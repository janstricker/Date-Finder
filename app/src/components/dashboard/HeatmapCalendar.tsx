import type { DayScore } from '../../lib/scoring';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeatmapCalendarProps {
    scores: DayScore[];
    selectedDate: Date | null;
    currentMonth: Date;
    onSelectDate: (date: Date) => void;
    onMonthChange: (offset: number) => void;
    disabled?: boolean;
}

export function HeatmapCalendar({
    scores,
    selectedDate,
    currentMonth,
    onSelectDate,
    onMonthChange,
    disabled = false
}: HeatmapCalendarProps) {
    const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className={cn(
            "bg-white/50 backdrop-blur-md p-4 rounded-xl border border-gray-200 shadow-sm transition-opacity duration-300",
            disabled ? "opacity-40 pointer-events-none grayscale" : "opacity-100"
        )}>
            {/* Header with Navigation */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Heatmap</h2>

                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
                    <button
                        onClick={() => onMonthChange(-1)}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                        disabled={disabled}
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="text-xs font-semibold text-gray-900 min-w-[80px] text-center">
                        {monthName}
                    </span>
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
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
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
                        No data.
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
                            {dayScore.reasons.some(r => r.includes('Conflict')) && (
                                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-black/20" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}
