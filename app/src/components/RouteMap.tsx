import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GPXPoint } from '../lib/gpx';
import { useLanguage } from '../context/LanguageContext';

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

    const [consentGiven, setConsentGiven] = React.useState(false);

    if (track.length === 0) return null;

    if (!consentGiven) {
        return (
            <div className="h-64 w-full rounded-lg border border-gray-200 shadow-sm bg-gray-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <div className="max-w-xs space-y-2">
                    <h3 className="font-semibold text-gray-900">{t('gpx.map.disabled')}</h3>
                    <p className="text-xs text-gray-500">{t('gpx.map.consent')}</p>
                </div>
                <button
                    onClick={() => setConsentGiven(true)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium transition-colors"
                >
                    {t('gpx.map.load')}
                </button>
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
                            {t('gpx.map.samplingPoint')}{idx + 1} <br />
                            {t('gpx.map.ele')}: {pt.ele.toFixed(0)}m
                        </Popup>
                    </Marker>
                ))}

                <MapUpdater track={track} />
            </MapContainer>
        </div>
    );
};
