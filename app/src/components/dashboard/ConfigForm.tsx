import { useState } from 'react';
import type { EventConstraints } from '../../lib/scoring';
import { LocationSearch } from './LocationSearch';
import { Switch } from '../ui/Switch';
import { useLanguage } from '../../context/LanguageContext';
import { parseGPX } from '../../lib/gpx';
import { RouteMap } from '../RouteMap';
import { Upload, Play, Check, Info, Trophy, Mountain } from 'lucide-react';

interface ConfigFormProps {
    constraints: EventConstraints;
    onUpdate: (newConstraints: EventConstraints) => void;
    dataLastUpdated?: string;
}

const GERMAN_STATES: Record<string, string> = {
    'Baden-Württemberg': 'BW',
    'Bayern': 'BY',
    'Berlin': 'BE',
    'Brandenburg': 'BB',
    'Bremen': 'HB',
    'Hamburg': 'HH',
    'Hessen': 'HE',
    'Mecklenburg-Vorpommern': 'MV',
    'Niedersachsen': 'NI',
    'Nordrhein-Westfalen': 'NW',
    'Rheinland-Pfalz': 'RP',
    'Saarland': 'SL',
    'Sachsen': 'SN',
    'Sachsen-Anhalt': 'ST',
    'Schleswig-Holstein': 'SH',
    'Thüringen': 'TH'
};

const DISTANCE_OPTIONS = [5, 10, 21, 30, 42, 50, 70, 100];
const CUTOFF_OPTIONS = [2, 4, 6, 8, 10, 12, 14, 16, 18];

// Sub-component for Location/Route Tabs
function LocationRouteTabs({ constraints, onUpdate, t, deriveStateCode }: {
    constraints: EventConstraints,
    onUpdate: (c: EventConstraints) => void,
    t: any,
    deriveStateCode: (s?: string) => string
}) {
    // Mode state: 'city' | 'route'
    // If gpxData exists, default to 'route', else 'city'
    const [mode, setMode] = useState<'city' | 'route'>(constraints.gpxData ? 'route' : 'city');

    // Sync external changes (if gpx removed, switch to city)
    // useEffect(() => {
    //     if (!constraints.gpxData && mode === 'route') setMode('city'); // actually we want to stay in route mode to show upload
    // }, [constraints.gpxData]);

    return (
        <div className="space-y-6">
            <div className="flex border-b border-gray-200">
                <button
                    className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${mode === 'city' ? 'text-emerald-600 border-emerald-500' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                    onClick={() => {
                        setMode('city');
                        // Clear GPX data when explicitly switching to city? 
                        // User might want to keep it but just check city. 
                        // But scoring uses GPX if present. So yes, should clear or deactivate.
                        if (constraints.gpxData) onUpdate({ ...constraints, gpxData: undefined });
                    }}
                >
                    {t('config.location')}
                </button>
                <button
                    className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${mode === 'route' ? 'text-emerald-600 border-emerald-500' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
                    onClick={() => setMode('route')}
                >
                    {t('config.gpx.route')}
                </button>
            </div>

            {mode === 'city' ? (
                <div className="animate-in fade-in slide-in-from-left-1 duration-200">
                    <h3 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                        {t('config.searchCity')}
                    </h3>
                    <LocationSearch
                        initialName={constraints.location.name}
                        onLocationSelect={(loc) => onUpdate({
                            ...constraints,
                            location: { lat: loc.lat, lng: loc.lng, name: loc.name },
                            stateCode: deriveStateCode(loc.admin1)
                        })}
                    />
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-right-1 duration-200">
                    <h3 className="text-gray-900 font-semibold mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                        {t('config.uploadRoute')}
                    </h3>

                    {!constraints.gpxData ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-emerald-500 hover:bg-emerald-50 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-colors text-center cursor-pointer relative group">
                            <input
                                type="file"
                                accept=".gpx"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const text = await file.text();
                                        const data = parseGPX(text);
                                        onUpdate({
                                            ...constraints,
                                            distance: Math.round(data.totalDistance),
                                            gpxData: {
                                                track: data.track,
                                                sampledPoints: data.sampledPoints,
                                                stats: {
                                                    distance: data.totalDistance,
                                                    elevationGain: data.elevationGain
                                                },
                                                ready: false // Manual Trigger: Not ready yet
                                            }
                                        });
                                    }
                                }}
                            />
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-100 transition-colors">
                                <Upload className="w-6 h-6 text-gray-400 group-hover:text-emerald-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-900">
                                {t('config.gpx.drop')}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {t('config.gpx.drag')}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div>
                                    <div className="font-semibold text-gray-900 text-sm">
                                        {t('config.gpx.loaded')}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {constraints.gpxData.stats.distance.toFixed(1)}km • {constraints.gpxData.stats.elevationGain.toFixed(0)}m
                                    </div>
                                </div>
                                <button
                                    onClick={() => onUpdate({ ...constraints, gpxData: undefined })}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded"
                                >
                                    {t('config.gpx.remove')}
                                </button>
                            </div>

                            <RouteMap
                                track={constraints.gpxData.track}
                                sampledPoints={constraints.gpxData.sampledPoints}
                                onPointsChange={(newPoints) => {
                                    if (constraints.gpxData) {
                                        onUpdate({
                                            ...constraints,
                                            gpxData: {
                                                ...constraints.gpxData,
                                                sampledPoints: newPoints,
                                                ready: false // Reset ready state if points move
                                            }
                                        });
                                    }
                                }}
                            />

                            <div className="flex items-center justify-between gap-4">
                                <p className="text-xs text-gray-500 flex-1">
                                    {t('config.gpx.tip')}
                                </p>

                                <button
                                    onClick={() => {
                                        if (constraints.gpxData) {
                                            onUpdate({
                                                ...constraints,
                                                gpxData: { ...constraints.gpxData, ready: true }
                                            });
                                        }
                                    }}
                                    disabled={constraints.gpxData.ready}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all shadow-sm ${constraints.gpxData.ready
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
                                        }`}
                                >
                                    {constraints.gpxData.ready ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            {t('config.gpx.analysisActive')}
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4 fill-current" />
                                            {t('config.gpx.runAnalysis')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function ConfigForm({ constraints, onUpdate, dataLastUpdated }: ConfigFormProps) {
    const { t } = useLanguage();
    const [isCustomDistance, setIsCustomDistance] = useState(!DISTANCE_OPTIONS.includes(constraints.distance));
    const [isCustomCutoff, setIsCustomCutoff] = useState(!CUTOFF_OPTIONS.includes(constraints.raceDurationHours));

    // Calculate End Time for Display
    const getEndTime = (duration: number) => {
        const [h, m] = constraints.raceStartTime.split(':').map(Number);
        const date = new Date();
        date.setHours(h, m);
        date.setMinutes(date.getMinutes() + duration * 60);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Auto-suggest training time based on distance
    const suggestTrainingWeeks = (dist: number) => {
        if (dist <= 5) return 8;
        if (dist <= 10) return 12; // Couch to 10k
        if (dist <= 21) return 16; // HM
        if (dist <= 30) return 20;
        if (dist <= 42) return 24; // Marathon
        if (dist <= 60) return 24; // Ultra entry
        if (dist <= 70) return 26; // ~6 months for 66k
        return 32; // 100k+
    };



    const updateDistance = (val: string) => {
        if (val === 'custom') {
            setIsCustomDistance(true);
            return;
        }
        setIsCustomDistance(false);
        const dist = parseInt(val);
        onUpdate({
            ...constraints,
            distance: dist,
            minTrainingWeeks: suggestTrainingWeeks(dist)
        });
    };

    const updateCutoff = (val: string) => {
        if (val === 'custom') {
            setIsCustomCutoff(true);
            return;
        }
        setIsCustomCutoff(false);
        onUpdate({ ...constraints, raceDurationHours: parseFloat(val) });
    };

    // Helper to guess state code based on admin1 (for Germany)
    const deriveStateCode = (admin1?: string) => {
        if (!admin1) return constraints.stateCode; // Keep current if no admin1
        const foundState = Object.entries(GERMAN_STATES).find(([name]) =>
            admin1.includes(name) || name.includes(admin1)
        );
        return foundState ? foundState[1] : constraints.stateCode;
    };

    return (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-8">

            {/* LOCATION / ROUTE TABS */}

            <LocationRouteTabs
                constraints={constraints}
                onUpdate={onUpdate}
                t={t}
                deriveStateCode={deriveStateCode}
            />

            <hr className="border-gray-100" />

            {/* SECTION 2: TIMING */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">{t('config.timing')}</h2>

                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-900">{t('config.eventDay')}</label>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={constraints.allowWeekends}
                                    onChange={(e) => onUpdate({ ...constraints, allowWeekends: e.target.checked })}
                                />
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors peer-focus:ring-2 peer-focus:ring-emerald-500 peer-focus:ring-offset-1 ${constraints.allowWeekends ? 'bg-slate-900 border-slate-900' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                                    {constraints.allowWeekends && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                            </div>
                            <span className="text-gray-700">{t('config.weekends')}</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={constraints.allowWeekdays}
                                    onChange={(e) => onUpdate({ ...constraints, allowWeekdays: e.target.checked })}
                                />
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors peer-focus:ring-2 peer-focus:ring-emerald-500 peer-focus:ring-offset-1 ${constraints.allowWeekdays ? 'bg-slate-900 border-slate-900' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                                    {constraints.allowWeekdays && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                            </div>
                            <span className="text-gray-700">{t('config.weekdays')}</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-900">{t('config.startTime')}</label>
                        <input
                            type="time"
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                            value={constraints.raceStartTime}
                            onChange={(e) => onUpdate({ ...constraints, raceStartTime: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-900">{t('config.cutoffTime')}</label>
                        {isCustomCutoff ? (
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder={t('config.hours')}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={constraints.raceDurationHours}
                                    onChange={(e) => onUpdate({ ...constraints, raceDurationHours: parseFloat(e.target.value) })}
                                />
                                <button
                                    onClick={() => setIsCustomCutoff(false)}
                                    className="px-3 text-xs text-blue-600 hover:bg-blue-50 rounded-md"
                                >{t('config.back')}</button>
                            </div>
                        ) : (
                            <select
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                value={constraints.raceDurationHours}
                                onChange={(e) => updateCutoff(e.target.value)}
                            >
                                {CUTOFF_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt} {t('config.hours')} ({getEndTime(opt)})</option>
                                ))}
                                <option value="custom">{t('config.custom')}</option>
                            </select>
                        )}
                    </div>
                </div>
            </div>

            <hr className="border-gray-100" />

            {/* SECTION 3: SCORING PARAMETERS */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">{t('config.scoring')}</h2>

                {/* 1. Persona / Mode Card */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5 relative group cursor-help">
                            <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
                                {t('config.persona')}
                                <Info className="w-4 h-4 text-gray-400" />
                            </h3>
                            <p className="text-xs text-gray-500">{t('config.persona.desc')}</p>
                            {/* Tooltip */}
                            <div className="absolute left-0 bottom-full mb-2 w-72 bg-slate-900 text-white rounded-lg shadow-xl p-3 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{t('config.persona.impact')}</div>
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-xs font-bold text-white mb-0.5 flex items-center gap-1.5"><Trophy className="w-3 h-3 text-purple-400" /> {t('config.persona.race')}</div>
                                        <p className="text-[10px] text-gray-300 mb-1">{t('config.persona.race.temp.desc')}</p>
                                        <div className="grid grid-cols-2 gap-x-2 text-[10px]">
                                            <span className="text-emerald-400">{t('config.persona.race.temp.ideal')}</span><span>{t('config.persona.race.temp.idealRange')}</span>
                                            <span className="text-rose-400">{t('config.persona.race.temp.penalty')}</span><span>{t('config.persona.race.temp.penaltyRange')}</span>
                                        </div>
                                    </div>
                                    <div className="border-t border-white/10 pt-2">
                                        <div className="text-xs font-bold text-white mb-0.5 flex items-center gap-1.5"><Mountain className="w-3 h-3 text-emerald-400" /> {t('config.persona.experience')}</div>
                                        <p className="text-[10px] text-gray-300 mb-1">{t('config.persona.experience.temp.desc')}</p>
                                        <div className="grid grid-cols-2 gap-x-2 text-[10px]">
                                            <span className="text-emerald-400">{t('config.persona.experience.temp.ideal')}</span><span>{t('config.persona.experience.temp.idealRange')}</span>
                                            <span className="text-rose-400">{t('config.persona.experience.temp.penalty')}</span><span>{t('config.persona.experience.temp.penaltyRange')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => onUpdate({ ...constraints, persona: 'competition' })}
                            className={`p-3 rounded-lg border text-left transition-all ${constraints.persona === 'competition'
                                ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-500'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="font-bold text-gray-900 text-sm mb-0.5 flex items-center gap-2">
                                <Trophy className={`w-4 h-4 ${constraints.persona === 'competition' ? 'text-purple-600' : 'text-gray-400'}`} />
                                {t('config.persona.race')}
                            </div>
                            <div className="text-xs text-gray-500">{t('config.persona.race.desc')}</div>
                        </button>

                        <button
                            onClick={() => onUpdate({ ...constraints, persona: 'experience' })}
                            className={`p-3 rounded-lg border text-left transition-all ${constraints.persona === 'experience'
                                ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-500'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="font-bold text-gray-900 text-sm mb-0.5 flex items-center gap-2">
                                <Mountain className={`w-4 h-4 ${constraints.persona === 'experience' ? 'text-emerald-600' : 'text-gray-400'}`} />
                                {t('config.persona.experience')}
                            </div>
                            <div className="text-xs text-gray-500">{t('config.persona.experience.desc')}</div>
                        </button>
                    </div>
                </div>

                {/* 2. Conflicting Events Card */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={constraints.checkConflictingEvents}
                            onChange={(val) => onUpdate({ ...constraints, checkConflictingEvents: val })}
                        />
                        <span className="text-base font-medium text-gray-900">
                            {t('config.conflicts.avoid')}
                        </span>
                    </div>

                    {constraints.checkConflictingEvents && (
                        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                    <span className="text-sm text-slate-500 block">
                                        {t('config.conflicts.desc')}
                                    </span>
                                </div>

                                {/* Radius Slider */}
                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                                        <span>{t('config.conflicts.radius')}</span>
                                        <span className="text-gray-900">{constraints.conflictRadius || 50} km</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="25"
                                        max="100"
                                        step="25"
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                        value={constraints.conflictRadius || 50}
                                        onChange={(e) => onUpdate({ ...constraints, conflictRadius: parseInt(e.target.value) })}
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-400">
                                        <span>25km</span>
                                        <span>50km</span>
                                        <span>75km</span>
                                        <span>100km</span>
                                    </div>
                                </div>
                            </div>

                            {/* Metadata & Sources */}
                            <div className="pt-2 border-t border-gray-200 text-[10px] text-gray-400 space-y-1">
                                <div className="flex gap-1">
                                    <span>{t('config.conflicts.dataSources')}:</span>
                                    <a href="https://www.laufen.de/laufkalender" target="_blank" rel="noreferrer" className="hover:text-gray-600 underline">Laufen.de</a>
                                    <span>&</span>
                                    <a href="https://statistik.d-u-v.org/calendar.php?country=GER" target="_blank" rel="noreferrer" className="hover:text-gray-600 underline">Statistik DUV</a>
                                </div>
                                {dataLastUpdated && (
                                    <div className="flex gap-2">
                                        <span>{t('config.dataUpdated')} {new Date(dataLastUpdated).toLocaleDateString()}</span>
                                        <span>{t('config.nextUpdate')} {new Date(new Date(dataLastUpdated).getFullYear(), new Date(dataLastUpdated).getMonth() + 1, 1).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Preparation Time Card */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={constraints.incorporateTrainingTime}
                            onChange={(val) => onUpdate({ ...constraints, incorporateTrainingTime: val })}
                        />
                        <span className="text-base font-medium text-gray-900">{t('config.prep.title')}</span>
                        <div className="relative group cursor-help ml-1">
                            <Info className="w-4 h-4 text-gray-400" />
                            {/* Tooltip */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-slate-900 text-white rounded-lg shadow-xl p-3 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                                <p className="text-xs text-gray-300 leading-relaxed">
                                    {t('config.prep.tooltip')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {constraints.incorporateTrainingTime && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-900">{t('config.prep.distance')}</label>
                                {isCustomDistance ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="km"
                                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={constraints.distance}
                                            onChange={(e) => onUpdate({ ...constraints, distance: parseFloat(e.target.value) })}
                                        />
                                        <button
                                            onClick={() => setIsCustomDistance(false)}
                                            className="px-3 text-xs text-blue-600 hover:bg-blue-50 rounded-md"
                                        >{t('config.back')}</button>
                                    </div>
                                ) : (
                                    <select
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                        value={constraints.distance}
                                        onChange={(e) => updateDistance(e.target.value)}
                                    >
                                        {DISTANCE_OPTIONS.map(d => (
                                            <option key={d} value={d}>{d}k</option>
                                        ))}
                                        <option value="custom">{t('config.custom')}</option>
                                    </select>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-900">{t('config.prep.trainingTime')}</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 pr-16"
                                        value={constraints.minTrainingWeeks}
                                        onChange={(e) => onUpdate({ ...constraints, minTrainingWeeks: parseInt(e.target.value) })}
                                    />
                                    <span className="absolute right-3 top-2.5 text-gray-500 pointer-events-none">{t('detail.weeks')}</span>
                                </div>
                                <p className="text-xs text-slate-500">{t('config.prep.suggestion')}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 4. Holidays Card */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={constraints.considerHolidays}
                            onChange={(val) => onUpdate({ ...constraints, considerHolidays: val })}
                        />
                        <span className="text-base font-medium text-gray-900">{t('config.holidays.title')}</span>
                    </div>

                    {constraints.considerHolidays && (
                        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-900">{t('config.holidays.selectLocation')}</label>
                                <select
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 disabled:bg-gray-50 disabled:text-gray-400"
                                    value={constraints.location.name ? constraints.stateCode : ""}
                                    onChange={(e) => onUpdate({ ...constraints, stateCode: e.target.value })}
                                    disabled={!constraints.location.name}
                                >
                                    {!constraints.location.name && (
                                        <option value="">{t('config.holidays.basedOnLocation')}</option>
                                    )}
                                    {Object.entries(GERMAN_STATES).map(([name, code]) => (
                                        <option key={code} value={code}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-start gap-3">
                                <Switch
                                    checked={constraints.negativeHolidayImpact}
                                    onChange={(val) => onUpdate({ ...constraints, negativeHolidayImpact: val })}
                                    // className="mt-0.5" // Passed as prop if Switch supports it, but standard Switch is self-contained. 
                                    // Actually Switch component might need modification to accept className or we wrap it.
                                    // Let's assume wrapper for now or edit Switch if needed. 
                                    // The original code passed className="mt-0.5", let's keep it if Switch uses rest props.
                                    className="mt-0.5"
                                />
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium text-gray-900 block">{t('config.holidays.negative')}</label>
                                    <p className="text-sm text-slate-500">{t('config.holidays.negative.desc')}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
