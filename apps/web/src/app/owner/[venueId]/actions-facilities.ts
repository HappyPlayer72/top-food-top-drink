'use server';

import { revalidatePath } from 'next/cache';
import { owner, ServiceError } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { errorMessage, getUserId } from '@/lib/server/session';
import { type FormState } from '@/lib/form';

async function requireUser(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new ServiceError('unauthorized', 'Intră în cont ca să continui.');
  return userId;
}

/** Facilitățile declarate de owner: câmpurile `f:<cheie>` = yes | no | unspecified; setFacilities verifică managerul. */
export async function saveFacilitiesAction(venueId: string, _: FormState, fd: FormData): Promise<FormState> {
  const raw: Record<string, string> = {};
  for (const [k, v] of fd) if (k.startsWith('f:') && typeof v === 'string') raw[k.slice(2)] = v;
  try {
    await owner.setFacilities(getDb(), await requireUser(), venueId, raw);
  } catch (e) {
    return { error: errorMessage(e), values: raw, seq: Date.now() };
  }
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Facilitățile au fost salvate.', values: raw, seq: Date.now() };
}
