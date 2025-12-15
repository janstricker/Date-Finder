import { useState } from 'react';
import type { DayScore } from '../../lib/scoring';
import { useLanguage } from '../../context/LanguageContext';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Award, Calendar, Thermometer, CloudRain, Wind, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

interface TopDaysListProps {
    scores: DayScore[];
    onSelectDay: (date: Date) => void;
}

export function TopDaysList({ scores, onSelectDay }: TopDaysListProps) {
    const { t, language } = useLanguage();
    const [isExpanded, setIsExpanded] = useState(false);

    // 1. Sort by score (desc)
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const top10 = sorted.slice(0, 10);

    // Determine visible items
    const visibleItems = isExpanded ? top10 : top10.slice(0, 3);

    const locale = language === 'de' ? de : enUS;

    if (top10.length === 0 || top10[0].score === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center h-[200px] flex flex-col items-center justify-center">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <Calendar className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">{t('top10.title')}</h3>
                <p className="text-gray-500 mt-1">{t('top10.empty')}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-gray-900">{t('top10.title')}</h2>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-grow">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th className="px-4 py-3 w-12 text-center">#</th>
                            <th className="px-4 py-3">{t('top10.date')}</th>
                            <th className="px-4 py-3 text-center">{t('top10.score')}</th>
                            <th className="px-4 py-3 hidden sm:table-cell">{t('top10.conditions')}</th>
                            <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {visibleItems.map((day, index) => {
                            // Weather quick stats
                            const temp = day.details.weather?.avgMaxTemp.toFixed(0) || '-';
                            const rainProb = day.details.weather ? Math.round(day.details.weather.rainProbability) : 0;
                            const wind = day.details.weather?.maxWindSpeed.toFixed(0) || '-';

                            // Rank Badge color
                            let rankColor = 'bg-gray-100 text-gray-600';
                            if (index === 0) rankColor = 'bg-amber-100 text-amber-700 font-bold ring-1 ring-amber-200';
                            if (index === 1) rankColor = 'bg-slate-200 text-slate-700 font-bold';
                            if (index === 2) rankColor = 'bg-orange-100 text-orange-800 font-bold';

                            return (
                                <tr
                                    key={day.date.toISOString()}
                                    onClick={() => onSelectDay(day.date)}
                                    className="hover:bg-blue-50 transition-colors cursor-pointer group"
                                >
                                    <td className="px-4 py-3 text-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mx-auto ${rankColor}`}>
                                            {index + 1}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-semibold text-gray-900">
                                            {format(day.date, 'EEE, d. MMM', { locale })}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {format(day.date, 'yyyy', { locale })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                            ${day.score >= 80 ? 'bg-emerald-100 text-emerald-800' :
                                                day.score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                            {day.score}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 hidden sm:table-cell">
                                        <div className="flex items-center gap-3 text-xs text-gray-600">
                                            <span className="flex items-center gap-1" title={t('detail.tooltip.temp')}>
                                                <Thermometer className="w-3.5 h-3.5 text-gray-400" />
                                                {temp}°
                                            </span>
                                            {rainProb > 0 && (
                                                <span className="flex items-center gap-1" title={t('detail.rainRisk')}>
                                                    <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                                                    {rainProb}%
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1" title={t('detail.tooltip.wind')}>
                                                <Wind className="w-3.5 h-3.5 text-gray-400" />
                                                {wind}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Expand / Collapse Button */}
            {top10.length > 3 && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full p-3 bg-gray-50 hover:bg-gray-100 border-t border-gray-200 text-sm font-medium text-gray-600 flex items-center justify-center gap-2 transition-colors"
                >
                    {isExpanded ? (
                        <>
                            <span>{t('top10.show_less')}</span>
                            <ChevronUp className="w-4 h-4" />
                        </>
                    ) : (
                        <>
                            <span>{t('top10.show_more')}</span>
                            <ChevronDown className="w-4 h-4" />
                        </>
                    )}
                </button>
            )}
        </div>
    );
}
