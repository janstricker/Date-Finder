import { useState, useEffect } from 'react';
import type { EventConstraints } from './lib/scoring';
import { useAnalysis } from './hooks/useAnalysis';
import { ConfigForm } from './components/dashboard/ConfigForm';
import { HeatmapCalendar } from './components/dashboard/HeatmapCalendar';
import { YearOverview } from './components/dashboard/YearOverview';
import { DetailCard } from './components/dashboard/DetailCard';
import { TopDaysList } from './components/dashboard/TopDaysList';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { OnboardingModal } from './components/OnboardingModal';


// Initial State: September 2026, Fichtelgebirge
const defaultDate = new Date();
defaultDate.setMonth(defaultDate.getMonth() + 3);
defaultDate.setDate(1); // Start of month



function FichtelPlanner() {
  const { t } = useLanguage();

  const [constraints, setConstraints] = useState<EventConstraints>({
    // Default to September 2026
    targetMonth: new Date(2026, 8, 1),
    // Default Location: Fichtelgebirge
    location: { lat: 50.0513, lng: 11.8517, name: 'Fichtelgebirge' },
    stateCode: 'BY', // Bayern
    minTrainingWeeks: 24,
    raceStartTime: '07:00',
    raceDurationHours: 12,
    distance: 70,
    negativeHolidayImpact: true,
    incorporateTrainingTime: true,
    allowWeekends: true,
    allowWeekdays: false,
    considerHolidays: true,
    blockedDates: [],
    persona: 'experience',
    checkConflictingEvents: true,
    conflictRadius: 50
  });

  const [conflictingEvents, setConflictingEvents] = useState<any[]>([]);
  const [dataLastUpdated, setDataLastUpdated] = useState<string | undefined>();

  useEffect(() => {
    fetch('./data/events.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.events) {
          setConflictingEvents(data.events);
          if (data.metadata?.lastUpdated) {
            setDataLastUpdated(data.metadata.lastUpdated);
          }
        }
      })
      .catch(err => console.error("Failed to load events", err));
  }, []);

  const [selectedDayScore, setSelectedDayScore] = useState<any | null>(null);
  const [isYearView, setIsYearView] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('fichtel_onboarding_seen');
    if (!hasSeenOnboarding) {
      // Small delay to ensure app is loaded visually
      setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
    }
  }, []);

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
    localStorage.setItem('fichtel_onboarding_seen', 'true');
  };

  const handleShowOnboardingManual = () => {
    setShowOnboarding(true);
  };

  // loadingMessage is now available (and translated via key)
  const { scores, fullYearScores, loading, loadingMessage, error } = useAnalysis(constraints, conflictingEvents);

  const handleMonthChange = (offset: number) => {
    const newDate = new Date(constraints.targetMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setConstraints(prev => ({ ...prev, targetMonth: newDate }));
  };

  const handleDateChange = (date: Date) => {
    setConstraints(prev => ({ ...prev, targetMonth: date }));
  };

  const handleMonthClick = (date: Date) => {
    setConstraints(prev => ({ ...prev, targetMonth: date }));
    setIsYearView(false);
  };

  const handleDaySelect = (date: Date) => {
    // If selected from Top 10, we might need to jump month
    if (date.getMonth() !== constraints.targetMonth.getMonth() || date.getFullYear() !== constraints.targetMonth.getFullYear()) {
      const newTarget = new Date(date.getFullYear(), date.getMonth(), 1);
      setConstraints(prev => ({ ...prev, targetMonth: newTarget }));
    }

    // Find the score object for the selected date either in current scores or full year
    // Try fullYearScores first as it covers everything
    const found = fullYearScores.find(s => s.date.toDateString() === date.toDateString());
    if (found) {
      setSelectedDayScore(found);
      setIsYearView(false); // Switch to month view context
    }
    else {
      // Fallback to current month scores
      const mFound = scores.find(s => s.date.toDateString() === date.toDateString());
      if (mFound) {
        setSelectedDayScore(mFound);
        setIsYearView(false);
      }
    }
  };

  const handleCloseDetail = () => {
    setSelectedDayScore(null);
    // Stay in month view (don't force year view)
  };

  const isFormValid = constraints.location.name !== '';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Header />
      {showOnboarding && <OnboardingModal onClose={handleOnboardingClose} />}
      <div className="flex-grow p-6 md:p-12">
        <div className="max-w-6xl mx-auto space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left Col: Config */}
            <div className="lg:col-span-5 space-y-8">
              <ConfigForm constraints={constraints} onUpdate={setConstraints} dataLastUpdated={dataLastUpdated} />
            </div>

            {/* Right Col: The Big Calendar */}
            <div className="lg:col-span-7 space-y-6 relative lg:sticky lg:top-6 lg:self-start">
              {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-blue-700">
                      {loadingMessage ? t(loadingMessage as any) : t('loading.analyzing')}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-3 p-6 bg-red-50 rounded-lg border border-red-200 shadow-xl max-w-sm text-center">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-1">
                      ⚠️
                    </div>
                    <span className="text-sm font-semibold text-red-800">
                      {t(error as any)}
                    </span>
                    <button
                      onClick={() => window.location.reload()}
                      className="text-xs px-3 py-1.5 bg-white border border-red-200 rounded-md text-red-700 hover:bg-red-50 transition-colors font-medium shadow-sm"
                    >
                      Reload App
                    </button>
                  </div>
                </div>
              )}

              {/* Detail View OR Top 10 List */}
              {isFormValid && (
                <>
                  {selectedDayScore ? (
                    <DetailCard dayScore={selectedDayScore} onClose={handleCloseDetail} />
                  ) : (
                    !loading && <TopDaysList scores={fullYearScores} onSelectDay={handleDaySelect} />
                  )}
                </>
              )}

              {/* Back Button (only when in Month View without selection) */}
              {!isYearView && !selectedDayScore && (
                <button
                  onClick={() => setIsYearView(true)}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                >
                  {t('calendar.backToYear')}
                </button>
              )}

              {/* Calendar View Logic */}
              {isYearView && !selectedDayScore ? (
                <YearOverview
                  scores={fullYearScores}
                  currentYear={constraints.targetMonth.getFullYear()}
                  onMonthClick={handleMonthClick}
                />
              ) : (
                <HeatmapCalendar
                  scores={scores}
                  selectedDate={selectedDayScore ? selectedDayScore.date : null}
                  onSelectDate={handleDaySelect}
                  currentMonth={constraints.targetMonth}
                  onMonthChange={handleMonthChange}
                  onDateChange={handleDateChange}
                  disabled={!isFormValid}
                />
              )}
            </div>

          </div>
        </div>
      </div>

      <Footer onShowOnboarding={handleShowOnboardingManual} />
    </div>
  )
}

function App() {
  return (
    <LanguageProvider>
      <FichtelPlanner />
    </LanguageProvider>
  );
}

export default App;
