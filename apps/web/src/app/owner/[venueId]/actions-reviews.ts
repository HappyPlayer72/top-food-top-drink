'use server';

import { revalidatePath } from 'next/cache';
import { owner, ServiceError } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { errorMessage, getUserId } from '@/lib/server/session';
import { field, type FormState } from '@/lib/form';

async function requireUser(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new ServiceError('unauthorized', 'Intră în cont ca să continui.');
  return userId;
}

/** Răspuns public sub review. Owner-ul nu poate șterge sau ascunde review-uri (regula 2). */
export async function replyAction(venueId: string, reviewId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    await owner.replyToReview(getDb(), await requireUser(), reviewId, field(fd, 'text'));
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath(`/owner/${venueId}`);
  return { ok: true, message: 'Răspunsul a fost publicat.' };
}

/** Raportarea ajunge la admin; review-ul nu dispare automat. */
export async function reportAction(venueId: string, reviewId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    await owner.reportReview(getDb(), await requireUser(), reviewId, field(fd, 'reason'));
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath(`/owner/${venueId}`);
  return { ok: true, message: 'Am trimis raportarea la un admin.' };
}

/** Contestarea etichetei de capcană turistică; decide un admin. */
export async function appealTrapAction(venueId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const reason = field(fd, 'reason');
    if (reason.length < 10) return { error: 'Explică în câteva cuvinte de ce eticheta e greșită.' };
    await owner.appealTrapLabel(getDb(), await requireUser(), venueId, reason);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath(`/owner/${venueId}`);
  return { ok: true, message: 'Contestația a ajuns la un admin.' };
}
