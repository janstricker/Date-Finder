import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GPXPoint } from '../lib/gpx';
import { useLanguage } from '../context/LanguageContext';
import { useConsent } from '../context/ConsentContext';

// Fix Leaflet Default Icon issue in Webpack/Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface RouteMapProps {
    track: GPXPoint[];
    sampledPoints: GPXPoint[];
    onPointsChange: (newPoints: GPXPoint[]) => void;
}

function MapUpdater({ track }: { track: GPXPoint[] }) {
    const map = useMap();
    useEffect(() => {
        if (track.length > 0) {
            const bounds = L.latLngBounds(track.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [track, map]);
    return null;
}

export const RouteMap: React.FC<RouteMapProps> = ({ track, sampledPoints, onPointsChange }) => {
    const { t } = useLanguage();
    const { hasConsent } = useConsent();

    // Convert track to Leaflet LatLngExpression[]
    const polylinePositions = useMemo(() =>
        track.map(p => [p.lat, p.lng] as [number, number]),
        [track]);

    // Handle marker drag
    const handleDragEnd = (index: number, e: L.DragEndEvent) => {
        const marker = e.target;
        const position = marker.getLatLng();

        // Let's implement Snap-to-Track logic for data consistency (elevation is needed!)
        let bestP = track[0];
        let minD = Infinity;

        // Basic nearest search (can be improved spatially)
        track.forEach(p => {
            const d = Math.sqrt(Math.pow(p.lat - position.lat, 2) + Math.pow(p.lng - position.lng, 2));
            if (d < minD) {
                minD = d;
                bestP = p;
            }
        });

        const updated = [...sampledPoints];
        updated[index] = bestP; // Snap to track
        onPointsChange(updated);
    };

    if (track.length === 0) return null;

    if (!hasConsent) {
        return (
            <div className="h-64 w-full rounded-lg border border-gray-200 shadow-sm bg-gray-50 flex items-center justify-center flex-col gap-2">
                <span className="text-gray-400 text-sm">Map disabled (GDPR)</span>
                <span className="text-xs text-gray-400 max-w-xs text-center">
                    Accept privacy terms to load OpenStreetMap tiles.
                </span>
            </div>
        );
    }

    return (
        <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm z-0">
            <MapContainer
                center={[track[0].lat, track[0].lng]}
                zoom={10}
                className="h-full w-full"
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Polyline positions={polylinePositions} color="blue" weight={4} opacity={0.6} />

                {sampledPoints.map((pt, idx) => (
                    <Marker
                        key={`${idx}`}
                        position={[pt.lat, pt.lng]}
                        draggable={true}
                        eventHandlers={{
                            dragend: (e) => handleDragEnd(idx, e)
                        }}
                    >
                        <Popup>
                            Sampling Point #{idx + 1} <br />
                            Ele: {pt.ele.toFixed(0)}m
                        </Popup>
                    </Marker>
                ))}

                <MapUpdater track={track} />
            </MapContainer>
        </div>
    );
};
