# FichtelUltra Event OS: Date Finder

## Background
The **Date Finder** is the first module of the **FichtelUltra Event OS**, a comprehensive toolkit designed to democratize professional trail running event organization.

Built on the philosophy *"Wandern ist Taktik"* ("Walking is Strategy"), FichtelUltra aims to remove barriers for amateur runners and organizers alike. This tool addresses the critical first step of event planning: **Scheduling**. Finding a date that balances weather conditions, daylight availability, and participant schedules is often a complex guess-work. The Date Finder turns this into a data-driven decision.

## Core Functionality
The application provides a "Vibe Coding" dashboard that analyzes every day of a selected month to calculate a suitability score (0-100).

### Key Features
*   **🏃 Runability Score (0-100)**: A proprietary "Vibe Coding" algorithm that evaluates a date's suitability for running. It processes:
    *   **Temperature Comfort**: Penalties for extreme heat (>20°C) or freezing cold (<0°C).
    *   **Precipitation Impact**: Heavy penalties for rain, especially during race hours.
    *   **Daylight Safety**: Scores based on how much of the race happens in daylight vs. civil twilight vs. night.
    *   **Wind Factor**: (Coming soon: Wind chill adjustments).
*   **📊 "Vibe Coding" Dashboard**: A visual Deep Dive into any selected day:
    *   **Interactive Charts**: 4-Metric view (Temp, Rain, Wind, Humidity) with 3-hour granularity.
    *   **Daylight visualizer**: See exactly when the sun rises/sets relative to your race timeline.
*   **📍 Location Intelligence**:
    *   **Smart Search**: Type any city (e.g., "Bayreuth", "Chamonix") to auto-fetch coordinates.
    *   **Timezone Aware**: All times are adjusted to the local timezone of the race location.
*   **☀️ Historical Weather Analysis**: Fetches 5-year historical averages from OpenMeteo for reliable forecasting of seasonal trends.
*   **🎉 Holiday Integration**:
    *   **Public Holidays**: Treated as positive days (participants are free).
    *   **School Holidays**: Displayed for planning context (families might be away).
    *   **State Selection**: Configurable for all German states.
*   **🚫 Conflict Management**: Simple UI to manually block dates, ensuring you don't clash with major adjacent events (like the Berlin Marathon).

## Technical Stack
*   **Frontend**: React (Vite), TypeScript
*   **UI/UX**: Tailwind CSS, shadcn/ui, Lucide Icons
*   **Logic**: `suncalc` (Daylight), `date-fns` (Time), Custom Scoring Algorithms
*   **APIs**:
    *   [OpenMeteo](https://open-meteo.com/) (Weather & Geocoding)
    *   [Nager.Date](https://date.nager.at/) (Public Holidays)
    *   [Ferien-API](https://ferien-api.de/) (School Holidays)

## Future Plans
This is currently an **MVP (Minimum Viable Product)** running entirely client-side. The roadmap includes:

1.  **Backend Integration (Supabase)**:
    *   User Authentication to save multiple event drafts.
    *   Persistent storage for custom constraints.
2.  **Competition Intelligence**:
    *   Automated fetching of competitor events (e.g., from DUV Ultra Statistics or other race calendars) to replace manual blocking.
3.  **Export & Share**:
    *   Generate one-pager PDF reports to share with local authorities or stakeholders.
    *   "Add to Calendar" functionality.
