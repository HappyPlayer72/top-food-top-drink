// Doar pentru server: userul din backend → `UserAccount` (tipul folosit de componente).
import { eq } from 'drizzle-orm';
import { users } from '@tftd/db';
import type { Db } from '@tftd/api';
import type { UserAccount } from '../../types';

export async function toUserAccount(db: Db, userId: string, now = new Date()): Promise<UserAccount | null> {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u) return null;
  const isLocal = !!u.localCitySlug && !!u.localUntil && u.localUntil > now;
  return {
    id: u.id,
    name: u.displayName,
    email: u.email ?? undefined,
    role: isLocal ? 'verified-local' : 'tourist',
    neighborhood: isLocal ? (u.localNeighborhood ?? undefined) : undefined,
    weightMultiplier: isLocal ? 2.0 : 1.0,
    description: isLocal
      ? `Localnic verificat${u.localNeighborhood ? ` din ${u.localNeighborhood}` : ''} · review-urile tale au pondere 2,0×.`
      : 'Cont obișnuit (1,0×). Devii localnic verificat după check-in în Timișoara în 5 zile diferite sau cu emailul universitar.',
    interests: u.interests,
  };
}
