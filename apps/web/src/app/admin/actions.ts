'use server';
/**
 * Decizia vine legată de buton (`formAction={decideX.bind(null, 'approve')}`), nu din `name`/`value`
 * al butonului: la trimiterea formularului fără JavaScript, valoarea butonului nu ajungea în FormData.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { moderation, monetization, refreshAfterModeration, visits } from '@tftd/api';
import { reports } from '@tftd/db';
import { currentUserId, getDb } from './server';

async function adminId() {
  const id = await currentUserId();
  if (!id) redirect('/owner');
  await moderation.assertAdmin(getDb(), id);
  return id;
}

export async function decideReport(decision: string, data: FormData) {
  const id = await adminId();
  const reportId = String(data.get('id') ?? '');
  if (!reportId || !['hide', 'keep', 'accept', 'reject'].includes(decision)) throw new Error('Decizie invalidă.');
  const [report] = await getDb().select({ targetType: reports.targetType, targetId: reports.targetId }).from(reports).where(eq(reports.id, reportId));
  await moderation.resolveReport(getDb(), id, reportId, decision as 'hide' | 'keep' | 'accept' | 'reject', String(data.get('note') ?? '').trim());
  // Review ascuns sau eliberat din filtrul anti-bot → scorul localului se schimbă
  if (report?.targetType === 'review') await refreshAfterModeration(getDb(), report.targetId);
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
}

export async function decideMatch(decision: string, data: FormData) {
  const id = await adminId();
  const candidateId = String(data.get('id') ?? '');
  if (!candidateId || (decision !== 'confirm' && decision !== 'reject')) throw new Error('Decizie invalidă.');
  await moderation.decideMatch(getDb(), id, candidateId, decision === 'confirm');
  revalidatePath('/admin');
}

export async function decideClaim(decision: string, data: FormData) {
  const id = await adminId();
  const claimId = String(data.get('id') ?? '');
  if (!claimId || (decision !== 'approve' && decision !== 'reject')) throw new Error('Decizie invalidă.');
  await moderation.decideClaim(getDb(), id, claimId, decision === 'approve');
  revalidatePath('/admin');
}

export async function decideSuspicious(data: FormData) {
  const id = await adminId();
  const targetUserId = String(data.get('id') ?? '');
  const decision = String(data.get('decision') ?? '');
  if (!targetUserId || (decision !== 'dismiss' && decision !== 'hide_reviews')) throw new Error('Decizie invalidă.');
  await moderation.decideSuspiciousAccount(getDb(), id, targetUserId, decision);
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
}

export async function createAd(data: FormData) {
  const id = await adminId();
  const vertical = String(data.get('vertical') ?? 'food') === 'drink' ? 'drink' : 'food';
  const advertiser = String(data.get('advertiser') ?? '').trim();
  const creativeUrl = String(data.get('creativeUrl') ?? '').trim();
  const linkUrl = String(data.get('linkUrl') ?? '').trim();
  const days = Math.max(1, Math.min(365, Number(data.get('days') ?? 30) || 30));
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + days * 86_400_000);
  await monetization.createAdSlot(getDb(), id, {
    citySlug: 'timisoara',
    vertical,
    placement: 'city_banner',
    advertiser,
    creativeUrl,
    linkUrl,
    startsAt,
    endsAt,
  });
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
}

export async function deleteAd(data: FormData) {
  const id = await adminId();
  const slotId = String(data.get('id') ?? '');
  if (!slotId) throw new Error('Slot invalid.');
  await monetization.deleteAdSlot(getDb(), id, slotId);
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
}

/** Bonul unei vizite: aprobat → review-ul primește „vizită verificată” (×1,3). Poza se șterge oricum. */
export async function decideReceipt(decision: string, data: FormData) {
  const id = await adminId();
  const proofId = String(data.get('id') ?? '');
  if (!proofId || (decision !== 'approve' && decision !== 'reject')) throw new Error('Decizie invalidă.');
  await visits.decideReceipt(getDb(), id, proofId, decision === 'approve', String(data.get('note') ?? '').slice(0, 500));
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
}

/** Scoate un link de social media găsit greșit de căutarea automată (nu mai apare pe pagina localului). */
export async function removeSocialLink(data: FormData) {
  const id = await adminId();
  const submissionId = String(data.get('id') ?? '');
  if (!submissionId) throw new Error('Link lipsă.');
  await moderation.removeSocialLink(getDb(), id, submissionId);
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
}

/** Demo: pune un local la „Sponsorizat” fără plată (până la Stripe). Scorul și topul nu se schimbă. */
export async function grantPartnership(data: FormData) {
  const id = await adminId();
  const venueId = String(data.get('venueId') ?? '');
  const plan = data.get('plan') === 'basic' ? 'basic' : 'highlight';
  const days = Number(data.get('days') ?? 30);
  if (!venueId) throw new Error('Alege un local.');
  await monetization.grantDemoPartnership(getDb(), id, venueId, plan, days);
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
}

export async function cancelPartnership(data: FormData) {
  const id = await adminId();
  const partnershipId = String(data.get('id') ?? '');
  if (!partnershipId) throw new Error('Parteneriat lipsă.');
  await monetization.adminCancelPartnership(getDb(), id, partnershipId);
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
}
