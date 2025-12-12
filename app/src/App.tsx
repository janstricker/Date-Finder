import { useState } from 'react';
import type { EventConstraints } from './lib/scoring';
import { useAnalysis } from './hooks/useAnalysis';
import { ConfigForm } from './components/dashboard/ConfigForm';
import { HeatmapCalendar } from './components/dashboard/HeatmapCalendar';
import { DetailCard } from './components/dashboard/DetailCard';

function App() {
  // Initial State: September 2026, Fichtelgebirge Coords
  const [constraints, setConstraints] = useState<EventConstraints>({
    targetMonth: new Date('2026-09-01'),
    location: { lat: 50.046, lng: 11.825, name: 'Fichtelgebirge' },
    stateCode: 'BY',
    minTrainingWeeks: 12,
    raceStartTime: '09:00',
    raceDurationHours: 6.5,
    distance: 50,
    blockedDates: ['2026-09-27'] // Mock initial block (Berlin Marathon)
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Use Async Analysis Hook
  const { scores, loading } = useAnalysis(constraints);

  // Find score details for selected date
  const selectedDayScore = scores.find(s => s.date.getTime() === selectedDate?.getTime()) || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 text-slate-800 font-sans p-4 md:p-8">

      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
            DATE FINDER
          </h1>
          <p className="text-gray-500 font-medium">FichtelUltra Event OS</p>
        </div>
        <div className="text-xs font-mono text-gray-400 text-right hidden md:block">
          Loc: {constraints.location.name || `${constraints.location.lat.toFixed(2)}, ${constraints.location.lng.toFixed(2)}`} <br />
          Target: {constraints.targetMonth.toISOString().slice(0, 7)}
        </div>
      </header>

      {/* Main Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Col: Config & Details (Responsive) */}
        <div className="lg:col-span-4 space-y-8">
          <ConfigForm constraints={constraints} onUpdate={setConstraints} />
          <div className="hidden lg:block">
            <DetailCard dayScore={selectedDayScore} />
          </div>
        </div>

        {/* Right Col: The Big Calendar */}
        <div className="lg:col-span-8 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-gray-600">Analyzing Weather & Data...</span>
              </div>
            </div>
          )}
          <HeatmapCalendar
            scores={scores}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          {/* Mobile Detail Card shows below cal */}
          <div className="block lg:hidden mt-8">
            <DetailCard dayScore={selectedDayScore} />
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
