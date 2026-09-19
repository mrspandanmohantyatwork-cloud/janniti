import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Crosshair,
  Maximize2,
  ExternalLink,
  Navigation,
  Globe,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  reverseGeocodeUnified,
  getTileLayerConfig,
  isMapboxConfigured,
} from '../utils/mapboxService';

export interface InlineMapLocation {
  locationName: string;
  lat: number;
  lng: number;
}

interface InlineOsmMapProps {
  locationName: string;
  coords: { lat: number; lng: number };
  onLocationChange: (loc: InlineMapLocation) => void;
  onExpandModal: () => void;
  isLocatingGps: boolean;
  onGpsClick: () => void;
}

// User-specified OpenStreetMap default coordinates and zoom:
// https://www.openstreetmap.org/#map=5/21.84/82.79
const OSM_DEFAULT_CENTER = { lat: 21.84, lng: 82.79 };
const OSM_DEFAULT_ZOOM = 5;

export const InlineOsmMap: React.FC<InlineOsmMapProps> = ({
  locationName,
  coords,
  onLocationChange,
  onExpandModal,
  isLocatingGps,
  onGpsClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [viewMode, setViewMode] = useState<'interactive' | 'embed'>('interactive');
  const [geocodeProvider, setGeocodeProvider] = useState<'mapbox' | 'nominatim' | 'fallback'>('mapbox');

  // SVG Pin Icon
  const createPinIcon = () =>
    L.divIcon({
      className: 'custom-inline-map-pin',
      html: `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          background-color: #0284c7;
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 14px rgba(0,0,0,0.4);
          color: white;
          cursor: pointer;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span style="
            position: absolute;
            bottom: -6px;
            width: 8px;
            height: 8px;
            border-radius: 9999px;
            background-color: #0284c7;
            box-shadow: 0 0 6px #0284c7;
          "></span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });

  // Reverse geocoding via Mapbox Places API v5 with fallback
  const reverseGeocode = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    try {
      const res = await reverseGeocodeUnified(lat, lng);
      setGeocodeProvider(res.provider);
      onLocationChange({
        lat,
        lng,
        locationName: res.address,
      });
    } catch (err) {
      console.warn('Map geocoding error:', err);
      onLocationChange({
        lat,
        lng,
        locationName: `Location (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`,
      });
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Initialize Leaflet Map with Mapbox / OpenStreetMap tiles
  useEffect(() => {
    if (viewMode !== 'interactive' || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Determine initial center: use coords if available, otherwise OSM default (21.84, 82.79)
      const initialCenterLat = coords?.lat ?? OSM_DEFAULT_CENTER.lat;
      const initialCenterLng = coords?.lng ?? OSM_DEFAULT_CENTER.lng;
      const initialZoom = coords?.lat ? 13 : OSM_DEFAULT_ZOOM;

      const map = L.map(mapContainerRef.current, {
        center: [initialCenterLat, initialCenterLng],
        zoom: initialZoom,
        zoomControl: false,
        attributionControl: false,
      });

      // Add Mapbox / OpenStreetMap tile layer
      const tileCfg = getTileLayerConfig('streets');
      L.tileLayer(tileCfg.url, {
        maxZoom: tileCfg.maxZoom,
        attribution: tileCfg.attribution,
        tileSize: tileCfg.tileSize,
      }).addTo(map);

      // Add subtle top-right zoom control
      L.control
        .zoom({
          position: 'topright',
        })
        .addTo(map);

      // Create marker
      const marker = L.marker([initialCenterLat, initialCenterLng], {
        icon: createPinIcon(),
        draggable: true,
      }).addTo(map);

      // Click to pin anywhere
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        reverseGeocode(lat, lng);
      });

      // Drag marker
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        reverseGeocode(position.lat, position.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Invalidate size once rendered
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
    } else {
      // If map already exists, update center and marker
      const map = mapInstanceRef.current;
      const marker = markerRef.current;
      if (map && marker && coords) {
        marker.setLatLng([coords.lat, coords.lng]);
        map.panTo([coords.lat, coords.lng], { animate: true });
      }
      setTimeout(() => {
        map?.invalidateSize();
      }, 100);
    }

    return () => {
      // Keep instance for reuse or cleanup on unmount
    };
  }, [viewMode]);

  // Sync external coords changes (e.g. from GPS detection or modal)
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && coords) {
      markerRef.current.setLatLng([coords.lat, coords.lng]);
      mapInstanceRef.current.panTo([coords.lat, coords.lng], { animate: true });
    }
  }, [coords.lat, coords.lng]);

  // OpenStreetMap direct URL for the current position or default
  const osmDirectUrl = `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=15/${coords.lat}/${coords.lng}`;
  const osmSpecifiedUrl = 'https://www.openstreetmap.org/#map=5/21.84/82.79';

  // Embed bbox calculation for OSM iframe
  const delta = 0.08;
  const bbox = `${coords.lng - delta}%2C${coords.lat - delta}%2C${coords.lng + delta}%2C${coords.lat + delta}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`;

  return (
    <div className="w-full flex flex-col gap-1.5">
      {/* Header bar: OpenStreetMap & Mapbox Badge & Action Controls */}
      <div className="flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 font-semibold text-[11px]">
            <Globe className="w-3 h-3 text-sky-400" />
            <span>OpenStreetMap</span>
          </span>
          {isMapboxConfigured() ? (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[10px]"
              title="Mapbox Geocoding v5 API connected"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Mapbox API</span>
            </span>
          ) : (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[10px]"
              title="Mapbox Geocoding v5 Ready"
            >
              <Sparkles className="w-2.5 h-2.5 text-sky-400" />
              <span>Mapbox v5</span>
            </span>
          )}
          <a
            href={osmSpecifiedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-[var(--text-muted)] hover:text-sky-400 inline-flex items-center gap-0.5 transition-colors hidden sm:inline-flex"
            title="View original OpenStreetMap at #map=5/21.84/82.79"
          >
            <span>#map=5/21.84/82.79</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mode Switcher */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'interactive' ? 'embed' : 'interactive')}
            className="px-1.5 py-0.5 text-[10px] rounded font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--item-hover)] transition-colors cursor-pointer"
            title="Toggle between interactive Leaflet OSM and official OSM embed"
          >
            {viewMode === 'interactive' ? 'Embed View' : 'Interactive View'}
          </button>

          {/* GPS Locate button */}
          <button
            type="button"
            onClick={onGpsClick}
            disabled={isLocatingGps}
            className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 transition-all cursor-pointer disabled:opacity-50"
            title="Detect device GPS location"
          >
            {isLocatingGps ? (
              <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
            ) : (
              <Crosshair className="w-3 h-3 text-sky-400" />
            )}
            <span>{isLocatingGps ? 'Locating...' : 'Use GPS'}</span>
          </button>

          {/* Expand Fullscreen Modal button */}
          <button
            type="button"
            onClick={onExpandModal}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
            title="Expand to Fullscreen Map"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Map Canvas / Embed View */}
      <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden border border-[var(--border-color)] bg-slate-900 shadow-inner group">
        {viewMode === 'interactive' ? (
          <div
            ref={mapContainerRef}
            className="w-full h-full z-0 cursor-crosshair"
            style={{ minHeight: '190px' }}
          />
        ) : (
          <iframe
            title="OpenStreetMap Embed"
            src={embedUrl}
            className="w-full h-full border-0"
            loading="lazy"
          />
        )}

        {/* Floating Top Hint Overlay */}
        <div className="absolute top-2.5 left-2.5 z-[400] pointer-events-none">
          <span className="px-2 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-white text-[10px] font-medium flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Click or drag pin to locate</span>
          </span>
        </div>

        {/* Floating Bottom Location & Coords Bar */}
        <div className="absolute bottom-2 inset-x-2 z-[400] pointer-events-auto">
          <div className="p-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-white shadow-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <span className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0 text-sky-400">
                <Navigation className="w-3 h-3 text-sky-400" />
              </span>
              <div className="flex flex-col truncate text-left">
                <span className="font-bold text-xs truncate text-white">
                  {isReverseGeocoding ? (
                    <span className="flex items-center gap-1 text-sky-300">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Resolving address...
                    </span>
                  ) : (
                    locationName
                  )}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-mono">
                  <span>{coords.lat.toFixed(4)}° N, {coords.lng.toFixed(4)}° E</span>
                  <span className="text-slate-500">&bull;</span>
                  <span className="text-sky-300 font-sans text-[9px] uppercase tracking-wider font-semibold">
                    {geocodeProvider === 'mapbox' ? 'Mapbox Places' : 'OSM'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onExpandModal}
                className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                title="Open full interactive map modal"
              >
                <MapPin className="w-2.5 h-2.5" />
                <span>Enlarge</span>
              </button>
              <a
                href={osmDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Open on OpenStreetMap.org"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
