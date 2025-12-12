import type { DayScore } from '../../lib/scoring';
import { cn } from '../../lib/utils';

interface HeatmapCalendarProps {
    scores: DayScore[];
    selectedDate: Date | null;
    onSelectDate: (date: Date) => void;
}

export function HeatmapCalendar({ scores, selectedDate, onSelectDate }: HeatmapCalendarProps) {
    return (
        <div className="bg-white/50 backdrop-blur-md p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">2. Suitability Heatmap</h2>

            <div className="grid grid-cols-7 gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider py-2">
                        {day}
                    </div>
                ))}

                {/* Empty slots for start of month offset (Monday start) */}
                {Array.from({ length: (scores[0]?.date.getDay() + 6) % 7 || 0 }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-14 md:h-20" />
                ))}

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
                                "h-14 md:h-20 rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105 relative",
                                bgClass,
                                isSelected ? "ring-4 ring-blue-500/50 z-10 scale-105 shadow-lg opacity-100" : ""
                            )}
                        >
                            <span className="text-lg font-bold">{dayScore.date.getDate()}</span>
                            {/* Tiny score indicator */}
                            <span className="text-[10px] opacity-80 font-mono">{Math.round(dayScore.score)}%</span>

                            {/* Dot for conflicts */}
                            {dayScore.reasons.some(r => r.includes('Conflict')) && (
                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-black/20" />
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    );
}
