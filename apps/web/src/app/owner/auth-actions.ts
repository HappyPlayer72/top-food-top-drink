'use server';

import { redirect } from 'next/navigation';
import { accounts } from '@tftd/api';
import { getDb } from '@/lib/server/db';
import { clearSession, errorMessage, setSession } from '@/lib/server/session';
import { field, keep, type FormState } from '@/lib/form';

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await accounts.login(getDb(), { login: field(fd, 'login'), password: String(fd.get('password') ?? '') });
    await setSession(user.id);
  } catch (e) {
    return keep(fd, { error: errorMessage(e) });
  }
  redirect('/owner');
}

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    const user = await accounts.register(getDb(), {
      username: field(fd, 'username'),
      displayName: field(fd, 'displayName'),
      email: field(fd, 'email') || undefined,
      password: String(fd.get('password') ?? ''),
    });
    await setSession(user.id);
  } catch (e) {
    return keep(fd, { error: errorMessage(e) });
  }
  redirect('/owner');
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect('/owner');
}
