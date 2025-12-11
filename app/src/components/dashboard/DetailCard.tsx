import type { DayScore } from '../../lib/scoring';
import { format } from 'date-fns';

interface DetailCardProps {
    dayScore: DayScore | null;
}

export function DetailCard({ dayScore }: DetailCardProps) {
    if (!dayScore) {
        return (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-6 flex items-center justify-center text-gray-400">
                Select a date to see analysis
            </div>
        )
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg sticky top-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{format(dayScore.date, 'EEEE, d. MMMM')}</h2>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase tracking-wide mt-1
                ${dayScore.status === 'green' ? 'bg-emerald-100 text-emerald-700' : ''}
                ${dayScore.status === 'yellow' ? 'bg-amber-100 text-amber-700' : ''}
                ${dayScore.status === 'red' ? 'bg-rose-100 text-rose-700' : ''}
             `}>
                        {dayScore.status} Match ({Math.round(dayScore.score)}%)
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                {/* Reasons / Blockers */}
                <div className="space-y-4">
                    {/* Reasons */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Analysis</h3>
                        {dayScore.reasons.length > 0 ? (
                            <ul className="space-y-1">
                                {dayScore.reasons.map((reason, i) => (
                                    <li key={i} className="text-sm font-medium text-gray-700 flex items-start gap-2">
                                        <span className="text-red-500 mt-1">•</span>
                                        {reason}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-sm text-green-600 font-medium flex items-center gap-2">
                                <span>✓</span> Perfect conditions
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs text-gray-400 mb-1">Sunrise / Sunset</div>
                            <div className="font-semibold text-gray-800 text-sm">
                                {format(dayScore.details.sunrise, 'HH:mm')} - {format(dayScore.details.sunset, 'HH:mm')}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">({dayScore.details.daylightHours.toFixed(1)}h daylight)</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 mb-1">Training Prep</div>
                            <div className="font-semibold text-gray-800">{dayScore.details.trainingWeeksAvailable} weeks</div>
                        </div>
                        {dayScore.details.weather && (
                            <>
                                <div>
                                    <div className="text-xs text-gray-400 mb-1">Avg High Temp</div>
                                    <div className="font-semibold text-gray-800">{dayScore.details.weather.avgMaxTemp.toFixed(1)}°C</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400 mb-1">Avg Rain</div>
                                    <div className="font-semibold text-gray-800">{dayScore.details.weather.avgPrecipitation.toFixed(1)}mm</div>
                                </div>
                            </>
                        )}
                        {dayScore.details.holiday && (
                            <div className="col-span-2 bg-blue-50 p-2 rounded text-blue-800 text-sm font-medium flex items-center gap-2">
                                <span>🎉</span> {dayScore.details.holiday}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
