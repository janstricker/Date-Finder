
/**
 * @file gpx.ts
 * @description Utilities for parsing GPX files and sampling representative points for weather analysis.
 */

export interface GPXPoint {
    lat: number;
    lng: number;
    ele: number; // elevation in meters
}

export interface RouteData {
    track: GPXPoint[];
    totalDistance: number; // km
    elevationGain: number; // m
    elevationLoss: number; // m
    minEle: number;
    maxEle: number;
    sampledPoints: GPXPoint[]; // The default selection of points
}

/**
 * Parses a GPX string to extract track points and basic stats.
 * Uses naive string parsing to avoid heavy XML dependencies if possible, 
 * or DOMParser which is available in browsers.
 */
export function parseGPX(gpxContent: string): RouteData {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, "text/xml");

    const trkpts = xmlDoc.getElementsByTagName("trkpt");
    const track: GPXPoint[] = [];

    let minEle = Infinity;
    let maxEle = -Infinity;

    for (let i = 0; i < trkpts.length; i++) {
        const pt = trkpts[i];
        const lat = parseFloat(pt.getAttribute("lat") || "0");
        const lon = parseFloat(pt.getAttribute("lon") || "0");

        let ele = 0;
        const eleTag = pt.getElementsByTagName("ele")[0];
        if (eleTag && eleTag.textContent) {
            ele = parseFloat(eleTag.textContent);
        }

        if (ele < minEle) minEle = ele;
        if (ele > maxEle) maxEle = ele;

        track.push({ lat, lng: lon, ele });
    }

    // Calculate Distance & Elevation
    let totalDistance = 0;
    let elevationGain = 0;
    let elevationLoss = 0;

    for (let i = 1; i < track.length; i++) {
        const p1 = track[i - 1];
        const p2 = track[i];

        // Haversine Distance
        const R = 6371e3; // meters
        const φ1 = p1.lat * Math.PI / 180;
        const φ2 = p2.lat * Math.PI / 180;
        const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
        const Δλ = (p2.lng - p1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // in meters

        totalDistance += d;

        const dEle = p2.ele - p1.ele;
        if (dEle > 0) elevationGain += dEle;
        else elevationLoss += Math.abs(dEle);
    }

    const sampledPoints = sampleRoutePoints(track, 5);

    return {
        track,
        totalDistance: totalDistance / 1000, // km
        elevationGain,
        elevationLoss,
        minEle,
        maxEle,
        sampledPoints
    };
}

/**
 * Selects representative points to query weather for.
 * Tries to pick: Start, End, Highest, Lowest, and Midpoints.
 */
export function sampleRoutePoints(track: GPXPoint[], maxPoints: number = 5): GPXPoint[] {
    if (track.length === 0) return [];
    if (track.length <= maxPoints) return track;

    const points: GPXPoint[] = [];
    const usedIndices = new Set<number>();

    const addPoint = (idx: number) => {
        if (!usedIndices.has(idx)) {
            points.push(track[idx]);
            usedIndices.add(idx);
        }
    };

    // 1. Start and End
    addPoint(0);
    addPoint(track.length - 1);

    // 2. Highest Point
    let maxEle = -Infinity;
    let maxIdx = -1;
    track.forEach((p, i) => {
        if (p.ele > maxEle) {
            maxEle = p.ele;
            maxIdx = i;
        }
    });
    if (maxIdx !== -1) addPoint(maxIdx);

    // 3. Lowest Point
    let minEle = Infinity;
    let minIdx = -1;
    track.forEach((p, i) => {
        if (p.ele < minEle) {
            minEle = p.ele;
            minIdx = i;
        }
    });
    if (minIdx !== -1) addPoint(minIdx);

    // 4. Fill remaining with equidistant points
    // Sort current points by index to find gaps? 
    // Actually, simple strategy: just take N distinct points spread via index math 
    // is simpler if we didn't strictly care about min/max, but min/max is relevant for weather.

    // If we still have slots
    while (points.length < maxPoints) {
        // Find largest gap between selected indices
        // We need to work with indices to do this
        const sortedIndices = Array.from(usedIndices).sort((a, b) => a - b);
        let maxGap = -1;
        let gapStart = -1;
        let gapEnd = -1;

        for (let i = 0; i < sortedIndices.length - 1; i++) {
            const gap = sortedIndices[i + 1] - sortedIndices[i];
            if (gap > maxGap) {
                maxGap = gap;
                gapStart = sortedIndices[i];
                gapEnd = sortedIndices[i + 1];
            }
        }

        if (maxGap > 1) {
            const midIdx = Math.floor((gapStart + gapEnd) / 2);
            addPoint(midIdx);
        } else {
            break; // No more gaps to fill
        }
    }

    return points.sort((a, b) => {
        // Sort by index in original track? 
        // We can't easily unless we stored index. 
        // Let's re-find index or just trust they are distinct enough.
        // Actually, for display it might handle arbitrary order, but for "Route" logic 
        // maybe left-to-right is nicer.
        return track.indexOf(a) - track.indexOf(b);
    });
}
