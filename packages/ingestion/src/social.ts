/**
 * Linkuri TikTok / Instagram / Facebook trimise de useri (nivelul 3 de ingestie).
 * Afișare prin oEmbed oficial; analizăm doar titlul/descrierea primite de acolo. Fără scraping.
 */
import { adSignals, analyzeAspects } from "@tftd/review-analysis";

export type Platform = "tiktok" | "instagram" | "facebook" | "youtube";

export function detectPlatform(url: string): Platform | null {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\.|^m\./, "");
  } catch {
    return null;
  }
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  if (host === "instagram.com") return "instagram";
  if (host === "facebook.com" || host === "fb.watch") return "facebook";
  if (host === "youtube.com" || host === "youtu.be") return "youtube";
  return null;
}

export type Embed = { html: string | null; title: string | null; authorName: string | null; thumbnailUrl: string | null };

/** oEmbed oficial. Instagram și Facebook cer un token de aplicație Meta (META_OEMBED_TOKEN). */
export async function fetchEmbed(url: string, platform: Platform): Promise<Embed> {
  const endpoint =
    platform === "tiktok"
      ? `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
      : platform === "youtube"
        ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
        : process.env.META_OEMBED_TOKEN
          ? `https://graph.facebook.com/v19.0/${platform === "instagram" ? "instagram_oembed" : "oembed_post"}?url=${encodeURIComponent(url)}&access_token=${process.env.META_OEMBED_TOKEN}`
          : null;
  if (!endpoint) return { html: null, title: null, authorName: null, thumbnailUrl: null };
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`oEmbed ${platform} ${res.status}`);
  const j = (await res.json()) as { html?: string; title?: string; author_name?: string; thumbnail_url?: string };
  return { html: j.html ?? null, title: j.title ?? null, authorName: j.author_name ?? null, thumbnailUrl: j.thumbnail_url ?? null };
}

export type SocialAnalysis = {
  embed: Embed;
  isAd: boolean;
  adSignals: string[];
  sentiment: number | null;
  aspects: Record<string, number>;
  dishes: string[];
  priceMentioned: number | null;
};

/** Eticheta „reclamă?” + sentiment, din titlul/descrierea video-ului. */
export async function analyzeSocial(url: string, platform: Platform, vertical: "food" | "drink"): Promise<SocialAnalysis> {
  const embed = await fetchEmbed(url, platform);
  const caption = embed.title ?? "";
  const signals = adSignals(caption);
  const [aspectResult] = caption ? await analyzeAspects([{ id: "caption", text: caption }], vertical) : [];
  const values = Object.values(aspectResult?.aspects ?? {});
  const price = caption.match(/(\d{1,4})\s*(lei|ron)\b/i);
  return {
    embed,
    isAd: signals.length > 0,
    adSignals: signals,
    sentiment: values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100 : null,
    aspects: aspectResult?.aspects ?? {},
    dishes: aspectResult?.dishes ?? [],
    priceMentioned: price ? Number(price[1]) : null,
  };
}
