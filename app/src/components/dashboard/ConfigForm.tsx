import React from 'react';
import type { EventConstraints } from '../../lib/scoring';
import { LocationSearch } from './LocationSearch';

interface ConfigFormProps {
    constraints: EventConstraints;
    onUpdate: (newConstraints: EventConstraints) => void;
}

export function ConfigForm({ constraints, onUpdate }: ConfigFormProps) {
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) {
            onUpdate({ ...constraints, targetMonth: newDate });
        }
    };

    const handleTrainingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ ...constraints, minTrainingWeeks: parseInt(e.target.value) });
    }

    const handleLocationSelect = (loc: { lat: number; lng: number; name: string }) => {
        onUpdate({
            ...constraints,
            location: {
                lat: loc.lat,
                lng: loc.lng,
                name: loc.name
            }
        });
    }

    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ ...constraints, raceStartTime: e.target.value });
    }

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ ...constraints, raceDurationHours: parseFloat(e.target.value) });
    }

    return (
        <div className="bg-white/50 backdrop-blur-md p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">1. Define Event</h2>

            {/* Grid for basics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Selector */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-600">Target Month</label>
                    <input
                        type="month"
                        className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none w-full"
                        value={constraints.targetMonth.toISOString().slice(0, 7)}
                        onChange={handleDateChange}
                    />
                </div>

                {/* Training Weeks */}
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-600">Training Check (Weeks)</label>
                    <input
                        type="number"
                        className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none w-full"
                        value={constraints.minTrainingWeeks}
                        onChange={handleTrainingChange}
                    />
                </div>

                {/* Location Search - Spans 2 cols */}
                <div className="md:col-span-2">
                    <LocationSearch
                        initialLocation={constraints.location}
                        onLocationSelect={handleLocationSelect}
                    />
                    {constraints.location.name && (
                        <div className="mt-1 text-xs text-gray-500">
                            Selected: <span className="font-medium text-blue-600">{constraints.location.name}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="h-px bg-gray-200/50" />

            {/* Race Specifics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-600">Start Time</label>
                    <input
                        type="time"
                        className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none w-full"
                        value={constraints.raceStartTime}
                        onChange={handleStartTimeChange}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-600">Duration (Hours)</label>
                    <input
                        type="number" step="0.5"
                        className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none w-full"
                        value={constraints.raceDurationHours}
                        onChange={handleDurationChange}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-600">State (Holidays)</label>
                    <select
                        className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none w-full bg-white"
                        value={constraints.stateCode}
                        onChange={(e) => onUpdate({ ...constraints, stateCode: e.target.value })}
                    >
                        <option value="BY">Bayern</option>
                        <option value="BE">Berlin</option>
                        <option value="BW">Baden-Württemberg</option>
                        <option value="NW">Nordrhein-Westfalen</option>
                        <option value="HE">Hessen</option>
                        <option value="SN">Sachsen</option>
                        <option value="TH">Thüringen</option>
                        {/* Add more as needed */}
                    </select>
                </div>
            </div>
        </div>
    );
}
