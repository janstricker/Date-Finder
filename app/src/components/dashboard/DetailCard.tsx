import type { DayScore } from '../../lib/scoring';
import { format } from 'date-fns';

interface DetailCardProps {
    dayScore: DayScore | null;
}

export function DetailCard({ dayScore }: DetailCardProps) {
    if (!dayScore) {
        return (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg space-y-6 animate-pulse opacity-60">
                <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="h-12 bg-gray-200 rounded"></div>
                    <div className="h-12 bg-gray-200 rounded"></div>
                </div>
            </div>
        )
    }



    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg sticky top-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{format(dayScore.date, 'EEEE, d. MMMM')}</h2>
                    <div className="group relative inline-block">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase tracking-wide mt-1 cursor-help
                    ${dayScore.status === 'green' ? 'bg-emerald-100 text-emerald-700' : ''}
                    ${dayScore.status === 'yellow' ? 'bg-amber-100 text-amber-700' : ''}
                    ${dayScore.status === 'red' ? 'bg-rose-100 text-rose-700' : ''}
                 `}>
                            {dayScore.status} Match ({Math.round(dayScore.score)}%)
                        </span>
                        {/* Breakdown Tooltip */}
                        <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 text-white rounded-lg shadow-xl p-3 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <div className="text-xs font-semibold mb-2 text-gray-300 uppercase tracking-wider border-b border-white/20 pb-1">Score Formula</div>
                            <div className="space-y-1.5">
                                {dayScore.breakdown?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="text-gray-300">{item.label}</span>
                                        <span className={`font-mono font-medium ${item.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {item.value > 0 ? '+' : ''}{item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 pt-2 border-t border-white/20 flex justify-between items-center text-xs font-bold">
                                <span>Final Score</span>
                                <span className={dayScore.score >= 80 ? 'text-emerald-400' : dayScore.score >= 40 ? 'text-amber-400' : 'text-rose-400'}>
                                    {Math.round(dayScore.score)}
                                </span>
                            </div>
                        </div>
                    </div>
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
                                        <span className="text-red-500">•</span>
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
                                    <div className="text-xs text-gray-400 mb-1">Rain Risk</div>
                                    <div className={`font-semibold ${dayScore.details.weather.rainProbability > 20 ? 'text-amber-600' : 'text-gray-800'}`}>
                                        {Math.round(dayScore.details.weather.rainProbability)}%
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="text-xs text-gray-400">Trail Condition</div>
                                        {(() => {
                                            const mud = dayScore.details.weather.mudIndex;
                                            let label = 'Perfect';
                                            let color = 'text-emerald-600';
                                            let level = 1;

                                            if (mud > 15) { label = 'Very Muddy'; color = 'text-red-600'; level = 5; }
                                            else if (mud > 8) { label = 'Muddy'; color = 'text-orange-600'; level = 4; }
                                            else if (mud > 5) { label = 'Damp'; color = 'text-yellow-600'; level = 3; }
                                            else if (mud > 2) { label = 'Good'; color = 'text-emerald-500'; level = 2; }

                                            return <div className={`text-xs font-bold ${color}`}>{label}</div>;
                                        })()}
                                    </div>

                                    {/* 5-Step Visual */}
                                    <div className="flex gap-1 h-2">
                                        {[1, 2, 3, 4, 5].map((step) => {
                                            const mud = dayScore.details.weather.mudIndex;
                                            // Determine threshold for each step
                                            // 1: >0, 2: >2, 3: >5, 4: >8, 5: >15
                                            // Actually simpler: map level 1-5 calculated above.

                                            let active = false;
                                            let stepColor = 'bg-gray-100';

                                            // Determine current level again for clarity or reuse calc
                                            let currentLevel = 1;
                                            if (mud > 15) currentLevel = 5;
                                            else if (mud > 8) currentLevel = 4;
                                            else if (mud > 5) currentLevel = 3;
                                            else if (mud > 2) currentLevel = 2;

                                            active = step <= currentLevel;

                                            if (active) {
                                                if (currentLevel === 1) stepColor = 'bg-emerald-400';
                                                if (currentLevel === 2) stepColor = 'bg-emerald-500';
                                                if (currentLevel === 3) stepColor = 'bg-yellow-400';
                                                if (currentLevel === 4) stepColor = 'bg-orange-500';
                                                if (currentLevel === 5) stepColor = 'bg-red-500';
                                            }

                                            return (
                                                <div
                                                    key={step}
                                                    className={`flex-1 rounded-full ${stepColor} transition-colors`}
                                                />
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between mt-1 px-0.5">
                                        <span className="text-[9px] text-gray-400">Dry</span>
                                        <span className="text-[9px] text-gray-400">Wet</span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Historical Chart */}
                        {dayScore.details.weather?.history && (
                            <div className="col-span-2 mt-4 pt-4 border-t border-gray-100">
                                <div className="flex justify-between items-end mb-4">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Historical Context (10y)</h4>
                                    {/* Legend */}
                                    <div className="flex gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded bg-blue-300"></div>
                                            <span className="text-[10px] text-gray-500">Rain</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                            <span className="text-[10px] text-gray-500">Temp</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative h-32 w-full flex items-end gap-1 pb-6">
                                    {/* Grid lines (simplified) */}
                                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                                        <div className="border-t border-gray-900 w-full"></div>
                                        <div className="border-t border-gray-900 w-full"></div>
                                        <div className="border-t border-gray-900 w-full"></div>
                                        <div className="border-t border-gray-900 w-full"></div>
                                    </div>

                                    {dayScore.details.weather.history.temps.map((temp, i) => {
                                        const rain = dayScore.details.weather!.history.rain[i];
                                        const year = dayScore.date.getFullYear() - 10 + i;
                                        const rainHeight = Math.min(100, (rain / 20) * 100); // 20mm max
                                        const tempHeight = Math.min(100, Math.max(0, (temp / 35) * 100)); // 35C max

                                        return (
                                            <div key={year} className="flex-1 group relative flex flex-col justify-end h-full hover:bg-gray-50 rounded-sm transition-colors cursor-pointer">
                                                <div className="flex justify-center items-end h-full gap-[2px] px-[2px]">
                                                    {/* Rain Bar */}
                                                    <div
                                                        className="w-1.5 bg-blue-300 rounded-t-[1px] opacity-80 group-hover:opacity-100 transition-all"
                                                        style={{ height: `${rainHeight}%` }}
                                                    ></div>
                                                    {/* Temp Bar (represented as a thinner line/bar or marker? User asked for bar chart design) */}
                                                    {/* Let's do side-by-side bars */}
                                                    <div
                                                        className="w-1.5 bg-orange-300 rounded-t-[1px] opacity-80 group-hover:opacity-100 transition-all"
                                                        style={{ height: `${tempHeight}%` }}
                                                    ></div>
                                                </div>

                                                {/* Year Label */}
                                                <div className="absolute top-full left-0 w-full text-center text-[9px] text-gray-400 mt-1">
                                                    {year}
                                                </div>

                                                {/* Tooltip */}
                                                <div className="absolute bottom-[90%] left-1/2 -translate-x-1/2 hidden group-hover:block z-20">
                                                    <div className="bg-white border text-xs rounded shadow-xl p-2 min-w-[100px] text-center">
                                                        <div className="font-bold text-gray-900 mb-1">{year}</div>
                                                        <div className="flex justify-between items-center text-blue-600 mb-0.5">
                                                            <span>Rain</span>
                                                            <span className="font-medium">{rain.toFixed(1)}mm</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-orange-600">
                                                            <span>Temp</span>
                                                            <span className="font-medium">{temp.toFixed(1)}°C</span>
                                                        </div>
                                                    </div>
                                                    {/* Arrow */}
                                                    <div className="w-2 h-2 bg-white border-r border-b border-gray-200 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}
