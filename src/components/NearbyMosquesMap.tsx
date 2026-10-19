import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary,
  MapMouseEvent,
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  MapPin,
  Footprints,
  Car,
  Compass,
  RefreshCw,
  ExternalLink,
  Star,
  Route as RouteIcon,
  Search,
} from 'lucide-react';
import { CityLocation, calculateQiblaDirection } from '../utils/astronomy';
import {
  NearbyMosque,
  buildMosqueNavigationUrls,
  sortAndEnrichMosquePlaces,
  calculateMetersBetweenCoords,
  RawGooglePlaceLike,
} from '../utils/islamicFeatures';
import { toArabicNumerals } from '../data/quranData';

interface NearbyMosquesMapProps {
  selectedCity: CityLocation;
  onDetectLocation: () => void;
  isLocating: boolean;
}

interface LiveRouteSummary {
  distanceMeters: number;
  durationMinutes: number;
}

interface MapPolylineInstance {
  setMap: (map: unknown) => void;
  setOptions: (options: Record<string, unknown>) => void;
}

const RADIUS_OPTIONS = [
  { meters: 1500, labelAr: '١.٥ كم' },
  { meters: 3000, labelAr: '٣ كم' },
  { meters: 5000, labelAr: '٥ كم' },
  { meters: 10000, labelAr: '١٠ كم' },
] as const;

let placesServiceTemporarilyUnavailable = false;

function isQuotaError(err: unknown): boolean {
  const msg = String(err || '');
  return (
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('QuotaExceededError') ||
    msg.includes('429')
  );
}

interface MapSearchAndRouteControllerProps {
  userCoords: { lat: number; lng: number };
  radiusMeters: number;
  searchQuery: string;
  travelMode: 'walking' | 'driving';
  refreshKey: number;
  focusRouteKey: number;
  selectedMosque: NearbyMosque | null;
  clickedPlaceIdToResolve: string | null;
  onResolvedClickedPlace: (placeId: string, nameAr: string, addressAr: string, uri?: string | null) => void;
  onMosquesLoaded: (mosques: NearbyMosque[]) => void;
  onSearchStateChange: (loading: boolean, statusNoteAr: string | null) => void;
  onRouteSummaryChange: (summary: LiveRouteSummary | null, loading: boolean) => void;
}

const MapSearchAndRouteController: React.FC<MapSearchAndRouteControllerProps> = ({
  userCoords,
  radiusMeters,
  searchQuery,
  travelMode,
  refreshKey,
  focusRouteKey,
  selectedMosque,
  clickedPlaceIdToResolve,
  onResolvedClickedPlace,
  onMosquesLoaded,
  onSearchStateChange,
  onRouteSummaryChange,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const coreLib = useMapsLibrary('core');

  const polylinesRef = useRef<MapPolylineInstance[]>([]);

  // Resolve Place Details if user clicked a POI icon directly on the Google Map
  useEffect(() => {
    if (!placesLib || !clickedPlaceIdToResolve || clickedPlaceIdToResolve.startsWith('mosque-pin-')) {
      return;
    }

    let cancelled = false;
    const PlaceCtor = (placesLib as unknown as {
      Place?: new (opts: { id: string }) => {
        displayName?: string | null;
        formattedAddress?: string | null;
        googleMapsURI?: string | null;
        fetchFields: (opts: { fields: string[] }) => Promise<void>;
      };
    }).Place;

    if (!PlaceCtor) return;

    const placeInstance = new PlaceCtor({ id: clickedPlaceIdToResolve });
    placeInstance
      .fetchFields({
        fields: ['displayName', 'formattedAddress', 'googleMapsURI'],
      })
      .then(() => {
        if (cancelled) return;
        if (placeInstance.displayName) {
          onResolvedClickedPlace(
            clickedPlaceIdToResolve,
            placeInstance.displayName,
            placeInstance.formattedAddress || '',
            placeInstance.googleMapsURI
          );
        }
      })
      .catch(() => {
        // Ignore if fetchFields is unavailable; coordinate navigation still works
      });

    return () => {
      cancelled = true;
    };
  }, [placesLib, clickedPlaceIdToResolve]);

  // 1. Resilient Mosque Search (Place.searchByText + Place.searchNearby)
  useEffect(() => {
    if (!placesLib || !map) return;

    // If user manually clicked refresh, reset unavailability flag
    if (refreshKey > 0) {
      placesServiceTemporarilyUnavailable = false;
    }

    if (placesServiceTemporarilyUnavailable) {
      map.panTo(userCoords);
      map.setZoom(15);
      onSearchStateChange(
        false,
        'انقر على أي مسجد ظاهر على الخريطة أعلاه لتحديده ورسم مسار الوصول إليه وفتح الملاحة.'
      );
      return;
    }

    let cancelled = false;
    onSearchStateChange(true, null);

    const PlaceClass = (placesLib as unknown as {
      Place?: {
        searchByText?: (req: Record<string, unknown>) => Promise<{ places?: RawGooglePlaceLike[] }>;
        searchNearby?: (req: Record<string, unknown>) => Promise<{ places?: RawGooglePlaceLike[] }>;
      };
    }).Place;

    const executePlacesQuery = async (): Promise<RawGooglePlaceLike[]> => {
      if (!PlaceClass) return [];

      // Note: Do not pass 'id' in fields array for JS SDK Place.searchNearby / searchByText;
      // place.id is populated automatically on returned Place instances.
      const commonFields = [
        'displayName',
        'location',
        'formattedAddress',
        'googleMapsURI',
      ];

      let lastErr: unknown = null;

      // Stage A: Try Place.searchByText
      if (typeof PlaceClass.searchByText === 'function') {
        try {
          const textReq: Record<string, unknown> = {
            textQuery: searchQuery.trim() || 'مسجد',
            fields: commonFields,
            locationBias: {
              center: { lat: userCoords.lat, lng: userCoords.lng },
              radius: radiusMeters,
            },
            maxResultCount: 15,
            language: 'ar',
          };
          const res = await PlaceClass.searchByText(textReq);
          if (res?.places && res.places.length > 0) {
            return res.places;
          }
        } catch (err) {
          lastErr = err;
          if (isQuotaError(err)) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          if (String(err || '').includes('UNAVAILABLE')) {
            placesServiceTemporarilyUnavailable = true;
            throw err;
          }
        }
      }

      // Stage B: Fallback to Place.searchNearby
      if (typeof PlaceClass.searchNearby === 'function') {
        try {
          const nearbyReq: Record<string, unknown> = {
            fields: commonFields,
            locationRestriction: {
              center: { lat: userCoords.lat, lng: userCoords.lng },
              radius: radiusMeters,
            },
            includedPrimaryTypes: ['mosque'],
            maxResultCount: 15,
            language: 'ar',
          };
          const res = await PlaceClass.searchNearby(nearbyReq);
          if (res?.places && res.places.length > 0) {
            return res.places;
          }
        } catch (err) {
          lastErr = err;
          if (isQuotaError(err)) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          if (String(err || '').includes('UNAVAILABLE')) {
            placesServiceTemporarilyUnavailable = true;
            throw err;
          }
        }
      }

      if (lastErr) {
        throw lastErr;
      }
      return [];
    };

    const runSearch = async () => {
      try {
        const rawPlaces = await executePlacesQuery();
        if (cancelled) return;

        const enriched = sortAndEnrichMosquePlaces(
          rawPlaces,
          userCoords.lat,
          userCoords.lng
        );

        onMosquesLoaded(enriched);
        onSearchStateChange(false, null);

        if (coreLib && enriched.length > 0) {
          const bounds = new coreLib.LatLngBounds();
          bounds.extend(userCoords);
          enriched.slice(0, 8).forEach((m) => {
            bounds.extend({ lat: m.latitude, lng: m.longitude });
          });
          map.fitBounds(bounds, 55);
        } else {
          map.panTo(userCoords);
          map.setZoom(15);
        }
      } catch {
        if (cancelled) return;
        map.panTo(userCoords);
        map.setZoom(15);
        onSearchStateChange(
          false,
          'انقر على أي مسجد ظاهر على الخريطة أعلاه لتحديده ورسم مسار الوصول إليه وفتح الملاحة.'
        );
      }
    };

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [
    placesLib,
    coreLib,
    map,
    userCoords.lat,
    userCoords.lng,
    radiusMeters,
    searchQuery,
    refreshKey,
  ]);

  // 2. Compute and render live route to selected mosque using Routes API: Route.computeRoutes
  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!routesLib || !map || !selectedMosque) {
      onRouteSummaryChange(null, false);
      return;
    }

    let cancelled = false;
    onRouteSummaryChange(null, true);

    const RouteClass = (routesLib as unknown as {
      Route?: {
        computeRoutes?: (req: Record<string, unknown>) => Promise<{
          routes?: Array<{
            distanceMeters?: number;
            durationMillis?: number;
            viewport?: unknown;
            createPolylines?: () => MapPolylineInstance[];
          }>;
        }>;
      };
    }).Route;

    if (!RouteClass || typeof RouteClass.computeRoutes !== 'function') {
      onRouteSummaryChange(null, false);
      return;
    }

    const request: Record<string, unknown> = {
      origin: { lat: userCoords.lat, lng: userCoords.lng },
      destination: {
        lat: selectedMosque.latitude,
        lng: selectedMosque.longitude,
      },
      travelMode: travelMode === 'walking' ? 'WALKING' : 'DRIVING',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    };

    RouteClass.computeRoutes(request)
      .then((res) => {
        if (cancelled) return;
        const primaryRoute = res?.routes?.[0];
        if (!primaryRoute) {
          onRouteSummaryChange(null, false);
          return;
        }

        if (typeof primaryRoute.createPolylines === 'function') {
          const newPolylines = primaryRoute.createPolylines();
          newPolylines.forEach((polyline) => {
            polyline.setOptions({
              strokeColor: '#14532D',
              strokeOpacity: 0.9,
              strokeWeight: 5,
            });
            polyline.setMap(map);
          });
          polylinesRef.current = newPolylines;
        }

        if (focusRouteKey > 0 && primaryRoute.viewport) {
          map.fitBounds(
            primaryRoute.viewport as Parameters<typeof map.fitBounds>[0],
            65
          );
        }

        const distanceMeters =
          primaryRoute.distanceMeters ?? selectedMosque.distanceMeters;
        const durationMinutes = primaryRoute.durationMillis
          ? Math.max(1, Math.round(primaryRoute.durationMillis / 60000))
          : travelMode === 'walking'
          ? selectedMosque.walkingMinutes
          : selectedMosque.drivingMinutes;

        onRouteSummaryChange({ distanceMeters, durationMinutes }, false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onRouteSummaryChange(null, false);
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [
    routesLib,
    map,
    userCoords.lat,
    userCoords.lng,
    selectedMosque?.id,
    selectedMosque?.latitude,
    selectedMosque?.longitude,
    travelMode,
    focusRouteKey,
  ]);

  return null;
};

export const NearbyMosquesMap: React.FC<NearbyMosquesMapProps> = ({
  selectedCity,
  onDetectLocation,
  isLocating,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const [radiusMeters, setRadiusMeters] = useState<number>(3000);
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>('مسجد');
  const [travelMode, setTravelMode] = useState<'walking' | 'driving'>('walking');
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [focusRouteKey, setFocusRouteKey] = useState<number>(0);

  const [mosques, setMosques] = useState<NearbyMosque[]>([]);
  const [selectedMosqueId, setSelectedMosqueId] = useState<string | null>(null);
  const [pinnedMapMosque, setPinnedMapMosque] = useState<NearbyMosque | null>(null);
  const [clickedPlaceIdToResolve, setClickedPlaceIdToResolve] = useState<string | null>(null);
  const [infoWindowOpen, setInfoWindowOpen] = useState<boolean>(false);

  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [statusNoteAr, setStatusNoteAr] = useState<string | null>(null);
  const [routeSummary, setRouteSummary] = useState<LiveRouteSummary | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);

  const userCoords = useMemo(
    () => ({
      lat: selectedCity.latitude,
      lng: selectedCity.longitude,
    }),
    [selectedCity.latitude, selectedCity.longitude]
  );

  useEffect(() => {
    setPinnedMapMosque(null);
    setClickedPlaceIdToResolve(null);
  }, [selectedCity.id, selectedCity.latitude, selectedCity.longitude]);

  const allMosques = useMemo(() => {
    if (!pinnedMapMosque) return mosques;
    return [
      pinnedMapMosque,
      ...mosques.filter((m) => m.id !== pinnedMapMosque.id),
    ];
  }, [mosques, pinnedMapMosque]);

  const selectedMosque = useMemo(() => {
    if (allMosques.length === 0) return null;
    return (
      allMosques.find((m) => m.id === selectedMosqueId) || allMosques[0] || null
    );
  }, [allMosques, selectedMosqueId]);

  const handleMosquesLoaded = (loaded: NearbyMosque[]) => {
    setMosques(loaded);
    if (loaded.length > 0) {
      setSelectedMosqueId((prev) =>
        prev && loaded.some((m) => m.id === prev) ? prev : loaded[0].id
      );
    }
  };

  const handleSelectMosque = (mosque: NearbyMosque, focusOnMap = true) => {
    setSelectedMosqueId(mosque.id);
    setInfoWindowOpen(true);
    if (focusOnMap) {
      setFocusRouteKey((k) => k + 1);
    }
  };

  const handleResolvedClickedPlace = (
    placeId: string,
    nameAr: string,
    addressAr: string,
    uri?: string | null
  ) => {
    setPinnedMapMosque((prev) => {
      if (!prev || prev.id !== placeId) return prev;
      return {
        ...prev,
        nameAr,
        districtAr: addressAr || prev.districtAr,
        googleMapsURI: uri ?? prev.googleMapsURI,
      };
    });
  };

  // Allow user to click any mosque icon or coordinate on the Google Map to select & navigate
  const handleMapClick = (event: MapMouseEvent) => {
    const clickedLatLng = event.detail?.latLng;
    if (!clickedLatLng) {
      setInfoWindowOpen(false);
      return;
    }

    const placeId = event.detail?.placeId || null;
    if (placeId && typeof event.stop === 'function') {
      event.stop();
    }

    const lat = Number(clickedLatLng.lat.toFixed(5));
    const lng = Number(clickedLatLng.lng.toFixed(5));
    const distMeters = calculateMetersBetweenCoords(
      userCoords.lat,
      userCoords.lng,
      lat,
      lng
    );
    const id = placeId || `mosque-pin-${lat}-${lng}`;
    const pinned: NearbyMosque = {
      id,
      nameAr: placeId ? 'المسجد المحدد على الخريطة' : 'نقطة المسجد المختارة على الخريطة',
      districtAr: `الإحداثيات: ${lat}°, ${lng}°`,
      latitude: lat,
      longitude: lng,
      distanceMeters: distMeters,
      walkingMinutes: Math.max(1, Math.round(distMeters / 75)),
      drivingMinutes: Math.max(1, Math.round(distMeters / 500)),
      qiblaBearingDeg: calculateQiblaDirection(lat, lng),
      featuresAr: 'تم تحديده من الخريطة التفاعلية للملاحة المباشرة',
    };

    setPinnedMapMosque(pinned);
    setSelectedMosqueId(pinned.id);
    setClickedPlaceIdToResolve(placeId);
    setInfoWindowOpen(true);
    setFocusRouteKey((k) => k + 1);
  };

  const activeNavUrls = useMemo(() => {
    if (!selectedMosque) return null;
    return buildMosqueNavigationUrls(
      userCoords,
      {
        lat: selectedMosque.latitude,
        lng: selectedMosque.longitude,
        placeId: selectedMosque.id,
        googleMapsURI: selectedMosque.googleMapsURI,
      },
      travelMode
    );
  }, [userCoords, selectedMosque, travelMode]);

  const fallbackQuickNavUrls = useMemo(() => {
    const originParam = `${userCoords.lat},${userCoords.lng}`;
    const destQuery = encodeURIComponent('مسجد');
    return {
      googleMapsDirUrl: `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destQuery}&travelmode=${travelMode}`,
      googleMapsSearchUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `مسجد بالقرب من ${userCoords.lat},${userCoords.lng}`
      )}`,
      appleMapsDirUrl: `https://maps.apple.com/?saddr=${originParam}&q=${destQuery}&dirflg=${
        travelMode === 'walking' ? 'w' : 'd'
      }`,
      wazeNavUrl: `https://waze.com/ul?q=${destQuery}&ll=${originParam}&navigate=yes`,
    };
  }, [userCoords, travelMode]);

  const formatDist = (meters: number) =>
    meters < 1000
      ? `${toArabicNumerals(meters)} متر`
      : `${(meters / 1000).toFixed(1)} كم`;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    placesServiceTemporarilyUnavailable = false;
    setActiveSearchQuery(searchInput.trim() || 'مسجد');
    setRefreshKey((k) => k + 1);
  };

  return (
    <section
      aria-labelledby="nearby-mosques-heading"
      data-testid="nearby-mosques-map-section"
      className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-start space-y-4"
    >
      {/* Header & GPS Action */}
      <div className="border-b border-stone-100 pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="nearby-mosques-heading"
            className="font-display text-base sm:text-lg font-bold text-stone-900"
          >
            خريطة المساجد المحيطة والملاحة — {selectedCity.nameAr}
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            اختر مسجداً من القائمة أو انقر على أي مسجد بالخريطة لرسم المسار وفتح الملاحة
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onDetectLocation}
            disabled={isLocating}
            data-testid="map-detect-gps-btn"
            className="min-h-[34px] px-3 py-1.5 rounded-xl bg-[#14532D] text-white text-xs font-semibold hover:bg-[#14532D]/90 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{isLocating ? 'جاري تحديد موقعك...' : 'موقعي الدقيق GPS'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              placesServiceTemporarilyUnavailable = false;
              setRefreshKey((k) => k + 1);
            }}
            title="تحديث البحث عن المساجد"
            className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-[#FBF9F5] border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isSearching ? 'animate-spin text-[#14532D]' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Search Bar & Radius / Travel Mode Controls */}
      <div className="space-y-2">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث عن اسم مسجد أو جامع قريب..."
              className="w-full min-h-[36px] pr-8 pl-3 py-1.5 rounded-xl bg-[#FBF9F5] border border-stone-200 text-xs text-stone-800 focus:outline-none focus:border-[#14532D]"
            />
          </div>
          <button
            type="submit"
            className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[#14532D] text-white text-xs font-semibold hover:bg-[#14532D]/90 transition-colors cursor-pointer shrink-0"
          >
            بحث
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FBF9F5] border border-stone-200/80 rounded-xl p-2">
          {/* Search Radius Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-semibold text-stone-600 px-1.5">
              النطاق:
            </span>
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.meters}
                type="button"
                onClick={() => setRadiusMeters(opt.meters)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  radiusMeters === opt.meters
                    ? 'bg-[#14532D] text-white'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                {opt.labelAr}
              </button>
            ))}
          </div>

          {/* Travel Mode Toggle */}
          <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setTravelMode('walking')}
              data-testid="travel-mode-walking"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                travelMode === 'walking'
                  ? 'bg-[#14532D] text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>مشياً</span>
            </button>
            <button
              type="button"
              onClick={() => setTravelMode('driving')}
              data-testid="travel-mode-driving"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                travelMode === 'driving'
                  ? 'bg-[#14532D] text-white'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>بالسيارة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Google Map Container (Explicit Height per CF2) */}
      <div
        className="h-[340px] sm:h-[390px] w-full rounded-xl overflow-hidden border border-stone-200 relative bg-stone-100"
        data-testid="google-map-container"
      >
        {apiKey ? (
          <APIProvider apiKey={apiKey} language="ar" region="SA">
            <Map
              defaultCenter={userCoords}
              defaultZoom={15}
              mapId="DEMO_MAP_ID"
              gestureHandling="greedy"
              clickableIcons={true}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              onClick={handleMapClick}
            >
              <MapSearchAndRouteController
                userCoords={userCoords}
                radiusMeters={radiusMeters}
                searchQuery={activeSearchQuery}
                travelMode={travelMode}
                refreshKey={refreshKey}
                focusRouteKey={focusRouteKey}
                selectedMosque={selectedMosque}
                clickedPlaceIdToResolve={clickedPlaceIdToResolve}
                onResolvedClickedPlace={handleResolvedClickedPlace}
                onMosquesLoaded={handleMosquesLoaded}
                onSearchStateChange={(loading, note) => {
                  setIsSearching(loading);
                  setStatusNoteAr(note);
                }}
                onRouteSummaryChange={(summary, loading) => {
                  setRouteSummary(summary);
                  setIsRouting(loading);
                }}
              />

              {/* User Current Location Marker */}
              <AdvancedMarker
                position={userCoords}
                title={`موقعك الحالي — ${selectedCity.nameAr}`}
                zIndex={50}
              >
                <div className="flex flex-col items-center">
                  <div className="px-2 py-0.5 rounded-full bg-stone-900 text-white text-[10px] font-bold shadow-md mb-1 whitespace-nowrap">
                    موقعك
                  </div>
                  <div className="w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-md ring-4 ring-emerald-500/30" />
                </div>
              </AdvancedMarker>

              {/* Discovered & Pinned Mosque Markers */}
              {allMosques.map((mosque, index) => {
                const isSelected = selectedMosque?.id === mosque.id;
                return (
                  <AdvancedMarker
                    key={mosque.id}
                    position={{ lat: mosque.latitude, lng: mosque.longitude }}
                    title={mosque.nameAr}
                    zIndex={isSelected ? 40 : 20 - Math.min(index, 15)}
                    onClick={() => handleSelectMosque(mosque, true)}
                  >
                    <div
                      className={`flex items-center gap-1 px-2 py-1 rounded-xl border shadow-md transition-transform cursor-pointer ${
                        isSelected
                          ? 'bg-[#78350F] text-white border-amber-300 scale-110'
                          : 'bg-[#14532D] text-white border-white/80 hover:scale-105'
                      }`}
                    >
                      <span className="text-xs" aria-hidden="true">
                        🕌
                      </span>
                      <span className="text-[11px] font-bold max-w-[115px] truncate">
                        {mosque.nameAr}
                      </span>
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* InfoWindow for Active Mosque on Map */}
              {infoWindowOpen && selectedMosque && activeNavUrls && (
                <InfoWindow
                  position={{
                    lat: selectedMosque.latitude,
                    lng: selectedMosque.longitude,
                  }}
                  maxWidth={260}
                  onCloseClick={() => setInfoWindowOpen(false)}
                >
                  <div className="text-right space-y-1.5 p-1" dir="rtl">
                    <h4 className="font-bold text-xs text-stone-900">
                      {selectedMosque.nameAr}
                    </h4>
                    {selectedMosque.districtAr && (
                      <p className="text-[11px] text-stone-600 leading-snug">
                        {selectedMosque.districtAr}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#14532D] pt-1">
                      <span>
                        {formatDist(
                          routeSummary?.distanceMeters ??
                            selectedMosque.distanceMeters
                        )}
                      </span>
                      <span>
                        {travelMode === 'walking' ? 'مشياً ' : 'بالسيارة '}
                        {toArabicNumerals(
                          routeSummary?.durationMinutes ??
                            (travelMode === 'walking'
                              ? selectedMosque.walkingMinutes
                              : selectedMosque.drivingMinutes)
                        )}{' '}
                        د
                      </span>
                    </div>
                    <a
                      href={activeNavUrls.googleMapsDirUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 w-full py-1.5 px-2.5 rounded-lg bg-[#14532D] text-white text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-[#14532D]/90"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>فتح الملاحة الآن</span>
                    </a>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center space-y-2">
            <MapPin className="w-8 h-8 text-stone-400" />
            <p className="text-sm font-bold text-stone-700">
              جاري تهيئة مفتاح خرائط جوجل التفاعلية...
            </p>
          </div>
        )}

        {/* Loading Badge Overlay */}
        {(isSearching || isRouting) && (
          <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm border border-stone-200 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2 text-xs font-semibold text-[#14532D]">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>
              {isSearching
                ? 'جاري البحث عن المساجد المحيطة...'
                : 'جاري رسم مسار الملاحة...'}
            </span>
          </div>
        )}
      </div>

      {/* Selected Mosque Turn-by-Turn Navigation Panel (Always Accessible) */}
      {selectedMosque && activeNavUrls ? (
        <div
          data-testid="selected-mosque-navigation-panel"
          className="bg-[#FBF9F5] border-2 border-[#14532D]/30 rounded-2xl p-3.5 sm:p-4 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold text-[#78350F] bg-amber-100/80 px-2 py-0.5 rounded-md">
                  المسجد المختار للملاحة
                </span>
                {typeof selectedMosque.rating === 'number' && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{selectedMosque.rating.toFixed(1)}</span>
                    {selectedMosque.userRatingCount ? (
                      <span className="text-stone-500">
                        ({toArabicNumerals(selectedMosque.userRatingCount)})
                      </span>
                    ) : null}
                  </span>
                )}
              </div>

              <h3
                data-testid="selected-mosque-name"
                className="font-display text-base sm:text-lg font-bold text-stone-900"
              >
                {selectedMosque.nameAr}
              </h3>

              {selectedMosque.districtAr && (
                <p className="text-xs text-stone-600 leading-relaxed">
                  {selectedMosque.districtAr}
                </p>
              )}
            </div>

            {/* Live Distance, ETA & Qibla at Mosque */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 bg-white border border-stone-200 rounded-xl px-3 py-2">
              <div className="text-xs font-bold text-stone-900">
                المسافة:{' '}
                <span className="font-tabular text-[#14532D]">
                  {formatDist(
                    routeSummary?.distanceMeters ??
                      selectedMosque.distanceMeters
                  )}
                </span>
              </div>
              <div className="text-xs font-semibold text-[#78350F]">
                {travelMode === 'walking' ? 'مشياً: ' : 'بالسيارة: '}
                {toArabicNumerals(
                  routeSummary?.durationMinutes ??
                    (travelMode === 'walking'
                      ? selectedMosque.walkingMinutes
                      : selectedMosque.drivingMinutes)
                )}{' '}
                دقيقة
              </div>
              <div className="text-[11px] text-stone-500 flex items-center gap-1">
                <Compass className="w-3 h-3 text-[#14532D]" />
                <span>القبلة: {selectedMosque.qiblaBearingDeg}°</span>
              </div>
            </div>
          </div>

          {/* Turn-by-Turn Navigation Launch Buttons */}
          <div className="pt-2 border-t border-stone-200/80 flex flex-wrap items-center gap-2">
            <a
              href={activeNavUrls.googleMapsDirUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="open-google-maps-nav-btn"
              className="flex-1 min-w-[200px] min-h-[40px] px-4 py-2 rounded-xl bg-[#14532D] text-white text-xs sm:text-sm font-bold hover:bg-[#14532D]/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Navigation className="w-4 h-4" />
              <span>
                بدء الملاحة في خرائط جوجل (
                {travelMode === 'walking' ? 'مشياً' : 'بالسيارة'})
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <button
              type="button"
              onClick={() => setFocusRouteKey((k) => k + 1)}
              data-testid="focus-route-on-map-btn"
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RouteIcon className="w-3.5 h-3.5 text-[#14532D]" />
              <span>توسيط المسار بالخريطة</span>
            </button>

            <a
              href={activeNavUrls.appleMapsDirUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="open-apple-maps-nav-btn"
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-100 transition-colors flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-[#78350F]" />
              <span>خرائط آبل</span>
            </a>

            <a
              href={activeNavUrls.wazeNavUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="open-waze-nav-btn"
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-100 transition-colors flex items-center gap-1.5"
            >
              <Car className="w-3.5 h-3.5 text-stone-700" />
              <span>تطبيق Waze</span>
            </a>
          </div>
        </div>
      ) : (
        <div
          data-testid="selected-mosque-navigation-panel"
          className="bg-[#FBF9F5] border-2 border-[#14532D]/30 rounded-2xl p-3.5 sm:p-4 space-y-3"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#78350F] bg-amber-100/80 px-2 py-0.5 rounded-md">
              الملاحة المباشرة للمساجد المحيطة
            </span>
            <h3 className="font-display text-sm sm:text-base font-bold text-stone-900">
              {statusNoteAr ||
                'انقر على أي رمز مسجد 🕌 على الخريطة أعلاه لرسم مسار الوصول إليه، أو افتح الملاحة الفورية لأقرب مسجد:'}
            </h3>
          </div>

          <div className="pt-1 flex flex-wrap items-center gap-2">
            <a
              href={fallbackQuickNavUrls.googleMapsDirUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="open-google-maps-nav-btn"
              className="flex-1 min-w-[200px] min-h-[40px] px-4 py-2 rounded-xl bg-[#14532D] text-white text-xs sm:text-sm font-bold hover:bg-[#14532D]/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Navigation className="w-4 h-4" />
              <span>
                فتح الملاحة لأقرب مسجد في Google Maps (
                {travelMode === 'walking' ? 'مشياً' : 'بالسيارة'})
              </span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <a
              href={fallbackQuickNavUrls.googleMapsSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-100 transition-colors flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-[#14532D]" />
              <span>جميع المساجد المحيطة</span>
            </a>

            <a
              href={fallbackQuickNavUrls.appleMapsDirUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="open-apple-maps-nav-btn"
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-100 transition-colors flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5 text-[#78350F]" />
              <span>خرائط آبل</span>
            </a>

            <a
              href={fallbackQuickNavUrls.wazeNavUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="open-waze-nav-btn"
              className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-100 transition-colors flex items-center gap-1.5"
            >
              <Car className="w-3.5 h-3.5 text-stone-700" />
              <span>تطبيق Waze</span>
            </a>
          </div>
        </div>
      )}

      {/* Interactive Nearby Mosques List */}
      {allMosques.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 px-1">
            <span className="font-semibold text-stone-700">
              قائمة المساجد ({toArabicNumerals(allMosques.length)})
            </span>
            <span>اضغط على المسجد لعرض مساره أو بدء الملاحة</span>
          </div>

          <div
            className="divide-y divide-stone-100 max-h-[290px] overflow-y-auto pr-1 border border-stone-200/80 rounded-xl bg-white"
            data-testid="nearby-mosques-list"
          >
            {allMosques.map((mosque) => {
              const isSelected = selectedMosque?.id === mosque.id;
              const itemNavUrls = buildMosqueNavigationUrls(
                userCoords,
                {
                  lat: mosque.latitude,
                  lng: mosque.longitude,
                  placeId: mosque.id,
                  googleMapsURI: mosque.googleMapsURI,
                },
                travelMode
              );

              return (
                <div
                  key={mosque.id}
                  onClick={() => handleSelectMosque(mosque, true)}
                  data-testid={`mosque-item-${mosque.id}`}
                  className={`p-3 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-[#14532D]/8 border-r-4 border-r-[#14532D]'
                      : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-900 truncate">
                        {mosque.nameAr}
                      </h3>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#14532D] text-white shrink-0">
                          محدّد بالخريطة
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-600 truncate">
                      {mosque.districtAr || mosque.featuresAr}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className="font-tabular tabular-nums text-stone-800">
                        {formatDist(mosque.distanceMeters)}
                      </span>
                      <span aria-hidden="true" className="text-stone-400">
                        ·
                      </span>
                      <span className="text-[#14532D] whitespace-nowrap">
                        {travelMode === 'walking'
                          ? `مشياً ${toArabicNumerals(mosque.walkingMinutes)} د`
                          : `بالسيارة ${toArabicNumerals(mosque.drivingMinutes)} د`}
                      </span>
                    </div>

                    <a
                      href={itemNavUrls.googleMapsDirUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`mosque-nav-link-${mosque.id}`}
                      className="min-h-[32px] px-2.5 py-1 rounded-lg bg-[#14532D] text-white text-xs font-semibold hover:bg-[#14532D]/90 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>ملاحة</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
