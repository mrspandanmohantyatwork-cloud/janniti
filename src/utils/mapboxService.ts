/**
 * Mapbox Geocoding & Mapping Integration Service
 * Endpoint: https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json?access_token={token}
 */

export interface MapboxGeocodeResult {
  id: string;
  placeName: string;
  text: string;
  lat: number;
  lng: number;
  relevance: number;
  category?: string;
}

/**
 * Retrieve Mapbox Access Token from client environment
 */
export function getMapboxAccessToken(): string {
  const envToken =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAPBOX_ACCESS_TOKEN) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.MAPBOX_ACCESS_TOKEN) ||
    '';
  return envToken.trim();
}

/**
 * Returns true if a valid-looking Mapbox token is configured
 */
export function isMapboxConfigured(): boolean {
  const token = getMapboxAccessToken();
  return token.length > 10 && token.startsWith('pk.');
}

/**
 * Mapbox Tile Layer URL for Leaflet
 * Returns Mapbox raster tile template if token is present, else standard OpenStreetMap tile
 */
export function getTileLayerConfig(style: 'streets' | 'satellite' | 'outdoors' = 'streets') {
  const token = getMapboxAccessToken();

  if (isMapboxConfigured()) {
    const styleId =
      style === 'satellite'
        ? 'satellite-streets-v12'
        : style === 'outdoors'
        ? 'outdoors-v12'
        : 'streets-v12';

    return {
      url: `https://api.mapbox.com/styles/v1/mapbox/${styleId}/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`,
      attribution:
        '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 22,
      tileSize: 256,
      zoomOffset: 0,
      isMapbox: true,
    };
  }

  // Fallback to OpenStreetMap / Esri
  if (style === 'satellite') {
    return {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
      maxZoom: 19,
      tileSize: 256,
      zoomOffset: 0,
      isMapbox: false,
    };
  }

  return {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    tileSize: 256,
    zoomOffset: 0,
    isMapbox: false,
  };
}

/**
 * Mapbox Forward Geocoding: Converts query string into geographic coordinates
 * Uses: https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json?access_token={token}
 */
export async function mapboxForwardGeocode(
  query: string,
  proximity?: { lat: number; lng: number }
): Promise<MapboxGeocodeResult[] | null> {
  const token = getMapboxAccessToken();
  if (!token) return null;

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${token}&autocomplete=true&limit=6`;

    if (proximity) {
      url += `&proximity=${proximity.lng},${proximity.lat}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Mapbox geocoding returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.features)) {
      return [];
    }

    return data.features.map((f: any) => {
      const [lng, lat] = f.center || (f.geometry && f.geometry.coordinates) || [0, 0];
      return {
        id: f.id || String(Math.random()),
        placeName: f.place_name || f.text,
        text: f.text || '',
        lat,
        lng,
        relevance: f.relevance || 1,
        category: f.properties?.category,
      };
    });
  } catch (err) {
    console.warn('Mapbox forward geocoding exception:', err);
    return null;
  }
}

/**
 * Mapbox Reverse Geocoding: Converts latitude and longitude to a human-readable street address
 * Uses: https://api.mapbox.com/geocoding/v5/mapbox.places/{lng},{lat}.json?access_token={token}
 */
export async function mapboxReverseGeocode(lat: number, lng: number): Promise<string | null> {
  const token = getMapboxAccessToken();
  if (!token) return null;

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&limit=1`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Mapbox reverse geocode returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data && Array.isArray(data.features) && data.features.length > 0) {
      const primary = data.features[0];
      return primary.place_name || primary.text || null;
    }
    return null;
  } catch (err) {
    console.warn('Mapbox reverse geocode exception:', err);
    return null;
  }
}

/**
 * Unified Reverse Geocoding:
 * Tries Mapbox v5 Geocoding API first, then falls back seamlessly to OpenStreetMap Nominatim
 */
export async function reverseGeocodeUnified(
  lat: number,
  lng: number
): Promise<{ address: string; provider: 'mapbox' | 'nominatim' | 'fallback' }> {
  // 1. Try Mapbox Geocoding API if token is configured
  if (isMapboxConfigured()) {
    const mapboxResult = await mapboxReverseGeocode(lat, lng);
    if (mapboxResult && mapboxResult.trim().length > 0) {
      return {
        address: mapboxResult,
        provider: 'mapbox',
      };
    }
  }

  // 2. OpenStreetMap Nominatim fallback
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const locality =
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.road ||
          addr.village ||
          addr.city_district ||
          addr.city ||
          'Civic Zone';
        const city = addr.city || addr.town || addr.state_district || 'Bhubaneswar';
        return {
          address: `${locality}, ${city}`,
          provider: 'nominatim',
        };
      }
    }
  } catch (err) {
    console.warn('Nominatim fallback reverse geocode failed:', err);
  }

  // 3. Fallback coordinates representation
  return {
    address: `Location (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`,
    provider: 'fallback',
  };
}

/**
 * Unified Forward Search:
 * Tries Mapbox v5 Geocoding API first, then falls back to OpenStreetMap Nominatim
 */
export async function searchLocationUnified(
  query: string,
  proximity?: { lat: number; lng: number }
): Promise<{ results: MapboxGeocodeResult[]; provider: 'mapbox' | 'nominatim' }> {
  // 1. Try Mapbox Geocoding API
  if (isMapboxConfigured()) {
    const mapboxResults = await mapboxForwardGeocode(query, proximity);
    if (mapboxResults && mapboxResults.length > 0) {
      return {
        results: mapboxResults,
        provider: 'mapbox',
      };
    }
  }

  // 2. OpenStreetMap Nominatim Fallback
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const results: MapboxGeocodeResult[] = data.map((item: any) => ({
          id: String(item.place_id || Math.random()),
          placeName: item.display_name,
          text: item.name || item.display_name.split(',')[0],
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          relevance: 0.9,
        }));
        return {
          results,
          provider: 'nominatim',
        };
      }
    }
  } catch (err) {
    console.warn('Nominatim forward search failed:', err);
  }

  return {
    results: [],
    provider: 'nominatim',
  };
}
