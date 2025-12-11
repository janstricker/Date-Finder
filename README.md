# FichtelUltra Event OS: Date Finder

## Background
The **Date Finder** is the first module of the **FichtelUltra Event OS**, a comprehensive toolkit designed to democratize professional trail running event organization.

Built on the philosophy *"Wandern ist Taktik"* ("Walking is Strategy"), FichtelUltra aims to remove barriers for amateur runners and organizers alike. This tool addresses the critical first step of event planning: **Scheduling**. Finding a date that balances weather conditions, daylight availability, and participant schedules is often a complex guess-work. The Date Finder turns this into a data-driven decision.

## Core Functionality
The application provides a "Vibe Coding" dashboard that analyzes every day of a selected month to calculate a suitability score (0-100).

### Key Features
*   **📍 Location Intelligence**: Search for any city or region to automatically retrieve coordinates (via OpenMeteo Geocoding).
*   **☀️ Historical Weather Analysis**: Fetches 5-year historical averages for Temperature and Precipitation. The scoring logic penalizes dates that are statistically too hot (>25°C), too cold (<5°C), or rainy.
*   **🌅 Advanced Daylight Logic**: Calculates exact Sunrise and Sunset times based on your specific **Race Start Time** and **Duration**. It warns you if your event will start or end in the dark—essential for safety planning without expensive lighting gear.
*   **🎉 Holiday Integration**: Automatically detects:
    *   **Public Holidays**: Treated as positive days (participants are free).
    *   **School Holidays**: Displayed for planning context (families might be away).
    *   **State Selection**: Configurable for all German states (e.g., Bayern, Berlin).
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
