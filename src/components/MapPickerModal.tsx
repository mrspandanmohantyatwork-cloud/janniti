import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin,
  X,
  Crosshair,
  Search,
  Check,
  Layers,
  ZoomIn,
  ZoomOut,
  Navigation,
  Sparkles,
} from 'lucide-react';
import {
  reverseGeocodeUnified,
  searchLocationUnified,
  getTileLayerConfig,
  isMapboxConfigured,
  MapboxGeocodeResult,
} from '../utils/mapboxService';

export interface MapLocation {
  locationName: string;
  lat: number;
  lng: number;
}

interface MapPickerModalProps {
  isOpen: boolean;
  initialLocation?: string;
  initialCoords?: { lat: number; lng: number };
  onClose: () => void;
  onSelectLocation: (loc: MapLocation) => void;
}

// Default to Bhubaneswar central civic zone if not specified
const DEFAULT_COORDS = { lat: 20.2961, lng: 85.8245 };

// Quick landmark shortcuts for instant navigation
const QUICK_LANDMARKS = [
  { name: 'Near Hotel Num Num, Acharya Vihar Square', lat: 20.3015, lng: 85.8312 },
  { name: 'Near Vishal Mega Mart, Jaydev Vihar Square', lat: 20.3003, lng: 85.8242 },
  { name: 'Near Kalinga Stadium', lat: 20.3039, lng: 85.8202 },
  { name: 'Patia', lat: 20.3533, lng: 85.8266 },
  { name: 'Madanpur', lat: 20.245, lng: 85.732 },
  { name: 'Gramadiha', lat: 20.2215, lng: 85.7482 },
  { name: 'Saheed Nagar', lat: 20.2882, lng: 85.8456 },
  { name: 'Khandagiri', lat: 20.2589, lng: 85.7876 },
  { name: 'Nayapalli', lat: 20.3012, lng: 85.8164 },
  { name: 'Infocity', lat: 20.3588, lng: 85.8139 },
  { name: 'Market Building', lat: 20.2644, lng: 85.836 },
];

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
  isOpen,
  initialLocation,
  initialCoords,
  onClose,
  onSelectLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>(
    initialCoords || DEFAULT_COORDS
  );
  const [resolvedAddress, setResolvedAddress] = useState<string>(
    initialLocation || 'Patia, Bhubaneswar'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState<MapboxGeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchProvider, setSearchProvider] = useState<'mapbox' | 'nominatim'>('mapbox');
  const [geocodeProvider, setGeocodeProvider] = useState<'mapbox' | 'nominatim' | 'fallback'>('mapbox');
  const searchDebounceRef = useRef<number | null>(null);

  // Synchronize initial values when opening
  useEffect(() => {
    if (isOpen) {
      const startingCoords = initialCoords || DEFAULT_COORDS;
      setCoords(startingCoords);
      if (initialLocation) {
        setResolvedAddress(initialLocation);
      }
    }
  }, [isOpen, initialCoords, initialLocation]);

  // Live Autocomplete using Mapbox Places Geocoding API v5
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = window.setTimeout(async () => {
      try {
        const { results, provider } = await searchLocationUnified(q, coords);
        setSuggestions(results);
        setSearchProvider(provider);
        if (results.length > 0) {
          setShowSuggestions(true);
        }
      } catch (err) {
        console.warn('Mapbox place search error:', err);
      }
    }, 280);

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery, coords]);

  // Create custom pulsing pin icon
  const createCustomPinIcon = () => {
    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -100%);">
          <!-- Pulsing radar wave -->
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background-color: rgba(56, 189, 248, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <!-- Pin Body -->
          <div style="position: relative; z-index: 10; width: 34px; height: 34px; background: linear-gradient(135deg, #0284c7, #38bdf8); border-radius: 9999px 9999px 9999px 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.5); border: 2.5px solid #ffffff;">
            <div style="transform: rotate(45deg); width: 12px; height: 12px; background-color: #ffffff; border-radius: 9999px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);"></div>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 44],
    });
  };

  // Reverse geocoding using Mapbox Places API v5 with fallback
  const reverseGeocode = async (lat: number, lng: number) => {
    setReverseGeocoding(true);
    try {
      const res = await reverseGeocodeUnified(lat, lng);
      setGeocodeProvider(res.provider);
      setResolvedAddress(res.address);
    } catch {
      // Fallback: estimate from nearest landmark
      let closestLandmark = QUICK_LANDMARKS[0];
      let minDistance = Number.MAX_VALUE;
      QUICK_LANDMARKS.forEach((lm) => {
        const d = Math.hypot(lm.lat - lat, lm.lng - lng);
        if (d < minDistance) {
          minDistance = d;
          closestLandmark = lm;
        }
      });

      if (minDistance < 0.03) {
        setResolvedAddress(`${closestLandmark.name}, Bhubaneswar`);
      } else {
        setResolvedAddress(`Location (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`);
      }
    } finally {
      setReverseGeocoding(false);
    }
  };

  // Move marker and pan map
  const setLocationPoint = (lat: number, lng: number, addressOverride?: string) => {
    setCoords({ lat, lng });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([lat, lng], { animate: true });
    }
    if (addressOverride) {
      setResolvedAddress(addressOverride);
    } else {
      reverseGeocode(lat, lng);
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Small delay to ensure modal container dimensions are settled
    const timer = window.setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        return;
      }

      const startingCoords = initialCoords || DEFAULT_COORDS;

      const map = L.map(mapContainerRef.current, {
        center: [startingCoords.lat, startingCoords.lng],
        zoom: 14,
        zoomControl: false,
      });

      mapInstanceRef.current = map;

      // Base tile layer via Mapbox / OpenStreetMap
      const tileCfg = getTileLayerConfig('streets');
      const streetTiles = L.tileLayer(tileCfg.url, {
        attribution: tileCfg.attribution,
        maxZoom: tileCfg.maxZoom,
        tileSize: tileCfg.tileSize,
      });

      streetTiles.addTo(map);
      tileLayerRef.current = streetTiles;

      // Create draggable pin marker
      const pinMarker = L.marker([startingCoords.lat, startingCoords.lng], {
        icon: createCustomPinIcon(),
        draggable: true,
      }).addTo(map);

      markerRef.current = pinMarker;

      pinMarker.on('dragend', () => {
        const pos = pinMarker.getLatLng();
        setCoords({ lat: pos.lat, lng: pos.lng });
        reverseGeocode(pos.lat, pos.lng);
      });

      // Click anywhere to drop pin
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setLocationPoint(lat, lng);
      });

      // Force render refresh
      map.invalidateSize();
    }, 120);

    return () => {
      window.clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [isOpen]);

  // Toggle Street / Satellite layer
  const toggleMapLayer = (type: 'streets' | 'satellite') => {
    if (!mapInstanceRef.current) return;
    setMapType(type);

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const tileCfg = getTileLayerConfig(type);
    const newTileLayer = L.tileLayer(tileCfg.url, {
      attribution: tileCfg.attribution,
      maxZoom: tileCfg.maxZoom,
      tileSize: tileCfg.tileSize,
    });

    newTileLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
  };

  // Live Location via Geolocation API
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 17);
        }
        setLocationPoint(latitude, longitude);
        setIsLocatingGps(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setIsLocatingGps(false);
        // Fallback to default
        setLocationPoint(DEFAULT_COORDS.lat, DEFAULT_COORDS.lng, 'Patia, Bhubaneswar');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Select suggestion item
  const handleSelectSuggestion = (item: MapboxGeocodeResult) => {
    setLocationPoint(item.lat, item.lng, item.placeName);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([item.lat, item.lng], 16);
    }
    setSearchQuery(item.placeName);
    setShowSuggestions(false);
  };

  // Search places via Mapbox Places API v5 or keyword match
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Check quick landmarks first
    const matched = QUICK_LANDMARKS.find((lm) =>
      lm.name.toLowerCase().includes(query.toLowerCase())
    );
    if (matched) {
      setLocationPoint(matched.lat, matched.lng, `${matched.name}, Bhubaneswar`);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([matched.lat, matched.lng], 16);
      }
      setShowSuggestions(false);
      return;
    }

    if (suggestions.length > 0) {
      handleSelectSuggestion(suggestions[0]);
      return;
    }

    setIsSearching(true);
    try {
      const { results } = await searchLocationUnified(query, coords);
      if (results.length > 0) {
        handleSelectSuggestion(results[0]);
        return;
      }
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Confirm selection
  const handleConfirm = () => {
    onSelectLocation({
      locationName: resolvedAddress.trim() || 'Pinned Map Location',
      lat: coords.lat,
      lng: coords.lng,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl h-[92vh] max-h-[780px] bg-[var(--card-bg)] backdrop-blur-2xl border border-[var(--border-color)] rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden text-[var(--text)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-color)] flex items-center justify-between bg-black/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <MapPin className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold text-[var(--text)] tracking-tight">
                  Locate Issue on Map
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  Precision Pin
                </span>
                {isMapboxConfigured() ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Mapbox Places v5</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-sky-400" />
                    <span>Mapbox Geocoding</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] font-light">
                Click anywhere on the map, drag the pin, or search any place with Mapbox Geocoding
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/10 transition-colors cursor-pointer"
            title="Close map picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Quick Landmark Bar */}
        <div className="p-3 sm:px-5 border-b border-[var(--border-color)] bg-[var(--item-bg)] flex flex-col gap-2 shrink-0">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <form onSubmit={handleSearch} className="relative w-full">
                <Search className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Search landmark, street, city, or global place (e.g. Los Angeles)..."
                  className="w-full pl-9 pr-20 py-2 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-sky-400 transition-all"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSearching ? 'Finding...' : 'Search'}
                </button>
              </form>

              {/* Mapbox Places live suggestions popup */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-[1000] bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
                  <div className="px-3 py-1.5 bg-black/20 border-b border-[var(--border-color)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span className="font-semibold">Matching Places</span>
                    <span className="text-sky-400 font-bold uppercase tracking-wider text-[9px]">
                      {searchProvider === 'mapbox' ? 'Mapbox Places v5' : 'Nominatim'}
                    </span>
                  </div>
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(item)}
                      className="w-full text-left px-3 py-2 hover:bg-sky-500/15 border-b border-[var(--border-color)]/50 last:border-0 flex items-start gap-2.5 cursor-pointer transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[var(--text)] truncate">
                          {item.text || item.placeName}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] truncate">
                          {item.placeName}
                        </div>
                      </div>
                      <span className="text-[9px] text-sky-400/80 font-mono shrink-0 self-center">
                        {item.lat.toFixed(3)}, {item.lng.toFixed(3)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Locate Me (GPS) Button */}
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocatingGps}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
              title="Detect device GPS location"
            >
              <Crosshair className={`w-3.5 h-3.5 text-sky-400 ${isLocatingGps ? 'animate-spin' : ''}`} />
              <span>{isLocatingGps ? 'Detecting GPS...' : 'Use My Location'}</span>
            </button>
          </div>

          {/* Quick Landmark Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 text-[11px]">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>Popular spots:</span>
            </span>
            {QUICK_LANDMARKS.map((lm) => (
              <button
                key={lm.name}
                type="button"
                onClick={() => setLocationPoint(lm.lat, lm.lng, `${lm.name}, Bhubaneswar`)}
                className="px-2.5 py-0.5 rounded-full bg-[var(--card-bg)] hover:bg-sky-500/20 hover:text-sky-300 border border-[var(--border-color)] text-[var(--text-muted)] text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer"
              >
                📍 {lm.name}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Map Area */}
        <div className="relative flex-1 w-full h-full min-h-[320px] bg-slate-950 overflow-hidden">
          {/* Leaflet Map DOM Container */}
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Floating Map Controls: Layers & Zoom */}
          <div className="absolute top-3 right-3 z-[400] flex flex-col gap-1.5">
            {/* Layer switcher */}
            <div className="bg-black/80 backdrop-blur-md rounded-xl p-1 border border-white/20 shadow-lg flex flex-col gap-1">
              <button
                type="button"
                onClick={() => toggleMapLayer('streets')}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mapType === 'streets'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Street Map view"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[10px]">Streets</span>
              </button>
              <button
                type="button"
                onClick={() => toggleMapLayer('satellite')}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  mapType === 'satellite'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
                title="Satellite Imagery view"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="text-[10px]">Satellite</span>
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="bg-black/80 backdrop-blur-md rounded-xl p-1 border border-white/20 shadow-lg flex flex-col gap-1">
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="p-2 rounded-lg text-white hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="p-2 rounded-lg text-white hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Floating Instructions Banner */}
          <div className="absolute top-3 left-3 z-[400] pointer-events-none hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-[11px] font-medium text-sky-300 shadow-md">
            <Navigation className="w-3 h-3 text-sky-400" />
            <span>Click anywhere to move pin &bull; Drag pin for fine-tuning</span>
          </div>
        </div>

        {/* Modal Bottom: Location Summary & Confirm Actions */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-color)] bg-[var(--card-bg)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Selected Coordinates & Address Field */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider font-bold text-sky-400">
                  Target Location
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {coords.lat.toFixed(5)}° N, {coords.lng.toFixed(5)}° E
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 font-medium">
                  {geocodeProvider === 'mapbox' ? 'Mapbox Places v5' : 'Nominatim'}
                </span>
                {reverseGeocoding && (
                  <span className="text-[9px] text-amber-400 animate-pulse">Resolving address...</span>
                )}
              </div>
              <input
                type="text"
                value={resolvedAddress}
                onChange={(e) => setResolvedAddress(e.target.value)}
                placeholder="Enter or refine location name (e.g. Madanpur near NIIS College)..."
                className="w-full mt-0.5 bg-transparent border-b border-sky-400/40 focus:border-sky-400 text-xs sm:text-sm font-semibold text-[var(--text)] outline-none py-0.5 truncate"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--item-bg)] hover:bg-[var(--item-hover)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-[0_4px_14px_rgba(2,132,199,0.4)] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Pin Location</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
