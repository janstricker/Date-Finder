import React, { useState } from 'react';
import type { EventConstraints } from '../../lib/scoring';
import { LocationSearch } from './LocationSearch';
import { Switch } from '../ui/Switch';
import { Check } from 'lucide-react';

interface ConfigFormProps {
    constraints: EventConstraints;
    onUpdate: (newConstraints: EventConstraints) => void;
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

const DISTANCE_OPTIONS = [5, 10, 21, 30, 42, 50, 68, 100];
const CUTOFF_OPTIONS = [2, 4, 6, 8, 10, 12, 14, 16, 18];

export function ConfigForm({ constraints, onUpdate }: ConfigFormProps) {
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

    const handleLocationSelect = (loc: { lat: number; lng: number; name: string; admin1?: string; country?: string }) => {
        let newStateCode = constraints.stateCode;

        // Try to map state name to code
        if (loc.country === 'Germany' && loc.admin1) {
            const foundState = Object.entries(GERMAN_STATES).find(([name]) =>
                loc.admin1!.includes(name) || name.includes(loc.admin1!)
            );
            if (foundState) newStateCode = foundState[1];
        }

        onUpdate({
            ...constraints,
            location: {
                lat: loc.lat,
                lng: loc.lng,
                name: loc.name
            },
            stateCode: newStateCode
        });
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

    return (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-8">

            {/* SECTION 1: LOCATION */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Location</h2>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-900">Location</label>
                    <LocationSearch
                        initialLocation={constraints.location}
                        onLocationSelect={handleLocationSelect}
                    />
                </div>
            </div>

            <hr className="border-gray-100" />

            {/* SECTION 2: TIMING */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Timing</h2>

                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-900">Event Day</label>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${constraints.allowWeekends ? 'bg-slate-900 border-slate-900' : 'bg-white border-gray-300'}`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={constraints.allowWeekends}
                                    onChange={(e) => onUpdate({ ...constraints, allowWeekends: e.target.checked })}
                                />
                                {constraints.allowWeekends && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className="text-gray-700">Weekends (Sat, Sun)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${constraints.allowWeekdays ? 'bg-slate-900 border-slate-900' : 'bg-white border-gray-300'}`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={constraints.allowWeekdays}
                                    onChange={(e) => onUpdate({ ...constraints, allowWeekdays: e.target.checked })}
                                />
                                {constraints.allowWeekdays && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className="text-gray-700">Weekdays (Mon, Tue, Wed, Thu, Fri)</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-900">Start Time</label>
                        <input
                            type="time"
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                            value={constraints.raceStartTime}
                            onChange={(e) => onUpdate({ ...constraints, raceStartTime: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-900">Cut-Off Time</label>
                        {isCustomCutoff ? (
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Hours"
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={constraints.raceDurationHours}
                                    onChange={(e) => onUpdate({ ...constraints, raceDurationHours: parseFloat(e.target.value) })}
                                />
                                <button
                                    onClick={() => setIsCustomCutoff(false)}
                                    className="px-3 text-xs text-blue-600 hover:bg-blue-50 rounded-md"
                                >Back</button>
                            </div>
                        ) : (
                            <select
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                                value={constraints.raceDurationHours}
                                onChange={(e) => updateCutoff(e.target.value)}
                            >
                                {CUTOFF_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt} hours ({getEndTime(opt)})</option>
                                ))}
                                <option value="custom">Custom...</option>
                            </select>
                        )}
                    </div>
                </div>
            </div>

            <hr className="border-gray-100" />

            {/* SECTION 3: SCORING PARAMETERS */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">Scoring parameters</h2>

                {/* 1. Preparation Time Card */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={constraints.incorporateTrainingTime}
                            onChange={(val) => onUpdate({ ...constraints, incorporateTrainingTime: val })}
                        />
                        <span className="text-base font-medium text-gray-900">Preparation Time</span>
                    </div>

                    {constraints.incorporateTrainingTime && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-900">Distance</label>
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
                                        >Back</button>
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
                                        <option value="custom">Custom...</option>
                                    </select>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-900">Training Time</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900 pr-16"
                                        value={constraints.minTrainingWeeks}
                                        onChange={(e) => onUpdate({ ...constraints, minTrainingWeeks: parseInt(e.target.value) })}
                                    />
                                    <span className="absolute right-3 top-2.5 text-gray-500 pointer-events-none">weeks</span>
                                </div>
                                <p className="text-xs text-slate-500">Suggestion based on race distance</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Holidays Card */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <Switch
                            checked={constraints.considerHolidays}
                            onChange={(val) => onUpdate({ ...constraints, considerHolidays: val })}
                        />
                        <span className="text-base font-medium text-gray-900">Public & School Holidays</span>
                    </div>

                    {constraints.considerHolidays && (
                        <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-gray-900">Select location</label>
                                <select
                                    className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 disabled:bg-gray-50 disabled:text-gray-400"
                                    value={constraints.location.name ? constraints.stateCode : ""}
                                    onChange={(e) => onUpdate({ ...constraints, stateCode: e.target.value })}
                                    disabled={!constraints.location.name}
                                >
                                    {!constraints.location.name && (
                                        <option value="">Based on selected location</option>
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
                                    className="mt-0.5"
                                />
                                <div className="space-y-0.5">
                                    <label className="text-sm font-medium text-gray-900 block">Negative impact on scoring</label>
                                    <p className="text-sm text-slate-500">E.g. more tourist activity expected</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
