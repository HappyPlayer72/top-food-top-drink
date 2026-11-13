'use server';

import { revalidatePath } from 'next/cache';
import { loyalty, ServiceError } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { errorMessage, getUserId } from '@/lib/server/session';
import { field, keep, type FormState } from '@/lib/form';

const ICONS = ['soup', 'coffee', 'croissant', 'pizza', 'beer', 'wine', 'heart', 'cat'] as const;

/** Owner-ul creează (sau înlocuiește) cardul de fidelitate al localului. */
export async function createProgramAction(venueId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const userId = await getUserId();
    if (!userId) throw new ServiceError('unauthorized', 'Intră în cont ca să continui.');
    const icon = field(fd, 'icon') as (typeof ICONS)[number];
    await loyalty.createVenueProgram(getDb(), userId, venueId, {
      rewardTitle: field(fd, 'rewardTitle'),
      stampsRequired: Number(field(fd, 'stampsRequired')),
      icon: ICONS.includes(icon) ? icon : 'heart',
    });
    revalidatePath(`/owner/${venueId}/fidelitate`);
    return { ok: true, message: 'Cardul de fidelitate e activ. Arată codul QR clienților la casă.' };
  } catch (e) {
    return keep(fd, { error: errorMessage(e) });
  }
}
