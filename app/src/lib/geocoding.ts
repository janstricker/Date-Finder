export interface GeoLocation {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string; // State/Region
}

export async function searchLocation(query: string): Promise<GeoLocation[]> {
    if (query.length < 2) return [];

    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
        );

        if (!response.ok) throw new Error('Geocoding failed');

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Geocoding error:', error);
        return [];
    }
}
