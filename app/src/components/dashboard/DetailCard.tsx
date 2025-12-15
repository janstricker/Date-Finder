import { Info } from 'lucide-react';
import type { DayScore } from '../../lib/scoring';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { formatDuration } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';

interface DetailCardProps {
    dayScore: DayScore | null;
}

export function DetailCard({ dayScore }: DetailCardProps) {
    const { t, language } = useLanguage();
    if (!dayScore) return null;

    const dateLocale = language === 'de' ? de : enUS;

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg sticky top-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{format(dayScore.date, 'EEEE, d. MMMM', { locale: dateLocale })}</h2>
                    <div className="group relative inline-block">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide mt-1 cursor-help
                    ${dayScore.status === 'green' ? 'bg-emerald-100 text-emerald-700' : ''}
                    ${dayScore.status === 'yellow' ? 'bg-amber-100 text-amber-700' : ''}
                    ${dayScore.status === 'red' ? 'bg-rose-100 text-rose-700' : ''}
                 `}>
                            {dayScore.status === 'green' && t('detail.status.green')}
                            {dayScore.status === 'yellow' && t('detail.status.yellow')}
                            {dayScore.status === 'red' && t('detail.status.red')}
                            {' '}{t('detail.match')} ({Math.round(dayScore.score)}%)
                            <Info className="w-3 h-3" />
                        </span>
                        {/* Breakdown Tooltip */}
                        <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 text-white rounded-lg shadow-xl p-3 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <div className="text-xs font-semibold mb-2 text-gray-300 uppercase tracking-wider border-b border-white/20 pb-1">{t('detail.scoreFormula')}</div>
                            <div className="space-y-1.5">
                                {dayScore.breakdown?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className={item.value === 0 ? "text-gray-500" : "text-gray-300"}>{item.label}</span>
                                        <span className={`font-mono font-medium ${item.value > 0 ? 'text-emerald-400' :
                                            item.value < 0 ? 'text-rose-400' :
                                                'text-gray-600' // Neutral style
                                            }`}>
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
                        <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">{t('detail.summary')}</h3>
                        {dayScore.reasons.length > 0 ? (
                            <ul className="space-y-1">
                                {dayScore.reasons.map((reason, i) => {
                                    // Check if this reason corresponds to a conflict with a URL
                                    // Reason format: "Event Conflict: NAME (DISTkm)"
                                    const conflict = dayScore.conflicts?.find(c =>
                                        reason.includes(c.name)
                                    );

                                    return (
                                        <li key={i} className="text-sm font-medium text-gray-700 flex items-start gap-2">
                                            <span className="text-red-500">•</span>
                                            {conflict && conflict.url ? (
                                                <span className="flex items-center gap-1">
                                                    {t('detail.conflictPrefix')}
                                                    <a
                                                        href={conflict.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline hover:text-blue-800 transition-colors"
                                                    >
                                                        {conflict.name}
                                                    </a>
                                                    <span className="text-gray-500">({Math.round(conflict.distance)}km)</span>
                                                </span>
                                            ) : (
                                                reason
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="text-sm text-green-600 font-medium flex items-center gap-2">
                                <span>✓</span> {t('detail.perfect')}
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* 1. Daylight Chart (Full Width) */}
                        <div className="col-span-2">
                            <div className="flex flex-col gap-1 w-full">
                                <div className="flex justify-between items-end text-xs text-gray-400 mb-1">
                                    <span>{t('detail.daylight.title')} ({formatDuration(dayScore.details.daylightHours)} {t('detail.daylight')})</span>
                                </div>
                                <div className="relative w-full h-12 border border-gray-100 rounded-md overflow-hidden bg-slate-900">
                                    {(() => {
                                        const totalMins = 24 * 60;

                                        // Times
                                        const dawn = dayScore.details.dawn;
                                        const sunrise = dayScore.details.sunrise;
                                        const sunset = dayScore.details.sunset;
                                        const dusk = dayScore.details.dusk;

                                        const dawnMins = dawn.getHours() * 60 + dawn.getMinutes();
                                        const sunriseMins = sunrise.getHours() * 60 + sunrise.getMinutes();
                                        const sunsetMins = sunset.getHours() * 60 + sunset.getMinutes();
                                        const duskMins = dusk.getHours() * 60 + dusk.getMinutes();

                                        // Race
                                        const [rh, rm] = dayScore.details.raceStartTime.split(':').map(Number);
                                        const raceStartMins = rh * 60 + rm;
                                        const raceDurMins = dayScore.details.raceDuration * 60;
                                        const raceEndMins = raceStartMins + raceDurMins;

                                        // Percentages
                                        const dawnPct = (dawnMins / totalMins) * 100;
                                        const sunrisePct = (sunriseMins / totalMins) * 100;
                                        const sunsetPct = (sunsetMins / totalMins) * 100;
                                        const duskPct = (duskMins / totalMins) * 100;

                                        // Race Bar (Top)
                                        const raceStartPct = (raceStartMins / totalMins) * 100;
                                        const raceWidthPct = Math.min(100 - raceStartPct, (raceDurMins / totalMins) * 100);

                                        // Gradient for Sky
                                        // Night (Slate-900) -> Dawn (Slate-700/Blue) -> Sunrise (Orange) -> Day (Blue/Yellow) -> Sunset (Orange) -> Dusk (Slate-700) -> Night
                                        // We'll use CSS linear gradient
                                        // Stops: 
                                        // 0% -> dawnPct: Night
                                        // dawnPct -> sunrisePct: Dawn Transition (Slate -> Orange)
                                        // sunrisePct -> sunsetPct: Day (Yellow/Blue Sky)
                                        // sunsetPct -> duskPct: Dusk Transition (Orange -> Slate)
                                        // duskPct -> 100%: Night

                                        const gradient = `linear-gradient(to right, 
                                            #0f172a 0%, 
                                            #0f172a ${dawnPct}%, 
                                            #fdba74 ${sunrisePct}%, 
                                            #fde047 ${sunrisePct + 2}%, 
                                            #fde047 ${sunsetPct - 2}%, 
                                            #fdba74 ${sunsetPct}%, 
                                            #0f172a ${duskPct}%, 
                                            #0f172a 100%)`;

                                        return (
                                            <>
                                                {/* Sky Background with Gradient */}
                                                <div className="absolute inset-0" style={{ background: gradient }} />

                                                {/* Race Overlay (Top Half) */}
                                                <div
                                                    className="absolute top-0 bottom-1/2 bg-pink-500 opacity-90 border-b border-white/20 shadow-sm"
                                                    style={{ left: `${raceStartPct}%`, width: `${raceWidthPct}%` }}
                                                />

                                                {/* Markers */}
                                                {/* Sunrise/Dawn Area */}
                                                <div className="absolute top-1/2 h-1/2 w-px bg-white/20" style={{ left: `${dawnPct}%` }} />
                                                <div className="absolute top-1/2 h-1/2 w-px bg-white/50" style={{ left: `${sunrisePct}%` }}>
                                                    <div className="absolute bottom-1 -translate-x-1/2 text-[9px] text-white font-mono bg-black/50 px-0.5 rounded leading-none whitespace-nowrap">
                                                        {format(sunrise, 'HH:mm')}
                                                    </div>
                                                </div>

                                                {/* Sunset/Dusk Area */}
                                                <div className="absolute top-1/2 h-1/2 w-px bg-white/50" style={{ left: `${sunsetPct}%` }}>
                                                    <div className="absolute bottom-1 -translate-x-1/2 text-[9px] text-white font-mono bg-black/50 px-0.5 rounded leading-none whitespace-nowrap">
                                                        {format(sunset, 'HH:mm')}
                                                    </div>
                                                </div>
                                                <div className="absolute top-1/2 h-1/2 w-px bg-white/20" style={{ left: `${duskPct}%` }} />

                                                {/* Race Markers */}
                                                <div className="absolute top-0 h-1/2 w-px bg-white" style={{ left: `${raceStartPct}%` }}>
                                                    <div className="absolute top-1 -translate-x-1/2 text-[9px] text-white font-mono bg-pink-900 px-0.5 rounded leading-none z-10">{dayScore.details.raceStartTime}</div>
                                                </div>
                                                {raceEndMins < totalMins && (
                                                    <div className="absolute top-0 h-1/2 w-px bg-white" style={{ left: `${raceStartPct + raceWidthPct}%` }}>
                                                        <div className="absolute top-1 -translate-x-1/2 text-[9px] text-white font-mono bg-pink-900 px-0.5 rounded leading-none z-10">{Math.floor(raceEndMins / 60)}:{(raceEndMins % 60).toString().padStart(2, '0')}</div>
                                                    </div>
                                                )}

                                                {/* Labels for Dawn/Dusk (Optional, small triangles?) */}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* 2. Training Prep */}
                        <div>
                            <div className="text-xs text-gray-400 mb-1">{t('detail.trainingPrep')}</div>
                            <div className="font-semibold text-gray-800">{dayScore.details.trainingWeeksAvailable} {t('detail.weeks')}</div>
                        </div>

                        {/* 3. Weather Stats (if available) - Inside Grid */}
                        {dayScore.details.weather && (
                            <>
                                {/* Temp */}
                                <div>
                                    <div className="flex items-center gap-1 group relative cursor-help mb-1">
                                        <div className="text-xs text-gray-400">{t('detail.avgTemp')}</div>
                                        <Info className="w-3 h-3 text-gray-400" />
                                        <div className="absolute left-0 bottom-full mb-2 w-56 bg-slate-900 text-white rounded-lg shadow-xl p-3 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
                                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                                                {dayScore.details.persona === 'competition' ? t('config.persona.race') : t('config.persona.experience')}
                                            </div>
                                            <p className="text-[10px] leading-relaxed text-gray-300 mb-2">
                                                {dayScore.details.persona === 'competition'
                                                    ? t('config.persona.race.temp.desc')
                                                    : t('config.persona.experience.temp.desc')}
                                            </p>

                                            {dayScore.details.persona === 'competition' ? (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px]"><span className="text-emerald-400">{t('config.persona.race.temp.ideal')}</span><span>5°C - 12°C</span></div>
                                                    <div className="flex justify-between text-[10px]"><span className="text-yellow-400">{t('detail.acceptable')}</span><span>0°C - 18°C</span></div>
                                                    <div className="flex justify-between text-[10px]"><span className="text-rose-400">{t('config.persona.race.temp.penalty')}</span><span>&gt; 12°C</span></div>
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[10px]"><span className="text-emerald-400">{t('config.persona.experience.temp.ideal')}</span><span>15°C - 20°C</span></div>
                                                    <div className="flex justify-between text-[10px]"><span className="text-yellow-400">{t('detail.acceptable')}</span><span>10°C - 25°C</span></div>
                                                    <div className="flex justify-between text-[10px]"><span className="text-rose-400">{t('config.persona.experience.temp.penalty')}</span><span>&lt; 15°C</span></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="font-semibold text-gray-800">
                                        {dayScore.details.weather.avgMaxTemp.toFixed(1)}°C <span className="text-gray-400 font-normal">/</span> {dayScore.details.weather.avgMinTemp.toFixed(1)}°C
                                    </div>
                                </div>

                                {/* Humidity */}
                                <div>
                                    <div className="text-xs text-gray-400 mb-1">{t('detail.avgHumidity')}</div>
                                    <div className="font-semibold text-gray-800">{Math.round(dayScore.details.weather.avgHumidity)}%</div>
                                </div>

                                {/* Wind */}
                                <div>
                                    <div className="text-xs text-gray-400 mb-1">{t('detail.wind')}</div>
                                    <div className="font-semibold text-gray-800">{dayScore.details.weather.maxWindSpeed.toFixed(1)} km/h</div>
                                </div>

                                {/* Rain */}
                                <div>
                                    <div className="text-xs text-gray-400 mb-1">{t('detail.rainRisk')}</div>
                                    <div className={`font-semibold ${dayScore.details.weather.rainProbability > 20 ? 'text-amber-600' : 'text-gray-800'}`}>
                                        {Math.round(dayScore.details.weather.rainProbability)}%
                                    </div>
                                </div>

                                {/* Trail Condition (Col Span 2) */}
                                <div className="col-span-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-1 group relative cursor-help">
                                            <span className="text-xs text-gray-400">{t('detail.trailCondition')}</span>
                                            <Info className="w-3 h-3 text-gray-400" />
                                            <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-900 text-white rounded-lg shadow-xl p-3 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{t('detail.mudIndex')}</div>
                                                <p className="text-[10px] leading-relaxed text-gray-300">{t('detail.mudIndex.desc')}</p>
                                                <div className="mt-2 pt-2 border-t border-white/20 flex justify-between items-center">
                                                    <span className="text-[10px] text-gray-400">{t('detail.indexScore')}</span>
                                                    <span className="text-xs font-mono font-medium text-emerald-400">{dayScore.details.weather.mudIndex.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {(() => {
                                            const mud = dayScore.details.weather.mudIndex;
                                            let label = t('detail.mud.perfect');
                                            let color = 'text-emerald-600';
                                            if (mud > 15) { label = t('detail.mud.veryMuddy'); color = 'text-red-600'; }
                                            else if (mud > 8) { label = t('detail.mud.muddy'); color = 'text-orange-600'; }
                                            else if (mud > 5) { label = t('detail.mud.damp'); color = 'text-yellow-600'; }
                                            else if (mud > 2) { label = t('detail.mud.good'); color = 'text-emerald-500'; }
                                            return <div className={`text-xs font-bold ${color}`}>{label}</div>;
                                        })()}
                                    </div>
                                    <div className="flex gap-1 h-2">
                                        {[1, 2, 3, 4, 5].map((step) => {
                                            const mud = dayScore.details.weather!.mudIndex;
                                            let currentLevel = 1;
                                            if (mud > 15) currentLevel = 5;
                                            else if (mud > 8) currentLevel = 4;
                                            else if (mud > 5) currentLevel = 3;
                                            else if (mud > 2) currentLevel = 2;

                                            const active = step <= currentLevel;
                                            let stepColor = 'bg-gray-100';
                                            if (active) {
                                                if (currentLevel === 1) stepColor = 'bg-emerald-400';
                                                else if (currentLevel === 2) stepColor = 'bg-emerald-500';
                                                else if (currentLevel === 3) stepColor = 'bg-yellow-400';
                                                else if (currentLevel === 4) stepColor = 'bg-orange-500';
                                                else if (currentLevel === 5) stepColor = 'bg-red-500';
                                            }
                                            return <div key={step} className={`flex-1 rounded-full ${stepColor} transition-colors`} />;
                                        })}
                                    </div>
                                    <div className="flex justify-between mt-1 px-0.5">
                                        <span className="text-[9px] text-gray-400">Dry</span>
                                        <span className="text-[9px] text-gray-400">Wet</span>
                                    </div>
                                </div>

                                {/* Historical Chart (Col Span 2) */}
                                {/* Historical Chart (3-Panel Meteorogram) */}
                                {dayScore.details.weather.history && (
                                    <div className="col-span-2 mt-6 pt-6 border-t border-gray-100">
                                        <div className="flex justify-between items-end mb-4">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('detail.historyContext')}</h4>
                                            <div className="flex gap-4">
                                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full border border-orange-400 bg-orange-100"></div><span className="text-[10px] text-gray-500">{t('detail.graph.temp')}</span></div>
                                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-blue-400 rounded-sm"></div><span className="text-[10px] text-gray-500">{t('detail.graph.rain')}</span></div>
                                                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-teal-100 border border-teal-200"></div><span className="text-[10px] text-gray-500">{t('detail.graph.humidity')}</span></div>
                                                <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-purple-400"></div><span className="text-[10px] text-gray-500">{t('detail.graph.gusts')}</span></div>
                                            </div>
                                        </div>

                                        <div className="relative w-full select-none" style={{ height: '380px' }}>
                                            {(() => {
                                                const history = dayScore.details.weather!.history;
                                                const count = history.temps.length;

                                                // 1. Data Prep & Scales
                                                const rawMax = Math.max(...history.temps, ...history.tempsMin ?? []);
                                                const rawMin = Math.min(...history.temps, ...history.tempsMin ?? []);

                                                // Dynamic buffer: 10% of range, but respecting 0 boundary if close
                                                const range = rawMax - rawMin || 1;
                                                const buffer = Math.max(2, range * 0.2); // minimum 2 degrees buffer

                                                let maxTemp = Math.ceil(rawMax + buffer / 2);
                                                let minTemp = Math.floor(rawMin - buffer / 2);

                                                // Don't cross 0 unnecessarily
                                                if (rawMin >= 0 && minTemp < 0) minTemp = 0;

                                                const tempRange = maxTemp - minTemp || 1;

                                                const maxRain = Math.max(...history.rain, 10); // min 10mm scale

                                                // SVG Coords
                                                // We have 4 panels vertically.
                                                // Retuned for 762px height
                                                // Panel 1 (Temp): 0% - 13.5%
                                                // Gap: 12.6% (~48px)
                                                // Panel 2 (Rain): 26.1% - 39.6%
                                                // Gap: 12.6% (~48px)
                                                // Panel 3 (Hum):  52.2% - 65.7%
                                                // Gap: 12.6% (~48px)
                                                // Panel 4 (Wind): 78.3% - 91.8%
                                                // Bottom buffer: ~8.2% (~31px)

                                                const P1_H = 13.5; const P1_TOP = 0;
                                                const P2_H = 13.5; const P2_TOP = 26.1;
                                                const P3_H = 13.5; const P3_TOP = 52.2;
                                                const P4_H = 13.5; const P4_TOP = 78.3;

                                                // 2. Grid & Labels Helper
                                                const renderGridLine = (val: number, type: 'temp' | 'rain' | 'wind' | 'hum', panelTopPct: number, panelHeightPct: number, min?: number, max?: number) => {
                                                    let yLocalPct = 0;
                                                    if (type === 'temp') {
                                                        yLocalPct = 100 - ((val - (min ?? 0)) / (max ?? 1)) * 100;
                                                    } else if (type === 'rain') {
                                                        yLocalPct = 100 - (val / (max ?? 1)) * 100;
                                                    } else if (type === 'wind') {
                                                        yLocalPct = 100 - (Math.min(Math.max(0, val), 60) / 60) * 100;
                                                    } else if (type === 'hum') {
                                                        yLocalPct = 100 - val;
                                                    }

                                                    const top = panelTopPct + (yLocalPct / 100) * panelHeightPct;

                                                    // Safety check for NaN or Infinity
                                                    if (!isFinite(top)) return null;

                                                    return (
                                                        <div key={`${type}-${val}`} className="absolute w-full pointer-events-none" style={{ top: `${top}%` }}>
                                                            {/* Label (Left Aligned within container) - Widened to w-10 */}
                                                            <div className="absolute left-0 w-10 text-[9px] text-gray-500 font-mono text-right leading-none -translate-y-1/2 pr-1.5">
                                                                {val}{type === 'temp' ? '°' : type === 'rain' ? 'mm' : type === 'hum' ? '%' : type === 'wind' ? <span className="text-[8px]">km/h</span> : ''}
                                                            </div>
                                                            {/* Line (Offset to start after label) - Shifted to left-10 */}
                                                            <div className="absolute left-10 right-0 border-t border-gray-300 border-dashed"></div>
                                                        </div>
                                                    );
                                                };

                                                // Corrected getX to align with Flex-Bar centers: ((i + 0.5) / count) * 100
                                                const getX = (i: number) => ((i + 0.5) / count) * 100;

                                                // Points for Temp Range (Area)
                                                // Panel 1
                                                const tempPointsTop = history.temps.map((t, i) => {
                                                    const val = t;
                                                    const y = P1_TOP + P1_H - ((val - minTemp) / tempRange) * P1_H;
                                                    return `${getX(i)},${y}`;
                                                }).join(' ');

                                                const tempPointsBottom = (history.tempsMin ?? history.temps).map((t, i) => {
                                                    const val = t;
                                                    const y = P1_TOP + P1_H - ((val - minTemp) / tempRange) * P1_H;
                                                    return `${getX(i)},${y}`;
                                                }).reverse().join(' ');

                                                // Points for Humidity (Area)
                                                // Panel 3
                                                const humPoints = (history.humidities ?? []).map((h, i) => {
                                                    const safeH = Math.max(0, Math.min(100, h || 0));
                                                    const y = P3_TOP + P3_H - (safeH / 100) * P3_H;
                                                    return `${getX(i)},${y}`;
                                                }).join(' ');
                                                // Humidity area needs to go down to P3_TOP + P3_H
                                                const humArea = `${humPoints} 100,${P3_TOP + P3_H} 0,${P3_TOP + P3_H}`;

                                                // Points for Wind (Line)
                                                // Panel 4
                                                const windPoints = (history.winds ?? []).map((w, i) => {
                                                    const safeW = Math.max(0, w || 0); // Clamp negative/null
                                                    const y = P4_TOP + P4_H - (Math.min(safeW, 60) / 60) * P4_H;
                                                    return `${getX(i)},${y}`;
                                                }).join(' ');


                                                // Helper generating steps of 5 for Temp
                                                const tempSteps = [];
                                                for (let t = Math.ceil(minTemp / 5) * 5; t <= maxTemp; t += 5) {
                                                    tempSteps.push(t);
                                                }

                                                return (
                                                    <>
                                                        {/* Grid Lines & Labels Container - Behind everything */}
                                                        {/* No clip needed here, grid labels should be visible */}
                                                        <div className="absolute inset-0 z-0">
                                                            {/* Temp Grid - Every 5 degrees */}
                                                            {tempSteps.map(t => renderGridLine(t, 'temp', P1_TOP, P1_H, minTemp, tempRange))}

                                                            {/* Ensure 0 line if in range */}
                                                            {minTemp < 0 && maxTemp > 0 && !tempSteps.includes(0) && renderGridLine(0, 'temp', P1_TOP, P1_H, minTemp, tempRange)}

                                                            {/* Rain Grid */}
                                                            {renderGridLine(Math.ceil(maxRain), 'rain', P2_TOP, P2_H, 0, maxRain)}
                                                            {renderGridLine(Math.round(maxRain / 2), 'rain', P2_TOP, P2_H, 0, maxRain)}
                                                            {renderGridLine(0, 'rain', P2_TOP, P2_H, 0, maxRain)}

                                                            {/* Hum Grid */}
                                                            {renderGridLine(100, 'hum', P3_TOP, P3_H)}
                                                            {renderGridLine(50, 'hum', P3_TOP, P3_H)}
                                                            {renderGridLine(0, 'hum', P3_TOP, P3_H)}

                                                            {/* Wind Grid */}
                                                            {renderGridLine(60, 'wind', P4_TOP, P4_H)}
                                                            {renderGridLine(30, 'wind', P4_TOP, P4_H)}
                                                            {renderGridLine(0, 'wind', P4_TOP, P4_H)}
                                                        </div>

                                                        {/* SVGs Container (Offset right by 2.5rem/10tailwind to match labels) */}
                                                        {/* Apply strict clipping here to prevent line artifacts spilling out */}
                                                        <svg
                                                            className="absolute left-10 right-0 h-full overflow-visible"
                                                            style={{ width: 'calc(100% - 2.5rem)' }}
                                                            preserveAspectRatio="none"
                                                            viewBox="0 0 100 100"
                                                        >

                                                            {/* --- Panel 1: Temp --- */}
                                                            {minTemp < 0 && maxTemp > 0 && (
                                                                <line x1="0" y1={P1_TOP + P1_H - ((0 - minTemp) / tempRange) * P1_H} x2="100" y2={P1_TOP + P1_H - ((0 - minTemp) / tempRange) * P1_H} stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
                                                            )}
                                                            <polygon points={`${tempPointsTop} ${tempPointsBottom}`} fill="#fed7aa" fillOpacity="0.5" stroke="none" />
                                                            <polyline points={tempPointsTop} fill="none" stroke="#fb923c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                                            <polyline points={history.tempsMin ? tempPointsBottom.split(' ').reverse().join(' ') : tempPointsTop} fill="none" stroke="#fb923c" strokeWidth="1" strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />


                                                            {/* --- Panel 3: Humidity --- */}
                                                            <polygon points={humArea} fill="#ccfbf1" fillOpacity="0.6" />
                                                            <polyline points={humPoints} fill="none" stroke="#2dd4bf" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />

                                                            {/* --- Panel 4: Wind --- */}
                                                            <polyline points={windPoints} fill="none" stroke="#a855f7" strokeWidth="2" vectorEffect="non-scaling-stroke" />

                                                        </svg>

                                                        {/* --- Panel 2: Rain (HTML Bars for crispness) --- (Offset left-10) */}
                                                        <div className="absolute right-0 left-10 flex items-end gap-1 overflow-hidden" style={{ top: `${P2_TOP}%`, height: `${P2_H}%` }}>
                                                            {history.rain.map((r, i) => (
                                                                <div key={i} className="flex-1 h-full flex items-end">
                                                                    <div
                                                                        className="w-full bg-blue-400 rounded-t-sm opacity-80"
                                                                        style={{ height: `${Math.min(100, (r / maxRain) * 100)}%` }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* --- Overlay & Tooltips --- (Offset left-10) */}
                                                        {/* No overflow hidden here, to allow tooltips to pop out */}
                                                        <div className="absolute top-0 bottom-0 right-0 left-10 flex">
                                                            {history.temps.map((_, i) => (
                                                                <div key={i} className="flex-1 group relative z-10 hover:bg-white/5 cursor-crosshair">
                                                                    {/* Vertical Guide Line on Hover */}
                                                                    <div className="absolute inset-y-0 left-1/2 w-px bg-gray-400/50 opacity-0 group-hover:opacity-100 pointer-events-none" />

                                                                    {/* Tooltip */}
                                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-slate-900 text-white text-[10px] p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                                                        <div className="font-bold border-b border-white/20 pb-1 mb-1 text-center">
                                                                            {dayScore.date.getFullYear() - 10 + i}
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-right">
                                                                            <span className="text-left text-orange-300">{t('detail.tooltip.temp')}</span>
                                                                            <span>{history.temps[i].toFixed(1)}° / {history.tempsMin?.[i]?.toFixed(1)}°</span>

                                                                            <span className="text-left text-blue-300">{t('detail.tooltip.rain')}</span>
                                                                            <span>{history.rain[i].toFixed(1)}mm</span>

                                                                            <span className="text-left text-teal-300">{t('detail.tooltip.hum')}</span>
                                                                            <span>{history.humidities?.[i] ?? '-'}%</span>

                                                                            <span className="text-left text-purple-300">{t('detail.tooltip.wind')}</span>
                                                                            <span>{history.winds?.[i]?.toFixed(1) ?? '-'}km/h</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* X-Axis Label */}
                                                                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 font-medium opacity-50 group-hover:opacity-100 group-hover:text-gray-900">
                                                                        {dayScore.date.getFullYear() - 10 + i}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
