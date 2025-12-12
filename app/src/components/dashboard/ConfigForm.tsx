import React, { useEffect, useState } from 'react';
import type { EventConstraints } from '../../lib/scoring';
import { LocationSearch } from './LocationSearch';
import { Calendar, Clock, MapPin, Route, Timer } from 'lucide-react';

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

const DISTANCE_OPTIONS = [5, 10, 21, 30, 42, 50, 100];
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
            // Check direct match or partial
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
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                1. Define Event
            </h2>

            <div className="space-y-5">
                {/* Target Month */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        Target Month
                    </label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="month"
                            className="w-full pl-10 p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900"
                            value={constraints.targetMonth.toISOString().slice(0, 7)}
                            onChange={(e) => {
                                const d = new Date(e.target.value);
                                if (!isNaN(d.getTime())) onUpdate({ ...constraints, targetMonth: d });
                            }}
                        />
                    </div>
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                    {/* LocationSearch component handles label and icon internally, might need adjustment to match style exactly but let's wrap it consistent */}
                    <LocationSearch
                        initialLocation={constraints.location}
                        onLocationSelect={handleLocationSelect}
                    />
                </div>

                {/* Holidays */}
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-900">
                        Holidays (Public & School)
                    </label>
                    <select
                        className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
                        value={constraints.stateCode}
                        onChange={(e) => onUpdate({ ...constraints, stateCode: e.target.value })}
                    >
                        {Object.entries(GERMAN_STATES).map(([name, code]) => (
                            <option key={code} value={code}>
                                {name} {constraints.location.name && constraints.stateCode === code ? '(based on selected location)' : ''}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500">Based by default on the selected location</p>
                </div>

                {/* Grid for Time & Distance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* Start Time */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-900">Start Time</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="time"
                                className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={constraints.raceStartTime}
                                onChange={(e) => onUpdate({ ...constraints, raceStartTime: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Cut-Off Time */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-900">Cut-Off Time</label>
                        <div className="relative">
                            {!isCustomCutoff && <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />}
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
                                    className="w-full pl-10 p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                    value={constraints.raceDurationHours}
                                    onChange={(e) => updateCutoff(e.target.value)}
                                >
                                    {CUTOFF_OPTIONS.map(h => (
                                        <option key={h} value={h}>{h} hours ({getEndTime(h)})</option>
                                    ))}
                                    <option value="custom">Custom</option>
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Distance */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-900">Distance</label>
                        <div className="relative">
                            {!isCustomDistance && <Route className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />}
                            {isCustomDistance ? (
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={constraints.distance}
                                        onChange={(e) => {
                                            const d = parseFloat(e.target.value);
                                            onUpdate({ ...constraints, distance: d, minTrainingWeeks: suggestTrainingWeeks(d) });
                                        }}
                                    />
                                    <button
                                        onClick={() => setIsCustomDistance(false)}
                                        className="px-3 text-xs text-blue-600 hover:bg-blue-50 rounded-md"
                                    >Back</button>
                                </div>
                            ) : (
                                <select
                                    className="w-full pl-10 p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                                    value={constraints.distance}
                                    onChange={(e) => updateDistance(e.target.value)}
                                >
                                    {DISTANCE_OPTIONS.map(d => (
                                        <option key={d} value={d}>{d}km</option>
                                    ))}
                                    <option value="custom">Custom</option>
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Training Time */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-900">Training Time</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full p-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                                value={`${constraints.minTrainingWeeks} weeks`}
                                readOnly
                                onClick={(e) => {
                                    const input = e.target as HTMLInputElement;
                                    input.type = 'number';
                                    input.value = constraints.minTrainingWeeks.toString();
                                }}
                                onBlur={(e) => {
                                    const input = e.target as HTMLInputElement;
                                    input.type = 'text';
                                    input.value = `${constraints.minTrainingWeeks} weeks`;
                                }}
                                onChange={(e) => onUpdate({ ...constraints, minTrainingWeeks: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <p className="text-xs text-gray-500">Suggestion based on distance</p>
                    </div>

                </div>
            </div>
        </div>
    );
}
