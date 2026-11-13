'use server';

// Fiecare Server Action e un endpoint public: verifică sesiunea aici, iar backend-ul verifică dreptul pe local.
import { revalidatePath } from 'next/cache';
import { accounts, owner, ServiceError } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { errorMessage, getUserId } from '@/lib/server/session';
import { field, type ClaimState } from '@/lib/form';

async function requireUser(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new ServiceError('unauthorized', 'Intră în cont ca să continui.');
  return userId;
}

// ---------- Revendicare ----------

export async function startClaimAction(_: ClaimState, fd: FormData): Promise<ClaimState> {
  try {
    const userId = await requireUser();
    const venueId = field(fd, 'venueId');
    if (!venueId) return { error: 'Alege localul.' };
    const { claimId, sendTo } = await accounts.startClaim(getDb(), userId, venueId, 'phone_code');
    // `code` rămâne pe server: în realitate pleacă prin SMS/apel la numărul public al localului.
    return { claimId, sendTo };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function confirmClaimAction(prev: ClaimState, fd: FormData): Promise<ClaimState> {
  try {
    const userId = await requireUser();
    await accounts.confirmClaim(getDb(), userId, field(fd, 'claimId'), { code: field(fd, 'code') });
  } catch (e) {
    return { ...prev, error: errorMessage(e) };
  }
  revalidatePath('/owner');
  return { ok: true, message: 'Gata, acum administrezi localul.' };
}

// ---------- Invitații primite ca angajat ----------

export async function respondToInviteAction(employeeId: string, accept: boolean): Promise<void> {
  const userId = await requireUser();
  await owner.respondToInvite(getDb(), userId, employeeId, accept);
  revalidatePath('/owner');
}

