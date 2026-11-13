'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
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
  X,
} from 'lucide-react';
import {
  Restaurant,
  Neighborhood,
  TouristZone,
  TrapTier,
  Vertical,
  formatScore,
} from '../types';
import { INITIAL_RESTAURANTS, TOURIST_ZONES } from '../data/restaurants';
import { LocalnicBadge, TrapBadge } from './BrandPrimitives';

export interface MapViewProps {
  vertical?: Vertical;
  restaurants?: Restaurant[];
  onSelectRestaurant: (restaurant: Restaurant) => void;
  selectedRestaurant?: Restaurant | null;
  selectedNeighborhood?: Neighborhood | 'All' | 'all' | string;
  onSelectNeighborhood?: (neighborhood: string) => void;
  touristZones?: TouristZone[];
  onResetFilters?: () => void;
}

const MAP_WIDTH = 1600;
const MAP_HEIGHT = 1000;
const LAT_MIN = 45.74;
const LAT_MAX = 45.764;
const LNG_MIN = 21.202;
const LNG_MAX = 21.258;
const SVG_UNITS_PER_METER = 0.36786;

function projectLatLng(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * MAP_WIDTH;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * MAP_HEIGHT;
  return { x, y };
}

function unprojectXY(x: number, y: number): { lat: number; lng: number } {
  const lng = LNG_MIN + (x / MAP_WIDTH) * (LNG_MAX - LNG_MIN);
  const lat = LAT_MAX - (y / MAP_HEIGHT) * (LAT_MAX - LAT_MIN);
  return { lat, lng };
}

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
    lng: 21.23,
    zoom: 1.08,
  },
  'Cetate / Piața Unirii': {
    label: 'Piața Unirii',
    shortLabel: 'Piața Unirii',
    lat: 45.7574,
    lng: 21.2288,
    zoom: 2.5,
  },
  'Piața Victoriei': {
    label: 'Piața Victoriei',
    shortLabel: 'Piața Victoriei',
    lat: 45.7537,
    lng: 21.2252,
    zoom: 2.6,
  },
  'Piața Libertății': {
    label: 'Piața Libertății',
    shortLabel: 'Piața Libertății',
    lat: 45.7557,
    lng: 21.2273,
    zoom: 2.7,
  },
  Iosefin: {
    label: 'Iosefin',
    shortLabel: 'Iosefin',
    lat: 45.7465,
    lng: 21.2138,
    zoom: 2.1,
  },
  Fabric: {
    label: 'Fabric',
    shortLabel: 'Fabric',
    lat: 45.7574,
    lng: 21.2485,
    zoom: 2.1,
  },
  'Complexul Studențesc': {
    label: 'Complex',
    shortLabel: 'Complex',
    lat: 45.7492,
    lng: 21.2392,
    zoom: 2.2,
  },
  Elisabetin: {
    label: 'Elisabetin',
    shortLabel: 'Elisabetin',
    lat: 45.7469,
    lng: 21.2272,
    zoom: 2.1,
  },
};

const TIMISOARA_LANDMARKS = [
  { name: 'Domul Romano-Catolic', lat: 45.7581, lng: 21.2298 },
  { name: 'Palatul Baroc', lat: 45.7576, lng: 21.2283 },
  { name: 'Catedrala Mitropolitană', lat: 45.7509, lng: 21.2242 },
  { name: 'Opera Națională', lat: 45.7543, lng: 21.2259 },
  { name: 'Piața Traian', lat: 45.7578, lng: 21.2488 },
  { name: 'Piața Iosefin', lat: 45.7452, lng: 21.2098 },
];

const BEGA_BRIDGES = [
  { name: 'Podul Iosefin', lat: 45.7448, lng: 21.2082, angle: -28 },
  { name: 'Podul Ștefan cel Mare', lat: 45.7468, lng: 21.2145, angle: -25 },
  { name: 'Podul Maria', lat: 45.7495, lng: 21.2224, angle: -20 },
  { name: 'Podul Șaguna', lat: 45.7503, lng: 21.2262, angle: -10 },
  { name: 'Podul Michelangelo', lat: 45.7506, lng: 21.2328, angle: -8 },
  { name: 'Podul Decebal', lat: 45.7549, lng: 21.2412, angle: -34 },
  { name: 'Podul Dacilor', lat: 45.7568, lng: 21.2468, angle: -12 },
];

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

export function MapView({
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
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [tierFilter, setTierFilter] = useState<TrapTier | 'all'>('all');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [sidebarQuery, setSidebarQuery] = useState<string>('');
  const [activeCam, setActiveCam] = useState<string>('ALL');

  const [zoom, setZoom] = useState<number>(1.08);
  const [centerSvg, setCenterSvg] = useState<{ x: number; y: number }>(() =>
    projectLatLng(45.7525, 21.23)
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedNeighborhood) return;
    if (selectedNeighborhood === 'All' || selectedNeighborhood === 'all') {
      const cam = NEIGHBORHOOD_CAMERAS.ALL;
      setCenterSvg(projectLatLng(cam.lat, cam.lng));
      setZoom(cam.zoom);
      setActiveCam('ALL');
      return;
    }
    const cam = NEIGHBORHOOD_CAMERAS[selectedNeighborhood];
    if (cam) {
      setCenterSvg(projectLatLng(cam.lat, cam.lng));
      setZoom(cam.zoom);
      setActiveCam(selectedNeighborhood);
    }
  }, [selectedNeighborhood]);

  const visibleRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      if (tierFilter !== 'all' && r.trapTier !== tierFilter) return false;
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
  }, [restaurants, tierFilter, sidebarQuery]);

  useEffect(() => {
    if (visibleRestaurants.length === 0) {
      setActiveRestaurantId(null);
      return;
    }
    if (!activeRestaurantId || !visibleRestaurants.some((r) => r.id === activeRestaurantId)) {
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

  const flyToRestaurant = useCallback((restaurant: Restaurant, targetZoom?: number) => {
    setActiveRestaurantId(restaurant.id);
    const pt = projectLatLng(restaurant.coordinates.lat, restaurant.coordinates.lng);
    setCenterSvg(pt);
    if (targetZoom) setZoom(targetZoom);
    else setZoom((prev) => Math.max(prev, 1.85));
  }, []);

  const flyToCamera = useCallback(
    (key: string) => {
      const cam = NEIGHBORHOOD_CAMERAS[key] || NEIGHBORHOOD_CAMERAS.ALL;
      setCenterSvg(projectLatLng(cam.lat, cam.lng));
      setZoom(cam.zoom);
      setActiveCam(key);
      if (onSelectNeighborhood) {
        onSelectNeighborhood(key === 'ALL' ? 'all' : key);
      }
    },
    [onSelectNeighborhood]
  );

  const handlePrevRestaurant = useCallback(() => {
    if (visibleRestaurants.length === 0) return;
    const idx = visibleRestaurants.findIndex((r) => r.id === activeRestaurantId);
    const prevIdx = idx <= 0 ? visibleRestaurants.length - 1 : idx - 1;
    flyToRestaurant(visibleRestaurants[prevIdx]);
  }, [visibleRestaurants, activeRestaurantId, flyToRestaurant]);

  const handleNextRestaurant = useCallback(() => {
    if (visibleRestaurants.length === 0) return;
    const idx = visibleRestaurants.findIndex((r) => r.id === activeRestaurantId);
    const nextIdx = idx < 0 || idx >= visibleRestaurants.length - 1 ? 0 : idx + 1;
    flyToRestaurant(visibleRestaurants[nextIdx]);
  }, [visibleRestaurants, activeRestaurantId, flyToRestaurant]);

  const positionedPins = useMemo(() => {
    const nodes = visibleRestaurants.map((r) => {
      const exact = projectLatLng(r.coordinates.lat, r.coordinates.lng);
      return {
        restaurant: r,
        exactX: exact.x,
        exactY: exact.y,
        x: exact.x,
        y: exact.y,
      };
    });

    const minSepX = 68 / Math.pow(zoom, 0.85);
    const minSepY = 40 / Math.pow(zoom, 0.85);

    for (let iter = 0; iter < 28; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const normDx = dx / minSepX;
          const normDy = dy / minSepY;
          const distSq = normDx * normDx + normDy * normDy;
          if (distSq < 1) {
            const dist = Math.sqrt(distSq) || 0.01;
            const overlap = (1 - dist) * 0.52;
            const angle =
              distSq > 0.0001
                ? Math.atan2(normDy, normDx)
                : ((i * 7 + j * 13) % 12) * (Math.PI / 6);
            const pushX = Math.cos(angle) * overlap * minSepX;
            const pushY = Math.sin(angle) * overlap * minSepY;
            a.x -= pushX;
            a.y -= pushY;
            b.x += pushX;
            b.y += pushY;
          }
        }
      }
      for (const n of nodes) {
        n.x += (n.exactX - n.x) * 0.14;
        n.y += (n.exactY - n.y) * 0.14;
      }
    }
    return nodes;
  }, [visibleRestaurants, zoom]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: centerSvg.x,
      startY: centerSvg.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || !dragStartRef.current || !mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const viewW = MAP_WIDTH / zoom;
    const viewH = MAP_HEIGHT / zoom;
    const dx = (e.clientX - dragStartRef.current.clientX) * (viewW / rect.width);
    const dy = (e.clientY - dragStartRef.current.clientY) * (viewH / rect.height);

    setCenterSvg({
      x: Math.max(120, Math.min(MAP_WIDTH - 120, dragStartRef.current.startX - dx)),
      y: Math.max(100, Math.min(MAP_HEIGHT - 100, dragStartRef.current.startY - dy)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    setZoom((prev) => Math.max(0.85, Math.min(4.2, Number((prev * factor).toFixed(2)))));
  };

  const viewBoxW = MAP_WIDTH / zoom;
  const viewBoxH = MAP_HEIGHT / zoom;
  const viewBoxX = centerSvg.x - viewBoxW / 2;
  const viewBoxY = centerSvg.y - viewBoxH / 2;
  const currentLatLng = unprojectXY(centerSvg.x, centerSvg.y);

  return (
    <section
      aria-label="Harta Timișoara"
      className={`relative w-full select-none overflow-hidden pb-14 md:pb-0 ${
        isDrink ? 'bg-[#17382C] text-[#F4EEE2]' : 'bg-white text-[#3A2418]'
      }`}
    >
      {/* Top Map Control Bar */}
      <div
        className={`border-b px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 ${
          isDrink ? 'bg-[#17382C] border-[#285443]' : 'bg-white border-[#E6DFD5]'
        }`}
      >
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 max-w-full no-scrollbar">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border transition-colors shrink-0 ${
              isDrink
                ? 'border-[#2D5947] bg-[#143025] text-[#F4EEE2] hover:border-[#F2A33A]'
                : 'border-[#D6CFC5] bg-[#FAF8F5] text-[#3A2418] hover:border-[#3A2418]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{sidebarOpen ? 'Ascunde lista' : 'Listă și filtre'}</span>
            <span className="opacity-70">({visibleRestaurants.length})</span>
          </button>

          <div
            className={`h-4 w-px shrink-0 ${
              isDrink ? 'bg-[#285443]' : 'bg-[#E6DFD5]'
            }`}
          />

          {Object.entries(NEIGHBORHOOD_CAMERAS).map(([key, cam]) => {
            const isCurrent = activeCam === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => flyToCamera(key)}
                className={`px-2.5 py-1 rounded-[4px] text-[12px] font-semibold border transition-colors shrink-0 ${
                  isCurrent
                    ? isDrink
                      ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                      : 'bg-[#3A2418] text-white border-[#3A2418]'
                    : isDrink
                    ? 'bg-[#17382C] text-[#F4EEE2]/80 border-[#285443] hover:border-[#F2A33A]/50'
                    : 'bg-white text-[#6E5649] border-[#E6DFD5] hover:text-[#3A2418]'
                }`}
              >
                {cam.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowTouristRings((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[12px] font-semibold border transition-colors ${
              showTouristRings
                ? 'bg-[#E0A526] text-[#3A2418] border-[#E0A526]'
                : isDrink
                ? 'bg-[#17382C] text-[#F4EEE2]/80 border-[#285443]'
                : 'bg-white text-[#6E5649] border-[#E6DFD5]'
            }`}
          >
            {showTouristRings ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            <span>Zone turistice (300 m)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLandmarks((v) => !v)}
            className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] text-[12px] font-semibold border transition-colors ${
              isDrink
                ? 'border-[#285443] text-[#F4EEE2]/85'
                : 'border-[#E6DFD5] text-[#6E5649] hover:text-[#3A2418]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Repere</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="relative flex w-full h-[calc(100vh-140px)] min-h-[600px] max-h-[880px]">
        {/* LEFT PANEL */}
        {sidebarOpen && (
          <aside
            className={`w-80 lg:w-96 shrink-0 h-full border-r flex flex-col z-20 ${
              isDrink
                ? 'bg-[#17382C] border-[#285443]'
                : 'bg-white border-[#E6DFD5]'
            }`}
          >
            <div
              className={`p-4 border-b space-y-2.5 ${
                isDrink ? 'border-[#285443]' : 'border-[#E6DFD5] bg-[#FAF8F5]/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold">
                  Filtrează după risc de capcană
                </span>
                {tierFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setTierFilter('all')}
                    className={`text-[12px] font-semibold underline ${
                      isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                    }`}
                  >
                    Toate ({tierCounts.total})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setTierFilter((p) => (p === 'local-staple' ? 'all' : 'local-staple'))
                  }
                  className={`p-2 rounded-[4px] border text-left transition-colors ${
                    tierFilter === 'local-staple'
                      ? isDrink
                        ? 'bg-[#F2A33A] text-[#17382C] border-[#F2A33A]'
                        : 'bg-[#3A2418] text-white border-[#3A2418]'
                      : isDrink
                      ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]'
                      : 'bg-white border-[#D6CFC5] text-[#3A2418]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>Onest</span>
                    <span>{tierCounts.staple}</span>
                  </div>
                  <div className="text-[10px] opacity-75 mt-0.5">0–25%</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTierFilter((p) => (p === 'mixed-fair' ? 'all' : 'mixed-fair'))
                  }
                  className={`p-2 rounded-[4px] border text-left transition-colors ${
                    tierFilter === 'mixed-fair'
                      ? 'bg-[#E0A526] text-[#3A2418] border-[#3A2418]'
                      : isDrink
                      ? 'bg-[#143025] border-[#285443] text-[#F4EEE2]'
                      : 'bg-[#E0A526]/20 border-[#E0A526] text-[#3A2418]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>Mixt</span>
                    <span>{tierCounts.mixed}</span>
                  </div>
                  <div className="text-[10px] opacity-75 mt-0.5">26–60%</div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setTierFilter((p) => (p === 'tourist-trap' ? 'all' : 'tourist-trap'))
                  }
                  className={`p-2 rounded-[4px] border text-left transition-colors ${
                    tierFilter === 'tourist-trap'
                      ? 'bg-[#B3261E] text-white border-[#B3261E]'
                      : 'bg-[#B3261E]/12 border-[#B3261E]/40 text-[#B3261E]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>▲ Capcană</span>
                    <span>{tierCounts.trap}</span>
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5">61–100%</div>
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 opacity-60 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sidebarQuery}
                  onChange={(e) => setSidebarQuery(e.target.value)}
                  placeholder="Caută pe hartă..."
                  className={`w-full pl-8 pr-7 py-1.5 text-[13px] rounded-[4px] border focus:outline-none ${
                    isDrink
                      ? 'bg-[#122B22] border-[#285443] text-[#F4EEE2] placeholder:text-[#F4EEE2]/50'
                      : 'bg-white border-[#D6CFC5] text-[#3A2418] placeholder:text-[#6E5649]'
                  }`}
                />
                {sidebarQuery && (
                  <button
                    type="button"
                    onClick={() => setSidebarQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div
              className={`px-4 py-2.5 border-b flex items-start gap-2 text-[11px] leading-snug ${
                isDrink
                  ? 'border-[#285443] bg-[#143025] text-[#F4EEE2]/75'
                  : 'border-[#E6DFD5] bg-[#FAF8F5] text-[#6E5649]'
              }`}
            >
              <Compass
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isDrink ? 'text-[#F2A33A]' : 'text-[#B3261E]'
                }`}
              />
              <span>
                Cercurile de 300 m marchează Piața Unirii, Victoriei, Libertății
                și Bastion. Capcanele sunt marcate cu triunghi.
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
                      setSidebarQuery('');
                      if (onResetFilters) onResetFilters();
                    }}
                    className={`px-3 py-1.5 rounded-[4px] text-[12px] font-semibold ${
                      isDrink
                        ? 'bg-[#F2A33A] text-[#17382C]'
                        : 'bg-[#3A2418] text-white'
                    }`}
                  >
                    Resetează filtrele
                  </button>
                </div>
              ) : (
                visibleRestaurants.map((r) => {
                  const isSelected = r.id === activeRestaurantId;
                  const isSevere = r.touristTrapIndex >= 80;
                  const isPossible =
                    r.touristTrapIndex >= 60 && r.touristTrapIndex < 80;

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => flyToRestaurant(r, 2.25)}
                      onMouseEnter={() => setHoveredRestaurantId(r.id)}
                      onMouseLeave={() => setHoveredRestaurantId(null)}
                      className={`w-full p-3.5 text-left transition-colors flex items-center justify-between gap-3 ${
                        isSelected
                          ? isDrink
                            ? 'bg-[#1E4335] border-l-4 border-l-[#F2A33A]'
                            : 'bg-[#FAF8F5] border-l-4 border-l-[#B3261E]'
                          : isDrink
                          ? 'hover:bg-[#1C4234]'
                          : 'hover:bg-[#FAF8F5]/70'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[14px] truncate">
                            {r.name}
                          </span>
                          {isSevere && <TrapBadge variant="severe" label="Capcană" />}
                          {isPossible && (
                            <TrapBadge variant="possible" label="Posibilă" />
                          )}
                        </div>
                        <div
                          className={`text-[12px] truncate ${
                            isDrink ? 'text-[#F4EEE2]/70' : 'text-[#6E5649]'
                          }`}
                        >
                          {r.shortNeighborhood ?? r.neighborhood} · Localnici{' '}
                          {formatScore(r.localsScore)} vs Turiști{' '}
                          {formatScore(r.touristsScore)}
                        </div>
                      </div>

                      <span className="font-display text-[26px] leading-none tabular-nums shrink-0">
                        {formatScore(r.foodQualityScore)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* RIGHT / MAIN VECTOR MAP */}
        <div
          ref={mapContainerRef}
          className={`relative flex-1 h-full overflow-hidden ${
            isDrink ? 'bg-[#122B22]' : 'bg-[#F4EFE6]'
          }`}
        >
          <svg
            viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`}
            preserveAspectRatio="xMidYMid slice"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            <defs>
              <pattern id="tm-grid" width="80" height="80" patternUnits="userSpaceOnUse">
                <path
                  d="M 80 0 L 0 0 0 80"
                  fill="none"
                  stroke={isDrink ? '#1D4234' : '#E6DFD3'}
                  strokeWidth="0.9"
                />
              </pattern>

              <filter id="pin-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow
                  dx="0"
                  dy="3"
                  stdDeviation="3"
                  floodColor="#3A2418"
                  floodOpacity="0.22"
                />
              </filter>
            </defs>

            {/* Base Canvas */}
            <rect
              x="-800"
              y="-800"
              width="3200"
              height="2600"
              fill={isDrink ? '#143025' : '#F6F2EA'}
            />
            <rect
              x="-800"
              y="-800"
              width="3200"
              height="2600"
              fill="url(#tm-grid)"
            />

            {/* Historic Parks & Cetate Star Rampart */}
            <g opacity={isDrink ? 0.45 : 0.9}>
              <polygon
                points="580,250 725,235 745,335 605,355"
                fill={isDrink ? '#1C4536' : '#E2EAD8'}
                stroke={isDrink ? '#285443' : '#C9D6BC'}
                strokeWidth="1.5"
              />
              <polygon
                points="460,575 645,515 675,605 495,665"
                fill={isDrink ? '#1C4536' : '#E2EAD8'}
                stroke={isDrink ? '#285443' : '#C9D6BC'}
                strokeWidth="1.5"
              />
              <polygon
                points="685,505 925,495 935,555 690,565"
                fill={isDrink ? '#1C4536' : '#E2EAD8'}
                stroke={isDrink ? '#285443' : '#C9D6BC'}
                strokeWidth="1.5"
              />
              <polygon
                points="660,340 815,310 950,365 965,485 830,520 685,490 635,415"
                fill={isDrink ? '#1A3D30' : '#ECE5D8'}
                stroke={isDrink ? '#2F624F' : '#D2C7B4'}
                strokeWidth="2"
                strokeDasharray="8 4"
              />
            </g>

            {/* Boulevards & Street Ring */}
            <g fill="none" strokeLinecap="round">
              <path
                d="M 610,415 L 675,320 L 855,295 L 995,365 L 975,495 L 795,525 L 645,495 Z"
                stroke={isDrink ? '#234D3E' : '#FFFFFF'}
                strokeWidth="9"
              />
              <path
                d="M 80,820 L 360,720 L 650,555 L 718,465"
                stroke={isDrink ? '#234D3E' : '#FFFFFF'}
                strokeWidth="8"
              />
              <path
                d="M 760,960 L 745,730 L 665,555"
                stroke={isDrink ? '#234D3E' : '#FFFFFF'}
                strokeWidth="7.5"
              />
              <path
                d="M 985,375 L 1360,345 L 1560,330"
                stroke={isDrink ? '#234D3E' : '#FFFFFF'}
                strokeWidth="8.5"
              />
              <path
                d="M 965,485 L 1165,610 L 1460,640"
                stroke={isDrink ? '#234D3E' : '#FFFFFF'}
                strokeWidth="7"
              />
            </g>

            {/* Canalul Bega */}
            <g>
              <path
                d="M -60,895 C 120,830 280,755 445,675 C 585,605 660,565 785,560 C 920,555 1015,525 1140,440 C 1255,360 1385,365 1660,350"
                fill="none"
                stroke={isDrink ? '#0E241C' : '#CBDCE2'}
                strokeWidth="32"
                strokeLinecap="round"
              />
              {BEGA_BRIDGES.map((bridge) => {
                const pt = projectLatLng(bridge.lat, bridge.lng);
                return (
                  <g
                    key={bridge.name}
                    transform={`translate(${pt.x}, ${pt.y}) rotate(${bridge.angle})`}
                  >
                    <rect
                      x="-5"
                      y="-20"
                      width="10"
                      height="40"
                      rx="2"
                      fill={isDrink ? '#234D3E' : '#FFFFFF'}
                      stroke={isDrink ? '#3A6F5B' : '#9C8978'}
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}
              <text
                x="535"
                y="632"
                transform="rotate(-26 535,632)"
                fill={isDrink ? '#5E917E' : '#5D7D87'}
                fontSize="12"
                fontWeight="600"
                className="pointer-events-none"
              >
                Canalul Bega
              </text>
            </g>

            {/* Neighborhood Watermarks (Natural case, Archivo) */}
            <g className="pointer-events-none select-none">
              {[
                { name: 'Iosefin', lat: 45.7478, lng: 21.211 },
                { name: 'Elisabetin', lat: 45.7435, lng: 21.2265 },
                { name: 'Cetate', lat: 45.7598, lng: 21.2275 },
                { name: 'Fabric', lat: 45.7595, lng: 21.2485 },
                { name: 'Complex', lat: 45.7472, lng: 21.2415 },
              ].map((nb) => {
                const pt = projectLatLng(nb.lat, nb.lng);
                return (
                  <text
                    key={nb.name}
                    x={pt.x}
                    y={pt.y}
                    textAnchor="middle"
                    fill={isDrink ? '#F4EEE2' : '#3A2418'}
                    opacity={isDrink ? 0.22 : 0.28}
                    fontSize={16 / Math.pow(zoom, 0.35)}
                    className="font-display"
                  >
                    {nb.name}
                  </text>
                );
              })}
            </g>

            {/* 300m Tourist Zone Rings */}
            {showTouristRings &&
              touristZones.map((zone) => {
                const center = projectLatLng(zone.center.lat, zone.center.lng);
                const radiusSvg = zone.radiusM * SVG_UNITS_PER_METER;
                const isZoneSelected = activeZoneId === zone.id;
                return (
                  <g
                    key={zone.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveZoneId((prev) => (prev === zone.id ? null : zone.id));
                    }}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={radiusSvg}
                      fill={isZoneSelected ? '#E0A526' : '#B3261E'}
                      fillOpacity={isZoneSelected ? 0.16 : 0.08}
                      stroke={isZoneSelected ? '#B3261E' : '#E0A526'}
                      strokeWidth={2 / Math.pow(zoom, 0.5)}
                      strokeDasharray={`${8 / Math.pow(zoom, 0.4)} ${5 / Math.pow(zoom, 0.4)}`}
                    />
                    <g
                      transform={`translate(${center.x}, ${
                        center.y - radiusSvg + 2
                      }) scale(${1 / Math.pow(zoom, 0.55)})`}
                    >
                      <rect
                        x="-76"
                        y="-10"
                        width="152"
                        height="19"
                        rx="3"
                        fill="#E0A526"
                      />
                      <text
                        x="0"
                        y="2.5"
                        textAnchor="middle"
                        fill="#3A2418"
                        fontWeight="700"
                        fontSize="9.5"
                      >
                        {zone.shortName} · 300 m
                      </text>
                    </g>
                  </g>
                );
              })}

            {/* Landmarks */}
            {showLandmarks &&
              TIMISOARA_LANDMARKS.map((lm) => {
                const pt = projectLatLng(lm.lat, lm.lng);
                return (
                  <g
                    key={lm.name}
                    transform={`translate(${pt.x}, ${pt.y}) scale(${
                      1 / Math.pow(zoom, 0.5)
                    })`}
                    className="pointer-events-none"
                  >
                    <circle
                      r="3"
                      fill={isDrink ? '#F4EEE2' : '#FFFFFF'}
                      stroke={isDrink ? '#17382C' : '#6E5649'}
                      strokeWidth="1.5"
                    />
                    <text
                      y="12"
                      textAnchor="middle"
                      fill={isDrink ? '#F4EEE2' : '#6E5649'}
                      opacity={0.75}
                      fontSize="9.5"
                      fontWeight="600"
                    >
                      {lm.name}
                    </text>
                  </g>
                );
              })}

            {/* Leader Lines */}
            {positionedPins.map(({ restaurant, exactX, exactY, x, y }) => {
              const dist = Math.hypot(x - exactX, y - exactY);
              if (dist < 4) return null;
              const isSelected = restaurant.id === activeRestaurantId;
              return (
                <g key={`leader-${restaurant.id}`} className="pointer-events-none">
                  <line
                    x1={exactX}
                    y1={exactY}
                    x2={x}
                    y2={y}
                    stroke={isSelected ? '#B3261E' : '#6E5649'}
                    strokeWidth={(isSelected ? 2 : 1.2) / Math.pow(zoom, 0.5)}
                    strokeDasharray="3 2"
                  />
                  <circle
                    cx={exactX}
                    cy={exactY}
                    r={3 / Math.pow(zoom, 0.5)}
                    fill={isSelected ? '#B3261E' : '#3A2418'}
                  />
                </g>
              );
            })}

            {/* Restaurant / Bar Pins (Rule #4: Traps use warning triangles!) */}
            {positionedPins
              .slice()
              .sort((a, b) => {
                if (a.restaurant.id === activeRestaurantId) return 1;
                if (b.restaurant.id === activeRestaurantId) return -1;
                if (a.restaurant.id === hoveredRestaurantId) return 1;
                if (b.restaurant.id === hoveredRestaurantId) return -1;
                return a.y - b.y;
              })
              .map(({ restaurant, x, y }) => {
                const isSelected = restaurant.id === activeRestaurantId;
                const isHovered = restaurant.id === hoveredRestaurantId;
                const tierStyle = getTierStyles(
                  restaurant.trapTier,
                  restaurant.touristTrapIndex
                );
                const isTrap = restaurant.touristTrapIndex >= 60;
                const isSevereTrap = restaurant.touristTrapIndex >= 80;
                const pinScale =
                  (isSelected ? 1.24 : isHovered ? 1.12 : 1.0) /
                  Math.pow(zoom, 0.55);

                return (
                  <g
                    key={restaurant.id}
                    transform={`translate(${x}, ${y}) scale(${pinScale})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveRestaurantId(restaurant.id);
                    }}
                    onMouseEnter={() => setHoveredRestaurantId(restaurant.id)}
                    onMouseLeave={() => setHoveredRestaurantId(null)}
                    className="cursor-pointer"
                  >
                    <g filter="url(#pin-shadow)">
                      {isDrink && !isTrap ? (
                        /* Suportul de bere circular coaster pin on topdrink */
                        <g transform="translate(0, -18)">
                          <circle
                            r="20"
                            fill="#F4EEE2"
                            stroke={isSelected ? '#F2A33A' : '#B98A5E'}
                            strokeWidth={isSelected ? '3.5' : '2.8'}
                          />
                          <text
                            x="0"
                            y="5.5"
                            textAnchor="middle"
                            className="font-display"
                            fontSize="15"
                            fill="#17382C"
                          >
                            {formatScore(restaurant.foodQualityScore)}
                          </text>
                        </g>
                      ) : (
                        <>
                          <path
                            d="M -26,-34 H 26 A 6,6 0 0 1 32,-28 V -10 A 6,6 0 0 1 26,-4 H 6 L 0,4 L -6,-4 H -26 A 6,6 0 0 1 -32,-10 V -28 A 6,6 0 0 1 -26,-34 Z"
                            fill={isSelected ? '#3A2418' : tierStyle.pinBg}
                            stroke={isSelected ? '#FFFFFF' : tierStyle.border}
                            strokeWidth={isSelected ? '2.2' : '1.8'}
                          />
                          <text
                            x={isTrap ? '-7' : '0'}
                            y="-13"
                            textAnchor="middle"
                            className="font-display"
                            fontSize="15"
                            fill={isSelected ? '#FFFFFF' : tierStyle.pinText}
                          >
                            {formatScore(restaurant.foodQualityScore)}
                          </text>
                          {/* Triangle trap marker inside pin (Rule #4) */}
                          {isTrap && (
                            <g transform="translate(17, -19)">
                              <path
                                d="M 0,-7 L 7,5.5 H -7 Z"
                                fill={isSevereTrap ? '#FFFFFF' : '#3A2418'}
                              />
                              <text
                                x="0"
                                y="3.5"
                                textAnchor="middle"
                                fontSize="8"
                                fontWeight="800"
                                fill={isSevereTrap ? '#B3261E' : '#E0A526'}
                              >
                                !
                              </text>
                            </g>
                          )}
                        </>
                      )}
                    </g>

                    {(isSelected || isHovered || zoom >= 1.55) && (
                      <g transform="translate(0, 18)">
                        <rect
                          x="-68"
                          y="-9"
                          width="136"
                          height="18"
                          rx="3"
                          fill={isSelected ? '#3A2418' : '#FFFFFF'}
                          stroke={isSelected ? '#3A2418' : '#D6CFC5'}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3"
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="600"
                          fill={isSelected ? '#FFFFFF' : '#3A2418'}
                        >
                          {restaurant.name.length > 21
                            ? `${restaurant.name.slice(0, 19)}…`
                            : restaurant.name}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
          </svg>

          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-[4px] bg-white/95 border border-[#D6CFC5] text-[11px] font-semibold text-[#3A2418]">
              <Navigation className="w-3 h-3 text-[#B3261E]" />
              <span>
                {currentLatLng.lat.toFixed(4)}°N, {currentLatLng.lng.toFixed(4)}°E
              </span>
              <span className="opacity-40">|</span>
              <span>{formatScore(zoom)}×</span>
            </div>

            <div className="flex flex-col bg-white rounded-[4px] border border-[#D6CFC5] overflow-hidden text-[#3A2418]">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(4.2, Number((z * 1.3).toFixed(2))))}
                className="p-2.5 hover:bg-[#FAF8F5] border-b border-[#E6DFD5]"
                aria-label="Mărește harta"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.85, Number((z / 1.3).toFixed(2))))}
                className="p-2.5 hover:bg-[#FAF8F5] border-b border-[#E6DFD5]"
                aria-label="Micșorează harta"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => flyToCamera('ALL')}
                className="p-2.5 hover:bg-[#FAF8F5]"
                aria-label="Resetează harta"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Tourist Zone Info */}
          {activeZone && (
            <div className="absolute top-4 left-4 max-w-sm bg-white border border-[#E0A526] rounded-[4px] p-4 shadow-md z-20 text-[#3A2418]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#B3261E] shrink-0" />
                  <h4 className="font-display text-[20px] leading-tight">
                    {activeZone.name}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveZoneId(null)}
                  className="p-1 opacity-70 hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[13px] text-[#6E5649] mt-2 leading-snug">
                {activeZone.description}
              </p>
              <div className="mt-2.5 pt-2 border-t border-[#E6DFD5] flex items-center justify-between text-[12px]">
                <span>Rază 300 m · 20% semnal capcană</span>
                <button
                  type="button"
                  onClick={() => {
                    setCenterSvg(
                      projectLatLng(activeZone.center.lat, activeZone.center.lng)
                    );
                    setZoom(2.6);
                  }}
                  className="font-semibold text-[#B3261E] underline"
                >
                  Focalizează
                </button>
              </div>
            </div>
          )}

          {/* Bottom Floating Preview Card */}
          {activeRestaurant && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-5 md:w-[430px] bg-white text-[#3A2418] rounded-[6px] border border-[#3A2418] shadow-lg overflow-hidden z-20">
              <div className="px-3.5 py-2 bg-[#FAF8F5] border-b border-[#E6DFD5] flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevRestaurant}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-[3px] border border-[#D6CFC5] bg-white hover:border-[#3A2418]"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Anterior</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextRestaurant}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-[3px] border border-[#D6CFC5] bg-white hover:border-[#3A2418]"
                  >
                    <span>Următorul</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[#6E5649]">
                    {visibleRestaurants.findIndex((r) => r.id === activeRestaurant.id) + 1}{' '}
                    / {visibleRestaurants.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveRestaurantId(null)}
                    className="p-1 text-[#6E5649] hover:text-[#3A2418]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-[24px] leading-tight truncate">
                      {activeRestaurant.name}
                    </h3>
                    <p className="text-[13px] text-[#6E5649] mt-0.5">
                      {activeRestaurant.shortCategory ?? activeRestaurant.cuisine},{' '}
                      {activeRestaurant.shortNeighborhood ?? activeRestaurant.neighborhood} ·{' '}
                      {activeRestaurant.trapBreakdown.touristZoneProximityM} m de centru
                    </p>
                  </div>

                  <span className="font-display text-[36px] leading-none text-[#3A2418] tabular-nums shrink-0">
                    {formatScore(activeRestaurant.foodQualityScore)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-[12px]">
                    <LocalnicBadge
                      label={`Localnici ${formatScore(activeRestaurant.localsScore)}`}
                      size="xs"
                    />
                    <span className="text-[#6E5649]">
                      Turiști <strong>{formatScore(activeRestaurant.touristsScore)}</strong>
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
                  className="w-full py-2.5 px-4 rounded-[4px] bg-[#B3261E] text-white font-bold text-[13px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
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
