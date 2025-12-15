# Experten-Review: Date Finder App (Prototyp)

**Version:** v01
**Datum:** 2025-12-15
**Gegenstand:** Analyse des Quellcodes (`app/src`) und der Business-Logik.

---

## Schritt 1: Technisches Verständnis

Die Applikation ist ein **React-basiertes Dashboard** (Vite, TypeScript, TailwindCSS), das darauf abzielt, datengestützt den idealen Zeitraum für ein Sportevent ("FichtelUltra") zu finden.

**Kern-Metriken:**
- **Runability Score (0-100):** Ein berechneter Wert basierend auf diversen Constraints.
- **Datenbasis:**
  - **Wetter:** 10 Jahre historische Daten via OpenMeteo API (Temperatur, Regen, Wind, Feuchtigkeit).
  - **Astronomie:** `suncalc` für exakte Tageslichtberechnung (Sonnenaufgang/-untergang).
  - **Logik:** Harte (z.B. Trainingszeit) und weiche (z.B. Feiertage, Matsch-Index) Faktoren.

**Code-Struktur:**
- Moderne React-Hooks (`useState`, `useEffect` via Custom Hooks).
- **Hardcore-Visualisierung:** `DetailCard.tsx` rendert komplexe SVG-Charts manuell (keine Chart-Lib), was performant ist, aber wartungsintensiv.
- **Separation of Concerns:** Gute Trennung von Logik (`scoring.ts`, `weather.ts`) und UI.

---

## Schritt 2: Experten-Reviews

### 1. Senior Webdesigner & UX-Experte
*Fokus: UI/UX, Code-Qualität*

**Analyse:**
- **Positiv:** Der visuelle Anspruch ("Best Practices", "Premium") ist erkennbar. Nutzung von Farbverläufen für Tageslicht und SVG-Charts zeugt von Liebe zum Detail. Tailwind-Nutzung ist sauber.
- **Negativ:** Die Komponente `DetailCard.tsx` ist mit über 500 Zeilen **monolithisch**. Das Wartungsrisiko ist hoch.

**Logische Fehler / Barrierefreiheit:**
- **Desktop-First Bias:** Die Tooltips (`group-hover:visible`) funktionieren exzellent mit der Maus, sind aber auf Touch-Geräten (Mobile) quasi unbenutzbar. Ein Klick-Trigger (`onClick`) fehlt.
- **Farbkontraste:** Die Nutzung von Textfarben wie `text-emerald-400` auf `bg-slate-900` ist gut (Dark Mode Style), aber die "Traffic Light" Logik (Grün/Gelb/Rot) verlässt sich rein auf Farbe. Für Farbenblinde wäre ein zusätzliches Icon oder Text-Label direkt am Wert hilfreich.

**Sinnhaftigkeit:**
- Hoch. Das UI erzählt eine Geschichte ("Data Storytelling"), statt nur Tabellen zu zeigen.

**Verbesserungsvorschläge:**
1. **Refactoring:** `DetailCard.tsx` in Sub-Komponenten aufbrechen (`<DaylightChart />`, `<WeatherHistoryChart />`).
2. **Mobile UX:** Tooltips auf "Click/Tap" umstellen oder für Mobile eine alternative Info-Ansicht (Modal/Drawer) bauen.

---

### 2. Sportevent Organisator
*Fokus: Score-Aussagekraft, Übersicht*

**Analyse:**
- **Positiv:** Der "Runability Score" reduziert komplexe Daten auf eine einzige, entscheidbare Zahl. Das Ampelsystem macht die Entscheidung ("Go/No-Go") einfach.
- **Negativ:** Die "Training Time"-Logik (Harter Blocker auf 0 Score) ist sehr strikt. Wenn ein Event in 10 Wochen ist, aber 12 Wochen Training empfohlen werden, fällt der Score auf 0. Das könnte Nutzer flustrieren, die "schon fit" sind. (Dies ist im UI abschaltbar, aber als Default hart).

**Sinnhaftigkeit:**
- Sehr hoch. Die Integration von Ferienterminen (`holidays`) ist ein Killer-Feature für die Planung, um Teilnehmern die Anreise zu erleichtern oder Konflikte zu vermeiden.

**Verbesserungsvorschläge:**
1. **Soft-Fail bei Training:** Statt Score 0 eine starke Warnung oder Abzug (-30 Punkte), damit der Tag im Kalender zumindest noch sichtbar vergleichbar bleibt.
2. **Erklärbarkeit:** Der Score braucht eine "Top 3 Gründe"-Zusammenfassung direkt am Dashboard-Header (z.B. "Perfektes Wetter, aber zu wenig Training").

---

### 3. Erfahrener Meteorologe
*Fokus: Wetterdaten-Interpretation*

**Analyse:**
- **Positiv:** Die Nutzung von 10 Jahren Historie (`weather.ts`) glättet Ausreißer. Die Berechnung des "Matsch-Index" (`mudIndex`) basierend auf *vorangegangenem* Regen (Trailing 3-Day Sum) ist fachlich exzellent für Trail-Running.
- **Logik-Check:**
  - **Wind:** Es wird der Durchschnitt der *täglichen Maximalböen* über 10 Jahre gebildet. Das ist korrekt, um die "typische Böigkeit" abzubilden.
  - **Regenrisiko:** Die Wahrscheinlichkeit (`rainProbability`) wird korrekt über die Anzahl der Tage mit >1mm Regen berechnet (nicht über die Menge). Das ist für die Planung ("Werde ich nass?") der korrektere Ansatz als reine mm-Mengen.
  - **Akklimatisation:** Die Logik für "Heat Shock Risk" (Training im Winter -> Event im ersten warmen Frühlingsmonat) ist meteorologisch und physiologisch sehr weitsichtig!

**Sinnhaftigkeit:**
- Absolut gegeben. Die Unterscheidung zwischen "Competition" (kühler = besser) und "Experience" (wärmer = besser) ist meteorologisch korrekt implementiert.

**Verbesserungsvorschläge:**
1. **Varianz anzeigen:** Der Chart zeigt Min/Max-Range ("Schlauch"), was gut ist. Ein Indikator für "stabile Wetterlage" vs "chaotische Wetterlage" (Standardabweichung?) wäre das i-Tüpfelchen.

---

### 4. Profi-Sportler (Outdoor-Fokus)
*Fokus: Praxisrelevanz*

**Analyse:**
- **Positiv:** Das Feature "Nachtstunden (Stirnlampe nötig)" ist genial. Nichts ist nerviger als unerwartet im Dunkeln zu laufen. Auch der "Matsch-Index" entscheidet über die Schuhwahl.
- **Negativ:**
  - **Experience-Mode Temp:** Im Experience-Modus beginnt die Penalty ("Too Cold") schon unter 15°C. Für sportliches Wandern/Laufen ist 10-14°C oft noch sehr angenehm ("Shorts-Wetter wenn man sich bewegt"). 15°C als *Untergrenze* für "Ideal" wirkt etwas hoch für Mitteleuropa.
  - **Wochentage:** Die Option "Wandern ist Taktik" passt zum "Experience"-Ansatz. Hier ist die Akzeptanz für Wochenend-Termine (Fr-So) oft höher als unter der Woche.

**Sinnhaftigkeit:**
- Die Daten sind direkt in Ausrüstung (Lampe, Schuhe, Kleidung) übersetzbar. Das ist selten bei Wetter-Apps.

**Verbesserungsvorschläge:**
1. **Experience-Toleranz erweitern:** Den "Wohlfühlbereich" im Code (`scoring.ts`) auf 12°C absenken. Bewegung erzeugt Wärme.
2. **Packliste:** Aus den Daten (Matsch > 5 -> "Trail-Schuhe mit Profil", Nacht > 0 -> "Stirnlampe") könnte direkt eine Packliste generiert werden.

---

## Schritt 3: Synthese & Fazit

Der Prototyp ist **technisch solide und fachlich überraschend tiefgehend**. Er ist kein bloßes "Wetter-Widget", sondern ein echtes Entscheidungstool. Die Logik (`scoring.ts`) ist das Herzstück und bereits sehr reif.

**Wichtigste Priorität für den nächsten Schritt:**
> **[UX/Frontend] Refactoring & Mobile-Readiness**
> Die `DetailCard` muss dringend modularisiert werden, und die **Tooltips müssen touch-fähig werden**. Ohne dies ist die tiefe Logik auf Smartphones (wo Sportler oft planen) unsichtbar.

**Urteil:** Brauchbar? **JA**.
Potenzial: **SEHR HOCH** (Alleinstellungsmerkmal durch "Persona"-Logik).
