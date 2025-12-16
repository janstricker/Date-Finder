/**
 * @file geocoding.ts
 * @description Provides search functionality to resolve location names (cities) to geographic coordinates
 * using the OpenMeteo Geocoding API.
 */

/**
 * Represents a geographical location result from the API.
 */
export interface GeoLocation {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string; // State/Region
}

/**
 * Searches for a location by name.
 * 
 * @param query - The city or place name to search for (e.g. "Berlin")
 * @returns A list of matching locations (max 5) with coordinates and administrative info.
 */
export async function searchLocation(query: string): Promise<GeoLocation[]> {
    if (query.length < 2) return [];

    try {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json&country_code=DE`
        );

        if (!response.ok) throw new Error('Geocoding failed');

        const data = await response.json();

        // Client-side filtering because API ignores country_code param sometimes or for specific endpoint versions
        if (data.results) {
            return data.results.filter((res: any) => res.country_code === 'DE');
        }

        return [];
    } catch (error) {
        console.error('Geocoding error:', error);
        return [];
    }
}
