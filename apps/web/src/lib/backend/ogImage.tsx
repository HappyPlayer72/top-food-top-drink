import { ImageResponse } from 'next/og';
import { leaderboardPage } from '@tftd/api';
import { getDb } from '../server/db';
import { DRINK_VENUES, INITIAL_RESTAURANTS } from '../../data/restaurants';
import { findVenue } from './venueRoute';

const fmt = (x: number | null | undefined) => (x == null ? '—' : x.toFixed(1).replace('.', ','));

function palette(vertical: 'food' | 'drink') {
  return vertical === 'drink'
    ? { bg: '#17382C', card: '#143025', border: '#2D5947', fg: '#F4EEE2', muted: '#C4D7CE', accent: '#F2A33A', danger: '#FF7A70' }
    : { bg: '#FAF8F5', card: '#FFFFFF', border: '#E6DFD5', fg: '#3A2418', muted: '#6E5649', accent: '#B3261E', danger: '#B3261E' };
}

export async function renderVenueOgImage(vertical: 'food' | 'drink', slug: string) {
  const p = palette(vertical);
  const v = await findVenue(vertical, slug);
  const brand = vertical === 'drink' ? 'topdrink/timișoara' : 'topfood/timișoara';
  const title = v?.name ?? 'Local în Timișoara';
  const headline = v?.headline ?? 'Scor Onest verificat de localnicii din Timișoara.';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: p.bg,
          color: p.fg,
          padding: '56px 64px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: p.accent, letterSpacing: '-0.02em' }}>
            {brand}
          </div>
          {(v?.trap ?? 0) >= 60 ? (
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: '#FFFFFF', background: '#B3261E', padding: '8px 18px', borderRadius: 8 }}>
              {`Posibilă capcană turistică (${Math.round(v!.trap!)}%)`}
            </div>
          ) : (
            <div style={{ display: 'flex', fontSize: 22, fontWeight: 700, color: p.muted }}>
              Pe gustate, nu pe ghicite
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 740, gap: 16 }}>
            <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
              {title}
            </div>
            <div style={{ fontSize: 28, color: p.muted, lineHeight: 1.35 }}>
              {headline}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: p.card,
              border: `3px solid ${p.accent}`,
              borderRadius: 16,
              padding: '24px 36px',
              minWidth: 220,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: p.muted, textTransform: 'uppercase' }}>
              Scor Onest
            </div>
            <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 1, color: p.accent }}>
              {fmt(v?.honest)}
            </div>
            {v?.locals != null && (
              <div style={{ display: 'flex', fontSize: 20, color: p.muted, marginTop: 8 }}>
                {`Localnici: ${fmt(v.locals)}`}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `2px solid ${p.border}`, paddingTop: 22, fontSize: 22, color: p.muted }}>
          <span>Fără influență plătită · Localnicii cântăresc ×2</span>
          <span>timisoara</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

export async function renderMonthlyOgImage(vertical: 'food' | 'drink', month?: string, dims: { width: number; height: number } = { width: 1200, height: 630 }) {
  const p = palette(vertical);
  const brand = vertical === 'drink' ? 'topdrink/timișoara' : 'topfood/timișoara';
  let entries: { rank: number; name: string; score: number }[] = [];
  let effectiveMonth = month ?? '2026-11';

  if (process.env.DATABASE_URL) {
    try {
      const lb = await leaderboardPage(getDb(), { citySlug: 'timisoara', vertical, month });
      if (lb.month) effectiveMonth = lb.month;
      if (lb.snapshot?.entries?.length) {
        entries = lb.snapshot.entries.slice(0, 5).map((e) => ({ rank: e.rank, name: e.name, score: e.score }));
      }
    } catch {
      entries = [];
    }
  }
  if (!entries.length) {
    const list = (vertical === 'drink' ? DRINK_VENUES : INITIAL_RESTAURANTS)
      .filter((r) => !r.isSponsored && r.touristTrapIndex < 60)
      .sort((a, b) => b.foodQualityScore - a.foodQualityScore)
      .slice(0, 5);
    entries = list.map((r, i) => ({ rank: i + 1, name: r.name, score: r.foodQualityScore }));
  }

  const isVertical = dims.height > dims.width;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: p.bg,
          color: p.fg,
          padding: isVertical ? '96px 72px' : '48px 64px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: isVertical ? 36 : 26, fontWeight: 800, color: p.accent }}>
            {brand}
          </div>
          <div style={{ display: 'flex', fontSize: isVertical ? 84 : 56, fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.03em' }}>
            {`Topul lunii · ${effectiveMonth}`}
          </div>
          <div style={{ fontSize: isVertical ? 32 : 22, color: p.muted }}>
            Clasament bazat pe review-urile verificate ale localnicilor
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: isVertical ? 26 : 14 }}>
          {entries.map((e) => (
            <div
              key={e.rank}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: p.card,
                border: `2px solid ${e.rank === 1 ? p.accent : p.border}`,
                borderRadius: 12,
                padding: isVertical ? '28px 34px' : '14px 24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                <span style={{ fontSize: isVertical ? 44 : 28, fontWeight: 900, color: p.accent }}>
                  {`#${e.rank}`}
                </span>
                <span style={{ fontSize: isVertical ? 40 : 26, fontWeight: 700 }}>
                  {e.name}
                </span>
              </div>
              <span style={{ fontSize: isVertical ? 46 : 30, fontWeight: 900, color: p.accent }}>
                {fmt(e.score)}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `2px solid ${p.border}`, paddingTop: 24, fontSize: isVertical ? 28 : 20, color: p.muted }}>
          <span>Sponsorizatul nu schimbă scorul</span>
          <span>timisoara</span>
        </div>
      </div>
    ),
    dims
  );
}
