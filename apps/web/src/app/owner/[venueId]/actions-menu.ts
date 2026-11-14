'use server';

import { revalidatePath } from 'next/cache';
import { owner, ServiceError } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { errorMessage, getUserId } from '@/lib/server/session';
import { alsoVenueIds, field, type FormState } from '@/lib/form';

async function requireUser(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new ServiceError('unauthorized', 'Intră în cont ca să continui.');
  return userId;
}

/** Meniul vine ca JSON (categorii + preparate, din MenuPanel); setMenu verifică fiecare local bifat. */
export async function saveMenuAction(venueId: string, _: FormState, fd: FormData): Promise<FormState> {
  const others = alsoVenueIds(fd);
  try {
    const items = owner.parseMenuInput(field(fd, 'menu'));
    await owner.setMenu(getDb(), await requireUser(), venueId, items, others);
  } catch (e) {
    // Meniul stă în state-ul clientului; păstrăm doar bifele, pe care React le golește la reset.
    return { error: errorMessage(e), values: { alsoVenueIds: others.join(',') }, seq: Date.now() };
  }
  revalidatePath('/', 'layout');
  return { ok: true, message: others.length ? `Meniul a fost salvat aici și la încă ${others.length === 1 ? 'un local' : `${others.length} localuri`}.` : 'Meniul a fost salvat.' };
}
