# Experten-Review v03: Wetter-Logik Deep Dive

**Fokus:** Detaillierte Analyse der meteorologischen Berechnungsmodelle und deren Relevanz für den Sportler.
**Ziel:** Beantwortung der Nutzerfragen zu "Regendauer vs. Menge" und "Gefühlte Temperatur".

---

## 1. Experte: Der Meteorologe
*Fokus: Datenqualität & Physikalische Korrektheit*

### Status Quo Analyse
Aktuell nutzt die App historische Tagesdaten (`precipitation_sum`, `temperature_2m_max`).
- **Regen-Logik:** Ein Tag gilt als "Regen-Risiko", wenn in >50% der letzten 10 Jahre mehr als **1mm** Niederschlag fiel.
- **Temperatur-Logik:** Es wird die reine Lufttemperatur (`2m_max`) verwendet. Wind und Feuchtigkeit werden durch manuelle `if`-Abfragen ("Schwellenwerte") berücksichtigt.

### Deep Dive: Die Nutzerfragen

#### Szenario A: "Ein bisschen Regen ist verkraftbar vs. Dauerregen"
**Analyse:** Die aktuelle Logik unterscheidet NICHT zwischen einem 10-Minuten-Schauer (1mm) und 5 Stunden Nieselregen (1mm).
- **Das Problem:** Die Variable `precipitation_sum` ist eine "Black Box" für die Tagesverteilung.
- **Die Lösung:** Die OpenMeteo API bietet den Parameter `precipitation_hours`. Dieser ist viel wertvoller für die Planung.
    - *Beispiel:* 5mm Niederschlag in 1 Stunde = Heftiger Schauer, danach trocken (Gut für Event). 5mm in 10 Stunden = Der Boden weicht auf, Hypothermie-Gefahr (Schlecht).

#### Szenario B: "Taupunkt / Gefühlte Temperatur"
**Analyse:** Aktuell "baut" die App ihre eigene gefühlte Temperatur (`if humidity > 70 then temp_limit = 15 else 18`). Das ist eine gute Annäherung, aber physikalisch grob.
- **Wissenschaftlicher Fakt:** Für sportliche Leistung ist die **Feuchtkugeltemperatur (Wet Bulb Temperature)** oder der **Hitzeindex** entscheidend. Ab einem Taupunkt von >16°C kann Schweiß kaum noch verdunsten -> Körper überhitzt.
- **Optimierung:** OpenMeteo liefert direkt `apparent_temperature_max` (Gefühlte Temp). Diese Variable kombiniert Windchill (Kälte) und Hitzeindex (Wärme/Feuchte) nach standardisierten Modellen.

### Konkrete Optimierungsvorschläge (Meteorologe)
1.  **API Upgrade:** Statt `temperature_2m_max` -> `apparent_temperature_max` abfragen. Ersetzt die manuelle "Wind/Feuchte"-Logik durch einen Industriestandard.
2.  **Regendauer nutzen:** Parameter `precipitation_hours` hinzunehmen.
    - *Formel-Idee:* Strafe nur, wenn `precipitation_hours > 3` ODER `precipitation_sum > 5mm`.

---

## 2. Experte: Der Profi-Sportler (Ultra-Trail)
*Fokus: "Runability" & Realitätscheck*

### Status Quo Kritik
Der Score "bestraft" Regenwahrscheinlichkeit (>50%) pauschal mit **-40 Punkten**.
- **Realitätscheck:** Ein Ultra-Läufer *erwartet* Matsch und Wetter. Ein Tag mit 60% Schauer-Risiko ist kein "Rotes Licht" (Score < 40), sondern eher ein "Gelbes Licht" (Pack Regenjacke ein).
- **Fehlgewichtung:** Die aktuelle Logik behandelt "Nasses Gras" (1mm Regen) fast genauso hart wie "Sturmflut".

### Zu den Nutzerfragen

#### "Morgens Regen, danach trocken?"
**Einschätzung:** Das ist der Klassiker. Start im Regen, Finish in der Sonne.
- **Problem:** Wenn ich sehe "Regenrisiko: Hoch", sage ich vielleicht ab. Dabei wäre der Boden schnell trocken.
- **Wichtig:** Im Ultra-Bereich ist **Wind** bei Nässe der Killer (Auskühlung). Trockene Kälte ist okay (-5°C). Nasse Kälte (+2°C & Regen) ist lebensgefährlich.
- **Feedback zur Logik:** Die App prüft Windchill (`temp < 0 && wind > 20`). **Das ist zu spät!** Hypothermie droht schon bei +5°C, wenn man nass ist. Die Kombination `Rain Probability > 50%` AND `Temp < 10°C` müsste die *eigentliche* Todeszone sein.

#### "Gefühlte Temperatur relevanter?"
**Einschätzung:** JA! Absolut.
- Im Sommer: 25°C trocken = Bestzeit. 25°C schwül = DNF (Did Not Finish) wegen Magenproblemen/Hitze.
- Im Winter: -5°C Windstill = Traum. -5°C mit Sturm = Erfrierungen im Gesicht.
- **Urteil:** Die Umstellung auf "Apparent Temperature" wäre ein *Gamechanger* für die Verlässlichkeit. Ich traue "30°C" nicht, aber "Gefühlte 35°C" ist eine Warnung, die ich verstehe.

---

## Zusammenfassung & Roadmap

Um die Logik auf das nächste Level zu heben, sind folgende Schritte empfohlen:

1.  **Metric Swap:** Tausche in `weather.ts` und `scoring.ts` die `temperature_2m` gegen `apparent_temperature`. Das vereinfacht den Code (`scoring.ts` muss weniger `if`-Bedingungen haben) und erhöht die Präzision.
2.  **Rain Nuance:** Unterscheidung einführen:
    - **"Showers"**: (Wahrscheinlichkeit hoch, aber Menge < 5mm) -> Kleiner Abzug (-10).
    - **"Washout"**: (Menge > 5mm OR Stunden > 4) -> Großer Abzug (-40).
3.  **The "Killer Combo":** Neue Logik-Regel für `Cold & Wet`. Wenn `ApparentTemp < 5°C` UND `RainProb > 40%` -> Massive Warnung/Abzug. Das ist gefährlicher als -10°C trocken.
