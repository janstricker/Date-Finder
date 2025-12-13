import { useState, useEffect, useRef } from 'react';
import { searchLocation, type GeoLocation } from '../../lib/geocoding';
import { Search, MapPin } from 'lucide-react';

interface LocationSearchProps {
    initialName?: string;
    onLocationSelect: (loc: { lat: number; lng: number; name: string; admin1?: string; country?: string }) => void;
}

export function LocationSearch({ initialName = '', onLocationSelect }: LocationSearchProps) {
    const [query, setQuery] = useState(initialName);
    const [results, setResults] = useState<GeoLocation[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setLoading(true);
                const data = await searchLocation(query);
                setResults(data);
                setLoading(false);
                setIsOpen(true);
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (loc: GeoLocation) => {
        setQuery(loc.name);
        setIsOpen(false);
        onLocationSelect({
            lat: loc.latitude,
            lng: loc.longitude,
            name: loc.name,
            admin1: loc.admin1,
            country: loc.country
        });
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="text-sm font-medium text-gray-600 block mb-2">Location</label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    className="w-full pl-9 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Search city (e.g. Bayreuth)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-100 max-h-60 overflow-y-auto">
                    {results.map((loc) => (
                        <button
                            key={loc.id}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 group transition-colors"
                            onClick={() => handleSelect(loc)}
                        >
                            <MapPin className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                            <div>
                                <span className="font-medium text-gray-700">{loc.name}</span>
                                <span className="text-xs text-gray-400 ml-2">
                                    {loc.admin1 ? `${loc.admin1}, ` : ''}{loc.country}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
