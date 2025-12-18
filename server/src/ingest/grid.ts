/**
 * Generates a grid of points covering Germany.
 * Bounding Box approx: 
 * N: 55.1, S: 47.2, W: 5.8, E: 15.1
 */
export function generateGermanyGrid(kmResolution: number = 10): { lat: number, lng: number }[] {
    const bounds = {
        north: 55.1,
        south: 47.2,
        west: 5.8,
        east: 15.1
    };

    // Approximation: 1 deg lat ~ 111km. 1 deg lng ~ 111km * cos(lat)
    const latStep = kmResolution / 111;

    const points: { lat: number, lng: number }[] = [];

    for (let lat = bounds.south; lat <= bounds.north; lat += latStep) {
        // Adjust lng step based on latitude (convergence at poles)
        const lngStep = kmResolution / (111 * Math.cos(lat * (Math.PI / 180)));

        for (let lng = bounds.west; lng <= bounds.east; lng += lngStep) {
            // Optional: Simple point-in-polygon check for "Is in Germany" could go here
            // to avoid fetching sea/neighbors. For now, a box is fine.
            points.push({
                lat: Number(lat.toFixed(4)),
                lng: Number(lng.toFixed(4))
            });
        }
    }

    return points;
}
