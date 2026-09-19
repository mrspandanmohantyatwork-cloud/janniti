import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CivicUpdate } from '../types';
import { getTileLayerConfig } from '../utils/mapboxService';
import {
  MapPin,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ExternalLink,
  Shield,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface OfficerGisMapProps {
  updates: CivicUpdate[];
  selectedSector: string;
  onSelectDossier?: (update: CivicUpdate) => void;
}

// Bhubaneswar Exact Coordinates Lookup
const BHUBANESWAR_WARD_COORDS: Record<string, { lat: number; lng: number }> = {
  'hotel num num': { lat: 20.3015, lng: 85.8312 },
  'acharya vihar': { lat: 20.3015, lng: 85.8312 },
  'ward 3': { lat: 20.3015, lng: 85.8312 },
  'vishal mega mart': { lat: 20.3003, lng: 85.8242 },
  'jaydev vihar': { lat: 20.3003, lng: 85.8242 },
  'ward 10': { lat: 20.3003, lng: 85.8242 },
  'kalinga stadium': { lat: 20.3039, lng: 85.8202 },
  'ward 18': { lat: 20.3039, lng: 85.8202 },
  'market building': { lat: 20.2644, lng: 85.8360 },
  'unit-2': { lat: 20.2644, lng: 85.8360 },
  'capital hospital': { lat: 20.2650, lng: 85.8350 },
  'unit-6': { lat: 20.2650, lng: 85.8350 },
  'rasulgarh': { lat: 20.2882, lng: 85.8650 },
  'master canteen': { lat: 20.2680, lng: 85.8420 },
  'station square': { lat: 20.2680, lng: 85.8420 },
  'nayapalli': { lat: 20.3012, lng: 85.8164 },
  'saheed nagar': { lat: 20.2882, lng: 85.8456 },
  'khandagiri': { lat: 20.2589, lng: 85.7876 },
  'vss nagar': { lat: 20.3120, lng: 85.8520 },
  'patia': { lat: 20.3533, lng: 85.8266 },
  'infocity': { lat: 20.3588, lng: 85.8139 },
  'madanpur': { lat: 20.2450, lng: 85.7320 },
  'gramadiha': { lat: 20.2215, lng: 85.7482 },
  'chandrasekharpur': { lat: 20.3230, lng: 85.8200 },
  'bhubaneswar': { lat: 20.2961, lng: 85.8245 },
};

function resolveCoordinates(update: CivicUpdate, index: number): { lat: number; lng: number } {
  if (typeof update.lat === 'number' && typeof update.lng === 'number' && !isNaN(update.lat) && !isNaN(update.lng)) {
    return { lat: update.lat, lng: update.lng };
  }

  const wardLower = (update.ward || '').toLowerCase();
  for (const [key, coords] of Object.entries(BHUBANESWAR_WARD_COORDS)) {
    if (wardLower.includes(key)) {
      // Deterministic slight jitter if multiple items share the same neighborhood
      const jitterLat = ((index % 5) - 2) * 0.0022;
      const jitterLng = (((index * 3) % 5) - 2) * 0.0022;
      return { lat: coords.lat + jitterLat, lng: coords.lng + jitterLng };
    }
  }

  // Fallback Bhubaneswar center with deterministic spread
  const jitterLat = ((index % 7) - 3) * 0.004;
  const jitterLng = (((index * 4) % 7) - 3) * 0.004;
  return { lat: 20.2961 + jitterLat, lng: 85.8245 + jitterLng };
}

function getCategoryColor(category: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('health')) return '#f43f5e'; // rose
  if (cat.includes('infra')) return '#f59e0b'; // amber
  if (cat.includes('waste')) return '#10b981'; // emerald
  if (cat.includes('safe')) return '#8b5cf6'; // purple
  if (cat.includes('transit') || cat.includes('traffic')) return '#0284c7'; // sky blue
  if (cat.includes('water') || cat.includes('sanitation')) return '#06b6d4'; // cyan
  if (cat.includes('edu')) return '#6366f1'; // indigo
  return '#3b82f6'; // blue
}

function getCategoryIconSymbol(category: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('health')) return '🏥';
  if (cat.includes('infra')) return '🏗️';
  if (cat.includes('waste')) return '♻️';
  if (cat.includes('safe')) return '🛡️';
  if (cat.includes('transit') || cat.includes('traffic')) return '🚦';
  if (cat.includes('water') || cat.includes('sanitation')) return '🚰';
  if (cat.includes('edu')) return '🏫';
  return '📍';
}

export const OfficerGisMap: React.FC<OfficerGisMapProps> = ({
  updates,
  selectedSector,
  onSelectDossier,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  const [activeIssueCount, setActiveIssueCount] = useState(0);

  // Filter issues according to selectedSector
  const filteredUpdates = updates.filter((item) => {
    if (selectedSector === 'all') return true;
    return item.category.toLowerCase().includes(selectedSector.toLowerCase());
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default to Bhubaneswar
      const initialCenter: [number, number] = [20.2961, 85.8245];
      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 12,
        zoomControl: false,
      });

      // Add Tile Layer
      const config = getTileLayerConfig(mapStyle);
      const tileLayer = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: config.maxZoom || 19,
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Layer group for citizen issue markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer when style changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const config = getTileLayerConfig(mapStyle);
    const newLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom || 19,
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [mapStyle]);

  // Update Markers whenever filteredUpdates change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear existing markers
    markersLayer.clearLayers();

    const bounds: [number, number][] = [];

    filteredUpdates.forEach((issue, idx) => {
      const coords = resolveCoordinates(issue, idx);
      bounds.push([coords.lat, coords.lng]);

      const color = getCategoryColor(issue.category);
      const iconSymbol = getCategoryIconSymbol(issue.category);

      // Create Leaflet DivIcon with exact anchor at the pin pointer tip [17, 38]
      const pinIcon = L.divIcon({
        className: 'citizen-issue-gis-pin',
        html: `
          <div style="position: relative; width: 34px; height: 38px; transform: translate(-50%, -100%); cursor: pointer;">
            <!-- Outer Pin Shape pointing downward -->
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 34px;
              height: 34px;
              background: ${color};
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              box-shadow: 0 4px 14px rgba(0,0,0,0.5);
              border: 2px solid #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.2s ease;
            ">
              <!-- Center Icon Badge -->
              <div style="
                transform: rotate(45deg);
                font-size: 13px;
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                ${iconSymbol}
              </div>
            </div>
            ${
              issue.status === 'in_progress'
                ? `<div style="position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%); width: 8px; height: 8px; background: #38bdf8; border-radius: 50%; box-shadow: 0 0 8px #38bdf8;"></div>`
                : ''
            }
          </div>
        `,
        iconSize: [34, 38],
        iconAnchor: [17, 38],
        popupAnchor: [0, -38],
      });

      const marker = L.marker([coords.lat, coords.lng], {
        icon: pinIcon,
        title: `${issue.id}: ${issue.category} - ${issue.ward}`,
      });

      // Build rich popup
      const statusColor =
        issue.status === 'resolved'
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
          : issue.status === 'in_progress'
          ? 'bg-sky-500/20 text-sky-300 border-sky-400'
          : issue.status === 'reviewing'
          ? 'bg-purple-500/20 text-purple-300 border-purple-400'
          : 'bg-amber-500/20 text-amber-300 border-amber-400';

      const popupHtml = `
        <div style="font-family: inherit; min-width: 220px; max-width: 280px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-weight: 800; font-size: 11px; color: ${color}; text-transform: uppercase; letter-spacing: 0.5px;">
              ${issue.category}
            </span>
            <span style="font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 9999px; background: #1e293b; color: #94a3b8; border: 1px solid #334155; text-transform: uppercase;">
              ${issue.status.replace('_', ' ')}
            </span>
          </div>

          <div style="font-weight: 700; font-size: 13px; color: #0f172a; line-height: 1.35; margin-bottom: 4px;">
            ${issue.ward}
          </div>

          <p style="font-size: 11px; color: #475569; margin: 0 0 8px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${issue.description}
          </p>

          ${
            issue.imageUrl
              ? `<div style="margin-bottom: 8px; border-radius: 8px; overflow: hidden; height: 80px; background: #000;">
                   <img src="${issue.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="Grievance evidence" />
                 </div>`
              : ''
          }

          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            <span>By <strong>${issue.authorName || 'Citizen'}</strong></span>
            <span style="font-family: monospace;">${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'custom-gis-popup',
        maxWidth: 320,
      });

      marker.on('click', () => {
        if (onSelectDossier) {
          onSelectDossier(issue);
        }
      });

      markersLayer.addLayer(marker);
    });

    setActiveIssueCount(filteredUpdates.length);

    // If there are issues, fit map bounds cleanly to include them
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [filteredUpdates, onSelectDossier]);

  // Controls Handlers
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([20.2961, 85.8245], 12);
    }
  };

  return (
    <div className="relative w-full h-[460px] rounded-2xl overflow-hidden border border-[var(--border-color)] bg-slate-900 shadow-inner group">
      {/* Real Interactive Leaflet Map Canvas - Pointer stays locked to exact coordinates when zooming */}
      <div
        id="officer-gis-map-iframe"
        ref={mapContainerRef}
        className="w-full h-full z-0 cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-700 text-white text-xs font-semibold flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Citizen Issues: <strong className="text-sky-400">{activeIssueCount}</strong></span>
        </div>

        {selectedSector !== 'all' && (
          <div className="px-2.5 py-1.5 rounded-xl bg-sky-500/80 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 shadow-lg">
            <Filter className="w-3 h-3" />
            <span className="capitalize">{selectedSector}</span>
          </div>
        )}
      </div>

      {/* Top-Right Map Mode & Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
        <div className="flex items-center bg-slate-950/85 backdrop-blur-md border border-slate-700 rounded-xl p-1 shadow-lg">
          <button
            type="button"
            onClick={() => setMapStyle('streets')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mapStyle === 'streets'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Streets
          </button>
          <button
            type="button"
            onClick={() => setMapStyle('satellite')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mapStyle === 'satellite'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Satellite
          </button>
        </div>

        {/* Zoom & Recenter Controls */}
        <div className="flex flex-col bg-slate-950/85 backdrop-blur-md border border-slate-700 rounded-xl overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-800" />
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <div className="h-px bg-slate-800" />
          <button
            type="button"
            onClick={handleResetView}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Recenter Map"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Category Legend */}
      <div className="absolute bottom-3 left-3 z-10 p-2.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-white text-[11px] shadow-xl max-w-sm hidden sm:block">
        <div className="font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
          <span>Citizen Issue Legend</span>
          <span className="text-[9px] text-sky-400">Fixed to GPS Coordinates</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shrink-0" />
            <span className="truncate">Infrastructure</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e] shrink-0" />
            <span className="truncate">Public Health</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shrink-0" />
            <span className="truncate">Waste Mgmt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] shrink-0" />
            <span className="truncate">Safety</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] shrink-0" />
            <span className="truncate">Transit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4] shrink-0" />
            <span className="truncate">Water & Sanitation</span>
          </div>
        </div>
      </div>
    </div>
  );
};
