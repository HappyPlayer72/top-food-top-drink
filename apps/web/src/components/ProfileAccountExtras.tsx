'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ExternalLink, Link2, ShieldCheck, Trash2, Users } from 'lucide-react';
import {
  confirmSocialVerificationAction,
  leaveTeamAction,
  respondEmployeeInviteAction,
  startSocialVerificationAction,
  unlinkSocialAction,
} from '@/app/actions/user';
import type { UserAccount, UserSocialLink, Vertical } from '../types';
import { LocalVerificationPanel } from './LocalVerificationPanel';

type Platform = UserSocialLink['platform'];

export function ProfileAccountExtras({
  user,
  vertical,
  onUserUpdated,
  onMessage,
}: {
  user: UserAccount;
  vertical: Vertical;
  onUserUpdated: (user: UserAccount) => void;
  onMessage?: (msg: string) => void;
}) {
  const router = useRouter();
  const isDrink = vertical === 'drink';
  const [platform, setPlatform] = useState<Platform>('tiktok');
  const [url, setUrl] = useState('');
  const [followers, setFollowers] = useState('');
  const [challengeCode, setChallengeCode] = useState<string | null>(null);
  const [bioSnippet, setBioSnippet] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);

  const pendingInvites = (user.employments ?? []).filter((e) => !e.accepted);
  const activeTeams = (user.employments ?? []).filter((e) => e.accepted);
  const links = user.socialLinks ?? [];

  const border = isDrink ? 'border-white/15 bg-white/5 text-white' : 'border-cafea/15 bg-cafea/[0.03] text-cafea';
  const inputCls = isDrink
    ? 'w-full rounded border border-white/20 bg-black/30 px-2.5 py-1.5 text-xs text-white placeholder:text-white/40'
    : 'w-full rounded border border-cafea/20 bg-white px-2.5 py-1.5 text-xs text-cafea placeholder:text-cafea-deschis';
  const muted = isDrink ? 'text-white/65' : 'text-cafea-deschis';

  const handleStartVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !url.trim()) return;
    setBusy(true);
    setStatus(null);
    const res = await startSocialVerificationAction({
      platform,
      url: url.trim(),
      followers: followers ? Number(followers) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setStatus({ text: res.error, error: true });
      return;
    }
    setChallengeCode(res.code);
    onUserUpdated(res.user);
    setStatus({ text: res.instruction, error: false });
  };

  const handleConfirmVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !bioSnippet.trim()) return;
    setBusy(true);
    setStatus(null);
    const res = await confirmSocialVerificationAction({
      platform,
      bioSnippet: bioSnippet.trim(),
      followers: followers ? Number(followers) : undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setStatus({ text: res.error, error: true });
      return;
    }
    setChallengeCode(null);
    setBioSnippet('');
    setUrl('');
    onUserUpdated(res.user);
    const msg = res.influencer
      ? 'Cont verificat! Ai ≥ 1.000 urmăritori — ai primit insigna de Influencer.'
      : 'Cont social verificat cu succes.';
    setStatus({ text: msg, error: false });
    onMessage?.(msg);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      {user.username && (
        <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${border}`}>
          <span className={muted}>Profil public: @{user.username}</span>
          <Link
            href={`/u/${encodeURIComponent(user.username)}`}
            className="inline-flex items-center gap-1 font-semibold text-carou hover:underline"
          >
            Vezi profilul <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}

      {user.role !== 'verified-local' && (
        <LocalVerificationPanel vertical={vertical} onVerified={onMessage} />
      )}

      {(pendingInvites.length > 0 || activeTeams.length > 0) && (
        <section className={`space-y-2 rounded-lg border p-3 text-xs ${border}`}>
          <div className="flex items-center gap-1.5 font-semibold">
            <Users className="h-3.5 w-3.5 text-carou" />
            <span>Echipă & invitații (GDPR)</span>
          </div>
          {pendingInvites.map((inv) => (
            <div key={inv.employeeId} className="space-y-1.5 rounded border border-current/10 p-2">
              <p>
                <strong>{inv.venueName}</strong> te-a invitat ca <strong>{inv.role}</strong> ({inv.firstName}). Prenumele apare public doar dacă accepți.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const r = await respondEmployeeInviteAction(inv.employeeId, true);
                    setBusy(false);
                    if (r.ok) {
                      onUserUpdated(r.user);
                      onMessage?.(`Ai acceptat invitația la ${inv.venueName}.`);
                      router.refresh();
                    }
                  }}
                  className="rounded bg-patrunjel px-2.5 py-1 font-semibold text-white hover:opacity-90"
                >
                  Acceptă
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const r = await respondEmployeeInviteAction(inv.employeeId, false);
                    setBusy(false);
                    if (r.ok) {
                      onUserUpdated(r.user);
                      onMessage?.(`Ai refuzat invitația de la ${inv.venueName}.`);
                      router.refresh();
                    }
                  }}
                  className="rounded border border-current/25 px-2.5 py-1 font-medium"
                >
                  Refuză
                </button>
              </div>
            </div>
          ))}
          {activeTeams.map((team) => (
            <div key={team.employeeId} className="flex items-center justify-between gap-2 rounded border border-current/10 p-2">
              <span>
                <strong>{team.venueName}</strong> · {team.role}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const r = await leaveTeamAction(team.employeeId);
                  setBusy(false);
                  if (r.ok) {
                    onUserUpdated(r.user);
                    onMessage?.(`Ai ieșit din echipa ${team.venueName}.`);
                    router.refresh();
                  }
                }}
                className="rounded border border-carou/40 px-2 py-0.5 text-[11px] font-semibold text-carou hover:bg-carou/10"
              >
                Ieși din echipă
              </button>
            </div>
          ))}
        </section>
      )}

      <section className={`space-y-2.5 rounded-lg border p-3 text-xs ${border}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-carou" />
            Cont social & Influencer
          </span>
          {user.isInfluencer && (
            <span className="rounded bg-carou/15 px-1.5 py-0.5 text-[10px] font-bold text-carou">
              Influencer activ
            </span>
          )}
        </div>
        <p className={muted}>
          Leagă TikTok, Instagram sau YouTube și pune codul primit în bio pentru verificare (≥ 1.000 urmăritori = insignă Influencer).
        </p>

        {links.length > 0 && (
          <ul className="space-y-1">
            {links.map((l) => (
              <li key={l.platform} className="flex items-center justify-between gap-2 rounded border border-current/10 px-2 py-1">
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="truncate font-medium hover:underline">
                  {l.platform.toUpperCase()} {l.followers ? `(${l.followers.toLocaleString('ro-RO')})` : ''}
                </a>
                <span className="flex shrink-0 items-center gap-1.5">
                  {l.verified ? (
                    <span className="inline-flex items-center gap-0.5 text-patrunjel font-semibold">
                      <CheckCircle2 className="h-3 w-3" /> Verificat
                    </span>
                  ) : (
                    <span className={muted}>Neverificat</span>
                  )}
                  <button
                    type="button"
                    aria-label={`Șterge cont ${l.platform}`}
                    onClick={async () => {
                      const r = await unlinkSocialAction(l.platform);
                      if (r.ok) {
                        onUserUpdated(r.user);
                        router.refresh();
                      }
                    }}
                    className="p-0.5 text-carou hover:opacity-75"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleStartVerify} className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value as Platform);
                setChallengeCode(null);
              }}
              aria-label="Platformă socială"
              className={inputCls}
            >
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
            </select>
            <input
              type="number"
              min={0}
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
              placeholder="Urmăritori (ex: 1500)"
              className={inputCls}
            />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={`https://www.${platform === 'youtube' ? 'youtube.com/@cont' : `${platform}.com/@cont`}`}
            className={inputCls}
          />
          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded bg-cafea px-3 py-1.5 font-semibold text-hartie hover:opacity-90 disabled:opacity-50"
          >
            <Link2 className="h-3 w-3" />
            Generează cod de verificare
          </button>
        </form>

        {challengeCode && (
          <form onSubmit={handleConfirmVerify} className="space-y-1.5 rounded border border-carou/30 bg-carou/5 p-2">
            <p className="font-semibold">
              Codul tău: <code className="select-all rounded bg-white/80 px-1.5 py-0.5 text-cafea">{challengeCode}</code>
            </p>
            <textarea
              rows={2}
              value={bioSnippet}
              onChange={(e) => setBioSnippet(e.target.value)}
              placeholder={`Lipește textul din bio care conține ${challengeCode}`}
              className={inputCls}
            />
            <button
              type="submit"
              disabled={busy || !bioSnippet.trim()}
              className="w-full rounded bg-carou px-3 py-1.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Confirmă verificarea
            </button>
          </form>
        )}

        {status && (
          <p className={status.error ? 'text-carou font-medium' : 'text-patrunjel font-medium'} role="status">
            {status.text}
          </p>
        )}
      </section>
    </div>
  );
}
