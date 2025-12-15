import { useMemo } from 'react';
import type { DayScore } from '../../lib/scoring';
import { useLanguage } from '../../context/LanguageContext';
import { format, getYear } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { cn } from '../../lib/utils';

interface YearOverviewProps {
    scores: DayScore[]; // Array containing full year scores
    onMonthClick: (date: Date) => void;
    currentYear: number;
}

export function YearOverview({ scores, onMonthClick, currentYear }: YearOverviewProps) {
    const { t, language } = useLanguage();
    const dateLocale = language === 'de' ? de : enUS;

    // Group scores by month
    const monthsData = useMemo(() => {
        const groups: DayScore[][] = Array.from({ length: 12 }, () => []);

        // Filter for current year just in case, or assume scores are correct
        scores.forEach(score => {
            if (getYear(score.date) === currentYear) {
                groups[score.date.getMonth()].push(score);
            }
        });

        // Sort each group by date
        groups.forEach(g => g.sort((a, b) => a.date.getTime() - b.date.getTime()));

        return groups;
    }, [scores, currentYear]);

    const months = Array.from({ length: 12 }, (_, i) => {
        return format(new Date(currentYear, i, 1), 'MMMM', { locale: dateLocale });
    });



    return (
        <div className="bg-white/50 backdrop-blur-md p-4 rounded-xl border border-gray-200 shadow-sm animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-4">
                <h2 className="heading font-bold text-gray-900">{currentYear} {t('heatmap.title')}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {monthsData.map((monthScores, monthIndex) => (
                    <div key={monthIndex} className="bg-white border border-gray-100 rounded-lg p-2 shadow-sm flex flex-col gap-1 hover:border-blue-200 transition-colors cursor-pointer group"
                        onClick={() => {
                            // Zoom in on this month
                            const monthDate = new Date(currentYear, monthIndex, 1);
                            onMonthClick(monthDate);
                        }}>
                        <div className="text-xs font-bold text-gray-700 mb-1 group-hover:text-blue-600 transition-colors">{months[monthIndex]}</div>

                        <div className="grid grid-cols-7 gap-px pointer-events-none">
                            {/* Empty slots for start of month offset (Monday start) */}
                            {monthScores.length > 0 && Array.from({ length: (monthScores[0].date.getDay() + 6) % 7 }).map((_, i) => (
                                <div key={`empty-${i}`} className="h-2 w-2" />
                            ))}

                            {monthScores.map((day) => {
                                let bgClass = "bg-gray-100";
                                if (day.status === 'green') bgClass = "bg-emerald-500";
                                if (day.status === 'yellow') bgClass = "bg-amber-400";
                                if (day.status === 'red') bgClass = "bg-rose-500";

                                return (
                                    <div
                                        key={day.date.toISOString()}
                                        className={cn("h-2 w-2 rounded-sm", bgClass)}
                                        title={`${format(day.date, 'dd.MM', { locale: dateLocale })}: ${day.score}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
