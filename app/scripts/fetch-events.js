
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '../public/data/events.json');

// Geocoding Cache to be nice to APIs
const GEO_CACHE_FILE = path.join(__dirname, '../public/data/geo-cache.json');
let geoCache = {};

async function loadGeoCache() {
    try {
        const data = await fs.readFile(GEO_CACHE_FILE, 'utf-8');
        geoCache = JSON.parse(data);
    } catch (e) {
        geoCache = {};
    }
}

async function saveGeoCache() {
    await fs.writeFile(GEO_CACHE_FILE, JSON.stringify(geoCache, null, 2), 'utf-8');
}

async function geocodeCity(city) {
    if (!city) return null;
    const key = city.toLowerCase().trim();
    if (geoCache[key]) return geoCache[key];

    try {
        // Rate limit dampener
        await new Promise(r => setTimeout(r, 250)); // max 4 req/sec roughly

        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=de&format=json`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.results && data.results.length > 0) {
            const loc = {
                lat: data.results[0].latitude,
                lng: data.results[0].longitude,
                name: data.results[0].name,
                admin1: data.results[0].admin1
            };
            geoCache[key] = loc;
            return loc;
        }
    } catch (error) {
        console.error(`Error geocoding ${city}:`, error.message);
    }
    return null;
}

async function scrapeDUV(browser) {
    console.log('Scraping DUV...');
    const page = await browser.newPage();
    // DUV Calendar for 'Upcoming' - usually defaults to current forward
    // Using a specific URL that filters for Germany (Country=GER) to reduce noise/load?
    // Or just all? User asked for "50km radius", so we need to filter by location later.
    // Let's scrape Germany + Neighbors or just Germany for relevance.
    // DUV URL parameters: &country=GER
    await page.goto('https://statistik.d-u-v.org/calendar.php?country=GER', { waitUntil: 'domcontentloaded' });

    const content = await page.content();
    const $ = cheerio.load(content);
    const events = [];

    // Selector based on inspection (generic table row in .calendar)
    // Note: This is an assumption based on typical DUV layout.
    // We might need to adjust selectors if "view_content" showed something specific.
    // Based on text dump it looks like a list.
    // Let's look for standard table rows <tr>
    $('tr').each((i, el) => {
        // Skip header
        if ($(el).find('th').length > 0) return;

        const cols = $(el).find('td');
        if (cols.length < 3) return;

        // DUV columns: Date | Event | Distance | City | ...
        const dateText = $(cols[0]).text().trim();
        const name = $(cols[1]).text().trim();
        let city = $(cols[3]).text().trim();

        // Remove country code like "(GER)" for geocoding
        city = city.replace(/\s*\([A-Z]{3}\)$/, '');

        // Link
        const linkElem = $(cols[1]).find('a');
        const relativeLink = linkElem.attr('href');
        const url = relativeLink ? `https://statistik.d-u-v.org/${relativeLink}` : '';

        // Basic date parsing (DD.MM.YYYY)
        // DUV format: 01.01.2025
        const [d, m, y] = dateText.split('.');
        if (!d || !m || !y) return;
        const isoDate = `${y}-${m}-${d}`;

        events.push({
            id: `duv-${i}`,
            source: 'duv',
            name,
            date: isoDate,
            locationName: city,
            url
        });
    });

    await page.close();
    console.log(`Found ${events.length} events from DUV.`);
    return events;
}

async function scrapeLaufenDe(browser) {
    console.log('Scraping Laufen.de (Filter Mode)...');
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const events = [];

    try {
        await page.goto('https://www.laufen.de/laufkalender', { waitUntil: 'networkidle2', timeout: 60000 });

        // Cookie Consent
        try {
            await new Promise(r => setTimeout(r, 2000));
            const iframeElement = await page.$('iframe[id^="sp_message_iframe"]');
            if (iframeElement) {
                const frame = await iframeElement.contentFrame();
                if (frame) {
                    const btn = await frame.$('button[title="Alle Akzeptieren"], button[aria-label="Alle Akzeptieren"]');
                    if (btn) {
                        await btn.click();
                        await new Promise(r => setTimeout(r, 1000));
                        console.log('  Accepted cookies.');
                    }
                }
            }
        } catch (e) {
            console.log('  Cookie banner issue (ignoring):', e.message);
        }

        // Open Filter "Eventsuche"
        try {
            console.log('  Opening "Eventsuche" filter...');
            // Find element containing "Eventsuche" text
            const toggleClicked = await page.evaluate(() => {
                const storedElements = Array.from(document.querySelectorAll('*'));
                const toggle = storedElements.find(el => el.innerText && el.innerText.includes('Eventsuche') && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE');
                if (toggle) {
                    toggle.click();
                    return true;
                }
                return false;
            });

            if (toggleClicked) {
                await new Promise(r => setTimeout(r, 1000)); // Wait for animation

                // Click "Suche starten" (Red button)
                console.log('  Clicking "Suche starten" to reveal all events...');
                const searchClicked = await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const submitBtn = buttons.find(b => b.innerText && b.innerText.includes('Suche starten'));
                    if (submitBtn) {
                        submitBtn.click();
                        return true;
                    }
                    return false;
                });

                if (searchClicked) {
                    await new Promise(r => setTimeout(r, 3000)); // Wait for AJAX reload
                } else {
                    console.log('  WARNING: "Suche starten" button not found.');
                }
            } else {
                console.log('  WARNING: "Eventsuche" toggle not found.');
            }
        } catch (e) {
            console.log('  Filter interaction failed:', e.message);
        }

        // Deep Scroll
        console.log('  Scrolling to load all events (approx 60 pages)...');
        // Increase scroll count to ensure we reach 2026/2027
        for (let i = 0; i < 60; i++) {
            await page.evaluate(() => window.scrollBy(0, window.innerHeight));
            await new Promise(r => setTimeout(r, 600)); // Faster scroll
        }

        // Extract using original selectors
        const extracted = await page.evaluate(() => {
            const items = document.querySelectorAll('a.teaser.event');
            const result = [];

            items.forEach(el => {
                try {
                    const firstCol = el.querySelector('div > div:nth-child(1)');
                    const secondCol = el.querySelector('div > div:nth-child(2)');

                    if (!firstCol || !secondCol) return;

                    const dateDiv = firstCol.querySelector('div');
                    const dateText = dateDiv ? dateDiv.innerText.trim() : '';

                    const nameDiv = secondCol.querySelector('div:first-child');
                    const name = nameDiv ? nameDiv.innerText.trim() : 'Unknown Run';

                    const locationDiv = secondCol.querySelector('div:nth-child(2)');
                    let location = locationDiv ? locationDiv.innerText.trim() : '';
                    location = location.replace(/^\d{5}\s+/, '');

                    const link = el.getAttribute('href');
                    const url = link ? (link.startsWith('http') ? link : new URL(link, 'https://www.laufen.de/').href) : '';

                    // Check for Fichtel debug
                    let debugDateRaw = dateText;

                    // Date Parsing Strategies
                    // 1. Standard DD.MM.YYYY
                    // 2. Range DD.-DD.MM.YYYY or DD.MM.-DD.MM.YYYY
                    // We extract the first valid full date or the partial start date?
                    // Strategy: Regex for the *first* or *last* valid date part?
                    // For "04.07. - 05.07.2026", we want 2026-07-04.

                    // Regex to find a date pattern DD.MM.YYYY even if inside text
                    // Allow 1 or 2 digits not just 2
                    const dateMatch = dateText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
                    let isoDate = null;

                    if (dateMatch) {
                        let [_, d, m, y] = dateMatch;
                        // Pad with 0 if needed
                        d = d.padStart(2, '0');
                        m = m.padStart(2, '0');
                        isoDate = `${y}-${m}-${d}`;
                    } else {
                        // Attempt to parse range like "04.-05.07.2026"
                        // If we find YYYY at end, and some DD.MM before it.
                        // This is complex. Let's rely on the simple match first.
                    }

                    if (name && isoDate && location) {
                        result.push({
                            id: 'laufen-' + Math.random().toString(36).substr(2, 9),
                            source: 'laufen.de',
                            name: name,
                            date: isoDate,
                            locationName: location,
                            url: url
                        });
                    } else if (name && name.includes('Fichtel')) {
                        // Keep debug-failed for logging, filtered out later
                        result.push({
                            id: 'debug-failed',
                            source: 'laufen.de-debug',
                            name: name,
                            date: null,
                            _debugName: name,
                            _debugDate: dateText,
                            _failReason: 'Invalid Date Parse'
                        });
                    }
                } catch (err) { }
            });
            return result;
        });

        // Debug Log
        const fichtelDebug = extracted.find(e => e.name && e.name.includes('Fichtel'));
        if (fichtelDebug) {
            console.log(`DEBUG NODE: Found Fichtel Event! Name: "${fichtelDebug.name}", RawDate: "${fichtelDebug._debugDate}", DateObj: ${fichtelDebug.date}`);
        } else {
            console.log('DEBUG NODE: Fichtel Event NOT found in extracted list.');
        }

        const validEvents = extracted.filter(e => e.id !== 'debug-failed');
        events.push(...validEvents);
        console.log(`  Found ${validEvents.length} events on Laufen.de`);

    } catch (error) {
        console.error('  Error scraping Laufen.de:', error);
    } finally {
        await page.close();
    }

    return events;
}


async function main() {
    await loadGeoCache();

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    let allEvents = [];
    try {
        const duvEvents = await scrapeDUV(browser);
        allEvents = [...allEvents, ...duvEvents];

        // Laufen.de is tricky without exact selectors. 
        // I will focus on DUV which is structured (<table>) and reliable for Ultras (User is "FichtelUltra").
        // Laufen.de can be added if selectors are known.
        const laufenDeEvents = await scrapeLaufenDe(browser);
        allEvents = [...allEvents, ...laufenDeEvents];

    } catch (e) {
        console.error('Scraping failed:', e);
    } finally {
        await browser.close();
    }

    // Geocoding Optimization
    console.log(`Geocoding ${allEvents.length} events...`);
    const finalEvents = [];

    // Extract unique locations to minimize calls and waits
    const uniqueLocations = [...new Set(allEvents.map(e => e.locationName).filter(Boolean))];
    console.log(`  Unique locations to process: ${uniqueLocations.length}`);

    // Pre-fill cache for these locations
    for (const locName of uniqueLocations) {
        // geocodeCity handles caching internally
        await geocodeCity(locName);
        // Progress log for large sets
        if (uniqueLocations.indexOf(locName) % 50 === 0) {
            process.stdout.write('.');
        }
    }
    console.log('\n  Geocoding complete.');

    // Map events to coords
    for (const ev of allEvents) {
        if (!ev.locationName) continue;
        const coords = await geocodeCity(ev.locationName); // Will be instant from cache
        if (coords) {
            finalEvents.push({
                ...ev,
                coords
            });
        }
    }

    // Save
    const output = {
        metadata: {
            lastUpdated: new Date().toISOString()
        },
        events: finalEvents
    };

    // Ensure dir
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

    await saveGeoCache();
    console.log(`Saved ${finalEvents.length} events to ${OUTPUT_FILE}`);
}

main();
