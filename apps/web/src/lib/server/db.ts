// Doar pentru server (Server Components / Server Actions): deschide conexiuni la Postgres.
import { createDb, type Db } from '@tftd/api';

const g = globalThis as unknown as { tftdDb?: Db };

/** O singură instanță per proces; în dev supraviețuiește hot reload-ului. */
export function getDb(): Db {
  g.tftdDb ??= createDb();
  return g.tftdDb;
}
