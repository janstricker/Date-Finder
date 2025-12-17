# Experten-Review v03: Vorbereitungszeit & Training

**Fokus:** Analyse der Zeit-Berechnung (`trainingWeeksAvailable`) aus Sicht eines Profi-Athleten.
**Ziel:** Evaluation der aktuellen "Linearen Strafe" und Identifikation von Optimierungspotenzial.

---

## 1. Experte: Der Profi-Athlet (Trainer-Lizenz A)
*Fokus: Physiologie, Periodisierung & Realitätscheck*

### Status Quo Analyse
**Code-Basis (`scoring.ts`):**
- **Berechnung:** `weeksAvailable / minTrainingWeeks` = Ratio.
- **Fail:** Ratio < 0.5 -> Score 0 ("Critical Failure").
- **Penalty:** Ratio 0.5 bis 0.99 -> Linearer Abzug (`-(1-ratio)*100`).
    - *Beispiel:* 20 Wochen nötig, 18 vorhanden (90%) -> -10 Punkte.
    - *Beispiel:* 20 Wochen nötig, 12 vorhanden (60%) -> -40 Punkte.

### Kritik & Fehleinschätzungen

#### 1. "Die letzte Woche fehlt" (Tapering-Paradoxon)
Die aktuelle Logik bestraft das Fehlen einer beliebigen Woche gleich. Physiologisch ist das falsch.
- **Szenario:** Du hast 20 Wochen geplant, hast aber nur noch 19 Wochen Zeit bis zum Event.
- **Logik heute:** -5 Punkte Strafe.
- **Realität:** Völlig egal. Die letzte Woche ist "Tapering" (Erholung). Ob die Vorbereitung 19 oder 20 Wochen dauert, ist für die physiologische Anpassung fast irrelevant.
- **Das Urteil:** Kleine Abweichungen (<10%) sollten **keine** oder nur minime Strafe geben.

#### 2. "Der Weekend-Warrior Faktor"
Für Amateure (Zielgruppe "FichtelUltra Confidence") ist der **Umfang pro Woche** der limitierende Faktor, nicht die absolute Zeit.
- Wenn ich nur 10 Wochen statt 12 habe, kann ich das kompensieren, indem ich pro Woche 10% mehr laufe (Risiko: Verletzung).
- Die aktuelle "Harte Grenze" bei 50% (Score 0) ist gut als Sicherheitsnetz ("Crash Course" Verbot).

#### 3. "Saisonale Erschwernis" (Winter-Training)
Die App ignoriert, *wann* die Vorbereitung stattfindet.
- **Race im März:** Training im Jan/Feb (Dunkel, Glatteis, Kälte). -> 1 Woche Ausfall wegen Grippe ist wahrscheinlich. Man braucht *mehr* Puffer.
- **Race im September:** Training im Sommer. -> Konstantes Training einfacher.
- **Fehlgewichtung:** Die gleiche Zeitdauer (12 Wochen) ist im Winter weniger "wert" als im Sommer.

---

## Optimierungsvorschläge (Roadmap)

### A. Non-Lineare Kurve ("Sigmoid Penalty")
Statt stur linear abzuziehen, sollte eine Kurve verwendet werden:
- **0% - 15% weniger Zeit:** "Toleranzbereich". Strafe 0-5 Punkte. (Ein bisschen weniger Zeit geht immer).
- **15% - 40% weniger Zeit:** "Stress Zone". Hier steigt die Strafe massiv an (exponentiell).
- **>50% weniger Zeit:** "Injury Risk". Score 0.

**Vorschlag für die Formel:**
Statt `-(1-ratio)*100` eher:
`if (ratio > 0.85) return 0; // Tapering Buffer`
`if (ratio > 0.5) return -((1-ratio) * Factor)^2; // Exponential penalty`

### B. "Crash-Course" Warnung statt Verbot
Der Nutzer fragte: *"Werden aktuell evtl. falsch gewichtet?"*
Ja. Ein Score von 0 bei 49% der Zeit ist brutal.
Manche Athleten sind fit und brauchen keine "Null-auf-Ultra" 32 Wochen.
- **Idee:** Wenn `ratio < 0.5`, zeige Score nicht als 0, sondern als "Warnung" (Gelb/Rot) mit Text: *"Hohes Verletzungsrisiko: Crash-Kurse funktionieren selten."*
- Aber lass den Nutzer entscheiden. Ein fitter Läufer braucht vielleicht nur 8 Wochen für 50km, auch wenn die App 16 vorschlägt.

### C. Saison-Faktor (Seasonality Multiplier)
Wenn `EventMonth` im Frühling (März-Mai) liegt -> Erhöhe `minTrainingWeeks` intern um 10-20% oder warne strenger.
*"Achtung: Dein Training fällt in den Winter. Plane Puffer für Krankheit/Wetter ein."*

---

## Fazit zur Nutzerfrage
> *"Welche Optimierungen an der Berechnung könnten noch ergänzt werden?"*

1.  **Puffer einbauen:** Die ersten 10-15% Zeitmangel sollten straffrei sein ("Flexibilitäts-Bonus").
2.  **Saison-Check:** Winter-Training braucht mehr Zeitpuffer als Sommer-Training.
3.  **Nicht-Linearität:** Der Abzug muss bei starker Verkürzung drastisch steigen ("Die Verletzungsgefahr steigt nicht linear, sondern exponentiell").
