'use server';

import { revalidatePath } from 'next/cache';
import { owner, ServiceError } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { errorMessage, getUserId } from '@/lib/server/session';
import { field, keep, type FormState } from '@/lib/form';
import { parseBucharest } from '@/lib/time';

async function requireUser(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new ServiceError('unauthorized', 'Intră în cont ca să continui.');
  return userId;
}

const TYPES = ['menu', 'event', 'offer', 'news'];
// Ora din formular e ora României; serverul poate rula în UTC. Gol → null, invalid → Invalid Date.
const toDate = (v: string) => (v ? (parseBucharest(v) ?? new Date(NaN)) : null);

/** FormData → PostInput. Validarea de aici acoperă și editarea (updatePost nu validează). */
function parsePost(fd: FormData): { input: owner.PostInput } | { error: string } {
  const type = field(fd, 'type');
  const title = field(fd, 'title');
  const body = field(fd, 'body');
  if (!TYPES.includes(type)) return { error: 'Alege tipul postării.' };
  if (!title || title.length > 140) return { error: 'Titlul trebuie să aibă între 1 și 140 de caractere.' };
  if (!body || body.length > 5000) return { error: 'Textul trebuie să aibă între 1 și 5000 de caractere.' };

  const eventAt = type === 'event' ? toDate(field(fd, 'eventAt')) : null;
  const publishAt = toDate(field(fd, 'publishAt'));
  if ([eventAt, publishAt].some((d) => d && isNaN(d.getTime()))) return { error: 'Data introdusă nu e validă.' };
  if (type === 'event' && !eventAt) return { error: 'Un eveniment are nevoie de dată și oră.' };

  const photos = field(fd, 'photos')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('https://'));
  return {
    input: { type: type as owner.PostInput['type'], title, body, photos, eventAt, ...(publishAt && { publishAt }) },
  };
}

export async function createPostAction(venueId: string, _: FormState, fd: FormData): Promise<FormState> {
  const parsed = parsePost(fd);
  if ('error' in parsed) return keep(fd, parsed);
  try {
    await owner.createPost(getDb(), await requireUser(), venueId, parsed.input);
  } catch (e) {
    return keep(fd, { error: errorMessage(e) });
  }
  revalidatePath(`/owner/${venueId}`);
  return { ok: true, message: 'Postarea a fost salvată.' };
}

/** Câmpul „Publică la" gol = rămâne data existentă. */
export async function updatePostAction(venueId: string, postId: string, _: FormState, fd: FormData): Promise<FormState> {
  const parsed = parsePost(fd);
  if ('error' in parsed) return keep(fd, parsed);
  try {
    await owner.updatePost(getDb(), await requireUser(), postId, parsed.input);
  } catch (e) {
    return keep(fd, { error: errorMessage(e) });
  }
  revalidatePath(`/owner/${venueId}`);
  return { ok: true, message: 'Postarea a fost actualizată.' };
}

/** Owner-ul își poate șterge postările (nu și review-urile). O eroare aici ajunge în error boundary. */
export async function deletePostAction(venueId: string, postId: string): Promise<void> {
  await owner.deletePost(getDb(), await requireUser(), postId);
  revalidatePath(`/owner/${venueId}`);
}
