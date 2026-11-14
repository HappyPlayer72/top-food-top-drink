'use server';
/**
 * Decizia vine legată de buton (`formAction={decideX.bind(null, 'approve')}`), nu din `name`/`value`
 * al butonului: la trimiterea formularului fără JavaScript, valoarea butonului nu ajungea în FormData.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { moderation, refreshAfterModeration, visits } from '@tftd/api';
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

/** Bonul unei vizite: aprobat → review-ul primește „vizită verificată” (×1,3). Poza se șterge oricum. */
export async function decideReceipt(decision: string, data: FormData) {
  const id = await adminId();
  const proofId = String(data.get('id') ?? '');
  if (!proofId || (decision !== 'approve' && decision !== 'reject')) throw new Error('Decizie invalidă.');
  await visits.decideReceipt(getDb(), id, proofId, decision === 'approve', String(data.get('note') ?? '').slice(0, 500));
  revalidatePath('/admin');
  revalidatePath('/', 'layout');
}
