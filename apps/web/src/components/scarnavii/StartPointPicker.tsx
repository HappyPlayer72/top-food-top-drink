'use client';

import React, { useEffect, useRef } from 'react';
import type * as maplibreglType from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Coordinates } from '../../types';
import { OPENFREEMAP_POSITRON_URL, applyTopFoodMapSkin } from '../../data/timisoaraGeo';

const CITY_CENTER: Coordinates = { lat: 45.7537, lng: 21.2257 };

/** Hartă mică: apeși sau tragi pinul ca să alegi punctul de plecare. */
export function StartPointPicker({ value, isDrink, onPick }: { value: Coordinates | null; isDrink: boolean; onPick: (point: Coordinates) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibreglType.Map | null>(null);
  const markerRef = useRef<maplibreglType.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const initialValue = useRef(value);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const maplibregl = await import('maplibre-gl');
      if (cancelled || !containerRef.current) return;
      maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
      let style: maplibreglType.StyleSpecification | string = OPENFREEMAP_POSITRON_URL;
      try {
        const response = await fetch(OPENFREEMAP_POSITRON_URL);
        if (response.ok) style = applyTopFoodMapSkin(await response.json(), isDrink, isDrink);
      } catch { /* rămâne stilul de bază */ }
      if (cancelled || !containerRef.current) return;

      const center = initialValue.current ?? CITY_CENTER;
      const map = new maplibregl.Map({ container: containerRef.current, style, center: [center.lng, center.lat], zoom: 14, minZoom: 11, maxZoom: 18.5, attributionControl: { compact: true } });
      const marker = new maplibregl.Marker({ draggable: true, color: isDrink ? '#F2A33A' : '#B3261E' }).setLngLat([center.lng, center.lat]);
      if (initialValue.current) marker.addTo(map);
      mapRef.current = map;
      markerRef.current = marker;
      map.on('click', (event) => {
        marker.setLngLat(event.lngLat).addTo(map);
        onPickRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      });
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLngLat();
        onPickRef.current({ lat, lng });
      });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [isDrink]);

  // Punct ales din altă parte (GPS sau listă): mutăm pinul și harta acolo.
  useEffect(() => {
    const map = mapRef.current;
    if (!value || !map || !markerRef.current) return;
    markerRef.current.setLngLat([value.lng, value.lat]).addTo(map);
    map.easeTo({ center: [value.lng, value.lat] });
  }, [value]);

  return <div ref={containerRef} role="application" aria-label="Hartă: apasă sau trage pinul ca să alegi punctul de plecare" className="h-64 w-full overflow-hidden rounded-[6px] border sm:h-80" />;
}
