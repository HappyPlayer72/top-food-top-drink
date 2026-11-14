'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { setVenueIconAction } from '@/app/owner/actions';
import { EMPTY } from '@/lib/form';
import { Chip, Field, FormMessage, SubmitButton } from './ui';
import { buttonClass, inputClass } from './ui-classes';
import { COLORS, SYMBOLS, VenueIcon, type IconColor, type IconSymbol, type VenueIconValue } from './venue-icon';

const MAX_FILE_BYTES = 8 * 1024 * 1024;

/** Decupează pătrat din centru și micșorează la 96×96 px (JPEG, câțiva KB), ca să încapă în baza de date. */
async function toSmallDataUrl(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 96, 96);
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 96, 96);
  return canvas.toDataURL('image/jpeg', 0.85);
}

const defaults = (vertical: 'food' | 'drink') => (vertical === 'drink' ? { symbol: 'beer', color: 'sticla' } : { symbol: 'utensils', color: 'carou' });

/** Fereastra în care ownerul alege poza sau simbolul + culoarea localului. Doar owner-ul o deschide (verificat și pe server). */
export function IconDialog({ venueId, venueName, vertical, current, open, onClose }: {
  venueId: string;
  venueName: string;
  vertical: 'food' | 'drink';
  current: VenueIconValue;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState(setVenueIconAction, EMPTY);
  const [tab, setTab] = useState<'symbol' | 'image' | 'initials'>(current.image ? 'image' : 'symbol');
  const [symbol, setSymbol] = useState<string>(current.symbol ?? defaults(vertical).symbol);
  const [color, setColor] = useState<string>(current.color ?? defaults(vertical).color);
  const [image, setImage] = useState<string>(current.image ?? '');
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // `state` e un obiect nou după fiecare salvare, deci redeschiderea ferestrei nu o închide din nou.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    if (state.ok) onCloseRef.current();
  }, [state]);

  async function pick(file: File | undefined) {
    setFileError('');
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return setFileError('Poza e prea mare (maximum 8 MB).');
    try {
      setImage(await toSmallDataUrl(file));
    } catch {
      setFileError('Nu am putut citi poza. Încearcă un JPG, PNG sau WebP.');
    }
  }

  const preview: VenueIconValue =
    tab === 'image' ? { symbol: null, color: null, image: image || null } : tab === 'symbol' ? { symbol, color, image: null } : { symbol: null, color: null, image: null };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className="m-auto max-h-[92vh] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-[4px] border border-o-line bg-o-bg p-0 text-o-fg backdrop:bg-black/55"
    >
      <form action={action} className="flex flex-col gap-5 p-5 sm:p-7">
        <input type="hidden" name="venueId" value={venueId} />
        <input type="hidden" name="symbol" value={symbol} />
        <input type="hidden" name="color" value={color} />
        <input type="hidden" name="image" value={image} />

        <div className="flex items-center gap-4">
          <VenueIcon name={venueName} icon={preview} size={96} />
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-balance text-[28px] leading-none">
              Cum apare localul în listă
            </h2>
            <p className="mt-1.5 truncate text-[14px] text-o-muted">{venueName}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Chip active={tab === 'symbol'} onClick={() => setTab('symbol')}>
            Simbol
          </Chip>
          <Chip active={tab === 'image'} onClick={() => setTab('image')}>
            Poză
          </Chip>
          <Chip active={tab === 'initials'} onClick={() => setTab('initials')}>
            Doar inițialele
          </Chip>
        </div>

        {tab === 'symbol' ? (
          <>
            <div role="group" aria-label="Simbol" className="grid grid-cols-6 gap-2">
              {(Object.keys(SYMBOLS) as IconSymbol[]).map((key) => {
                const { Icon, label } = SYMBOLS[key];
                const on = symbol === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    aria-label={label}
                    title={label}
                    onClick={() => setSymbol(key)}
                    className={`btn-press flex size-11 items-center justify-center rounded-[4px] transition-colors ${on ? 'bg-o-active text-o-active-fg' : 'border border-o-field-line hover:bg-o-fg/[0.07]'}`}
                  >
                    <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <div role="group" aria-label="Culoare" className="flex flex-wrap gap-3">
              {(Object.keys(COLORS) as IconColor[]).map((key) => {
                const c = COLORS[key];
                const on = color === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    aria-label={c.label}
                    title={c.label}
                    onClick={() => setColor(key)}
                    className={`btn-press flex size-11 items-center justify-center rounded-full ${on ? 'outline-2 outline-offset-2 outline-o-fg' : ''}`}
                    style={{ backgroundColor: c.bg, color: c.fg }}
                  >
                    {on ? <Check size={18} strokeWidth={2.4} aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
          </>
        ) : tab === 'initials' ? (
          <p className="text-[15px] leading-relaxed text-o-muted">Fără poză și fără simbol: în listă apar inițialele numelui, pe cerc. Poți schimba oricând.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <Field label="Poza localului" hint="Se decupează pătrat și se micșorează la 96×96 px. JPG, PNG sau WebP.">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => pick(e.target.files?.[0])}
                className={`${inputClass} file:mr-3 file:rounded-[3px] file:border-0 file:bg-o-quiet file:px-3 file:py-1.5 file:font-semibold file:text-o-fg`}
              />
            </Field>
            {fileError ? <p className="text-[14px] font-semibold text-o-danger">{fileError}</p> : null}
          </div>
        )}

        <FormMessage state={state} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span />
          <span className="flex gap-2">
            <button type="button" onClick={onClose} className={buttonClass('quiet')}>
              Mai târziu
            </button>
            <SubmitButton name="kind" value={tab === 'initials' ? 'reset' : tab} pendingLabel="Se salvează…" disabled={tab === 'image' && !image}>
              Salvează
            </SubmitButton>
          </span>
        </div>
      </form>
    </dialog>
  );
}

/** Pictograma din rândul unui local; owner-ul o poate apăsa ca să o schimbe (creionul din colț). */
export function IconEditor({ venueId, name, vertical, icon, canEdit, size = 76 }: {
  venueId: string;
  name: string;
  vertical: 'food' | 'drink';
  icon: VenueIconValue;
  canEdit: boolean;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  if (!canEdit) return <VenueIcon name={name} icon={icon} size={size} />;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={`Schimbă pictograma pentru ${name}`} className="btn-press relative shrink-0 rounded-full transition-transform hover:-rotate-6 motion-reduce:hover:rotate-0">
        <VenueIcon name={name} icon={icon} size={size} />
        <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full bg-o-bg text-o-fg shadow-[inset_0_0_0_1.5px_var(--o-fg)]">
          <Pencil size={14} />
        </span>
      </button>
      <IconDialog venueId={venueId} venueName={name} vertical={vertical} current={icon} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
