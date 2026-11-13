'use client';

import { useActionState, useState } from 'react';
import type { submitSocialLinkNow, venuePage } from '@tftd/api';
import { submitLinkAction } from '@/app/owner/[venueId]/actions-videos';
import { Field, FormMessage, SubmitButton, inputClass } from '@/components/owner/ui';
import { embedSrc } from '@/lib/embed';
import { EMPTY } from '@/lib/form';

export type VenueVideo = Awaited<ReturnType<typeof venuePage>>['videos'][number];

type Analysis = NonNullable<Awaited<ReturnType<typeof submitSocialLinkNow>>['analysis']>;

const URL_ERROR = 'Linkul trebuie să fie un video TikTok, Instagram sau YouTube.';

function VideoCard({ video, venueName }: { video: VenueVideo; venueName: string }) {
  const src = embedSrc(video.url);
  // jsonb: analysis poate lipsi sau să aibă alt format, deci ghidăm fiecare câmp
  const a = video.analysis as Partial<Analysis> | null;
  const label = [a?.embed?.authorName, a?.embed?.title].filter(Boolean).join(' · ');
  const signals = a?.adSignals ?? [];
  const dishes = a?.dishes ?? [];
  const shape = video.platform === 'youtube' ? 'aspect-video' : 'aspect-[9/16]';

  return (
    <li className="flex flex-col gap-2">
      {src ? (
        <iframe
          src={src}
          title={`Video despre ${venueName}`}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          allow="encrypted-media; picture-in-picture; fullscreen"
          className={`${shape} w-full max-w-[340px] rounded-[4px] border border-hairline`}
        />
      ) : (
        <a href={video.url} rel="noopener noreferrer" target="_blank" className="break-all text-[15px] text-cafea underline">
          {video.url}
        </a>
      )}
      {label ? <p className="line-clamp-2 break-words text-[15px] text-cafea">{label}</p> : null}
      {a?.isAd ? (
        <p className="flex flex-wrap items-center gap-2">
          <span className="rounded-[4px] bg-sponsored-food px-2 py-0.5 text-[13px] font-semibold text-cafea">reclamă?</span>
          {signals.length ? <span className="text-[13px] text-muted-cafea">găsit: {signals.join(', ')}</span> : null}
        </p>
      ) : null}
      {dishes.length || a?.priceMentioned ? (
        <p className="text-[13px] text-muted-cafea">
          {[dishes.length ? `Menționat: ${dishes.join(', ')}` : null, a?.priceMentioned ? `${a.priceMentioned} lei` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}
    </li>
  );
}

export function SocialLinks({ venueId, venueName, videos }: { venueId: string; venueName: string; videos: VenueVideo[] }) {
  const [state, formAction] = useActionState(submitLinkAction.bind(null, venueId), EMPTY);
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <form
        action={formAction}
        onSubmit={(e) => {
          const url = String(new FormData(e.currentTarget).get('url') ?? '');
          const bad = embedSrc(url) === null;
          setClientError(bad ? URL_ERROR : null);
          if (bad) e.preventDefault();
        }}
        className="flex max-w-[520px] flex-col gap-3"
      >
        <Field label="Lipește un link TikTok, Instagram sau YouTube">
          <input
            type="url"
            name="url"
            required
            inputMode="url"
            spellCheck={false}
            placeholder="https://www.tiktok.com/@…/video/…"
            className={inputClass}
          />
        </Field>
        <div>
          <SubmitButton pendingLabel="Se procesează…">Adaugă video-ul</SubmitButton>
        </div>
        <FormMessage state={clientError ? { error: clientError } : state} />
      </form>

      {videos.length ? (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {videos.map((v) => (
            <VideoCard key={v.url} video={v} venueName={venueName} />
          ))}
        </ul>
      ) : (
        <p className="text-[15px] text-muted-cafea">Încă nu sunt videouri despre acest local.</p>
      )}
    </div>
  );
}
