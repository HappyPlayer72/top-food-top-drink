'use client';

import { useActionState, useState } from 'react';
import { Clapperboard } from 'lucide-react';
import type { submitSocialLinkNow, venuePage } from '@tftd/api';
import { submitLinkAction } from '@/app/owner/[venueId]/actions-videos';
import { EmptyState, Field, FormMessage, StatStrip, SubHeading, SubmitButton, Tag } from '@/components/owner/ui';
import { frameClass, inputClass, stagger } from '@/components/owner/ui-classes';
import { embedSrc } from '@/lib/embed';
import { EMPTY } from '@/lib/form';

export type VenueVideo = Awaited<ReturnType<typeof venuePage>>['videos'][number];

type Analysis = NonNullable<Awaited<ReturnType<typeof submitSocialLinkNow>>['analysis']>;

const PLATFORM: Record<string, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube' };

const URL_ERROR = 'Linkul trebuie să fie un video TikTok, Instagram sau YouTube.';

function VideoCard({ video, venueName, index }: { video: VenueVideo; venueName: string; index: number }) {
  const src = embedSrc(video.url);
  // jsonb: analysis poate lipsi sau să aibă alt format, deci ghidăm fiecare câmp
  const a = video.analysis as Partial<Analysis> | null;
  const label = [a?.embed?.authorName, a?.embed?.title].filter(Boolean).join(' · ');
  const signals = a?.adSignals ?? [];
  const dishes = a?.dishes ?? [];
  const shape = video.platform === 'youtube' ? 'aspect-video' : 'aspect-[9/16]';

  return (
    <li style={stagger(index)} className="stagger-fade-in flex flex-col overflow-hidden rounded-[4px] border border-o-line bg-o-card">
      <div className="flex justify-center bg-o-surface p-4">
      {src ? (
        <iframe
          src={src}
          title={`Video despre ${venueName}`}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          allow="encrypted-media; picture-in-picture; fullscreen"
          className={`${shape} w-full max-w-[340px] rounded-[4px]`}
        />
      ) : (
        <a href={video.url} rel="noopener noreferrer" target="_blank" className="break-all text-[15px] font-semibold underline underline-offset-2">
          {video.url}
        </a>
      )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Tag>{PLATFORM[video.platform] ?? video.platform}</Tag>
          {a?.isAd ? <Tag tone="quiet">reclamă?</Tag> : null}
        </div>
        {label ? <p className="line-clamp-2 break-words text-[16px] font-semibold leading-snug">{label}</p> : null}
        {a?.isAd && signals.length ? <p className="text-[13px] text-o-muted">găsit: {signals.join(', ')}</p> : null}
        {dishes.length || a?.priceMentioned ? (
          <p className="text-[13px] text-o-muted">
            {[dishes.length ? `Menționat: ${dishes.join(', ')}` : null, a?.priceMentioned ? `${a.priceMentioned} lei` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function SocialLinks({ venueId, venueName, videos }: { venueId: string; venueName: string; videos: VenueVideo[] }) {
  const [state, formAction] = useActionState(submitLinkAction.bind(null, venueId), EMPTY);
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-10">
      <StatStrip
        items={[
          { value: videos.length, label: 'Videouri' },
          { value: videos.filter((v) => (v.analysis as Partial<Analysis> | null)?.isAd).length, label: 'Marcate „reclamă?”' },
        ]}
      />

      <section aria-labelledby="video-nou">
        <SubHeading id="video-nou" note="Analizăm linkul: dacă pare reclamă, îl marcăm „reclamă?”.">
          Adaugă un video
        </SubHeading>
        <form
          action={formAction}
          onSubmit={(e) => {
            const url = String(new FormData(e.currentTarget).get('url') ?? '');
            const bad = embedSrc(url) === null;
            setClientError(bad ? URL_ERROR : null);
            if (bad) e.preventDefault();
          }}
          className={`${frameClass} flex max-w-xl flex-col gap-4 bg-o-card`}
        >
          <Field label="Lipește un link TikTok, Instagram sau YouTube">
            <input
              type="url"
              name="url"
              required
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://www.tiktok.com/@…/video/…"
              className={inputClass}
            />
          </Field>
          <FormMessage state={clientError ? { error: clientError } : state} />
          <div>
            <SubmitButton pendingLabel="Se procesează…">Adaugă video-ul</SubmitButton>
          </div>
        </form>
      </section>

      <section aria-labelledby="video-lista">
        <SubHeading id="video-lista">Videouri despre local</SubHeading>
        {videos.length ? (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v, i) => (
              <VideoCard key={v.url} video={v} venueName={venueName} index={i} />
            ))}
          </ul>
        ) : (
          <EmptyState title="Încă nu sunt videouri" icon={<Clapperboard size={26} />}>Lipește mai sus un link TikTok, Instagram sau YouTube despre local și apare aici, cu analiza lui.</EmptyState>
        )}
      </section>
    </div>
  );
}
