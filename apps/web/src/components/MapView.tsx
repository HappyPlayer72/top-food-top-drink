'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { HonestValue } from './BrandPrimitives';
import type * as maplibreglType from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MapPin,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Compass,
  Navigation,
  ExternalLink,
  Search,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Layers,
  X,
  Check,
  Utensils,
  Sandwich,
  Pizza,
  Soup,
  CakeSlice,
  Coffee,
  Beer,
  Wine,
  Martini,
  Citrus,
  Leaf,
  WheatOff,
} from 'lucide-react';
import {
  Restaurant,
  Neighborhood,
  TouristZone,
  TrapTier,
  Vertical,
  formatHonest, honestSpoken, formatScore,
} from '../types';
import { INITIAL_RESTAURANTS, TOURIST_ZONES } from '../data/restaurants';
import {
  OPENFREEMAP_POSITRON_URL,
  TIMISOARA_LANDMARKS,
  applyTopFoodMapSkin,
  buildNeighborhoodLabelsGeoJSON,
  buildNeighborhoodsGeoJSON,
  buildTouristZonesGeoJSON,
} from '../data/timisoaraGeo';
import { LocalnicBadge, TrapBadge } from './BrandPrimitives';
import { MAP_TASTES, matchesMapTastes, type MapTaste } from './mapTasteFilter';

export interface MapViewProps {
  darkMode?: boolean;
  vertical?: Vertical;
  restaurants?: Restaurant[];
  onSelectRestaurant: (restaurant: Restaurant) => void;
  selectedRestaurant?: Restaurant | null;
  selectedNeighborhood?: Neighborhood | 'All' | 'all' | string;
  onSelectNeighborhood?: (neighborhood: string) => void;
  touristZones?: TouristZone[];
  onResetFilters?: () => void;
}

const TASTE_ICONS: Record<MapTaste, typeof Utensils> = {
  burger: Sandwich, pizza: Pizza, pasta: Utensils, soup: Soup, dessert: CakeSlice,
  coffee: Coffee, beer: Beer, wine: Wine, cocktail: Martini, fresh: Citrus,
  vegetarian: Leaf, vegan: Leaf, 'gluten-free': WheatOff,
};

interface NeighborhoodCamera {
  label: string;
  shortLabel: string;
  lat: number;
  lng: number;
  zoom: number;
}

const NEIGHBORHOOD_CAMERAS: Record<string, NeighborhoodCamera> = {
  ALL: {
    label: 'Toată Timișoara',
    shortLabel: 'Toată harta',
    lat: 45.7525,
    lng: 21.2295,
    zoom: 13.5,
  },
  'Cetate / Piața Unirii': {
    label: 'Cetate / Piața Unirii',
    shortLabel: 'Cetate / Unirii',
    lat: 45.7568,
    lng: 21.2286,
    zoom: 15.4,
  },
  'Piața Victoriei': {
    label: 'Piața Victoriei',
    shortLabel: 'Piața Victoriei',
    lat: 45.7537,
    lng: 21.2251,
    zoom: 15.8,
  },
  'Piața Libertății': {
    label: 'Piața Libertății',
    shortLabel: 'Piața Libertății',
    lat: 45.7559,
    lng: 21.2275,
    zoom: 16.0,
  },
  Bastion: {
    label: 'Bastionul Maria Theresia',
    shortLabel: 'Bastion',
    lat: 45.7568,
    lng: 21.2335,
    zoom: 15.8,
  },
  Iosefin: {
    label: 'Iosefin',
    shortLabel: 'Iosefin',
    lat: 45.7468,
    lng: 21.2132,
    zoom: 14.7,
  },
  Fabric: {
    label: 'Fabric',
    shortLabel: 'Fabric',
    lat: 45.7574,
    lng: 21.2485,
    zoom: 14.8,
  },
  'Complexul Studențesc': {
    label: 'Complexul Studențesc',
    shortLabel: 'Complex',
    lat: 45.7486,
    lng: 21.2402,
    zoom: 15.0,
  },
  Elisabetin: {
    label: 'Elisabetin',
    shortLabel: 'Elisabetin',
    lat: 45.7458,
    lng: 21.2268,
    zoom: 14.8,
  },
};

const PRIMARY_CAMERA_KEYS = [
  'ALL',
  'Cetate / Piața Unirii',
  'Iosefin',
  'Fabric',
] as const;

const SECONDARY_CAMERA_KEYS = [
  'Piața Victoriei',
  'Piața Libertății',
  'Bastion',
  'Complexul Studențesc',
  'Elisabetin',
] as const;

const TIMISOARA_COS_LAT = Math.cos((45.7525 * Math.PI) / 180);

function getScreenDeltaPx(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  zoom: number
): { dx: number; dy: number; dist: number } {
  const worldPx = 512 * Math.pow(2, zoom);
  const pxPerDegLng = worldPx / 360;
  const pxPerDegLat = pxPerDegLng / TIMISOARA_COS_LAT;
  const dx = (lng1 - lng2) * pxPerDegLng;
  const dy = (lat2 - lat1) * pxPerDegLat;
  return { dx, dy, dist: Math.hypot(dx, dy) };
}

function getTierStyles(tier: TrapTier, trapIndex: number) {
  if (tier === 'tourist-trap' && trapIndex >= 80) {
    return {
      label: 'Capcană',
      pinBg: '#B3261E',
      pinText: '#FFFFFF',
      border: '#B3261E',
      barColor: '#B3261E',
    };
  }
  if (tier === 'tourist-trap' || tier === 'mixed-fair') {
    return {
      label: trapIndex >= 60 ? 'Posibilă capcană' : 'Preț de centru',
      pinBg: '#E0A526',
      pinText: '#3A2418',
      border: '#3A2418',
      barColor: '#E0A526',
    };
  }
  return {
    label: 'Onest',
    pinBg: '#FFFFFF',
    pinText: '#3A2418',
    border: '#3A2418',
    barColor: '#3A2418',
  };
}

function createFallbackStyle(isDrink: boolean, darkMode: boolean): maplibreglType.StyleSpecification {
  return {
    version: 8,
    name: 'topfood-fallback',
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': darkMode ? (isDrink ? '#143025' : '#211f1d') : (isDrink ? '#f8f2e5' : '#F6F2EA'),
        },
      },
    ],
  };
}

export function MapView({
  darkMode = false,
  vertical = 'food',
  restaurants = INITIAL_RESTAURANTS,
  onSelectRestaurant,
  selectedRestaurant = null,
  selectedNeighborhood,
  onSelectNeighborhood,
  touristZones = TOURIST_ZONES,
  onResetFilters,
}: MapViewProps) {
  const isDrink = vertical === 'drink';
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(() => {
    if (selectedRestaurant) return selectedRestaurant.id;
    return restaurants[0]?.id ?? null;
  });

  const [hoveredRestaurantId, setHoveredRestaurantId] = useState<string | null>(null);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [showTouristRings, setShowTouristRings] = useState<boolean>(true);
  const [showNeighborhoodZones, setShowNeighborhoodZones] = useState<boolean>(true);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [selectedTastes, setSelectedTastes] = useState<MapTaste[]>([]);
  const [tierFilter, setTierFilter] = useState<TrapTier | 'all'>('all');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [sidebarQuery, setSidebarQuery] = useState<string>('');
  const [activeCam, setActiveCam] = useState<string>('ALL');
  const [mapZoom, setMapZoom] = useState<number>(NEIGHBORHOOD_CAMERAS.ALL.zoom);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: NEIGHBORHOOD_CAMERAS.ALL.lat,
    lng: NEIGHBORHOOD_CAMERAS.ALL.lng,
  });
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);
  const [sheetDragY, setSheetDragY] = useState<number>(0);
  const [isSheetDragging, setIsSheetDragging] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibreglType.Map | null>(null);
  const maplibreModuleRef = useRef<typeof maplibreglType | null>(null);
  const rawStyleRef = useRef<maplibreglType.StyleSpecification | null>(null);
  const venueMarkersRef = useRef<Map<string, maplibreglType.Marker>>(new Map());
  const zoneBadgeMarkersRef = useRef<maplibreglType.Marker[]>([]);
  const landmarkMarkersRef = useRef<maplibreglType.Marker[]>([]);
  const cameraRailRef = useRef<HTMLDivElement | null>(null);
  const sheetTouchStartYRef = useRef<number | null>(null);

  const updateRailFade = useCallback(() => {
    const el = cameraRailRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleViewportChange = () => {
      setIsMobileViewport(window.innerWidth < 768);
      updateRailFade();
    };
    handleViewportChange();
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
      setShowLandmarks(false);
    }
    window.addEventListener('resize', handleViewportChange);
    return () => window.removeEventListener('resize', handleViewportChange);
  }, [updateRailFade]);

  useEffect(() => {
    if (!sidebarOpen) {
      setSheetDragY(0);
      setIsSheetDragging(false);
      sheetTouchStartYRef.current = null;
    }
    updateRailFade();
  }, [sidebarOpen, updateRailFade]);

  const handleSheetTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) return;
      sheetTouchStartYRef.current = e.touches[0]?.clientY ?? null;
    },
    []
  );

  const handleSheetTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (sheetTouchStartYRef.current === null) return;
      const currentY = e.touches[0]?.clientY;
      if (currentY === undefined) return;
      const deltaY = currentY - sheetTouchStartYRef.current;
      if (deltaY > 8) {
        setIsSheetDragging(true);
        setSheetDragY(Math.min(deltaY, 320));
      } else if (deltaY <= 0) {
        setSheetDragY(0);
      }
    },
    []
  );

  const handleSheetTouchEnd = useCallback(() => {
    if (sheetTouchStartYRef.current === null) return;
    if (isSheetDragging && sheetDragY > 68) {
      setSidebarOpen(false);
    }
    sheetTouchStartYRef.current = null;
    setIsSheetDragging(false);
    setSheetDragY(0);
  }, [isSheetDragging, sheetDragY]);

  useEffect(() => {
    if (!activeZoneId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveZoneId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeZoneId]);

  const visibleRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      if (tierFilter !== 'all' && r.trapTier !== tierFilter) return false;
      if (!matchesMapTastes(r, selectedTastes)) return false;
      if (sidebarQuery.trim() !== '') {
        const q = sidebarQuery.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.cuisine.toLowerCase().includes(q) ||
          r.neighborhood.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [restaurants, tierFilter, sidebarQuery, selectedTastes]);

  useEffect(() => {
    if (visibleRestaurants.length === 0) {
      setActiveRestaurantId(null);
      return;
    }
    if (
      !activeRestaurantId ||
      !visibleRestaurants.some((r) => r.id === activeRestaurantId)
    ) {
      setActiveRestaurantId(visibleRestaurants[0].id);
    }
  }, [visibleRestaurants, activeRestaurantId]);

  const activeRestaurant = useMemo(
    () => visibleRestaurants.find((r) => r.id === activeRestaurantId) ?? null,
    [visibleRestaurants, activeRestaurantId]
  );

  const activeZone = useMemo(
    () => touristZones.find((z) => z.id === activeZoneId) ?? null,
    [touristZones, activeZoneId]
  );

  const tierCounts = useMemo(() => {
    let staple = 0;
    let mixed = 0;
    let trap = 0;
    for (const r of restaurants) {
      if (r.trapTier === 'local-staple') staple++;
      else if (r.trapTier === 'mixed-fair') mixed++;
      else trap++;
    }
    return { staple, mixed, trap, total: restaurants.length };
  }, [restaurants]);

  const flyToCamera = useCallback(
    (camKey: string) => {
      const cam = NEIGHBORHOOD_CAMERAS[camKey] ?? NEIGHBORHOOD_CAMERAS.ALL;
      const isSmallScreen =
        typeof window !== 'undefined' && window.innerWidth < 768;
      setActiveCam(camKey);
      mapRef.current?.flyTo({
        center: [cam.lng, cam.lat],
        zoom: camKey === 'ALL' && isSmallScreen ? 13.1 : cam.zoom,
        padding: isSmallScreen
          ? { top: 48, bottom: 16, left: 8, right: 8 }
          : { top: 0, bottom: 0, left: 0, right: 0 },
        duration: 750,
        essential: true,
      });
      if (onSelectNeighborhood) {
        onSelectNeighborhood(camKey === 'ALL' ? 'all' : camKey);
      }
    },
    [onSelectNeighborhood]
  );

  const flyToRestaurant = useCallback(
    (restaurant: Restaurant, targetZoom?: number) => {
      setActiveRestaurantId(restaurant.id);
      const currentZoom = mapRef.current?.getZoom() ?? 13.5;
      mapRef.current?.flyTo({
        center: [restaurant.coordinates.lng, restaurant.coordinates.lat],
        zoom: targetZoom ?? Math.max(currentZoom, 15.2),
        duration: 650,
        essential: true,
      });
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedRestaurant) return;
    setActiveRestaurantId(selectedRestaurant.id);
    if (mapReady) {
      mapRef.current?.flyTo({
        center: [selectedRestaurant.coordinates.lng, selectedRestaurant.coordinates.lat],
        zoom: 15.6,
        duration: 650,
        essential: true,
      });
    }
  }, [selectedRestaurant, mapReady]);

  useEffect(() => {
    if (!selectedNeighborhood || !mapReady) return;
    const isSmallScreen =
      typeof window !== 'undefined' && window.innerWidth < 768;
    if (selectedNeighborhood === 'All' || selectedNeighborhood === 'all') {
      const cam = NEIGHBORHOOD_CAMERAS.ALL;
      setActiveCam('ALL');
      mapRef.current?.flyTo({
        center: [cam.lng, cam.lat],
        zoom: isSmallScreen ? 13.1 : cam.zoom,
        padding: isSmallScreen
          ? { top: 48, bottom: 16, left: 8, right: 8 }
          : { top: 0, bottom: 0, left: 0, right: 0 },
        duration: 700,
      });
      return;
    }
    const cam = NEIGHBORHOOD_CAMERAS[selectedNeighborhood];
    if (cam) {
      setActiveCam(selectedNeighborhood);
      mapRef.current?.flyTo({
        center: [cam.lng, cam.lat],
        zoom: cam.zoom,
        duration: 700,
      });
    }
  }, [selectedNeighborhood, mapReady]);

  // Helper to ensure our real zone GeoJSON layers exist on the active MapLibre style
  const syncCustomGeoLayers = useCallback(
    (map: maplibreglType.Map) => {
      const neighborhoodsData = buildNeighborhoodsGeoJSON(activeCam);
      const neighborhoodLabelsData = buildNeighborhoodLabelsGeoJSON();
      const touristData = buildTouristZonesGeoJSON(touristZones, activeZoneId);

      // 1. Neighborhood Zones (Real Timișoara boundaries)
      const nbSource = map.getSource('topfood-neighborhoods') as
        | maplibreglType.GeoJSONSource
        | undefined;
      if (nbSource) {
        nbSource.setData(neighborhoodsData);
      } else {
        map.addSource('topfood-neighborhoods', {
          type: 'geojson',
          data: neighborhoodsData,
        });
        map.addLayer({
          id: 'topfood-neighborhoods-fill',
          type: 'fill',
          source: 'topfood-neighborhoods',
          layout: {
            visibility: showNeighborhoodZones ? 'visible' : 'none',
          },
          paint: {
            'fill-color': [
              'case',
              ['boolean', ['get', 'isActive'], false],
              isDrink ? '#F2A33A' : '#B3261E',
              isDrink ? '#2D5947' : '#3A2418',
            ],
            'fill-opacity': [
              'case',
              ['boolean', ['get', 'isActive'], false],
              isDrink ? 0.14 : 0.08,
              isDrink ? 0.06 : 0.03,
            ],
          },
        });
        map.addLayer({
          id: 'topfood-neighborhoods-line',
          type: 'line',
          source: 'topfood-neighborhoods',
          layout: {
            visibility: showNeighborhoodZones ? 'visible' : 'none',
          },
          paint: {
            'line-color': [
              'case',
              ['boolean', ['get', 'isActive'], false],
              isDrink ? '#F2A33A' : '#B3261E',
              isDrink ? '#4C826C' : '#8A7362',
            ],
            'line-width': [
              'case',
              ['boolean', ['get', 'isActive'], false],
              2.2,
              1.2,
            ],
            'line-dasharray': [4, 3],
            'line-opacity': 0.85,
          },
        });
      }

      const nbLabelSource = map.getSource('topfood-neighborhood-labels') as
        | maplibreglType.GeoJSONSource
        | undefined;
      if (!nbLabelSource) {
        map.addSource('topfood-neighborhood-labels', {
          type: 'geojson',
          data: neighborhoodLabelsData,
        });
        map.addLayer({
          id: 'topfood-neighborhood-labels-layer',
          type: 'symbol',
          source: 'topfood-neighborhood-labels',
          layout: {
            visibility: showNeighborhoodZones ? 'visible' : 'none',
            'text-field': ['get', 'name'],
            'text-size': 13,
            'text-letter-spacing': 0.04,
            'text-allow-overlap': true,
          },
          paint: {
            'text-color': darkMode ? '#f7f1e8' : (isDrink ? '#263e31' : '#3A2418'),
            'text-opacity': isDrink ? 0.45 : 0.55,
            'text-halo-color': darkMode ? (isDrink ? '#143025' : '#211f1d') : (isDrink ? '#f8f2e5' : '#F6F2EA'),
            'text-halo-width': 2,
          },
        });
      }

      // 2. Tourist Zones (True 300m Geodesic Circles)
      const tzSource = map.getSource('topfood-tourist-zones') as
        | maplibreglType.GeoJSONSource
        | undefined;
      if (tzSource) {
        tzSource.setData(touristData);
      } else {
        map.addSource('topfood-tourist-zones', {
          type: 'geojson',
          data: touristData,
        });
        map.addLayer({
          id: 'topfood-tourist-zones-fill',
          type: 'fill',
          source: 'topfood-tourist-zones',
          layout: {
            visibility: showTouristRings ? 'visible' : 'none',
          },
          paint: {
            'fill-color': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              '#E0A526',
              '#B3261E',
            ],
            'fill-opacity': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              0.18,
              0.08,
            ],
          },
        });
        map.addLayer({
          id: 'topfood-tourist-zones-line',
          type: 'line',
          source: 'topfood-tourist-zones',
          layout: {
            visibility: showTouristRings ? 'visible' : 'none',
          },
          paint: {
            'line-color': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              '#B3261E',
              '#E0A526',
            ],
            'line-width': 2,
            'line-dasharray': [4, 3],
          },
        });
      }
    },
    [activeCam, activeZoneId, isDrink, darkMode, showNeighborhoodZones, showTouristRings, touristZones]
  );

  // Initialize MapLibre GL JS instance once
  useEffect(() => {
    let cancelled = false;
    const container = mapContainerRef.current;
    if (!container) return;

    async function initMap() {
      const maplibregl = await import('maplibre-gl');
      if (cancelled || !container) return;
      maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
      maplibreModuleRef.current = maplibregl;

      let baseStyle: maplibreglType.StyleSpecification;
      try {
        const res = await fetch(OPENFREEMAP_POSITRON_URL);
        if (!res.ok) throw new Error('Style fetch failed');
        baseStyle = (await res.json()) as maplibreglType.StyleSpecification;
        rawStyleRef.current = baseStyle;
      } catch {
        baseStyle = createFallbackStyle(isDrink, darkMode);
      }

      if (cancelled) return;

      const skinnedStyle = rawStyleRef.current
        ? applyTopFoodMapSkin(rawStyleRef.current, isDrink, darkMode)
        : baseStyle;

      const isSmallScreen =
        typeof window !== 'undefined' && window.innerWidth < 768;

      const map = new maplibregl.Map({
        container,
        style: skinnedStyle,
        center: [NEIGHBORHOOD_CAMERAS.ALL.lng, NEIGHBORHOOD_CAMERAS.ALL.lat],
        zoom: isSmallScreen ? 13.1 : NEIGHBORHOOD_CAMERAS.ALL.zoom,
        minZoom: 12,
        maxZoom: 18.5,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on('load', () => {
        if (cancelled) return;
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          map.setPadding({ top: 48, bottom: 16, left: 8, right: 8 });
        }
        map.resize();
        setMapZoom(map.getZoom());
        syncCustomGeoLayers(map);
        setMapReady(true);
      });

      map.on('styledata', () => {
        if (cancelled || !map.isStyleLoaded()) return;
        syncCustomGeoLayers(map);
      });

      map.on('move', () => {
        const c = map.getCenter();
        setMapCenter({ lat: c.lat, lng: c.lng });
        setMapZoom(map.getZoom());
      });

      map.on('click', 'topfood-tourist-zones-fill', (e: maplibreglType.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        const zoneId = feature?.properties?.id as string | undefined;
        if (zoneId) {
          setActiveZoneId((prev) => (prev === zoneId ? null : zoneId));
        }
      });

      map.on('click', 'topfood-neighborhoods-fill', (e: maplibreglType.MapLayerMouseEvent) => {
        // Only trigger neighborhood focus if click wasn't inside a tourist zone
        const tzHits = map.queryRenderedFeatures(e.point, {
          layers: ['topfood-tourist-zones-fill'],
        });
        if (tzHits.length > 0) return;
        const feature = e.features?.[0];
        const camKey = feature?.properties?.cameraKey as string | undefined;
        if (camKey) {
          flyToCamera(camKey);
        }
      });

      map.on('mouseenter', 'topfood-tourist-zones-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'topfood-tourist-zones-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    }

    initMap();

    return () => {
      cancelled = true;
      venueMarkersRef.current.forEach((m) => m.remove());
      venueMarkersRef.current.clear();
      zoneBadgeMarkersRef.current.forEach((m) => m.remove());
      zoneBadgeMarkersRef.current = [];
      landmarkMarkersRef.current.forEach((m) => m.remove());
      landmarkMarkersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-apply TOP FOOD / TOP DRINK skin when vertical changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const nextStyle = rawStyleRef.current
      ? applyTopFoodMapSkin(rawStyleRef.current, isDrink, darkMode)
      : createFallbackStyle(isDrink, darkMode);
    map.setStyle(nextStyle);
    map.once('style.load', () => {
      syncCustomGeoLayers(map);
    });
  }, [isDrink, darkMode, mapReady, syncCustomGeoLayers]);

  // Sync GeoJSON data & visibility when filters/selections change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    syncCustomGeoLayers(map);

    if (map.getLayer('topfood-tourist-zones-fill')) {
      map.setLayoutProperty(
        'topfood-tourist-zones-fill',
        'visibility',
        showTouristRings ? 'visible' : 'none'
      );
      map.setLayoutProperty(
        'topfood-tourist-zones-line',
        'visibility',
        showTouristRings ? 'visible' : 'none'
      );
    }

    if (map.getLayer('topfood-neighborhoods-fill')) {
      map.setLayoutProperty(
        'topfood-neighborhoods-fill',
        'visibility',
        showNeighborhoodZones ? 'visible' : 'none'
      );
      map.setLayoutProperty(
        'topfood-neighborhoods-line',
        'visibility',
        showNeighborhoodZones ? 'visible' : 'none'
      );
    }
    if (map.getLayer('topfood-neighborhood-labels-layer')) {
      map.setLayoutProperty(
        'topfood-neighborhood-labels-layer',
        'visibility',
        showNeighborhoodZones ? 'visible' : 'none'
      );
    }
  }, [
    mapReady,
    showTouristRings,
    showNeighborhoodZones,
    activeCam,
    activeZoneId,
    syncCustomGeoLayers,
  ]);

  // Resize MapLibre when sidebar opens/closes or viewport resizes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handleResize = () => {
      map.resize();
    };
    const timer = setTimeout(handleResize, 60);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [sidebarOpen]);

  // Sync Tourist Zone Badge Markers (300m pills)
  const isZoomedOut = mapZoom < 14.8;
  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreModuleRef.current;
    if (!map || !maplibregl || !mapReady) return;

    zoneBadgeMarkersRef.current.forEach((m) => m.remove());
    zoneBadgeMarkersRef.current = [];

    if (!showTouristRings) return;

    // At city-wide zoom (< 14.8), show only the active zone badge (or Piața Unirii)
    // so the 4 overlapping central 300m badges do not collide with pins or each other.
    const zonesToRender = isZoomedOut
      ? touristZones.filter((z) =>
          activeZoneId
            ? z.id === activeZoneId
            : z.id === 'piata-unirii' || z === touristZones[0]
        )
      : touristZones;

    for (const zone of zonesToRender) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'group min-w-[44px] min-h-[44px] inline-flex items-center justify-center bg-transparent cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F2A33A]';
      btn.setAttribute(
        'aria-label',
        `Zonă turistică ${zone.name}, rază ${zone.radiusM} metri`
      );

      const pill = document.createElement('span');
      pill.className = `px-2 py-1 rounded-[3px] text-[11px] leading-none font-bold shadow-sm border whitespace-nowrap transition-transform group-hover:scale-105 ${
        activeZoneId === zone.id
          ? 'bg-[#B3261E] text-white border-[#3A2418]'
          : 'bg-[#E0A526] text-[#3A2418] border-[#3A2418]'
      }`;
      pill.textContent = `${zone.shortName} · ${zone.radiusM} m`;
      btn.appendChild(pill);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setActiveZoneId((prev) => (prev === zone.id ? null : zone.id));
      });

      // North edge of 300m circle (~0.0027 deg latitude north)
      const northLat = zone.center.lat + zone.radiusM / 111320;
      const marker = new maplibregl.Marker({ element: btn, anchor: 'center' })
        .setLngLat([zone.center.lng, northLat])
        .addTo(map);
      zoneBadgeMarkersRef.current.push(marker);
    }
  }, [mapReady, showTouristRings, touristZones, activeZoneId, isZoomedOut]);

  // Sync Editorial Landmark Markers
  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreModuleRef.current;
    if (!map || !maplibregl || !mapReady) return;

    landmarkMarkersRef.current.forEach((m) => m.remove());
    landmarkMarkersRef.current = [];

    if (!showLandmarks) return;

    for (const lm of TIMISOARA_LANDMARKS) {
      const el = document.createElement('div');
      el.className = 'pointer-events-none flex flex-col items-center';
      el.innerHTML = `
        <span class="w-2 h-2 rounded-full border ${
          isDrink
            ? 'bg-[#F4EEE2] border-[#17382C]'
            : 'bg-white border-[#6E5649]'
        }"></span>
        <span class="mt-0.5 px-1.5 py-0.5 rounded-[2px] text-[11px] leading-tight font-semibold whitespace-nowrap ${
          isDrink
            ? 'bg-[#143025]/90 text-[#F4EEE2]'
            : 'bg-[#F6F2EA]/95 text-[#3A2418]'
        }">${lm.name}</span>
      `;

      const marker = new maplibregl.Marker({ element: el, anchor: 'top' })
        .setLngLat([lm.lng, lm.lat])
        .addTo(map);
      landmarkMarkersRef.current.push(marker);
    }
  }, [mapReady, showLandmarks, isDrink]);

  // Sync Venue Pins (TOP FOOD / TOP DRINK skinned markers with clustering & spreading)
  const layoutZoom = isZoomedOut
    ? Math.min(14.5, Math.floor(mapZoom * 2) / 2)
    : mapZoom < 16.4
    ? 15.5
    : 17.0;
  const showAllLabels = isMobileViewport ? mapZoom >= 15.4 : mapZoom >= 14.9;

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreModuleRef.current;
    if (!map || !maplibregl || !mapReady) return;

    venueMarkersRef.current.forEach((m) => m.remove());
    venueMarkersRef.current.clear();

    const CLUSTER_RADIUS_PX = 48;
    const SPREAD_MIN_DIST_PX = 56;

    type ClusterGroup = {
      items: Restaurant[];
      lat: number;
      lng: number;
    };

    const clusters: ClusterGroup[] = [];
    const singleOffsets = new Map<string, [number, number]>();

    if (isZoomedOut) {
      const visited = new Set<string>();
      for (let i = 0; i < visibleRestaurants.length; i++) {
        const seed = visibleRestaurants[i];
        if (visited.has(seed.id)) continue;
        visited.add(seed.id);
        const group: Restaurant[] = [seed];

        for (let j = i + 1; j < visibleRestaurants.length; j++) {
          const candidate = visibleRestaurants[j];
          if (visited.has(candidate.id)) continue;
          const { dist } = getScreenDeltaPx(
            seed.coordinates.lat,
            seed.coordinates.lng,
            candidate.coordinates.lat,
            candidate.coordinates.lng,
            layoutZoom
          );
          if (dist <= CLUSTER_RADIUS_PX) {
            visited.add(candidate.id);
            group.push(candidate);
          }
        }

        const avgLat =
          group.reduce((sum, r) => sum + r.coordinates.lat, 0) / group.length;
        const avgLng =
          group.reduce((sum, r) => sum + r.coordinates.lng, 0) / group.length;
        clusters.push({ items: group, lat: avgLat, lng: avgLng });
      }
    } else {
      // Unclustered zoom (>= 14.8): apply subtle screen-aware spreading when pins sit < 56px apart
      for (const r of visibleRestaurants) {
        singleOffsets.set(r.id, [0, 0]);
        clusters.push({
          items: [r],
          lat: r.coordinates.lat,
          lng: r.coordinates.lng,
        });
      }

      for (let i = 0; i < visibleRestaurants.length; i++) {
        for (let j = i + 1; j < visibleRestaurants.length; j++) {
          const a = visibleRestaurants[i];
          const b = visibleRestaurants[j];
          const { dx, dy, dist } = getScreenDeltaPx(
            a.coordinates.lat,
            a.coordinates.lng,
            b.coordinates.lat,
            b.coordinates.lng,
            layoutZoom
          );
          if (dist < SPREAD_MIN_DIST_PX) {
            const push = (SPREAD_MIN_DIST_PX - dist) / 2;
            const ux = dist > 1 ? dx / dist : 1;
            const uy = dist > 1 ? dy / dist : 0.4;
            const offA = singleOffsets.get(a.id) ?? [0, 0];
            const offB = singleOffsets.get(b.id) ?? [0, 0];
            singleOffsets.set(a.id, [
              Math.round(offA[0] + ux * push),
              Math.round(offA[1] + uy * push),
            ]);
            singleOffsets.set(b.id, [
              Math.round(offB[0] - ux * push),
              Math.round(offB[1] - uy * push),
            ]);
          }
        }
      }
    }

    // Track screen coordinates of rendered items for passive label collision restraint
    const pinPositions = clusters.map((c) => {
      const off =
        c.items.length === 1 ? singleOffsets.get(c.items[0].id) ?? [0, 0] : [0, 0];
      return {
        id: c.items[0].id,
        lat: c.lat,
        lng: c.lng,
        ox: off[0],
        oy: off[1],
      };
    });

    for (const group of clusters) {
      if (group.items.length > 1) {
        const hasActive = group.items.some((r) => r.id === activeRestaurantId);
        const hasSevereTrap = group.items.some((r) => r.touristTrapIndex >= 80);
        const hasPossibleTrap = group.items.some((r) => r.touristTrapIndex >= 60);

        const wrapper = document.createElement('div');
        wrapper.className = 'relative flex flex-col items-center';
        wrapper.style.zIndex = hasActive ? '30' : '15';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute(
          'aria-label',
          `${group.items.length} localuri în această zonă: ${group.items
            .map((r) => r.name)
            .join(', ')}. Apasă pentru a mări.`
        );
        btn.className =
          'group min-w-[44px] min-h-[44px] inline-flex items-end justify-center pb-1 bg-transparent cursor-pointer transition-transform duration-150 hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F2A33A]';

        const bg = hasActive
          ? isDrink
            ? '#F2A33A'
            : '#3A2418'
          : hasSevereTrap
          ? '#B3261E'
          : hasPossibleTrap
          ? '#E0A526'
          : isDrink
          ? '#F4EEE2'
          : '#FFFFFF';
        const fg = hasActive
          ? isDrink
            ? '#17382C'
            : '#FFFFFF'
          : hasSevereTrap
          ? '#FFFFFF'
          : isDrink && !hasPossibleTrap
          ? '#17382C'
          : '#3A2418';
        const border = hasActive
          ? isDrink
            ? '#17382C'
            : '#FFFFFF'
          : hasSevereTrap
          ? '#3A2418'
          : isDrink && !hasPossibleTrap
          ? '#B98A5E'
          : '#3A2418';

        const trapMark =
          hasSevereTrap || hasPossibleTrap
            ? `<span class="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] font-extrabold leading-none ml-1" style="clip-path: polygon(50% 0%, 0% 100%, 100% 100%); background:${
                hasSevereTrap ? '#FFFFFF' : '#3A2418'
              }; color:${hasSevereTrap ? '#B3261E' : '#E0A526'}; padding-top:2px;">!</span>`
            : '';

        btn.innerHTML = `
          <div class="px-2.5 py-1.5 rounded-full shadow-md flex items-center font-display text-[14px] leading-none tabular-nums"
            style="background:${bg}; color:${fg}; border: 2px solid ${border};">
            <span>${group.items.length} loc.</span>
            ${trapMark}
          </div>
        `;

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          map.flyTo({
            center: [group.lng, group.lat],
            zoom: 15.8,
            duration: 600,
            essential: true,
          });
        });

        wrapper.appendChild(btn);

        const marker = new maplibregl.Marker({
          element: wrapper,
          anchor: 'bottom',
        })
          .setLngLat([group.lng, group.lat])
          .addTo(map);

        venueMarkersRef.current.set(`cluster-${group.items[0].id}`, marker);
        continue;
      }

      const restaurant = group.items[0];
      const isSelected = restaurant.id === activeRestaurantId;
      const isHovered = restaurant.id === hoveredRestaurantId;
      const tierStyle = getTierStyles(
        restaurant.trapTier,
        restaurant.touristTrapIndex
      );
      const isTrap = restaurant.touristTrapIndex >= 60;
      const isSevereTrap = restaurant.touristTrapIndex >= 80;
      const offset = singleOffsets.get(restaurant.id) ?? [0, 0];

      const wrapper = document.createElement('div');
      wrapper.className = 'relative flex flex-col items-center';
      wrapper.style.zIndex = isSelected ? '30' : isHovered ? '20' : '10';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute(
        'aria-label',
        `${restaurant.name}, ${restaurant.shortNeighborhood ?? restaurant.neighborhood}, ${honestSpoken(restaurant.foodQualityScore)}${isTrap ? `, ${tierStyle.label}` : ''}`
      );
      btn.setAttribute('aria-pressed', String(isSelected));
      btn.className = `group relative min-w-[44px] min-h-[44px] inline-flex items-end justify-center pb-1 bg-transparent cursor-pointer transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#F2A33A] ${
        isSelected ? 'scale-110' : isHovered ? 'scale-105' : 'hover:scale-105'
      }`;

      if (isDrink && !isTrap) {
        // Suport de bere circular coaster pin on topdrink
        btn.innerHTML = `
          <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-md font-display text-[15px] leading-none tabular-nums"
            style="background:#F4EEE2; color:#17382C; border: ${isSelected ? '3px solid #F2A33A' : '2.5px solid #B98A5E'};">
            ${formatHonest(restaurant.foodQualityScore)}
          </div>
        `;
      } else {
        const bg = isSelected ? '#3A2418' : tierStyle.pinBg;
        const fg = isSelected ? '#FFFFFF' : tierStyle.pinText;
        const border = isSelected ? '#FFFFFF' : tierStyle.border;
        const trapTri = isTrap
          ? `<span class="inline-flex items-center justify-center w-3.5 h-3.5 text-[9px] font-extrabold leading-none ml-1" style="clip-path: polygon(50% 0%, 0% 100%, 100% 100%); background:${
              isSevereTrap ? '#FFFFFF' : '#3A2418'
            }; color:${isSevereTrap ? '#B3261E' : '#E0A526'}; padding-top:2px;">!</span>`
          : '';

        btn.innerHTML = `
          <div class="relative flex flex-col items-center drop-shadow-md">
            <div class="px-2 py-1 rounded-[5px] flex items-center font-display text-[15px] leading-none tabular-nums"
              style="background:${bg}; color:${fg}; border: 1.8px solid ${border};">
              <span>${formatHonest(restaurant.foodQualityScore)}</span>
              ${trapTri}
            </div>
            <div class="w-2.5 h-2.5 rotate-45 -mt-1.5"
              style="background:${bg}; border-right: 1.8px solid ${border}; border-bottom: 1.8px solid ${border};"></div>
          </div>
        `;
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setActiveRestaurantId(restaurant.id);
      });
      btn.addEventListener('mouseenter', () => {
        setHoveredRestaurantId(restaurant.id);
      });
      btn.addEventListener('mouseleave', () => {
        setHoveredRestaurantId(null);
      });

      wrapper.appendChild(btn);

      // Show label for selected/hovered pin always; for passive pins at zoom >= threshold
      // restrain label length and skip if it would collide with a pin right below it.
      let shouldRenderLabel = isSelected || isHovered;
      if (!shouldRenderLabel && showAllLabels) {
        const collidesWithPinBelow = pinPositions.some((other) => {
          if (other.id === restaurant.id) return false;
          const { dx, dy } = getScreenDeltaPx(
            other.lat,
            other.lng,
            restaurant.coordinates.lat,
            restaurant.coordinates.lng,
            layoutZoom
          );
          const effDx = dx + (other.ox - offset[0]);
          const effDy = dy + (other.oy - offset[1]);
          return Math.abs(effDx) < 86 && effDy > -10 && effDy < 44;
        });
        shouldRenderLabel = !collidesWithPinBelow;
      }

      if (shouldRenderLabel) {
        const maxLen = isSelected || isHovered ? 22 : 16;
        const label = document.createElement('div');
        label.className = `pointer-events-none -mt-0.5 px-1.5 py-0.5 rounded-[3px] text-[11px] leading-tight font-semibold border whitespace-nowrap shadow-sm ${
          isSelected
            ? 'bg-[#3A2418] text-white border-[#3A2418]'
            : isDrink
            ? 'bg-[#143025] text-[#F4EEE2] border-[#2D5947]'
            : 'bg-white text-[#3A2418] border-[#D6CFC5]'
        }`;
        label.textContent =
          restaurant.name.length > maxLen
            ? `${restaurant.name.slice(0, maxLen - 2)}…`
            : restaurant.name;
        wrapper.appendChild(label);
      }

      const marker = new maplibregl.Marker({
        element: wrapper,
        anchor: 'bottom',
        offset,
      })
        .setLngLat([restaurant.coordinates.lng, restaurant.coordinates.lat])
        .addTo(map);

      venueMarkersRef.current.set(restaurant.id, marker);
    }
  }, [
    mapReady,
    visibleRestaurants,
    activeRestaurantId,
    hoveredRestaurantId,
    isDrink,
    isZoomedOut,
    layoutZoom,
    showAllLabels,
  ]);

  const handleNextRestaurant = () => {
    if (visibleRestaurants.length === 0) return;
    const idx = visibleRestaurants.findIndex((r) => r.id === activeRestaurantId);
    const next = visibleRestaurants[(idx + 1) % visibleRestaurants.length];
    flyToRestaurant(next);
  };

  const handlePrevRestaurant = () => {
    if (visibleRestaurants.length === 0) return;
    const idx = visibleRestaurants.findIndex((r) => r.id === activeRestaurantId);
    const prev =
      visibleRestaurants[
        (idx - 1 + visibleRestaurants.length) % visibleRestaurants.length
      ];
    flyToRestaurant(prev);
  };

  return (
    <section
      aria-label="Harta Timișoara"
      className={`relative w-full select-none overflow-hidden flex flex-col min-h-[440px] max-h-[920px] ${
        isDrink
          ? 'h-[calc(100dvh-7rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-[calc(100dvh-4rem)] bg-[#17382C] text-[#F4EEE2]'
          : 'h-[calc(100dvh-7.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] md:h-[calc(100dvh-4.5rem)] bg-white text-[#3A2418]'
      }`}
    >
      {/* Top Map Control Bar */}
      <div
        className={`relative z-30 shrink-0 border-b ${
          isDrink ? 'bg-[#17382C] border-[#285443]' : 'bg-white border-[#E6DFD5]'
        }`}
      >
        <div
          ref={cameraRailRef}
          onScroll={updateRailFade}
          className="px-3 pr-9 md:px-6 py-1.5 md:py-2 flex items-center justify-between gap-1.5 sm:gap-3 overflow-x-auto md:overflow-visible no-scrollbar"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 min-h-[44px] md:min-h-[34px] py-1.5 rounded-[4px] text-[12px] font-semibold border transition-colors shrink-0 ${
                isDrink
                  ? 'border-[#2D5947] bg-[#143025] text-[#F4EEE2] hover:border-[#F2A33A]'
                  : 'border-[#D6CFC5] bg-[#FAF8F5] text-[#3A2418] hover:border-[#3A2418]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{sidebarOpen ? 'Ascunde lista' : 'Listă și filtre'}</span>
              <span className="opacity-75 tabular-nums">({visibleRestaurants.length})</span>
            </button>

            <div
              className={`h-4 w-px shrink-0 ${
                isDrink ? 'bg-[#285443]' : 'bg-[#E6DFD5]'
              }`}
            />

            {PRIMARY_CAMERA_KEYS.map((key) => {
              const cam = NEIGHBORHOOD_CAMERAS[key];
              const isCurrent = activeCam === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => flyToCamera(key)}
                  className={`px-2.5 min-h-[44px] md:min-h-[32px] py-1 rounded-[4px] text-[12px] font-semibold border transition-colors shrink-0 ${
                    isCurrent
                      ? isDrink
                        ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                        : 'bg-[#3A2418] text-white border-[#3A2418]'
                      : isDrink
                      ? 'bg-[#17382C] text-[#F4EEE2]/85 border-[#285443] hover:border-[#F2A33A]/50'
                      : 'bg-white text-[#6E5649] border-[#E6DFD5] hover:text-[#3A2418]'
                  }`}
                >
                  {cam.shortLabel}
                </button>
              );
            })}

            <select
              aria-label="Mai multe zone"
              value={
                SECONDARY_CAMERA_KEYS.includes(
                  activeCam as (typeof SECONDARY_CAMERA_KEYS)[number]
                )
                  ? activeCam
                  : ''
              }
              onChange={(e) => {
                if (e.target.value) flyToCamera(e.target.value);
              }}
              className={`px-2.5 min-h-[44px] md:min-h-[32px] py-1 rounded-[4px] text-[16px] md:text-[12px] font-semibold border transition-colors shrink-0 ${
                SECONDARY_CAMERA_KEYS.includes(
                  activeCam as (typeof SECONDARY_CAMERA_KEYS)[number]
                )
                  ? isDrink
                    ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                    : 'bg-[#3A2418] text-white border-[#3A2418]'
                  : isDrink
                  ? 'bg-[#143025] text-[#F4EEE2]/85 border-[#285443] hover:border-[#F2A33A]/50'
                  : 'bg-white text-[#6E5649] border-[#E6DFD5] hover:text-[#3A2418]'
              }`}
            >
              <option
                value=""
                disabled
                className={
                  isDrink
                    ? 'bg-[#143025] text-[#F4EEE2]'
                    : 'bg-white text-[#3A2418]'
                }
              >
                Mai multe zone…
              </option>
              {SECONDARY_CAMERA_KEYS.map((key) => (
                <option
                  key={key}
                  value={key}
                  className={
                    isDrink
                      ? 'bg-[#143025] text-[#F4EEE2]'
                      : 'bg-white text-[#3A2418]'
                  }
                >
                  {NEIGHBORHOOD_CAMERAS[key].shortLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowTouristRings((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 min-h-[44px] md:min-h-[34px] py-1.5 rounded-[4px] text-[12px] font-semibold border transition-colors whitespace-nowrap ${
                showTouristRings
                  ? 'bg-[#E0A526] text-[#3A2418] border-[#E0A526]'
                  : isDrink
                  ? 'bg-[#17382C] text-[#F4EEE2]/85 border-[#285443]'
                  : 'bg-white text-[#6E5649] border-[#E6DFD5]'
              }`}
            >
              {showTouristRings ? (
                <Eye className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="sm:hidden">Zone 300 m</span>
              <span className="hidden sm:inline">Zone turistice (300 m)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowNeighborhoodZones((v) => !v)}
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 min-h-[34px] py-1.5 rounded-[4px] text-[12px] font-semibold border transition-colors ${
                showNeighborhoodZones
                  ? isDrink
                    ? 'bg-[#1E4335] text-[#F4EEE2] border-[#336652]'
                    : 'bg-[#FAF8F5] text-[#3A2418] border-[#3A2418]'
                  : isDrink
                  ? 'border-[#285443] text-[#F4EEE2]/70'
                  : 'border-[#E6DFD5] text-[#6E5649]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cartiere</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLandmarks((v) => !v)}
              className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 min-h-[34px] py-1.5 rounded-[4px] text-[12px] font-semibold border transition-colors ${
                showLandmarks
                  ? isDrink
                    ? 'border-[#336652] bg-[#1E4335] text-[#F4EEE2]'
                    : 'border-[#3A2418] bg-[#FAF8F5] text-[#3A2418]'
                  : isDrink
                  ? 'border-[#285443] text-[#F4EEE2]/70'
                  : 'border-[#E6DFD5] text-[#6E5649] hover:text-[#3A2418]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Repere</span>
            </button>
          </div>
        </div>

        {/* Right-edge horizontal scroll fade affordance on mobile */}
        <div
          aria-hidden="true"
          className={`pointer-events-none md:hidden absolute inset-y-0 right-0 w-9 transition-opacity duration-150 ${
            isDrink ? 'bg-[#17382C]' : 'bg-white'
          } ${canScrollRight ? 'opacity-100' : 'opacity-0'}`}
          style={{
            maskImage: 'linear-gradient(to left, black 28%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to left, black 28%, transparent 100%)',
          }}
        />
      </div>

      {/* Main Split Workspace */}
      <div className="relative flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Mobile Backdrop for Bottom Sheet */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Închide lista de localuri"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden absolute inset-0 z-30 bg-black/35"
          />
        )}

        {/* LEFT PANEL (Desktop Sidebar / Mobile Bottom Sheet) */}
        {sidebarOpen && (
          <aside
            style={
              isMobileViewport && sheetDragY > 0
                ? { transform: `translateY(${sheetDragY}px)` }
                : undefined
            }
            className={`absolute inset-x-0 bottom-0 h-[82%] max-h-[600px] rounded-t-[12px] border-t z-40 shadow-2xl md:static md:inset-auto md:w-80 lg:w-96 md:h-full md:max-h-none md:rounded-none md:border-t-0 md:border-r md:shadow-none shrink-0 flex flex-col overflow-hidden ${
              isSheetDragging ? '' : 'transition-transform duration-200 ease-out'
            } ${
              isDrink
                ? 'bg-[#17382C] border-[#2D5947]'
                : 'bg-white border-[#E6DFD5]'
            }`}
          >
            <div
              onTouchStart={handleSheetTouchStart}
              onTouchMove={handleSheetTouchMove}
              onTouchEnd={handleSheetTouchEnd}
              onTouchCancel={handleSheetTouchEnd}
              className="shrink-0 max-h-[65%] overflow-y-auto"
            >
              <div className="md:hidden flex justify-center pt-1.5 pb-0.5 touch-none cursor-grab">
                <span className="w-10 h-1 rounded-full bg-current opacity-25" />
              </div>

              <div
                className={`px-3 pt-1 pb-2 md:px-4 md:py-3 border-b space-y-1.5 md:space-y-2.5 ${
                  isDrink
                    ? 'border-[#285443]'
                    : 'border-[#E6DFD5] bg-[#FAF8F5]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 min-h-[44px] md:min-h-0">
                  <span className="text-[12px] font-bold leading-tight">
                    Filtrează după risc de capcană
                  </span>
                  <div className="flex items-center gap-1.5">
                    {tierFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setTierFilter('all')}
                        className={`text-[12px] font-semibold underline min-h-[44px] md:min-h-[36px] px-1 inline-flex items-center ${
                          isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                        }`}
                      >
                        Toate ({tierCounts.total})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(false)}
                      aria-label="Închide lista și filtrele"
                      className="md:hidden w-11 h-11 -mr-2 flex items-center justify-center rounded-[4px] opacity-85 hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      {
                        id: 'local-staple' as const,
                        label: 'Onest',
                        count: tierCounts.staple,
                        range: '0–25%',
                        dotClass: null,
                        activeClass: isDrink
                          ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                          : 'bg-[#3A2418] text-white border-[#3A2418]',
                        idleClass: isDrink
                          ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]'
                          : 'bg-white border-[#D6CFC5] text-[#3A2418]',
                      },
                      {
                        id: 'mixed-fair' as const,
                        label: 'Mixt',
                        count: tierCounts.mixed,
                        range: '26–60%',
                        dotClass: 'bg-[#E0A526]',
                        activeClass: isDrink
                          ? 'bg-[#E0A526] text-[#17382C] border-[#F4EEE2]'
                          : 'bg-[#E0A526] text-[#3A2418] border-[#3A2418]',
                        idleClass: isDrink
                          ? 'bg-[#143025] border-[#E0A526] text-[#F4EEE2]'
                          : 'bg-white border-[#E0A526] text-[#3A2418]',
                      },
                      {
                        id: 'tourist-trap' as const,
                        label: '▲ Capcană',
                        count: tierCounts.trap,
                        range: '61–100%',
                        dotClass: null,
                        activeClass: 'bg-[#B3261E] text-white border-[#B3261E]',
                        idleClass: isDrink
                          ? 'bg-[#143025] border-[#B3261E] text-[#F4EEE2]'
                          : 'bg-white border-[#B3261E] text-[#B3261E]',
                      },
                    ] as const
                  ).map((item) => {
                    const isActive = tierFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setTierFilter((p) => (p === item.id ? 'all' : item.id))
                        }
                        className={`min-h-[44px] md:min-h-[48px] px-2 py-1.5 md:p-2 rounded-[4px] border text-left transition-colors ${
                          isActive ? item.activeClass : item.idleClass
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 text-[11px] font-bold leading-tight">
                          <span className="inline-flex items-center gap-1 min-w-0 truncate">
                            {!isActive && item.dotClass && (
                              <span
                                aria-hidden="true"
                                className={`w-2 h-2 rounded-full shrink-0 ${item.dotClass}`}
                              />
                            )}
                            <span className="truncate">{item.label}</span>
                          </span>
                          <span className="tabular-nums shrink-0">{item.count}</span>
                        </div>
                        <div
                          className={`text-[10px] mt-0.5 tabular-nums leading-tight ${
                            isActive
                              ? 'opacity-95'
                              : isDrink
                              ? 'text-[#F4EEE2]/80'
                              : 'text-[#6E5649]'
                          }`}
                        >
                          {item.range}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <details className={`rounded-[8px] border px-3 py-2 ${isDrink ? 'border-[#336652] bg-[#143025]' : 'border-[#E6DFD5] bg-white'}`} aria-label="Filtre pentru mâncare și băutură">
                  <summary className="cursor-pointer text-[13px] font-bold leading-6">
                    <Utensils aria-hidden="true" className="mr-2 inline-block h-4 w-4 align-[-3px]" />
                    Ce ai poftă? {selectedTastes.length > 0 && <span className="font-normal opacity-75">· {selectedTastes.length}</span>}
                  </summary>
                  <div className="flex justify-end">
                    {selectedTastes.length > 0 && (
                      <button type="button" onClick={() => setSelectedTastes([])} className={`text-[11px] font-semibold underline underline-offset-2 ${isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'}`}>
                        Șterge
                      </button>
                    )}
                  </div>
                  {[
                    { label: 'Mâncare', tastes: MAP_TASTES.slice(0, 5) },
                    { label: 'Băutură', tastes: MAP_TASTES.slice(5, 10) },
                    { label: 'Regim alimentar', tastes: MAP_TASTES.slice(10) },
                  ].map(group => (
                    <div key={group.label} className="mt-3">
                      <p className={`mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] ${isDrink ? 'text-[#F4EEE2]/60' : 'text-[#8B7568]'}`}>{group.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.tastes.map(taste => {
                          const selected = selectedTastes.includes(taste.id);
                          const Icon = TASTE_ICONS[taste.id];
                          return (
                            <button key={taste.id} type="button" aria-pressed={selected} onClick={() => setSelectedTastes(current => selected ? current.filter(id => id !== taste.id) : [...current, taste.id])}
                              className={`inline-flex min-h-[36px] items-center gap-1 rounded-[4px] border px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${selected ? (isDrink ? 'border-[#F2A33A] bg-[#F2A33A] text-[#17382C]' : 'border-[#3A2418] bg-[#3A2418] text-white') : (isDrink ? 'border-[#47705C] text-[#F4EEE2] hover:border-[#F2A33A] hover:bg-[#1E4335]' : 'border-[#DED5CA] bg-[#FAF8F5] text-[#50392C] hover:border-[#9F8372] hover:bg-[#F2ECE5]')}`}>
                              <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                              {taste.label}
                              {selected && <Check aria-hidden="true" className="h-3 w-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {selectedTastes.includes('gluten-free') && (
                    <p className={`mt-2 text-[11px] leading-snug ${isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'}`}>
                      Pentru boala celiacă, verifică ingredientele și contaminarea încrucișată cu localul.
                    </p>
                  )}
                </details>

                {/* Mobile-only Map Layer Toggles */}
                <div className="flex sm:hidden items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowNeighborhoodZones((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-[4px] text-[12px] font-semibold border transition-colors ${
                      showNeighborhoodZones
                        ? isDrink
                          ? 'bg-[#1E4335] text-[#F4EEE2] border-[#336652]'
                          : 'bg-[#FAF8F5] text-[#3A2418] border-[#3A2418]'
                        : isDrink
                        ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]/80'
                        : 'bg-white border-[#E6DFD5] text-[#6E5649]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Cartiere</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLandmarks((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 min-h-[44px] rounded-[4px] text-[12px] font-semibold border transition-colors ${
                      showLandmarks
                        ? isDrink
                          ? 'bg-[#1E4335] text-[#F4EEE2] border-[#336652]'
                          : 'bg-[#FAF8F5] text-[#3A2418] border-[#3A2418]'
                        : isDrink
                        ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]/80'
                        : 'bg-white border-[#E6DFD5] text-[#6E5649]'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Repere</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 opacity-60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={sidebarQuery}
                    onChange={(e) => setSidebarQuery(e.target.value)}
                    placeholder="Caută pe hartă..."
                    aria-label="Caută pe hartă"
                    className={`w-full pl-9 pr-11 py-2 min-h-[44px] md:min-h-[36px] text-[16px] md:text-[13px] rounded-[4px] border ${
                      isDrink
                        ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2] placeholder:text-[#F4EEE2]/60'
                        : 'bg-white border-[#D6CFC5] text-[#3A2418] placeholder:text-[#6E5649]'
                    }`}
                  />
                  {sidebarQuery && (
                    <button
                      type="button"
                      onClick={() => setSidebarQuery('')}
                      aria-label="Șterge căutarea"
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 md:w-9 md:h-9 flex items-center justify-center rounded-[4px] opacity-75 hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div
              className={`hidden md:flex px-4 py-2.5 border-b items-start gap-2 text-[11px] leading-snug shrink-0 ${
                isDrink
                  ? 'border-[#285443] bg-[#143025] text-[#F4EEE2]/80'
                  : 'border-[#E6DFD5] bg-[#FAF8F5] text-[#6E5649]'
              }`}
            >
              <Compass
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                }`}
              />
              <span>
                Cercurile reale de 300 m marchează Piața Unirii, Victoriei,
                Libertății și Bastion. Capcanele sunt marcate cu triunghi.
              </span>
            </div>

            <div
              className={`flex-1 overflow-y-auto divide-y ${
                isDrink ? 'divide-[#285443]' : 'divide-[#E6DFD5]'
              }`}
            >
              {visibleRestaurants.length === 0 ? (
                <div className="p-6 text-center space-y-3">
                  <p className="text-[14px] font-semibold">
                    Niciun local vizibil pe hartă.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setTierFilter('all');
                      setSelectedTastes([]);
                      setSidebarQuery('');
                      if (onResetFilters) onResetFilters();
                    }}
                    className={`min-h-[44px] md:min-h-[36px] px-4 py-2 rounded-[4px] text-[12px] font-semibold ${
                      isDrink
                        ? 'bg-[#F2A33A] text-[#17382C]'
                        : 'bg-[#B3261E] text-white'
                    }`}
                  >
                    Resetează filtrele
                  </button>
                </div>
              ) : (
                visibleRestaurants.map((r) => {
                  const isSelected = r.id === activeRestaurantId;
                  const tierStyle = getTierStyles(r.trapTier, r.touristTrapIndex);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        flyToRestaurant(r);
                        if (
                          typeof window !== 'undefined' &&
                          window.innerWidth < 768
                        ) {
                          setSidebarOpen(false);
                        }
                      }}
                      onMouseEnter={() => setHoveredRestaurantId(r.id)}
                      onMouseLeave={() => setHoveredRestaurantId(null)}
                      className={`w-full text-left px-3 sm:px-4 py-2.5 md:py-3 min-h-[52px] md:min-h-[56px] flex items-center justify-between gap-3 transition-colors ${
                        isSelected
                          ? isDrink
                            ? 'bg-[#1E4335] ring-1 ring-inset ring-[#F2A33A]/50'
                            : 'bg-[#FAF8F5] ring-1 ring-inset ring-[#B3261E]/35'
                          : isDrink
                          ? 'hover:bg-[#1A3D30]'
                          : 'hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isSelected && (
                            <span
                              aria-hidden="true"
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isDrink ? 'bg-[#F2A33A]' : 'bg-[#B3261E]'
                              }`}
                            />
                          )}
                          <span className="font-bold text-[14px] truncate">
                            {r.name}
                          </span>
                          {r.touristTrapIndex >= 60 && (
                            <span
                              className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-[2px]"
                              style={{
                                backgroundColor: tierStyle.pinBg,
                                color: tierStyle.pinText,
                              }}
                            >
                              ▲ {r.touristTrapIndex}%
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[12px] truncate ${
                            isDrink ? 'text-[#F4EEE2]/75' : 'text-[#6E5649]'
                          }`}
                        >
                          {r.shortNeighborhood ?? r.neighborhood} · Localnici{' '}
                          {formatScore(r.localsScore)} vs Turiști{' '}
                          {formatScore(r.touristsScore)}
                        </div>
                      </div>

                      <span className="font-display text-[26px] leading-none tabular-nums shrink-0">
                        <HonestValue score={r.foodQualityScore} />
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* RIGHT / REAL MAPLIBRE ENGINE WITH TOP FOOD SKIN */}
        <div
          className={`relative z-10 isolate flex-1 h-full overflow-hidden ${
            isDrink ? 'bg-[#143025]' : 'bg-[#F6F2EA]'
          }`}
        >
          <div ref={mapContainerRef} className="relative z-10 isolate w-full h-full" />

          {/* Compact Attribution Pill */}
          <div
            className={`pointer-events-none absolute bottom-1 right-2 z-20 text-[12px] leading-tight px-2 py-0.5 rounded border ${
              isDrink
                ? 'bg-[#143025] border-[#2D5947] text-[#F4EEE2]'
                : 'bg-[#FAF8F5] border-[#E6DFD5] text-[#3A2418]'
            }`}
          >
            © OpenStreetMap · OpenFreeMap · TOP FOOD skin
          </div>

          {/* Floating Legend Pill when sidebar is collapsed */}
          {!sidebarOpen && (
            <div
              className={`pointer-events-none absolute left-3 md:left-4 z-20 px-2.5 sm:px-3 py-1.5 rounded-[4px] border text-[12px] leading-snug font-semibold shadow-sm max-w-[calc(100%-4.75rem)] md:max-w-none ${
                activeZone
                  ? 'hidden md:block md:bottom-4'
                  : 'top-3 md:top-auto md:bottom-4'
              } ${
                isDrink
                  ? 'bg-[#143025] border-[#2D5947] text-[#F4EEE2]'
                  : 'bg-white/95 border-[#D6CFC5] text-[#3A2418]'
              }`}
            >
              Cercuri 300 m = zone turistice reale · ▲ = risc capcană
            </div>
          )}

          {/* Zoom Controls */}
          <div className="absolute top-3 right-3 md:top-4 md:right-4 flex flex-col items-end gap-2 z-20">
            <div
              className={`flex flex-col rounded-[4px] border overflow-hidden shadow-sm ${
                isDrink
                  ? 'bg-[#143025] border-[#2D5947] text-[#F4EEE2]'
                  : 'bg-white border-[#D6CFC5] text-[#3A2418]'
              }`}
            >
              <button
                type="button"
                onClick={() => mapRef.current?.zoomIn({ duration: 250 })}
                className={`w-11 h-11 md:w-10 md:h-10 flex items-center justify-center border-b ${
                  isDrink
                    ? 'hover:bg-[#1E4335] border-[#285443]'
                    : 'hover:bg-[#FAF8F5] border-[#E6DFD5]'
                }`}
                aria-label="Mărește harta"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => mapRef.current?.zoomOut({ duration: 250 })}
                className={`w-11 h-11 md:w-10 md:h-10 flex items-center justify-center border-b ${
                  isDrink
                    ? 'hover:bg-[#1E4335] border-[#285443]'
                    : 'hover:bg-[#FAF8F5] border-[#E6DFD5]'
                }`}
                aria-label="Micșorează harta"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => flyToCamera('ALL')}
                className={`w-11 h-11 md:w-10 md:h-10 flex items-center justify-center ${
                  isDrink ? 'hover:bg-[#1E4335]' : 'hover:bg-[#FAF8F5]'
                }`}
                aria-label="Resetează harta"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Tourist Zone Info */}
          {activeZone && (
            <div
              className={`absolute top-3 left-3 right-16 sm:right-auto sm:top-4 sm:left-4 sm:w-80 md:max-w-sm max-h-[45%] md:max-h-none overflow-y-auto md:overflow-visible border rounded-[4px] p-3 sm:p-4 shadow-md z-30 ${
                isDrink
                  ? 'bg-[#143025] border-[#2D5947] text-[#F4EEE2]'
                  : 'bg-white border-[#E0A526] text-[#3A2418]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 ${
                      isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                    }`}
                  />
                  <h4 className="font-display text-[18px] sm:text-[20px] leading-tight">
                    {activeZone.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveZoneId(null)}
                  aria-label="Închide zona turistică"
                  className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center -mr-2 -mt-2 sm:-mr-1.5 sm:-mt-1.5 rounded-[4px] opacity-75 hover:opacity-100 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p
                className={`text-[13px] mt-1.5 sm:mt-2 leading-snug ${
                  isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'
                }`}
              >
                {activeZone.description}
              </p>
              <div
                className={`mt-2 sm:mt-2.5 pt-2 border-t flex items-center justify-between gap-2 text-[12px] ${
                  isDrink ? 'border-[#285443]' : 'border-[#E6DFD5]'
                }`}
              >
                <span>Rază reală 300 m · 20% semnal capcană</span>
                <button
                  type="button"
                  onClick={() => {
                    mapRef.current?.flyTo({
                      center: [activeZone.center.lng, activeZone.center.lat],
                      zoom: 16.0,
                      duration: 650,
                    });
                  }}
                  className={`font-semibold underline min-h-[44px] md:min-h-0 inline-flex items-center shrink-0 ${
                    isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                  }`}
                >
                  Focalizează
                </button>
              </div>
            </div>
          )}

          {/* Bottom Floating Preview Card */}
          {activeRestaurant && (
            <div
              className={`${
                sidebarOpen ? 'hidden md:block ' : ''
              }absolute bottom-3 left-3 right-3 md:bottom-4 md:left-auto md:right-5 md:w-[430px] rounded-[6px] border shadow-lg overflow-hidden z-30 ${
                isDrink
                  ? 'bg-[#143025] border-[#2D5947] text-[#F4EEE2]'
                  : 'bg-white text-[#3A2418] border-[#3A2418]'
              }`}
            >
              <div
                className={`px-3 sm:px-3.5 py-1.5 sm:py-2 border-b flex items-center justify-between text-[12px] ${
                  isDrink
                    ? 'bg-[#122B22] border-[#285443]'
                    : 'bg-[#FAF8F5] border-[#E6DFD5]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevRestaurant}
                    className={`inline-flex items-center gap-1 px-2.5 sm:px-2 min-h-[44px] md:min-h-0 py-1.5 md:py-1 rounded-[3px] border ${
                      isDrink
                        ? 'border-[#285443] bg-[#143025] text-[#F4EEE2] hover:border-[#F2A33A]'
                        : 'border-[#D6CFC5] bg-white hover:border-[#3A2418]'
                    }`}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextRestaurant}
                    className={`inline-flex items-center gap-1 px-2.5 sm:px-2 min-h-[44px] md:min-h-0 py-1.5 md:py-1 rounded-[3px] border ${
                      isDrink
                        ? 'border-[#285443] bg-[#143025] text-[#F4EEE2] hover:border-[#F2A33A]'
                        : 'border-[#D6CFC5] bg-white hover:border-[#3A2418]'
                    }`}
                  >
                    <span>Următorul</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`tabular-nums ${
                      isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'
                    }`}
                  >
                    {visibleRestaurants.findIndex(
                      (r) => r.id === activeRestaurant.id
                    ) + 1}{' '}
                    / {visibleRestaurants.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveRestaurantId(null)}
                    aria-label="Închide previzualizarea"
                    className={`w-11 h-11 md:w-9 md:h-9 flex items-center justify-center -mr-1.5 rounded-[4px] ${
                      isDrink
                        ? 'text-[#F4EEE2]/80 hover:text-[#F4EEE2]'
                        : 'text-[#6E5649] hover:text-[#3A2418]'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-[20px] sm:text-[24px] leading-tight truncate">
                      {activeRestaurant.name}
                    </h3>
                    <p
                      className={`text-[12px] sm:text-[13px] mt-0.5 truncate ${
                        isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'
                      }`}
                    >
                      {activeRestaurant.shortCategory ?? activeRestaurant.cuisine},{' '}
                      {activeRestaurant.shortNeighborhood ??
                        activeRestaurant.neighborhood}{' '}
                      · {activeRestaurant.trapBreakdown.touristZoneProximityM} m de
                      centru
                    </p>
                  </div>

                  <span
                    className={`font-display text-[30px] sm:text-[36px] leading-none tabular-nums shrink-0 ${
                      isDrink ? 'text-[#F4EEE2]' : 'text-[#3A2418]'
                    }`}
                  >
                    <HonestValue score={activeRestaurant.foodQualityScore} />
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-[12px]">
                    <LocalnicBadge
                      label={`Localnici ${formatScore(activeRestaurant.localsScore)}`}
                      size="xs"
                    />
                    <span
                      className={isDrink ? 'text-[#F4EEE2]/80' : 'text-[#6E5649]'}
                    >
                      Turiști{' '}
                      <strong className="tabular-nums">
                        {formatScore(activeRestaurant.touristsScore)}
                      </strong>
                    </span>
                  </div>

                  {activeRestaurant.touristTrapIndex >= 80 && (
                    <TrapBadge variant="severe" label="Capcană turistică" />
                  )}
                  {activeRestaurant.touristTrapIndex >= 60 &&
                    activeRestaurant.touristTrapIndex < 80 && (
                      <TrapBadge variant="possible" label="Posibilă capcană" />
                    )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectRestaurant(activeRestaurant)}
                  className={`w-full min-h-[44px] py-2.5 px-4 rounded-[4px] font-bold text-[13px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity ${
                    isDrink
                      ? 'bg-[#F2A33A] text-[#17382C]'
                      : 'bg-[#B3261E] text-white'
                  }`}
                >
                  <span>Deschide fișa localului</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default MapView;
