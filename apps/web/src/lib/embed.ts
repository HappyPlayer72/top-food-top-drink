/**
 * URL-ul oficial de embed (iframe) pentru un video TikTok, Instagram sau YouTube.
 * Construim noi URL-ul din ID-ul validat, în loc să injectăm HTML-ul din oEmbed (fără XSS),
 * iar Instagram merge așa fără token Meta. null = linkul nu e un video suportat.
 */
export function embedSrc(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  const parts = u.pathname.split('/').filter(Boolean);

  if (host === 'tiktok.com' || host === 'm.tiktok.com') {
    // /@user/video/{id}; linkurile scurte vm.tiktok.com nu au ID-ul în URL
    const i = parts.indexOf('video');
    const id = i >= 0 ? parts[i + 1] : undefined;
    return id && /^\d+$/.test(id) ? `https://www.tiktok.com/embed/v2/${id}` : null;
  }

  if (host === 'instagram.com') {
    const [kind, code] = parts;
    return (kind === 'p' || kind === 'reel') && code && /^[\w-]+$/.test(code) ? `https://www.instagram.com/p/${code}/embed` : null;
  }

  let ytId: string | null | undefined = null;
  if (host === 'youtu.be') ytId = parts[0];
  else if (host === 'youtube.com' || host === 'm.youtube.com') ytId = parts[0] === 'shorts' ? parts[1] : u.searchParams.get('v');
  return ytId && /^[\w-]{6,20}$/.test(ytId) ? `https://www.youtube-nocookie.com/embed/${ytId}` : null;
}
