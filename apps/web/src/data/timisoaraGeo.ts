import type { TouristZone } from '../types';

export interface NeighborhoodZoneMeta {
  id: string;
  name: string;
  cameraKey: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
  coordinates: [number, number][][];
}

/**
 * Real geographic boundaries (approximate real-world street/canal borders)
 * for Timișoara's main central & historic neighborhoods.
 * Coordinates are [lng, lat] in WGS84.
 */
export const TIMISOARA_NEIGHBORHOOD_ZONES: NeighborhoodZoneMeta[] = [
  {
    id: 'cetate',
    name: 'Cetate',
    cameraKey: 'Cetate / Piața Unirii',
    center: [21.2286, 45.7558],
    zoom: 15.2,
    coordinates: [
      [
        [21.2225, 45.7596], // Piața Mărăști / NW ring
        [21.2278, 45.7606], // Str. Oituz / Cazărmii
        [21.2336, 45.7592], // Punctele Cardinale
        [21.2356, 45.7564], // Bastion / Bd. Take Ionescu
        [21.2341, 45.7532], // Bd. Revoluției / Parcul Civic
        [21.2292, 45.7512], // Bd. I.C. Brătianu / Michelangelo edge
        [21.2238, 45.7506], // Catedrala Mitropolitană / Bega
        [21.2216, 45.7534], // Bd. Regele Ferdinand / Parcul Central
        [21.2210, 45.7568], // Piața 700
        [21.2225, 45.7596],
      ],
    ],
  },
  {
    id: 'iosefin',
    name: 'Iosefin',
    cameraKey: 'Iosefin',
    center: [21.2132, 45.7468],
    zoom: 14.6,
    coordinates: [
      [
        [21.2035, 45.7508], // Gara de Nord / Bd. Dragalina N
        [21.2135, 45.7520], // Bd. Republicii / Spital
        [21.2210, 45.7515], // Podul Maria N
        [21.2215, 45.7478], // Piața Maria / Bd. 16 Decembrie
        [21.2195, 45.7436], // Piața Mocioni / Kutl
        [21.2115, 45.7418], // Bd. 16 Decembrie / Reșiței
        [21.2040, 45.7435], // Piața Iosefin / Bega S
        [21.2018, 45.7472], // Splaiul Tudor Vladimirescu W
        [21.2035, 45.7508],
      ],
    ],
  },
  {
    id: 'elisabetin',
    name: 'Elisabetin',
    cameraKey: 'Elisabetin',
    center: [21.2268, 45.7458],
    zoom: 14.7,
    coordinates: [
      [
        [21.2215, 45.7495], // Podul Maria / Bega
        [21.2275, 45.7502], // Podul Șaguna / Parcul Rozelor
        [21.2334, 45.7496], // Podul Michelangelo / Bega
        [21.2338, 45.7432], // Bd. Eroilor de la Tisa / Cluj
        [21.2282, 45.7410], // Piața Bălcescu / Str. Ciprian Porumbescu
        [21.2202, 45.7426], // Piața Mocioni / Bd. 16 Decembrie
        [21.2215, 45.7495],
      ],
    ],
  },
  {
    id: 'complex',
    name: 'Complexul Studențesc',
    cameraKey: 'Complexul Studențesc',
    center: [21.2402, 45.7486],
    zoom: 15.0,
    coordinates: [
      [
        [21.2335, 45.7502], // Podul Michelangelo / Bega
        [21.2415, 45.7532], // Podul Decebal / Parcul Copiilor
        [21.2472, 45.7508], // Str. Pestalozzi / Bega
        [21.2468, 45.7448], // Aleea Studenților E / Str. Ripensia
        [21.2385, 45.7438], // Str. Cluj / Stadion
        [21.2338, 45.7452], // Bd. Eroilor de la Tisa
        [21.2335, 45.7502],
      ],
    ],
  },
  {
    id: 'fabric',
    name: 'Fabric',
    cameraKey: 'Fabric',
    center: [21.2485, 45.7574],
    zoom: 14.7,
    coordinates: [
      [
        [21.2365, 45.7582], // Bd. Take Ionescu / Punctele Cardinale E
        [21.2448, 45.7615], // Piața Badea Cârțan / Calea Dorobanților
        [21.2555, 45.7605], // Str. Andrei Șaguna / Uzinei
        [21.2568, 45.7552], // Parcul Poporului / Bega E
        [21.2475, 45.7538], // Podul Dacilor / Bd. 3 August 1919
        [21.2385, 45.7540], // Parcul Poporului W / Podul Decebal N
        [21.2365, 45.7582],
      ],
    ],
  },
];

export const TIMISOARA_LANDMARKS = [
  { name: 'Domul Romano-Catolic', lat: 45.7580, lng: 21.2299 },
  { name: 'Palatul Baroc', lat: 45.7576, lng: 21.2282 },
  { name: 'Catedrala Mitropolitană', lat: 45.7508, lng: 21.2242 },
  { name: 'Opera Națională', lat: 45.7544, lng: 21.2257 },
  { name: 'Bastionul Maria Theresia', lat: 45.7568, lng: 21.2335 },
  { name: 'Piața Traian', lat: 45.7578, lng: 21.2488 },
  { name: 'Piața Iosefin', lat: 45.7452, lng: 21.2098 },
  { name: 'Parcul Rozelor', lat: 45.7495, lng: 21.2308 },
] as const;

/**
 * Generates a true geodesic circle polygon (WGS84) for a given center & radius in meters.
 * Ensures 300m tourist rings match real-world street distances accurately.
 */
export function createGeodesicCircleCoords(
  lat: number,
  lng: number,
  radiusM: number,
  steps = 64
): [number, number][] {
  const earthRadiusM = 6378137;
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const angularDist = radiusM / earthRadiusM;

  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i * 2 * Math.PI) / steps;
    const sinLat2 =
      Math.sin(latRad) * Math.cos(angularDist) +
      Math.cos(latRad) * Math.sin(angularDist) * Math.cos(bearing);
    const lat2 = Math.asin(sinLat2);
    const lng2 =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDist) * Math.cos(latRad),
        Math.cos(angularDist) - Math.sin(latRad) * sinLat2
      );
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI]);
  }
  return coords;
}

export function buildNeighborhoodsGeoJSON(activeCameraKey: string) {
  return {
    type: 'FeatureCollection' as const,
    features: TIMISOARA_NEIGHBORHOOD_ZONES.map((zone) => ({
      type: 'Feature' as const,
      id: zone.id,
      properties: {
        id: zone.id,
        name: zone.name,
        cameraKey: zone.cameraKey,
        isActive:
          activeCameraKey === zone.cameraKey ||
          (zone.id === 'cetate' &&
            (activeCameraKey === 'Cetate / Piața Unirii' ||
              activeCameraKey === 'Piața Victoriei' ||
              activeCameraKey === 'Piața Libertății' ||
              activeCameraKey === 'Bastion')),
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: zone.coordinates,
      },
    })),
  };
}

export function buildNeighborhoodLabelsGeoJSON() {
  return {
    type: 'FeatureCollection' as const,
    features: TIMISOARA_NEIGHBORHOOD_ZONES.map((zone) => ({
      type: 'Feature' as const,
      properties: {
        id: zone.id,
        name: zone.name,
        cameraKey: zone.cameraKey,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: zone.center,
      },
    })),
  };
}

export function buildTouristZonesGeoJSON(
  zones: TouristZone[],
  activeZoneId: string | null
) {
  return {
    type: 'FeatureCollection' as const,
    features: zones.map((zone) => ({
      type: 'Feature' as const,
      id: zone.id,
      properties: {
        id: zone.id,
        name: zone.name,
        shortName: zone.shortName,
        radiusM: zone.radiusM,
        label: `${zone.shortName} · ${zone.radiusM} m`,
        isSelected: activeZoneId === zone.id,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          createGeodesicCircleCoords(
            zone.center.lat,
            zone.center.lng,
            zone.radiusM
          ),
        ],
      },
    })),
  };
}

export function buildTouristZoneLabelsGeoJSON(
  zones: TouristZone[],
  activeZoneId: string | null
) {
  return {
    type: 'FeatureCollection' as const,
    features: zones.map((zone) => {
      // Place badge at the north edge of the 300m geodesic circle
      const northEdge = createGeodesicCircleCoords(
        zone.center.lat,
        zone.center.lng,
        zone.radiusM,
        4
      )[0];
      return {
        type: 'Feature' as const,
        properties: {
          id: zone.id,
          label: `${zone.shortName} · ${zone.radiusM} m`,
          isSelected: activeZoneId === zone.id,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: northEdge,
        },
      };
    }),
  };
}

export const OPENFREEMAP_POSITRON_URL =
  'https://tiles.openfreemap.org/styles/positron';

interface MapLayerLike {
  id: string;
  type?: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
}

interface MapStyleLike {
  layers?: MapLayerLike[];
  [key: string]: unknown;
}

/**
 * Applies the TOP FOOD (warm Spumă paper + Cafea ink + editorial sage/water)
 * or TOP DRINK (deep Sticlă + Chihlimbar + Spumă) skin directly onto OpenFreeMap vector layers.
 */
export function applyTopFoodMapSkin<T extends MapStyleLike>(
  rawStyle: T,
  isDrink: boolean
): T {
  const style = JSON.parse(JSON.stringify(rawStyle)) as T;
  if (!Array.isArray(style.layers)) return style;

  const palette = isDrink
    ? {
        bg: '#143025',
        park: '#1A3E30',
        wood: '#183A2C',
        residential: '#163529',
        water: '#0D2119',
        building: '#193C2F',
        buildingOutline: '#245240',
        roadMinor: '#1F493A',
        roadMajorCasing: '#10271E',
        roadMajorInner: '#285A47',
        roadMotorwayCasing: '#0E221A',
        roadMotorwayInner: '#2F6852',
        path: '#1C4133',
        rail: '#265241',
        boundary: '#336652',
        labelText: '#D8D1C5',
        labelHalo: '#143025',
        waterLabel: '#6BA38F',
        roadLabel: '#B9C9C1',
      }
    : {
        bg: '#F6F2EA',
        park: '#E2EAD8',
        wood: '#D9E4CC',
        residential: '#F2ECE1',
        water: '#CBDCE2',
        building: '#EAE2D3',
        buildingOutline: '#DCD2C0',
        roadMinor: '#FFFFFF',
        roadMajorCasing: '#DED4C3',
        roadMajorInner: '#FFFFFF',
        roadMotorwayCasing: '#D2C4AF',
        roadMotorwayInner: '#FCF8F0',
        path: '#EAE2D5',
        rail: '#D4C9B8',
        boundary: '#C8BA9F',
        labelText: '#4F392C',
        labelHalo: '#F6F2EA',
        waterLabel: '#4E727D',
        roadLabel: '#6E5649',
      };

  style.layers = style.layers.map((layer) => {
    const id = layer.id;
    const paint = { ...(layer.paint ?? {}) };

    if (id === 'background') {
      paint['background-color'] = palette.bg;
    } else if (id === 'park') {
      paint['fill-color'] = palette.park;
      paint['fill-opacity'] = 0.85;
    } else if (id === 'landcover_wood') {
      paint['fill-color'] = palette.wood;
      paint['fill-opacity'] = 0.7;
    } else if (id === 'landuse_residential') {
      paint['fill-color'] = palette.residential;
      paint['fill-opacity'] = 0.55;
    } else if (id === 'water') {
      paint['fill-color'] = palette.water;
    } else if (id === 'waterway') {
      paint['line-color'] = palette.water;
    } else if (id === 'building') {
      paint['fill-color'] = palette.building;
      paint['fill-outline-color'] = palette.buildingOutline;
      paint['fill-opacity'] = 0.88;
    } else if (id === 'highway_path') {
      paint['line-color'] = palette.path;
    } else if (id === 'highway_minor') {
      paint['line-color'] = palette.roadMinor;
    } else if (
      id === 'highway_major_casing' ||
      id === 'tunnel_motorway_casing' ||
      id === 'highway_motorway_bridge_casing'
    ) {
      paint['line-color'] = palette.roadMajorCasing;
    } else if (
      id === 'highway_major_inner' ||
      id === 'highway_major_subtle'
    ) {
      paint['line-color'] = palette.roadMajorInner;
    } else if (id === 'highway_motorway_casing') {
      paint['line-color'] = palette.roadMotorwayCasing;
    } else if (
      id === 'highway_motorway_inner' ||
      id === 'highway_motorway_subtle' ||
      id === 'tunnel_motorway_inner' ||
      id === 'highway_motorway_bridge_inner'
    ) {
      paint['line-color'] = palette.roadMotorwayInner;
    } else if (id.startsWith('railway')) {
      paint['line-color'] = palette.rail;
    } else if (id.startsWith('boundary')) {
      paint['line-color'] = palette.boundary;
    } else if (
      id === 'waterway_line_label' ||
      id.startsWith('water_name')
    ) {
      paint['text-color'] = palette.waterLabel;
      paint['text-halo-color'] = palette.labelHalo;
    } else if (id.startsWith('highway-name')) {
      paint['text-color'] = palette.roadLabel;
      paint['text-halo-color'] = palette.labelHalo;
    } else if (layer.type === 'symbol') {
      paint['text-color'] = palette.labelText;
      paint['text-halo-color'] = palette.labelHalo;
    }

    return {
      ...layer,
      paint,
    };
  });

  return style;
}
