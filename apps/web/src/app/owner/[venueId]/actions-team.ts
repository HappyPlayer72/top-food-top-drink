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

/** Invitația cere un cont: angajatul apare public doar după ce o acceptă (GDPR). */
export async function inviteEmployeeAction(venueId: string, _: FormState, fd: FormData): Promise<FormState> {
  try {
    const actorId = await requireUser(); // înainte de căutarea numelui, ca să nu poată fi ghicite conturi fără login
    const firstName = field(fd, 'firstName');
    const role = field(fd, 'role');
    const username = field(fd, 'username');
    if (!firstName || !role || !username) return { error: 'Completează prenumele, rolul și numele de utilizator.' };
    const userId = await owner.userIdByUsername(getDb(), username);
    if (!userId) return { error: 'Nu există niciun cont cu acest nume de utilizator.' };
    await owner.inviteEmployee(getDb(), actorId, venueId, { firstName, role, userId });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath(`/owner/${venueId}`);
  return { ok: true, message: 'Invitația a fost trimisă. Apare în echipă după ce o acceptă.' };
}

/** Datele publice ale angajatului dispar imediat (active=false). */
export async function removeEmployeeAction(venueId: string, employeeId: string): Promise<void> {
  await owner.removeEmployee(getDb(), await requireUser(), employeeId);
  revalidatePath(`/owner/${venueId}`);
}
