import Link from 'next/link';
import { BookOpenText, Check, ChevronDown, ChevronRight, Circle, KeyRound, MessageSquareText, Store, UsersRound, type LucideIcon } from 'lucide-react';
import { cityPage, owner } from '@tftd/api';
import { CoasterScore, PlateScore, TrapBadge } from '@/components/BrandPrimitives';
import { AuthForm } from '@/components/owner/AuthForm';
import { ClaimForm } from '@/components/owner/ClaimForm';
import { AppealForm } from '@/components/owner/AppealForm';
import { IconEditor } from '@/components/owner/IconEditor';
import { EmptyState } from '@/components/owner/ui';
import { buttonClass } from '@/components/owner/ui-classes';
import { getDb } from '@/lib/server/db';
import { getUserId } from '@/lib/server/session';

import { respondToInviteAction, leaveTeamAsEmployeeAction } from './actions';

export const dynamic = 'force-dynamic';

/** Culorile din design/README.md pentru butoane și chip-uri: Carou, Chihlimbar, Sticlă (albastrul rămâne doar pentru „localnic”). */
const TONES = {
  carou: { chip: 'border-[#B3261E]/40 bg-[#B3261E]/10 hover:bg-[#B3261E]/20', dot: 'bg-[#B3261E] text-white' },
  chihlimbar: { chip: 'border-[#F2A33A]/60 bg-[#F2A33A]/20 hover:bg-[#F2A33A]/30', dot: 'bg-[#F2A33A] text-[#17382C]' },
  sticla: { chip: 'border-o-line bg-[#17382C]/10 hover:bg-[#17382C]/20', dot: 'bg-[#17382C] text-[#F4EEE2]' },
} as const;
type Tone = keyof typeof TONES;

/** Buton-pastilă cu iconiță pe cerc colorat; `solid` = acțiune urgentă, plin în culoarea de accent. */
function Pill({ href, tone, icon: Icon, solid = false, children }: { href: string; tone: Tone; icon: LucideIcon; solid?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center gap-2 rounded-[4px] border py-1 pl-1.5 pr-3.5 text-[14px] font-semibold transition-colors ${
        solid ? 'border-transparent bg-o-accent text-o-accent-fg hover:bg-o-accent-hover' : `text-o-fg ${TONES[tone].chip}`
      }`}
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${solid ? 'bg-white/20' : TONES[tone].dot}`}>
        <Icon size={16} aria-hidden="true" />
      </span>
      {children}
    </Link>
  );
}

const dateLine = (now = new Date()) =>
  new Intl.DateTimeFormat('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Bucharest' }).format(now);

/** Salutul după ora din București. */
function greeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('ro-RO', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Bucharest' }).format(now));
  return hour >= 5 && hour < 11 ? 'Bună dimineața' : hour >= 11 && hour < 18 ? 'Bună ziua' : 'Bună seara';
}

/** Cutia unei secțiuni: titlu + conținut, încadrate împreună peste tapet. */
function Box({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-titlu`} className="scroll-mt-20 rounded-[4px] border border-o-line bg-o-card p-5 sm:p-8">
      <h2 id={`${id}-titlu`} className="font-display mb-5 text-balance text-[30px] leading-none text-o-fg">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function OwnerHome() {
  const userId = await getUserId();
  if (!userId) return <AuthForm />;

  const db = getDb();
  const [mine, invites, employments, name, unanswered, resume, checklists, appealed, food, drink, owned] = await Promise.all([
    owner.managedVenues(db, userId),
    owner.pendingInvites(db, userId),
    owner.myEmployments(db, userId),
    owner.displayName(db, userId),
    owner.unansweredReviews(db, userId),
    owner.pendingClaim(db, userId),
    owner.profileChecklists(db, userId),
    owner.openTrapAppeals(db, userId),
    cityPage(db, { citySlug: 'timisoara', vertical: 'food', limit: 200 }),
    cityPage(db, { citySlug: 'timisoara', vertical: 'drink', limit: 200 }),
    owner.ownedVenueIds(db),
  ]);
  const activeEmployments = employments.filter((e) => e.accepted);
  const ranked = new Map([...food.top, ...drink.top].map((v) => [v.id, v]));
  const claimable = [
    ...food.top.map((v) => ({ id: v.id, name: v.name, group: 'Restaurante', neighborhood: v.neighborhood, vertical: 'food' as const })),
    ...drink.top.map((v) => ({ id: v.id, name: v.name, group: 'Baruri și cluburi', neighborhood: v.neighborhood, vertical: 'drink' as const })),
  // Doar localurile fără proprietar: pe cele revendicate deja nu le mai poate cere altcineva
  ].filter((v) => !mine.some((m) => m.id === v.id) && !owned.has(v.id));

  // Antetul: ce așteaptă o acțiune, fiecare cu link către locul unde se rezolvă.
  const totalUnanswered = [...unanswered.values()].reduce((a, b) => a + b, 0);
  const todo = [
    totalUnanswered ? { href: '#localele-tale', tone: 'carou' as Tone, icon: MessageSquareText, label: `${totalUnanswered} ${totalUnanswered === 1 ? 'review fără răspuns' : 'review-uri fără răspuns'}` } : null,
    invites.length ? { href: '#invitatii', tone: 'chihlimbar' as Tone, icon: UsersRound, label: `${invites.length} ${invites.length === 1 ? 'invitație în echipă' : 'invitații în echipă'}` } : null,
    resume ? { href: '#revendica', tone: 'sticla' as Tone, icon: KeyRound, label: `Revendicare în curs: ${resume.venueName}` } : null,
  ].filter((t) => t !== null);

  return (
    <div className="flex flex-col gap-6">
      <header className="relative overflow-hidden rounded-[4px] border border-o-line bg-o-card p-6 sm:p-10 lg:p-12">
        {name ? (
          <p className="relative mb-4 text-[15px] text-o-muted">
            <span className="font-semibold text-o-fg">
              {greeting()}, {name}
            </span>
            <span aria-hidden="true"> · </span>
            {dateLine()}
          </p>
        ) : null}
        <h1 className="font-display relative text-[48px] leading-[0.95] text-o-fg sm:text-[64px] lg:text-[72px]">
          Panoul <span className="font-display-light">proprietarului</span>
        </h1>
        <p className="relative mt-7 max-w-xl text-[16px] leading-relaxed text-o-muted lg:max-w-[28rem]">
          Răspunde la review-uri, scrie pe blog și adaugă echipa. Plata nu schimbă niciodată scorul sau locul în top.
        </p>
        {todo.length ? (
          <ul aria-label="Ce așteaptă o acțiune" className="relative mt-6 flex flex-wrap gap-2">
            {todo.map((t) => (
              <li key={t.href}>
                <a
                  href={t.href}
                  className={`inline-flex min-h-11 items-center gap-2.5 rounded-[4px] border py-1.5 pl-1.5 pr-3.5 text-[14px] font-semibold text-o-fg transition-colors ${TONES[t.tone].chip}`}
                >
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${TONES[t.tone].dot}`}>
                    <t.icon size={17} aria-hidden="true" />
                  </span>
                  {t.label} <ChevronRight size={16} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="relative mt-6 inline-flex items-center gap-2 text-[15px] text-o-muted">
            <Check size={17} aria-hidden="true" /> Nimic de făcut acum.
          </p>
        )}
      </header>

      {invites.length ? (
        <Box id="invitatii" title="Invitații în echipă">
          <ul className="flex flex-col gap-3">
            {invites.map((i) => (
              <li key={i.employeeId} className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-o-line p-4">
                <span className="text-[15px]">
                  <strong>{i.venueName}</strong> te-a adăugat ca <strong>{i.role}</strong>. Numele tău apare public doar dacă accepți.
                </span>
                <span className="flex gap-2">
                  <form action={respondToInviteAction.bind(null, i.employeeId, true)}>
                    <button type="submit" aria-label={`Acceptă invitația de la ${i.venueName}`} className={buttonClass()}>
                      Acceptă
                    </button>
                  </form>
                  <form action={respondToInviteAction.bind(null, i.employeeId, false)}>
                    <button type="submit" aria-label={`Refuză invitația de la ${i.venueName}`} className={buttonClass('quiet')}>
                      Refuză
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </Box>
      ) : null}

      {activeEmployments.length ? (
        <Box id="echipele-mele" title="Echipele din care faci parte">
          <p className="mb-4 text-[14px] text-o-muted">
            Conform GDPR (#7), prenumele tău apare public doar cât timp rămâi în echipă. Poți ieși oricând cu un singur click.
          </p>
          <ul className="flex flex-col gap-3">
            {activeEmployments.map((e) => (
              <li key={e.employeeId} className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-o-line p-4">
                <span className="text-[15px]">
                  <strong>{e.venueName}</strong> · {e.role} ({e.firstName})
                </span>
                <form action={leaveTeamAsEmployeeAction.bind(null, e.employeeId)}>
                  <button type="submit" className={buttonClass('quiet')}>
                    Ieși din echipă
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Box>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Box id="localele-tale" title="Localele tale">
          {mine.length ? (
            <ul className="-mx-2 flex flex-col divide-y divide-o-line border-y border-o-line">
              {mine.map((v) => {
                const r = ranked.get(v.id);
                const open = unanswered.get(v.id) ?? 0;
                const checklist = checklists.get(v.id);
                return (
                  <li key={v.id} className="flex items-start gap-3.5 px-2 py-5 sm:gap-5">
                    <IconEditor
                      venueId={v.id}
                      name={v.name}
                      vertical={v.vertical}
                      icon={{ symbol: v.iconSymbol, color: v.iconColor, image: v.iconImage }}
                      canEdit={v.role === 'owner'}
                    />
                    <div className="min-w-0 flex-1">
                      <Link href={`/owner/${v.id}`} className="group inline-flex max-w-full items-center gap-1.5 rounded-[4px]">
                        <span className="font-display line-clamp-2 text-[30px] leading-[1.02] text-o-fg group-hover:underline">{v.name}</span>
                        <ChevronRight aria-hidden="true" className="size-5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] text-o-muted">
                        <span>
                          {v.role === 'owner' ? 'Proprietar' : 'Manager'} · {v.vertical === 'food' ? 'TOP FOOD' : 'TOP DRINK'}
                        </span>
                        {r?.honestScore != null ? (
                          <span className="inline-flex items-center gap-2">
                            {v.vertical === 'drink' ? (
                              <CoasterScore score={r.honestScore} size="md" />
                            ) : (
                              <PlateScore score={r.honestScore} size="md" />
                            )}
                            <span className="font-semibold tabular-nums text-o-fg">Locul #{r.rank}</span>
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Pill href={`/owner/${v.id}/review-uri`} tone="carou" icon={MessageSquareText} solid={open > 0}>
                          Review-uri{open ? ` · ${open} fără răspuns` : ''}
                        </Pill>
                        <Pill href={`/owner/${v.id}/blog`} tone="chihlimbar" icon={BookOpenText}>
                          Blog
                        </Pill>
                        <Pill href={`/owner/${v.id}/echipa`} tone="sticla" icon={UsersRound}>
                          Echipă
                        </Pill>
                      </div>

                      {r && r.trapLevel !== 'none' ? (
                        <details className="mt-3 max-w-xl rounded-[4px] border border-o-line bg-o-surface">
                          <summary className="owner-summary flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-[14px] font-semibold">
                            <span className="inline-flex flex-wrap items-center gap-2">
                              <TrapBadge variant={r.trapLevel === 'trap' ? 'severe' : 'possible'} /> De ce are triunghiul?
                            </span>
                            <ChevronDown aria-hidden="true" className="owner-chevron size-4 shrink-0" />
                          </summary>
                          <div className="flex flex-col gap-3 border-t border-o-line p-3">
                            {r.explanation?.trapReasons?.length ? (
                              <ul className="list-disc space-y-1 pl-5 text-[14px] leading-relaxed">
                                {r.explanation.trapReasons.map((t) => (
                                  <li key={t.text}>{t.text}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-[14px] text-o-muted">Motivele nu sunt calculate încă.</p>
                            )}
                            <AppealForm venueId={v.id} alreadyAppealed={appealed.has(v.id)} />
                          </div>
                        </details>
                      ) : null}

                      {checklist ? (
                        <details className="mt-3 max-w-xl">
                          <summary className="owner-summary flex min-h-11 cursor-pointer items-center gap-3 text-[14px] font-semibold">
                            <span>
                              Profil {checklist.done} din {checklist.total}
                            </span>
                            <span aria-hidden="true" className="h-1.5 w-28 overflow-hidden rounded-full bg-o-line">
                              <span className="block h-full rounded-full bg-[#F2A33A]" style={{ width: `${(checklist.done / checklist.total) * 100}%` }} />
                            </span>
                            <ChevronDown aria-hidden="true" className="owner-chevron size-4 shrink-0" />
                          </summary>
                          <ul className="mt-1 flex flex-col divide-y divide-o-line border-y border-o-line">
                            {checklist.items.map((i) => (
                              <li key={i.key} className="flex min-h-11 items-center justify-between gap-3 py-2 text-[14px]">
                                <span className="inline-flex items-center gap-2.5">
                                  {i.done ? <Check size={17} aria-hidden="true" className="shrink-0 text-o-fg" /> : <Circle size={17} aria-hidden="true" className="shrink-0 text-o-muted" />}
                                  <span className={i.done ? 'text-o-muted' : 'font-semibold'}>{i.label}</span>
                                </span>
                                {i.done ? null : (
                                  <Link href={`/owner/${v.id}/${i.section}`} className="inline-flex min-h-11 shrink-0 items-center gap-1 font-semibold underline-offset-2 hover:underline">
                                    Rezolvă <ChevronRight size={15} aria-hidden="true" />
                                  </Link>
                                )}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="Niciun local încă" icon={<Store size={24} />}>
              Caută-ți localul în lista alăturată și confirmă cu codul primit prin SMS.
            </EmptyState>
          )}
        </Box>

        <Box id="revendica" title="Ești proprietarul unui local?">
          <ClaimForm venues={claimable} resume={resume} />
        </Box>
      </div>
    </div>
  );
}
