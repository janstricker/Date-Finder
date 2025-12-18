export type Language = 'en' | 'de';

export type TranslationKey =
    // Common
    | 'app.title'
    | 'app.subtitle'
    | 'header.brand'
    | 'header.app'
    | 'loading.analyzing'
    // Config Form
    | 'config.location'
    | 'config.location.placeholder'
    | 'config.timing'
    | 'config.eventDay'
    | 'config.weekends'
    | 'config.weekdays'
    | 'config.startTime'
    | 'config.cutoffTime'
    | 'config.hours'
    | 'config.custom'
    | 'config.back'
    | 'config.scoring'
    | 'config.persona'
    | 'config.persona.desc'
    | 'config.persona.race'
    | 'config.persona.race.desc'
    | 'config.persona.experience'
    | 'config.persona.experience.desc'
    | 'config.conflicts'
    | 'config.conflicts.avoid'
    | 'config.conflicts.desc'
    | 'config.conflicts.radius'
    | 'config.conflicts.dataSources'
    | 'config.dataUpdated'
    | 'config.nextUpdate'
    | 'config.prep'
    | 'config.prep.title'
    | 'config.prep.distance'
    | 'config.prep.trainingTime'
    | 'config.prep.suggestion'
    | 'config.holidays'
    | 'config.holidays.title'
    | 'config.holidays.selectLocation'
    | 'config.holidays.basedOnLocation'
    | 'config.holidays.negative'
    | 'config.holidays.negative.desc'
    | 'config.persona.impact'
    | 'config.persona.race.temp.desc'
    | 'config.persona.race.temp.ideal'
    | 'config.persona.race.temp.idealRange'
    | 'config.persona.race.temp.penalty'
    | 'config.persona.race.temp.penaltyRange'
    | 'config.prep.tooltip'
    | 'config.persona.experience.temp.desc'
    | 'config.persona.experience.temp.ideal'
    | 'config.persona.experience.temp.idealRange'
    | 'config.persona.experience.temp.penalty'
    | 'config.persona.experience.temp.penaltyRange'
    | 'config.persona.experience.temp.penalty'
    | 'config.persona.experience.temp.penaltyRange'
    | 'config.persona.race.temp.acceptableRange'
    | 'config.persona.experience.temp.acceptableRange'
    // Detail Card
    | 'detail.match'
    | 'detail.analysis'
    | 'detail.perfect'
    | 'detail.conflictPrefix'
    | 'detail.daylight'
    | 'detail.daylight.title'
    | 'detail.trainingPrep'
    | 'detail.weeks'
    | 'detail.avgTemp'
    | 'detail.avgHumidity'
    | 'detail.gusts'
    | 'detail.rainRisk'
    | 'detail.trailCondition'
    | 'detail.mudIndex'
    | 'detail.history'
    | 'detail.scoreFormula'
    | 'detail.finalScore'
    | 'detail.weather'
    | 'detail.summary'
    | 'detail.acceptable'
    | 'detail.wind'
    | 'detail.mudIndex.desc'
    | 'detail.indexScore'
    | 'detail.mud.perfect'
    | 'detail.mud.veryMuddy'
    | 'detail.mud.muddy'
    | 'detail.mud.damp'
    | 'detail.mud.good'
    | 'detail.historyContext'
    | 'detail.status.green'
    | 'detail.status.yellow'
    | 'detail.status.red'
    | 'detail.graph.temp'
    | 'detail.graph.rain'
    | 'detail.graph.humidity'
    | 'detail.graph.gusts'
    | 'detail.tooltip.temp'
    | 'detail.tooltip.rain'
    | 'detail.tooltip.hum'
    | 'detail.tooltip.wind'
    // Mud Levels
    | 'mud.perfect'
    | 'mud.good'
    | 'mud.damp'
    | 'mud.muddy'
    | 'mud.veryMuddy'
    // Scoring / Reasons
    | 'reason.training.insufficient'
    | 'reason.training.short'
    | 'reason.training.winter'
    | 'reason.training.crashCourse'
    | 'reason.blocked'
    | 'reason.conflict'
    | 'reason.holiday.negative'
    | 'reason.holiday'
    | 'reason.weekend.notAllowed'
    | 'reason.weekday.preferred'
    | 'reason.weekday.notAllowed'
    | 'reason.darkness'
    | 'reason.darkness.headlamp'
    | 'reason.headlamp'
    | 'reason.temp.ideal'
    | 'reason.temp.warm'
    | 'reason.temp.hot'
    | 'reason.temp.veryHot'
    | 'reason.temp.humidHot'
    | 'reason.temp.chilly'
    | 'reason.temp.freezing'
    | 'reason.temp.deepFreeze'
    | 'reason.windchill'
    | 'reason.severeWindchill'
    | 'reason.cool'
    | 'reason.tooCold'
    | 'reason.wind'
    | 'reason.tempSwing'
    | 'reason.rainRisk.high'
    | 'reason.accum.heat'
    | 'reason.accum.cold'
    | 'reason.mud.very'
    | 'reason.mud'
    | 'reason.temp.expIdeal'
    | 'reason.rain.showers'
    | 'reason.rain.washout'
    | 'reason.rain.washout'
    | 'reason.hypothermia'
    | 'reason.training.winter'
    | 'reason.training.crashCourse'

    // Breakdown Labels
    | 'breakdown.base'
    | 'breakdown.training'
    | 'breakdown.training.winter'
    | 'breakdown.training.crash'
    | 'breakdown.shortTraining'
    | 'breakdown.blocked'
    | 'breakdown.conflict'
    | 'breakdown.holiday'
    | 'breakdown.weekend'
    | 'breakdown.weekday'
    | 'breakdown.darkness'
    | 'breakdown.temp'
    | 'breakdown.stability'
    | 'breakdown.rain'
    | 'breakdown.mud'
    | 'breakdown.acclimatization'
    // Heatmap
    | 'heatmap.noData'
    | 'heatmap.title'
    | 'calendar.backToYear'

    // GPX / Route
    | 'config.searchCity'
    | 'config.uploadRoute'
    | 'config.gpx.route'
    | 'config.gpx.drop'
    | 'config.gpx.drag'
    | 'config.gpx.loaded'
    | 'config.gpx.remove'
    | 'config.gpx.tip'
    | 'config.gpx.analysisActive'
    | 'config.gpx.runAnalysis'

    | 'breakdown.hypothermia'
    | 'breakdown.washout'
    | 'gpx.map.disabled'
    | 'gpx.map.consent'
    | 'gpx.map.samplingPoint'
    | 'gpx.map.ele'

    // Misc
    | 'detail.close'
    | 'detail.mud.dry'
    | 'detail.mud.wet'

    // Loading
    | 'loading.fetching_history'
    | 'loading.analyzing_year'
    | 'error.analysis_failed'
    | 'error.rateLimit'
    | 'error.noData'

    // Top 10 List
    | 'top10.title'
    | 'top10.rank'
    | 'top10.date'
    | 'top10.score'
    | 'top10.conditions'
    | 'top10.view_details'
    | 'top10.empty'
    | 'top10.empty'
    | 'top10.show_more'
    | 'top10.show_less'

    // Search
    | 'search.label'
    | 'search.placeholder'
    | 'search.noResults.germany'

    // Weather Source
    | 'weather.source'

    // Footer
    | 'footer.builtWith'
    | 'footer.rights'
    | 'footer.help'


    // Onboarding
    | 'onboarding.welcome.title'
    | 'onboarding.welcome.desc'
    | 'onboarding.location.title'
    | 'onboarding.location.desc'
    | 'onboarding.config.title'
    | 'onboarding.config.desc'
    | 'onboarding.analysis.title'
    | 'onboarding.analysis.desc'
    | 'onboarding.visualization.title'
    | 'onboarding.visualization.desc'
    | 'onboarding.next'
    | 'onboarding.back'
    | 'onboarding.finish'
    | 'onboarding.skip'
    | 'onboarding.close'
    // Consent
    | 'consent.message'
    | 'consent.details'
    | 'consent.accept'
    | 'error.consent_required';

export const translations: Record<Language, Record<TranslationKey, string>> = {
    en: {
        'app.title': 'Date-Finder',

        'app.subtitle': 'Find the perfect date for your trail running event.',
        'header.brand': 'Date-Finder',
        'header.app': 'FichtelUltra',
        'loading.analyzing': 'Analyzing...',

        'config.location': 'Location',
        'config.location.placeholder': 'Search city (e.g. Selb, Regensburg)...',
        'config.timing': 'Timing',
        'config.eventDay': 'Event Day',
        'config.weekends': 'Weekends (Sat, Sun)',
        'config.weekdays': 'Weekdays (Mon-Fri)',
        'config.startTime': 'Start Time',
        'config.cutoffTime': 'Cut-Off Time',
        'config.hours': 'hours',
        'config.custom': 'Custom...',
        'config.back': 'Back',
        'config.scoring': 'Scoring parameters',
        'config.persona': 'Run Persona',
        'config.persona.desc': 'Choose your running style to adjust scoring parameters',
        'config.persona.race': 'Race',
        'config.persona.race.desc': 'Ideal conditions for performance',
        'config.persona.experience': 'Experience',
        'config.persona.experience.desc': 'Comfortable conditions',
        'config.conflicts': 'Event Conflicts',
        'config.conflicts.avoid': 'Avoid Event Conflicts',
        'config.conflicts.desc': 'Dates with other runs nearby negatively effect score',
        'config.conflicts.radius': 'Search Radius',
        'config.conflicts.dataSources': 'Data Sources',
        'config.dataUpdated': 'Data updated:',
        'config.nextUpdate': 'Next update:',
        'config.prep': 'Preparation Time',
        'config.prep.title': 'Preparation Time',
        'config.prep.distance': 'Distance',
        'config.prep.trainingTime': 'Training Time',
        'config.prep.suggestion': 'Suggestion based on race distance',
        'config.prep.tooltip': 'Accounts for tapering and seasonal difficulty.',
        'config.holidays': 'Public & School Holidays',
        'config.holidays.title': 'Public & School Holidays',
        'config.holidays.selectLocation': 'Select location',
        'config.holidays.basedOnLocation': 'Based on selected location',
        'config.holidays.negative': 'Negative impact on score',
        'config.holidays.negative.desc': 'E.g. more tourist activity expected',
        'config.persona.impact': 'Scoring Impact',
        'config.persona.race.temp.desc': 'Penalizes heat > 12°C',
        'config.persona.race.temp.ideal': 'Ideal',
        'config.persona.race.temp.idealRange': '5-12°C',
        'config.persona.race.temp.penalty': 'Penalty',
        'config.persona.race.temp.penaltyRange': '> 12°C or < 0°C',
        'config.persona.experience.temp.desc': 'Penalizes cold < 10°C, favors warm',
        'config.persona.experience.temp.ideal': 'Ideal',
        'config.persona.experience.temp.idealRange': '15-22°C',
        'config.persona.experience.temp.penalty': 'Penalty',
        'config.persona.experience.temp.penaltyRange': '< 10°C or > 25°C',
        'config.persona.race.temp.acceptableRange': '0°C - 18°C',
        'config.persona.experience.temp.acceptableRange': '10°C - 25°C',

        // Scoring - standardized to reason.* and breakdown.*
        // Removed scoring.* block to avoid duplicates.

        'detail.match': 'Match',
        'detail.analysis': 'Analysis',
        'detail.perfect': 'Perfect conditions',
        'detail.daylight': 'Daylight & Race Time',
        'detail.trainingPrep': 'Training Prep',
        'detail.weeks': 'weeks',
        'detail.avgTemp': 'Avg Air Temp (High/Low)',
        'detail.avgHumidity': 'Avg Humidity',
        'detail.gusts': 'Avg Max Gusts',
        'detail.rainRisk': 'Rain Risk',
        'detail.trailCondition': 'Trail Condition',
        'detail.mudIndex': 'Mud Index',
        'detail.history': 'Historical Context (last 10 years)',
        'detail.scoreFormula': 'Score Formula',
        'detail.finalScore': 'Final Score',
        'detail.summary': 'Analysis',
        'detail.weather': 'Historical Weather',
        'detail.conflictPrefix': 'Event Conflict:',
        'detail.daylight.title': 'Daylight & Race Time',
        'detail.acceptable': 'Acceptable',
        'detail.wind': 'Avg Max Gusts',
        'detail.mudIndex.desc': 'Estimated soil saturation based on preceding rainfall.',
        'detail.indexScore': 'Index Score',
        'detail.mud.perfect': 'Perfect',
        'detail.mud.veryMuddy': 'Very Muddy',
        'detail.mud.muddy': 'Muddy',
        'detail.mud.damp': 'Damp',
        'detail.mud.good': 'Good',
        'detail.historyContext': 'Historical Context (10y)',
        'detail.status.green': 'Excellent',
        'detail.status.yellow': 'Good',
        'detail.status.red': 'Poor',
        'detail.graph.temp': 'Temp Range',
        'detail.graph.rain': 'Rain',
        'detail.graph.humidity': 'Hum',
        'detail.graph.gusts': 'Gusts',
        'detail.tooltip.temp': 'Temp',
        'detail.tooltip.rain': 'Rain',
        'detail.tooltip.hum': 'Hum',
        'detail.tooltip.wind': 'Gusts',

        'heatmap.title': 'Heatmap Calendar',
        'heatmap.noData': 'No data.',
        'calendar.backToYear': '← Back to Year Overview',

        'config.searchCity': 'Search City',
        'config.uploadRoute': 'Upload Route',
        'config.gpx.route': 'GPX Route',
        'config.gpx.drop': 'Click to upload .gpx file',
        'config.gpx.drag': 'or drag and drop',
        'config.gpx.loaded': 'Route Loaded',
        'config.gpx.remove': 'Remove',
        'config.gpx.tip': '💡 Tip: Drag the markers to the most exposed parts of your route (peaks, ridges) for accurate weather.',
        'config.gpx.analysisActive': 'Analysis Active',
        'config.gpx.runAnalysis': 'Run Analysis',

        'gpx.map.disabled': 'Map disabled (GDPR)',
        'gpx.map.consent': 'Accept privacy terms to load OpenStreetMap tiles.',
        'gpx.map.samplingPoint': 'Sampling Point #',
        'gpx.map.ele': 'Ele',

        'detail.close': 'Close details',
        'detail.mud.dry': 'Dry',
        'detail.mud.wet': 'Wet',

        'search.label': 'Location',
        'search.placeholder': 'Search city (e.g. Bayreuth)...',
        'search.noResults.germany': 'No results found. (Note: Search limited to Germany)',

        'weather.source': 'Data Source: Open-Meteo (ERA5 Reanalysis)',

        'mud.perfect': 'Perfect',
        'mud.good': 'Good',
        'mud.damp': 'Damp',
        'mud.muddy': 'Muddy',
        'mud.veryMuddy': 'Very Muddy',

        'reason.training.insufficient': 'Not enough training time ({weeks} weeks vs {required} required)',
        'reason.training.short': 'Short Training Prep ({percent}% of recommended)',
        'reason.training.winter': 'Winter Training (Requires buffer)',
        'reason.training.crashCourse': 'Crash Course: High Injury Risk',
        'reason.blocked': 'Blocked Date',
        'reason.conflict': 'Event Conflict: {name} ({distance}km)',
        'reason.holiday.negative': 'Holiday (Negative Impact): {name}',
        'reason.holiday': 'Holiday: {name}',
        'reason.weekend.notAllowed': 'Weekend (Not allowed)',
        'reason.weekday.preferred': 'Weekday (Preferred Weekend)',
        'reason.weekday.notAllowed': 'Weekday (Not allowed)',
        'reason.darkness': 'Darkness',
        'reason.headlamp': 'Headlamp required',
        'reason.temp.ideal': 'Ideal Temp ({temp}°C Feels Like)',
        'reason.temp.warm': 'Warm ({temp}°C Feels Like)',
        'reason.temp.hot': 'Hot ({temp}°C Feels Like)',
        'reason.temp.veryHot': 'Very Hot ({temp}°C Feels Like)',
        'reason.temp.humidHot': 'Humid & Hot ({temp}°C)',
        'reason.temp.chilly': 'Chilly ({temp}°C Feels Like)',
        'reason.temp.freezing': 'Freezing ({temp}°C Feels Like)',
        'reason.temp.deepFreeze': 'Deep Freeze ({temp}°C Feels Like)',
        'reason.windchill': ' + Windchill',
        'reason.severeWindchill': ' + Severe Windchill',
        'reason.cool': 'Cool ({temp}°C)',
        'reason.tooCold': 'Too Cold ({temp}°C)',
        'reason.wind': ' + Wind',
        'reason.tempSwing': 'High Temp Swing ({swing}°C)',
        'reason.rainRisk.high': 'High Rain Risk ({prob}%)',
        'reason.accum.heat': 'Acclimatization Risk (Sudden Heat)',
        'reason.accum.cold': 'Acclimatization Risk (Sudden Cold)',
        'reason.mud.very': 'Very Muddy Trails (Index: {index})',
        'reason.mud': 'Muddy Trails',
        'reason.temp.expIdeal': 'Ideal Experience Temp ({temp}°C Feels Like)',
        'reason.darkness.headlamp': '{duration} Darkness (Headlamp required)',
        'reason.rain.showers': 'Showers likely (Short duration)',
        'reason.rain.washout': 'Washout Risk (Heavy/Long Rain)',
        'reason.hypothermia': 'HYPOTHERMIA RISK (Cold & Wet)',
        'breakdown.hypothermia': 'Hypothermia Risk',
        'breakdown.washout': 'Washout Penalty',

        'breakdown.base': 'Base Score',
        'breakdown.training': 'Insufficient Training Time',
        'breakdown.training.winter': 'Winter Training Adjustment',
        'breakdown.training.crash': 'Crash Course Penalty',
        'breakdown.shortTraining': 'Short Training Prep',
        'breakdown.blocked': 'Blocked Date',
        'breakdown.conflict': 'Event Conflict',
        'breakdown.holiday': 'Holiday ({name})',
        'breakdown.weekend': 'Weekend Not Allowed',
        'breakdown.weekday': 'Weekday Not Allowed',
        'breakdown.darkness': 'Darkness Hours',
        'breakdown.temp': 'Temp',
        'breakdown.stability': 'Temp Stability',
        'breakdown.rain': 'High Rain Risk',
        'breakdown.mud': 'Muddy',
        'breakdown.acclimatization': 'Acclimatization Risk',



        'loading.fetching_history': 'Fetching yearly weather history...',
        'loading.analyzing_year': 'Analyzing full year...',
        'error.analysis_failed': 'Failed to load weather data. Please check your connection or try again later.',
        'error.rateLimit': 'Rate limit exceeded (Too many requests). Please wait a minute before trying again.',
        'error.noData': 'No weather data found for this location. Currently, only the Fichtelgebirge region is supported.',

        'top10.title': 'Best Days',
        'top10.rank': 'Rank',
        'top10.date': 'Date',
        'top10.score': 'Score',
        'top10.conditions': 'Conditions',
        'top10.view_details': 'View',
        'top10.empty': 'No suitable dates found within criteria.',
        'top10.show_more': 'Show top 10 days',
        'top10.show_less': 'Show top 3 only',

        'footer.builtWith': 'Built with',
        'footer.rights': 'All rights reserved.',
        'footer.help': 'Help & Tour',

        // Onboarding
        'onboarding.welcome.title': 'Welcome to FichtelUltra Planner',
        'onboarding.welcome.desc': 'Your comprehensive tool to find the perfect date for your FKT or Ultra run:\nAnalyze 10 years of historical weather data\nPredict the best conditions for your specific needs\nCompare different locations and timeframes',

        'onboarding.location.title': 'Location & Route',
        'onboarding.location.desc': 'Choose your target location\nSearch for a specific city\nUpload a GPX route for precise analysis along the track',

        'onboarding.config.title': 'Set Your Parameters',
        'onboarding.config.desc': 'Define race distance and timing\nSelect run style (Race vs Experience)\nAvoid conflicting events nearby\nConsider holidays and school vacations\nSet preparation and training time',

        'onboarding.analysis.title': 'Smart Analysis',
        'onboarding.analysis.desc': 'Temperature scoring\nWind risk assessment\nRain probability analysis\nDaylight availability check\nEstimated trail conditions (Mud Index)',

        'onboarding.visualization.title': 'Find Your Day',
        'onboarding.visualization.desc': 'View top 3 recommendations instantly\nUse Year Overview for long-term planning\nCheck Heatmap Calendar for specific dates\nClick any day for hourly weather details',

        'onboarding.next': 'Next',
        'onboarding.back': 'Back',
        'onboarding.finish': 'Get Started',
        'onboarding.skip': 'Skip',
        'onboarding.close': 'Close',

        'consent.message': 'Privacy & Data Consent',
        'consent.details': 'This application retrieves weather data from Open-Meteo and holiday dates from OpenHolidays. To function, your IP address may be processed by these services. By continuing, you agree to this usage.',
        'consent.accept': 'Agree & Continue',
        'error.consent_required': 'Consent required to load data. Please accept the privacy terms.'
    },
    de: {
        'app.title': 'Laufevent Datumsfinder',
        'app.subtitle': 'Finde das perfekte Datum für deinen Lauf.',

        'header.brand': 'Laufevent Datumsfinder',
        'header.app': 'FichtelUltra',
        'loading.analyzing': 'Analysiere...',

        'config.location': 'Ort',
        'config.location.placeholder': 'Ort suchen (z.B. Selb, Regensburg)...',
        'config.timing': 'Zeitplanung',
        'config.eventDay': 'Lauf-Tag',
        'config.weekends': 'Wochenende (Sa, So)',
        'config.weekdays': 'Wochentage (Mo-Fr)',
        'config.startTime': 'Startzeit',
        'config.cutoffTime': 'Cut-Off Zeit',
        'config.hours': 'Stunden',
        'config.custom': 'Benutzerdefiniert...',
        'config.back': 'Zurück',
        'config.scoring': 'Bewertungsparameter',
        'config.persona': 'Lauf-Modus',
        'config.persona.desc': 'Wähle einen Laufstil um die Bewertung anzupassen',
        'config.persona.race': 'Wettkampf',
        'config.persona.race.desc': 'Optimale Bedingungen für Leistung',
        'config.persona.experience': 'Erlebnis',
        'config.persona.experience.desc': 'Komfortable Bedingungen',
        'config.conflicts': 'Event Konflikte',
        'config.conflicts.avoid': 'Event-Konflikte vermeiden',
        'config.conflicts.desc': 'Events in der Nähe haben negativen Einfluss auf die Bewertung',
        'config.conflicts.radius': 'Suchradius',
        'config.conflicts.dataSources': 'Datenquellen',
        'config.dataUpdated': 'Daten aktualisiert:',
        'config.nextUpdate': 'Nächstes Update:',
        'config.prep': 'Vorbereitungszeit',
        'config.prep.title': 'Vorbereitung',
        'config.prep.distance': 'Distanz',
        'config.prep.trainingTime': 'Trainingszeit',
        'config.prep.suggestion': 'Vorschlag basierend auf Distanz',
        'config.prep.tooltip': 'Berücksichtigt Tapering-Puffer und saisonale Erschwernis.',
        'config.holidays': 'Feiertage & Ferien',
        'config.holidays.title': 'Feiertage & Ferien',
        'config.holidays.selectLocation': 'Ort wählen',
        'config.holidays.basedOnLocation': 'Basierend auf gewähltem Ort',
        'config.holidays.negative': 'Negativer Einfluss auf Bewertung',
        'config.holidays.negative.desc': 'z.B. wegen erhöhtem Touristenaufkommen',
        'config.persona.impact': 'Einfluss auf Bewertung',
        'config.persona.race.temp.desc': 'Hitze > 12°C hat negativen Einfluss auf Bewertung',
        'config.persona.race.temp.ideal': 'Ideal',
        'config.persona.race.temp.idealRange': '5-12°C',
        'config.persona.race.temp.penalty': 'Ungeeignet',
        'config.persona.race.temp.penaltyRange': '> 12°C oder < 0°C',
        'config.persona.experience.temp.desc': 'Kälte < 10°C hat negativen Einfluss auf Bewertung, Wärme wird bevorzugt',
        'config.persona.experience.temp.ideal': 'Ideal',
        'config.persona.experience.temp.idealRange': '15-22°C',
        'config.persona.experience.temp.penalty': 'Ungeeignet',
        'config.persona.experience.temp.penaltyRange': '< 10°C oder > 25°C',
        'config.persona.race.temp.acceptableRange': '0°C - 18°C',
        'config.persona.experience.temp.acceptableRange': '10°C - 25°C',

        'detail.match': 'Match',
        'detail.analysis': 'Analyse',
        'detail.perfect': 'Perfekte Bedingungen',
        'detail.daylight': 'Tageslicht',
        'detail.trainingPrep': 'Vorbereitung',
        'detail.weeks': 'Wochen',
        'detail.avgTemp': 'Ø Luft-Temp (Hoch/Tief)',
        'detail.avgHumidity': 'Ø Luftfeuchte',
        'detail.gusts': 'Ø Max Böen',
        'detail.rainRisk': 'Regenrisiko',
        'detail.trailCondition': 'Bodenbeschaffenheit',
        'detail.mudIndex': 'Matsch-Index',
        'detail.history': 'Historischer Kontext (10J)',
        'detail.scoreFormula': 'Bewertungsformel',
        'detail.finalScore': 'Finale Bewertung',
        'detail.summary': 'Analyse',
        'detail.weather': 'Historisches Wetter',
        'detail.conflictPrefix': 'Event Konflikt:',
        'detail.daylight.title': 'Tageslicht & Eventzeitraum',
        'detail.acceptable': 'Akzeptabel',
        'detail.wind': 'Ø Max Böen',
        'detail.mudIndex.desc': 'Geschätzte Bodenfeuchte basierend auf vorherigem Regen.',
        'detail.indexScore': 'Index',
        'detail.mud.perfect': 'Perfekt',
        'detail.mud.veryMuddy': 'Sehr Matschig',
        'detail.mud.muddy': 'Matschig',
        'detail.mud.damp': 'Feucht',
        'detail.mud.good': 'Gut',
        'detail.historyContext': 'Historischer Kontext (letzte 10 Jahre)',
        'detail.status.green': 'Exzellenter',
        'detail.status.yellow': 'Guter',
        'detail.status.red': 'Schlechter',
        'detail.graph.temp': 'Temp-Bereich',
        'detail.graph.rain': 'Regen',
        'detail.graph.humidity': 'Feuchte',
        'detail.graph.gusts': 'Böen',
        'detail.tooltip.temp': 'Temp',
        'detail.tooltip.rain': 'Regen',
        'detail.tooltip.hum': 'Feuchte',
        'detail.tooltip.wind': 'Böen',

        'mud.perfect': 'Perfekt',
        'mud.good': 'Gut',
        'mud.damp': 'Feucht',
        'mud.muddy': 'Matschig',
        'mud.veryMuddy': 'Sehr Matschig',

        'reason.training.insufficient': 'Nicht genug Trainingszeit ({weeks} Wochen vs {required} nötig)',
        'reason.training.short': 'Kurze Vorbereitung ({percent}% der Empfehlung)',
        'reason.training.winter': 'Winter-Training (Benötigt Puffer)',
        'reason.training.crashCourse': 'Crash-Kurs: Verletzungsrisiko!',
        'reason.blocked': 'Blockiertes Datum',
        'reason.conflict': 'Event Konflikt: {name} ({distance}km)',
        'reason.holiday.negative': 'Feiertag/Ferien (Negativ): {name}',
        'reason.holiday': 'Feiertag/Ferien: {name}',
        'reason.weekend.notAllowed': 'Wochenende (Nicht erlaubt)',
        'reason.weekday.preferred': 'Wochentag (Wochenende bevorzugt)',
        'reason.weekday.notAllowed': 'Wochentag (Nicht erlaubt)',
        'reason.darkness': 'Dunkelheit',
        'reason.headlamp': 'Stirnlampe nötig',
        'reason.temp.ideal': 'Ideal Temp ({temp}°C Gefühlt)',
        'reason.temp.warm': 'Warm ({temp}°C Gefühlt)',
        'reason.temp.hot': 'Heiß ({temp}°C Gefühlt)',
        'reason.temp.veryHot': 'Sehr Heiß ({temp}°C Gefühlt)',
        'reason.temp.humidHot': 'Schwül & Heiß ({temp}°C Gefühlt)',
        'reason.temp.chilly': 'Frisch ({temp}°C Gefühlt)',
        'reason.temp.freezing': 'Gefrierend ({temp}°C Gefühlt)',
        'reason.temp.deepFreeze': 'Eiskalt ({temp}°C Gefühlt)',
        'reason.windchill': ' + Abkühlung durch Wind',
        'reason.severeWindchill': ' + Starker Abkühlung durch Wind',
        'reason.cool': 'Kühl ({temp}°C)',
        'reason.tooCold': 'Zu Kalt ({temp}°C)',
        'reason.wind': ' + Wind',
        'reason.tempSwing': 'Hohe Temp.schwankung ({swing}°C)',
        'reason.rainRisk.high': 'Hohes Regenrisiko ({prob}%)',
        'reason.accum.heat': 'Akklimatisierungsrisiko (Hitze)',
        'reason.accum.cold': 'Akklimatisierungsrisiko (Kälte)',
        'reason.mud.very': 'Sehr matschige Trails (Index: {index})',
        'reason.mud': 'Matschige Trails',
        'reason.temp.expIdeal': 'Ideale Komfort-Temperatur ({temp}°C Gefühlt)',
        'reason.darkness.headlamp': '{duration} Dunkelheit (Stirnlampe nötig)',
        'reason.rain.showers': 'Schauer wahrscheinlich (Kurz)',
        'reason.rain.washout': 'Washout Risiko (Dauerregen/Starkregen)',
        'reason.hypothermia': 'HYPOTHERMIE RISIKO (Kalt & Nass)',
        'breakdown.hypothermia': 'Hypothermie Risiko',
        'breakdown.washout': 'Washout Strafe',

        'breakdown.base': 'Basis Score',
        'breakdown.training': 'Zu wenig Trainingszeit',
        'breakdown.training.winter': 'Winter-Training Anpassung',
        'breakdown.training.crash': 'Crash-Kurs Strafe',
        'breakdown.shortTraining': 'Kurze Vorbereitung',
        'breakdown.blocked': 'Blockiert',
        'breakdown.conflict': 'Event Konflikt',
        'breakdown.holiday': 'Feiertag ({name})',
        'breakdown.weekend': 'Wochenende nicht erlaubt',
        'breakdown.weekday': 'Wochentag nicht erlaubt',
        'breakdown.darkness': 'Dunkelheit (Stunden)',
        'breakdown.temp': 'Temperatur',
        'breakdown.stability': 'Temp. Stabilität',
        'breakdown.rain': 'Hohes Regenrisiko',
        'breakdown.mud': 'Matschig',
        'breakdown.acclimatization': 'Akklimatisierung',

        'heatmap.noData': 'Keine Daten.',
        'heatmap.title': 'Heatmap',
        'calendar.backToYear': '← Zurück zur Jahresübersicht',

        'config.searchCity': 'Ort suchen',
        'config.uploadRoute': 'Route hochladen',
        'config.gpx.route': 'GPX Route',
        'config.gpx.drop': 'Klicken zum Hochladen (.gpx)',
        'config.gpx.drag': 'oder per Drag & Drop',
        'config.gpx.loaded': 'Route geladen',
        'config.gpx.remove': 'Entfernen',
        'config.gpx.tip': '💡 Tipp: Ziehe die Marker auf exponierte Stellen (Gipfel, Kämme) für genauere Wetterdaten.',
        'config.gpx.analysisActive': 'Analyse aktiv',
        'config.gpx.runAnalysis': 'Analyse starten',

        'gpx.map.disabled': 'Karte deaktiviert (DSGVO)',
        'gpx.map.consent': 'Stimme den Datenschutzbestimmungen zu, um OpenStreetMap zu laden.',
        'gpx.map.samplingPoint': 'Messpunkt Nr. ',
        'gpx.map.ele': 'Höhe',

        'detail.close': 'Details schließen',
        'detail.mud.dry': 'Trocken',
        'detail.mud.wet': 'Nass',

        'search.label': 'Ort',
        'search.placeholder': 'Stadt suchen (z.B. Selb, Regensburg)...',
        'search.noResults.germany': 'Keine Ergebnisse. (Hinweis: Suche auf Deutschland beschränkt)',

        'weather.source': 'Datenquelle: Open-Meteo (ERA5 Reanalysis)',

        'loading.fetching_history': 'Lade Wetterhistorie (ganzes Jahr)...',
        'loading.analyzing_year': 'Analysiere das komplette Jahr...',
        'error.analysis_failed': 'Fehler beim Laden der Wetterdaten. Bitte prüfen Sie Ihre Verbindung oder versuchen Sie es später noch einmal.',
        'error.rateLimit': 'Zu viele Anfragen (Rate Limit). Bitte probiere es in einigen Stunden noch einmal.',
        'error.noData': 'Keine Wetterdaten für diesen Ort gefunden. Aktuell wird nur die Region Fichtelgebirge unterstützt.',

        'top10.title': 'Beste Tage',
        'top10.rank': 'Rang',
        'top10.date': 'Datum',
        'top10.score': 'Score',
        'top10.conditions': 'Bedingungen',
        'top10.view_details': 'Details',
        'top10.empty': 'Keine passenden Tage mit diesen Einstellungen gefunden.',
        'top10.show_more': 'Top 10 Tage anzeigen',
        'top10.show_less': 'Nur Top 3 anzeigen',

        'footer.builtWith': 'Entwickelt mit',
        'footer.rights': 'Alle Rechte vorbehalten.',
        'footer.help': 'Hilfe & Tour',

        // Onboarding
        'onboarding.welcome.title': 'Willkommen beim Laufevent Datumsfinder',
        'onboarding.welcome.desc': 'Finde das perfekte Datum für dein Trailrunning Event.\nDas Tool analysiert alle relevanten Bedingungen, damit dem Sport nichts im Wege steht.',

        'onboarding.location.title': 'Ort & Strecke',
        'onboarding.location.desc': 'Suche einen Ort, oder lade eine GPX-Route hoch, um eine präzise Wettervorhersage für die Region zu erhalten.\nDas Tool analysiert 10 Jahre historische Wetterdaten und prüft die idealen Laufbedingungen.',

        'onboarding.config.title': 'Deine Einstellungen',
        'onboarding.config.desc': 'Definiere deine wichtigsten Rahmenbedingungen:\nWelche Wochentage kommen in Frage?\nWann ist Start und Cut-Off Zeit?\nWähle einen Laufstil: Wettkampf vs. Erlebnis\nChecke Feiertage, Ferien & Konflikte mit parallelen Events\nPlane Vorbereitungszeit zum Formaufbau mit ein',

        'onboarding.analysis.title': 'Die Analyse',
        'onboarding.analysis.desc': 'Das Tool berechnet einen Score aus:\nTemperatur & Wind\nRegenrisiko & Tageslicht\nMatsch-Index (Bodenfeuchte)\nAllen weiteren definierten Parametern',

        'onboarding.visualization.title': 'Das Ergebnis',
        'onboarding.visualization.desc': 'Die am besten geeigneten Tage des Jahres auf einen Blick\nTop Empfehlungen und Jahresübersicht\nDetaillierte Wetterdaten für alle Tage',

        'onboarding.next': 'Weiter',
        'onboarding.back': 'Zurück',
        'onboarding.finish': 'Los geht\'s',
        'onboarding.skip': 'Überspringen',
        'onboarding.close': 'Schließen',

        'consent.message': 'Datenschutz Zustimmung',
        'consent.details': 'Diese Anwendung ruft Wetterdaten von Open-Meteo und Feiertage von OpenHolidays ab. Um zu funktionieren, wird Ihre IP-Adresse ggf. von diesen Diensten verarbeitet. Durch Fortfahren stimmen Sie dieser Nutzung zu.',
        'consent.accept': 'Zustimmen & Weiter',
        'error.consent_required': 'Zustimmung erforderlich. Bitte akzeptieren Sie die Datenschutzhinweise.'
    }
};
