'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { moderation } from '@tftd/api';
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
