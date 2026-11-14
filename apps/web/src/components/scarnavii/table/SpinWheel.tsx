'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Flame } from 'lucide-react';
import { segmentCenter, wheelLabel, wheelTargetRotation } from './tableGames';
import type { TableTheme, Tone } from './theme';

export interface WheelSegment {
  id: string;
  label: string;
  /** 1–3 ardei în loc de text (intensitatea provocării). */
  marks?: number;
  tone: Tone;
}

interface SpinWheelProps {
  segments: WheelSegment[];
  targetIndex: number | null;
  /** Crește la fiecare învârtire; 0 = încă nu s-a învârtit. */
  spinKey: number;
  onDone: (index: number) => void;
  theme: TableTheme;
  size?: string;
}

const SPIN_MS = 3600;
const R = 96;

const point = (deg: number, r: number) => {
  const rad = (deg * Math.PI) / 180;
  return `${(100 + r * Math.sin(rad)).toFixed(2)} ${(100 - r * Math.cos(rad)).toFixed(2)}`;
};

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function SpinWheel({ segments, targetIndex, spinKey, onDone, theme, size = 'min(84vw, 340px)' }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [animate, setAnimate] = useState(true);
  const rotationRef = useRef(0);
  const finishRef = useRef<(() => void) | null>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (spinKey === 0 || targetIndex === null || segments.length === 0) return;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onDoneRef.current(targetIndex);
    };
    finishRef.current = finish;
    const next = wheelTargetRotation(rotationRef.current, targetIndex, segments.length, 5, (Math.random() - 0.5) * 0.7);
    rotationRef.current = next;
    const reduce = prefersReducedMotion();
    setAnimate(!reduce);
    setRotation(next);
    if (reduce) {
      finish();
      return;
    }
    // plasă de siguranță: transitionend nu vine dacă tabul e ascuns
    const timer = window.setTimeout(finish, SPIN_MS + 400);
    return () => {
      done = true;
      window.clearTimeout(timer);
    };
    // Doar un spinKey nou pornește o rotire; ținta și feliile vin în aceeași actualizare.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinKey]);

  const count = segments.length;
  const seg = 360 / count;
  const fontSize = count <= 4 ? 16 : count <= 8 ? 14 : 10;

  return (
    <div className="relative mx-auto" style={{ width: size, aspectRatio: '1' }}>
      <div
        className="w-full h-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: animate ? `transform ${SPIN_MS}ms var(--ease-out)` : 'none',
        }}
        onTransitionEnd={(e) => {
          if (e.propertyName === 'transform' && e.target === e.currentTarget) finishRef.current?.();
        }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
          {segments.map((s, i) => {
            const tone = theme.tones[s.tone];
            const label = wheelLabel(s.label, count);
            const a0 = i * seg;
            const a1 = a0 + seg;
            const d =
              count === 1
                ? `M100 ${100 - R} A${R} ${R} 0 1 1 99.99 ${100 - R} Z`
                : `M100 100 L${point(a0, R)} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${point(a1, R)} Z`;
            return (
              <g key={`${s.id}-${i}`}>
                <path d={d} fill={tone.fill} stroke="#B98A5E" strokeWidth="1.5" />
                {s.marks ? (
                  // ardeii stau pe rază, cu vârful spre margine, de la exterior spre butuc
                  Array.from({ length: s.marks }, (_, k) => (
                    <g key={k} transform={`translate(100 100) rotate(${(segmentCenter(i, count) - 90).toFixed(2)}) translate(${74 - k * 17} 0) rotate(90)`}>
                      <Flame x={-8} y={-8} size={16} color={tone.ink} fill={tone.ink} strokeWidth={1.5} />
                    </g>
                  ))
                ) : (
                <text
                  transform={`translate(100 100) rotate(${(segmentCenter(i, count) - 90).toFixed(2)})`}
                  x={R - 10}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill={tone.ink}
                  // textul stă între butuc (r≈22) și margine (r=86): ~64 de unități
                  fontSize={Math.min(fontSize, 100 / label.length).toFixed(1)}
                  fontWeight={700}
                >
                  {label}
                </text>
                )}
              </g>
            );
          })}
          <circle cx="100" cy="100" r={R} fill="none" stroke="#B98A5E" strokeWidth="4" />
          <circle cx="100" cy="100" r="20" fill="#B98A5E" stroke="#3A2418" strokeWidth="2" />
          <circle cx="100" cy="100" r="13" fill="none" stroke="#FBF6EA" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      </div>
      <svg viewBox="0 0 24 24" className="absolute left-1/2 -top-2 w-8 h-8 -translate-x-1/2" aria-hidden="true">
        <path d="M4 3h16L12 21z" fill={theme.tones.b.fill} stroke="#FBF6EA" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
