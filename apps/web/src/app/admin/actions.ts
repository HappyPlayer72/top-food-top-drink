'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { moderation, monetization } from '@tftd/api';
import { currentUserId, getDb } from './server';

async function adminId() {
  const id = await currentUserId();
  if (!id) redirect('/owner');
  await moderation.assertAdmin(getDb(), id);
  return id;
}

export async function decideReport(data: FormData) {
  const id = await adminId();
  const reportId = String(data.get('id') ?? '');
  const decision = String(data.get('decision') ?? '');
  if (!reportId || !['hide', 'keep', 'accept', 'reject'].includes(decision)) throw new Error('Decizie invalidă.');
  await moderation.resolveReport(getDb(), id, reportId, decision as 'hide' | 'keep' | 'accept' | 'reject', String(data.get('note') ?? '').trim());
  revalidatePath('/admin');
}

export async function decideMatch(data: FormData) {
  const id = await adminId();
  const candidateId = String(data.get('id') ?? '');
  const decision = data.get('decision');
  if (!candidateId || (decision !== 'confirm' && decision !== 'reject')) throw new Error('Decizie invalidă.');
  await moderation.decideMatch(getDb(), id, candidateId, decision === 'confirm');
  revalidatePath('/admin');
}

export async function decideClaim(data: FormData) {
  const id = await adminId();
  const claimId = String(data.get('id') ?? '');
  const decision = data.get('decision');
  if (!claimId || (decision !== 'approve' && decision !== 'reject')) throw new Error('Decizie invalidă.');
  await moderation.decideClaim(getDb(), id, claimId, decision === 'approve');
  revalidatePath('/admin');
}

export async function decideReceipt(data: FormData) {
  const id = await adminId();
  const reviewId = String(data.get('id') ?? '');
  const decision = data.get('decision');
  if (!reviewId || (decision !== 'approve' && decision !== 'reject')) throw new Error('Decizie invalidă.');
  await moderation.decideReceipt(getDb(), id, reviewId, decision === 'approve');
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
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
