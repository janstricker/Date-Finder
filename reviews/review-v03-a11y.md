# Experten-Review v03: Web Design & Accessibility (A11y)

**Fokus:** Barrierefreiheit (Vision/Motorik) und Usability Standards.
**Ziel:** Identifikation von "Quick Wins" und langfristigen Optimierungen für eine inklusive App.

---

## 1. Experte: Der Senior Web Designer (A11y Certified)
*Fokus: Semantic HTML, Contrast, Screen Reader Support*

### Status Quo Analyse
Die App sieht modern aus ("Tailwind Polish"), aber unter der Haube gibt es signifikante Barrieren für Nutzer mit Einschränkungen.

#### Kritische Befunde (High Impact)

1.  **Mouse-Only Interactions (Hover-Fallen)**
    - **Problem:** Wichtige Informationen (z.B. Wetter-Tooltip in `DetailCard.tsx`, Tagesdetails in `HeatmapCalendar.tsx`) erscheinen *nur* bei `hover`.
    - **A11y Violation:** Nutzer ohne Maus (Tastatur, Touch-Screen Reader, Motorisch eingeschränkt) können diese Daten NICHT erreichen.
    - **Betroffene Komponenten:**
        - `DetailCard`: Wetter-Graph Tooltips (`group-hover:visible`).
        - `ConfigForm`: "Info"-Icon Tooltips.
        - `DetailCard`: Breakdown-Score Tooltip.

2.  **Farbe als einziger Informationsträger**
    - **Problem:** Im `HeatmapCalendar` wird der Status (Grün/Gelb/Rot) fast ausschließlich über die Hintergrundfarbe kommuniziert.
    - **A11y Violation:** Rot-Grün-Blinde Nutzer sehen nur Graustufen-Unterschiede.
    - **Lösung:** Pattern oder Icons ergänzen (bereits teilweise im Code sichtbar `dayScore.status === 'green'`, aber visuell noch zu subtil).

3.  **Semantik-Lücken (Div-Soup)**
    - **Problem:** Interaktive Elemente sind oft `<div>` mit `onClick`.
    - **Beispiel:** `HeatmapCalendar.tsx` nutzt `<button>`, das ist gut! Aber in `ConfigForm.tsx`: Der "GPX Upload" Bereich ist ein `<div>`.
    - **Risk:** Screen Reader melden dies nicht als "Klickbar", und Tastatur-Fokus (Tab) springt darüber.

---

## Optimierungsvorschläge (Roadmap)

### Stufe 1: Die "Basics" (Quick Wins)
*Aufwand: Gering | Impact: Hoch*

1.  **Semantisches HTML reparieren:**
    - Ersetze `div onClick={...}` durch `<button type="button" onClick={...}>`.
    - Buttons erhalten so automatisch Keyboard-Focus und Enter-Key Support.
    - Betrifft: GPX Upload Area, Custom Selectors in ConfigForm.

2.  **Farb-Unabhängigkeit:**
    - Ergänze im Kalender für "Rot" (schlechte Tage) ein dezentes Muster (z.B. Schraffur) oder ein Icon.
    - Stelle sicher, dass Text-Kontrast auf den farbigen Hintergründen WCAG AA erfüllt (aktuell `text-white` auf `bg-emerald-500` -> **4.45:1** (knapp okay), aber auf `bg-amber-400` -> **1.86:1** (FAIL! Weisser Text auf Gelb ist unlesbar)).
    - **Fix:** Nutze `text-black` oder `text-amber-900` auf gelben Hintergründen.

3.  **Fokus-Styles:**
    - Tailwind entfernt oft den default Outline. Stelle sicher, dass `focus-visible:ring` überall gesetzt ist.
    - Aktuell in `HeatmapCalendar`: `isSelected ? "ring-2 ..."` -> Gut für Maus, aber Keyboard Fokus braucht `focus:ring`.

### Stufe 2: Ausbaustufe (Professional Grade)
*Aufwand: Mittel | Impact: Zertifizierbar*

4.  **Tooltips demokratisieren ("Toggletips"):**
    - Statt reiner Hover-CSS-Tooltips (`group-hover`), nutze ein Pattern, bei dem ein Klick/Tap das Tooltip öffnet und schließt.
    - Für Screen Reader: `aria-describedby` nutzen, um das Info-Icon mit dem Tooltip-Text zu verknüpfen.

5.  **Screen Reader "Announcements":**
    - Wenn sich der Score ändert oder eine Analyse fertig ist, muss das vorgelesen werden.
    - Nutze eine "Live Region" (`<div role="status" aria-live="polite">`), um Updates wie "Analyse abgeschlossen: 15 grüne Tage gefunden" zu verkünden.

---

## Fazit zur Nutzerfrage
> *"Welche grundlegenden Verbesserungen sollten durchgeführt werden?"*

**Priorität 1 (Sofort):** Kontrast auf den "Gelben" Badges/Buttons fixen (Weiß auf Gelb geht nicht).
**Priorität 2 (Sofort):** `<div>`-Buttons in echte `<button>`-Tags ändern.
**Priorität 3 (Konzept):** Hover-Tooltips durch Klick-Lösungen ersetzen (wichtig für Mobile & Touch!).

Soll ich die Kontrast-Fixes (Gelb/Text) direkt als Code-Change vorschlagen?
