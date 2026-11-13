import { cookies } from 'next/headers';
import { accounts, createDb, type Db } from '@tftd/api';

const globalDb = globalThis as typeof globalThis & { tftdDb?: Db };

export function getDb(): Db {
  return (globalDb.tftdDb ??= createDb());
}

export async function currentUserId(): Promise<string | null> {
  return accounts.verifySessionToken((await cookies()).get('tftd_session')?.value);
}
