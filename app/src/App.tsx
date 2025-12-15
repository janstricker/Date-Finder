import { useState } from 'react';
import type { EventConstraints } from './lib/scoring';
import { useAnalysis } from './hooks/useAnalysis';
import { ConfigForm } from './components/dashboard/ConfigForm';
import { HeatmapCalendar } from './components/dashboard/HeatmapCalendar';
import { DetailCard } from './components/dashboard/DetailCard';

// Initial State: September 2026, Fichtelgebirge Coconst defaultDate = new Date();
const defaultDate = new Date();
defaultDate.setMonth(defaultDate.getMonth() + 3);
defaultDate.setDate(1); // Start of month

function App() {
  const [constraints, setConstraints] = useState<EventConstraints>({
    // Default to September 2026
    targetMonth: new Date(2026, 8, 1),
    // Default Location: Fichtelgebirge
    location: { lat: 50.0513, lng: 11.8517, name: 'Fichtelgebirge' },
    stateCode: 'BY', // Bayern
    minTrainingWeeks: 24,
    raceStartTime: '07:00',
    raceDurationHours: 12,
    distance: 68, // 68k
    negativeHolidayImpact: true,
    incorporateTrainingTime: true,
    allowWeekends: true,
    allowWeekdays: false,
    considerHolidays: true,
    blockedDates: [],
    persona: 'experience'
  });

  const [selectedDayScore, setSelectedDayScore] = useState<any | null>(null); // Assuming DayScore type is available or will be imported

  const { scores, loading } = useAnalysis(constraints);

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(constraints.targetMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setConstraints(prev => ({ ...prev, targetMonth: newDate }));
  };

  const handleDateChange = (date: Date) => {
    setConstraints(prev => ({ ...prev, targetMonth: date }));
  };

  const handleDaySelect = (date: Date) => {
    // Find the score object for the selected date
    const found = scores.find(s => s.date.toDateString() === date.toDateString());
    if (found) setSelectedDayScore(found);
  };

  const isFormValid = constraints.location.name !== '';

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">

      <div className="max-w-6xl mx-auto space-y-6">

        {/*<header className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            FichtelUltra <span className="text-blue-600">Planner</span>
          </h1>
          <p className="text-slate-500 mt-2">Find the perfect date for your Fichtelgebirge run.</p>
        </header>*/}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Left Col: Config */}
          <div className="lg:col-span-5 space-y-8">
            <ConfigForm constraints={constraints} onUpdate={setConstraints} />
          </div>

          {/* Right Col: The Big Calendar */}
          <div className="lg:col-span-7 space-y-6 relative">
            {loading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-blue-700">Analyzing...</span>
                </div>
              </div>
            )}

            <HeatmapCalendar
              scores={scores}
              selectedDate={selectedDayScore ? selectedDayScore.date : null}
              onSelectDate={handleDaySelect}
              currentMonth={constraints.targetMonth}
              onMonthChange={handleMonthChange}
              onDateChange={handleDateChange}
              disabled={!isFormValid}
            />

            {/* Detail View (Skeleton or Real) */}
            {isFormValid && <DetailCard dayScore={selectedDayScore} />}
          </div>

        </div>
      </div>
    </div>
  )
}

export default App;
