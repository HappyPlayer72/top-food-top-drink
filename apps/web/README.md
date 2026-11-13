# apps/web — Pagini publice (modulul F)

Responsabil: **Frontend** · Next.js (randare pe server, pentru SEO).

Rute (vezi `docs/ARHITECTURA.md` → URL-uri):
- `topfood/{oras}`, `topfood/{oras}/{slug}`, `topfood/{oras}/categorie/{cat}`, `topfood/{oras}/top-luna`
- `topdrink/{oras}`, `topdrink/{oras}/{slug}`, `topdrink/{oras}/top-luna`, `topdrink/{oras}/weekend`
- `/u/{username}`, `/owner` (privat), `/admin` (privat)

Domeniul decide verticala (food/drink); primul segment decide orașul. Gândit pentru mobil.
Sloturile „Sponsorizat” sunt componente separate de topul onest.
