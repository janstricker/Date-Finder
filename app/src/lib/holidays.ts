
export interface Holiday {
    date: string; // YYYY-MM-DD
    name: string;
    type: 'public' | 'school';
}

// Simple in-memory cache
const cache: Record<string, Holiday[]> = {};

export async function fetchHolidays(year: number, stateCode: string = 'BY'): Promise<Record<string, Holiday>> {
    const cacheKey = `${year}-${stateCode}`;
    if (cache[cacheKey]) {
        return toRecord(cache[cacheKey]);
    }

    const holidays: Holiday[] = [];

    try {
        // 1. Fetch Public Holidays (Nager.Date)
        // https://date.nager.at/api/v3/publicholidays/2026/DE
        const pubResponse = await fetch(`https://date.nager.at/api/v3/publicholidays/${year}/DE`);
        if (pubResponse.ok) {
            const pubData = await pubResponse.json();
            pubData.forEach((h: any) => {
                // Filter for state if applicable, Nager returns national + state specific
                // For simplified MVP, we accept all DE holidays or check 'counties' if complex.
                // But Nager.Date '/DE' returns national holidays. 
                // Specific state endpoint might be needed or filtering.
                // For MVP, taking nationwide DE holidays.
                holidays.push({
                    date: h.date,
                    name: h.name,
                    type: 'public'
                });
            });
        }

        // 2. Fetch School Holidays (ferien-api.de)
        // https://ferien-api.de/api/v1/holidays/BY/2026
        const schoolResponse = await fetch(`https://ferien-api.de/api/v1/holidays/${stateCode}/${year}`);
        if (schoolResponse.ok) {
            const schoolData = await schoolResponse.json();
            schoolData.forEach((h: any) => {
                // Returns ranges: start, end
                const startDate = new Date(h.start);
                const endDate = new Date(h.end);

                // Expand range
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    holidays.push({
                        date: d.toISOString().split('T')[0],
                        name: h.name || 'School Holiday',
                        type: 'school'
                    });
                }
            });
        }

    } catch (e) {
        console.error("Failed to fetch holidays", e);
    }

    cache[cacheKey] = holidays;
    return toRecord(holidays);
}

function toRecord(holidays: Holiday[]): Record<string, Holiday> {
    const record: Record<string, Holiday> = {};
    holidays.forEach(h => {
        record[h.date] = h;
    });
    return record;
}
