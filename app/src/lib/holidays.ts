
export interface Holiday {
    date: string; // YYYY-MM-DD
    name: string;
    type: 'public' | 'school';
}

// Simple in-memory cache
const cache: Record<string, Holiday[]> = {};

export async function fetchHolidays(year: number, stateCode: string = 'BY'): Promise<Holiday[]> {
    const cacheKey = `${year}-${stateCode}`;
    if (cache[cacheKey]) {
        return cache[cacheKey];
    }

    const holidays: Holiday[] = [];

    const isoSubdivision = `DE-${stateCode}`;

    try {
        const publicUrl = `https://openholidaysapi.org/PublicHolidays?countryIsoCode=DE&languageIsoCode=DE&validFrom=${year}-01-01&validTo=${year}-12-31&subdivisionCode=${isoSubdivision}`;
        const schoolUrl = `https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&languageIsoCode=DE&validFrom=${year}-01-01&validTo=${year}-12-31&subdivisionCode=${isoSubdivision}`;

        const [pubResponse, schoolResponse] = await Promise.all([
            fetch(publicUrl),
            fetch(schoolUrl)
        ]);

        // Process School Holidays FIRST (so they can be overwritten by Public)
        if (schoolResponse.ok) {
            const schoolData = await schoolResponse.json();

            schoolData.forEach((h: any) => {
                const startDate = new Date(h.startDate);
                const endDate = new Date(h.endDate);
                const name = h.name.find((n: any) => n.language === 'DE')?.text || h.name[0]?.text || 'School Holiday';

                // Expand range
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    holidays.push({
                        date: d.toISOString().split('T')[0],
                        name: name,
                        type: 'school'
                    });
                }
            });
        }

        // Process Public Holidays SECOND (Higher priority)
        if (pubResponse.ok) {
            const pubData = await pubResponse.json();
            pubData.forEach((h: any) => {
                const startDate = new Date(h.startDate);
                const endDate = new Date(h.endDate);
                const name = h.name.find((n: any) => n.language === 'DE')?.text || h.name[0]?.text || 'Public Holiday';

                // Public holidays result in a single day usually, but let's handle ranges just in case
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    holidays.push({
                        date: d.toISOString().split('T')[0],
                        name: name,
                        type: 'public'
                    });
                }
            });
        }

    } catch (e) {
        console.error("Failed to fetch holidays", e);
    }

    cache[cacheKey] = holidays;
    return holidays;
}
