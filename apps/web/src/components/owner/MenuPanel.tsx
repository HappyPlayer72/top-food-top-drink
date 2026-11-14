'use client';

import { useActionState, useRef, useState } from 'react';
import { Plus, Star, Trash2, UtensilsCrossed } from 'lucide-react';
import type { owner } from '@tftd/api';
import { saveMenuAction } from '@/app/owner/[venueId]/actions-menu';
import { EMPTY } from '@/lib/form';
import { AlsoVenues, Field, FormMessage, StatStrip, SubmitButton } from './ui';
import { buttonClass, frameClass, inputClass } from './ui-classes';
import { toSmallDataUrl } from './IconEditor';

// La fel ca MAX_MENU_PHOTO_CHARS din packages/owner (validat și pe server).
const MAX_PHOTO_CHARS = 40_000;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

type MenuRow = Awaited<ReturnType<typeof owner.menuForOwner>>[number];
type Dish = { key: number; name: string; priceLei: string; description: string; mustOrder: boolean; photo: string | null };
type Category = { key: number; title: string; dishes: Dish[] };

/** Meniul pe categorii. Se trimite tot o dată, ca JSON; ordinea de pe ecran e ordinea de pe pagina publică. */
export function MenuPanel({ venueId, menu, vertical, otherVenues }: {
  venueId: string;
  menu: MenuRow[];
  vertical: 'food' | 'drink';
  otherVenues: { id: string; name: string }[];
}) {
  const [state, save] = useActionState(saveMenuAction.bind(null, venueId), EMPTY);
  const nextKey = useRef(0);
  const key = () => ++nextKey.current;
  const blankDish = (): Dish => ({ key: key(), name: '', priceLei: '', description: '', mustOrder: false, photo: null });
  const [categories, setCategories] = useState<Category[]>(() => {
    const byTitle = new Map<string, Category>();
    for (const m of menu) {
      if (!byTitle.has(m.category)) byTitle.set(m.category, { key: key(), title: m.category, dishes: [] });
      byTitle.get(m.category)!.dishes.push({ key: key(), name: m.name, priceLei: m.priceLei?.toString() ?? '', description: m.description ?? '', mustOrder: m.mustOrder, photo: m.photo });
    }
    return byTitle.size ? [...byTitle.values()] : [{ key: key(), title: vertical === 'drink' ? 'Băuturi' : 'Feluri principale', dishes: [blankDish()] }];
  });

  const editCategory = (ck: number, change: (c: Category) => Category) => setCategories((cs) => cs.map((c) => (c.key === ck ? change(c) : c)));
  const editDish = (ck: number, dk: number, patch: Partial<Dish>) =>
    editCategory(ck, (c) => ({ ...c, dishes: c.dishes.map((d) => (d.key === dk ? { ...d, ...patch } : d)) }));

  const dishes = categories.flatMap((c) => c.dishes.filter((d) => d.name.trim()));
  const payload = JSON.stringify(
    categories.flatMap((c) => c.dishes.map((d) => ({ category: c.title, name: d.name, priceLei: d.priceLei, description: d.description, mustOrder: d.mustOrder, photo: d.photo }))),
  );

  return (
    <div className="flex flex-col gap-10">
      <StatStrip
        items={[
          { value: categories.length, label: 'Categorii' },
          { value: dishes.length, label: 'Preparate' },
          { value: dishes.filter((d) => d.mustOrder).length, label: 'Recomandate' },
        ]}
      />

      <form action={save} className="flex flex-col gap-6">
        <input type="hidden" name="menu" value={payload} />
        {categories.map((c, ci) => (
          <section key={c.key} aria-label={c.title || `Categoria ${ci + 1}`} className={`${frameClass} flex flex-col gap-4 bg-o-card`}>
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <Field label="Categorie" hint="ex. Ciorbe, Desert, Cocktailuri">
                  <input value={c.title} maxLength={60} onChange={(e) => editCategory(c.key, (x) => ({ ...x, title: e.target.value }))} className={inputClass} />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => setCategories((cs) => cs.filter((x) => x.key !== c.key))}
                aria-label={`Șterge categoria ${c.title || ci + 1}`}
                className={buttonClass('quiet')}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>

            <ul className="flex flex-col gap-3">
              {c.dishes.map((d, di) => (
                <li key={d.key} className="flex flex-col gap-3 rounded-[4px] border border-o-line bg-o-surface p-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                    <Field label={`Preparat ${di + 1}`}>
                      <input value={d.name} maxLength={80} autoComplete="off" onChange={(e) => editDish(c.key, d.key, { name: e.target.value })} className={inputClass} />
                    </Field>
                    <Field label="Preț (lei)">
                      <input value={d.priceLei} inputMode="numeric" pattern="[0-9]*" onChange={(e) => editDish(c.key, d.key, { priceLei: e.target.value })} className={inputClass} />
                    </Field>
                  </div>
                  <Field label="Descriere (opțional)">
                    <input value={d.description} maxLength={300} onChange={(e) => editDish(c.key, d.key, { description: e.target.value })} className={inputClass} />
                  </Field>
                  <DishPhoto photo={d.photo} onChange={(photo) => editDish(c.key, d.key, { photo })} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex min-h-11 items-center gap-3 text-[15px]">
                      <input type="checkbox" checked={d.mustOrder} onChange={(e) => editDish(c.key, d.key, { mustOrder: e.target.checked })} className="size-5 accent-o-accent" />
                      <Star size={15} aria-hidden="true" /> Recomandat („Ce să comanzi”)
                    </label>
                    <button
                      type="button"
                      onClick={() => editCategory(c.key, (x) => ({ ...x, dishes: x.dishes.filter((y) => y.key !== d.key) }))}
                      className="min-h-11 px-2 text-[14px] font-semibold text-o-muted hover:text-o-fg"
                    >
                      Șterge preparatul
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div>
              <button type="button" onClick={() => editCategory(c.key, (x) => ({ ...x, dishes: [...x.dishes, blankDish()] }))} className={buttonClass('quiet')}>
                <Plus size={16} aria-hidden="true" /> Adaugă preparat
              </button>
            </div>
          </section>
        ))}

        <div>
          <button type="button" onClick={() => setCategories((cs) => [...cs, { key: key(), title: '', dishes: [blankDish()] }])} className={buttonClass('quiet')}>
            <UtensilsCrossed size={16} aria-hidden="true" /> Adaugă categorie
          </button>
        </div>

        <div className={`${frameClass} flex flex-col gap-4`}>
          {/* key: după o eroare, bifele se recreează din state.values (React golește formularul la reset) */}
          <AlsoVenues key={state.seq} venues={otherVenues} legend="Aplică același meniu și la" selected={state.values?.alsoVenueIds} />
          {otherVenues.length ? <p className="text-[13px] text-o-muted">Meniul localurilor bifate va fi înlocuit cu acesta. După salvare le poți modifica separat.</p> : null}
          <FormMessage state={state} />
          <div>
            <SubmitButton pendingLabel="Se salvează…">Salvează meniul</SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}

/** Poza unui fel: se decupează pătrat, se micșorează la 240×240 și se comprimă până încape în limită. */
function DishPhoto({ photo, onChange }: { photo: string | null; onChange: (photo: string | null) => void }) {
  const [error, setError] = useState('');
  // Doar ultima alegere contează: o poză procesată mai târziu nu o suprascrie pe una nouă sau pe „Scoate poza”.
  const latest = useRef(0);
  async function pick(file: File | undefined) {
    const turn = ++latest.current;
    setError('');
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) return setError('Poza e prea mare (maximum 15 MB).');
    try {
      for (const quality of [0.8, 0.65, 0.5, 0.35]) {
        const url = await toSmallDataUrl(file, 240, quality);
        if (turn !== latest.current) return;
        if (url.length <= MAX_PHOTO_CHARS) return onChange(url);
      }
      setError('Nu am putut micșora destul poza. Încearcă alta.');
    } catch {
      setError('Nu am putut citi poza. Încearcă un JPG, PNG sau WebP.');
    }
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="Poza preparatului" width={80} height={80} className="size-20 shrink-0 rounded-[4px] object-cover" />
      ) : null}
      <div className="min-w-0 flex-1">
        {/* fără `name`: fișierul nu pleacă în formular, doar poza micșorată din JSON */}
        <Field label={photo ? 'Schimbă poza' : 'Poză (opțional)'} hint="JPG, PNG sau WebP. Se decupează pătrat.">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => pick(e.target.files?.[0])}
            className={`${inputClass} file:mr-3 file:rounded-[3px] file:border-0 file:bg-o-quiet file:px-3 file:py-1.5 file:font-semibold file:text-o-fg`}
          />
        </Field>
      </div>
      {photo ? (
        <button type="button" onClick={() => { latest.current++; onChange(null); }} className="min-h-11 px-2 text-[14px] font-semibold text-o-muted hover:text-o-fg">
          Scoate poza
        </button>
      ) : null}
      {error ? <p role="alert" className="w-full text-[14px] font-semibold text-o-danger">{error}</p> : null}
    </div>
  );
}
