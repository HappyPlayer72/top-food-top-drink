'use server';

import { revalidatePath } from 'next/cache';
import { ServiceError, submitSocialLinkNow } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { errorMessage, getUserId } from '@/lib/server/session';
import { embedSrc } from '@/lib/embed';
import { field, type FormState } from '@/lib/form';

async function requireUser(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new ServiceError('unauthorized', 'Intră în cont ca să continui.');
  return userId;
}

/** Link TikTok/Instagram/YouTube trimis de user; embed-ul și eticheta „reclamă?” apar după procesare. */
export async function submitLinkAction(venueId: string, _: FormState, fd: FormData): Promise<FormState> {
  const url = field(fd, 'url');
  if (embedSrc(url) === null) return { error: 'Linkul trebuie să fie un video TikTok, Instagram sau YouTube.' };
  try {
    const { status } = await submitSocialLinkNow(getDb(), { venueId, url, userId: await requireUser() });
    if (status === 'duplicate') return { error: 'Linkul a fost deja trimis.' };
    if (status === 'failed') return { error: 'N-am putut citi video-ul. Verifică dacă e public.' };
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath(`/owner/${venueId}`);
  return { ok: true, message: 'Gata, video-ul apare mai jos.' };
}
