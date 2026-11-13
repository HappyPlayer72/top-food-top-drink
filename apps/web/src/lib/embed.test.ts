import { describe, expect, it } from 'vitest';
import { embedSrc } from './embed';

describe('embedSrc', () => {
  it('TikTok video → iframe-ul oficial', () => {
    expect(embedSrc('https://www.tiktok.com/@x/video/7312345678901234567')).toBe('https://www.tiktok.com/embed/v2/7312345678901234567');
  });
  it('Instagram reel sau post → /p/{code}/embed', () => {
    expect(embedSrc('https://www.instagram.com/reel/C1a2B3c4D5e/')).toBe('https://www.instagram.com/p/C1a2B3c4D5e/embed');
    expect(embedSrc('https://instagram.com/p/C1a2B3c4D5e')).toBe('https://www.instagram.com/p/C1a2B3c4D5e/embed');
  });
  it('YouTube: youtu.be, watch?v=, shorts → youtube-nocookie', () => {
    expect(embedSrc('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(embedSrc('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(embedSrc('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
  it('null pentru linkuri nesuportate sau periculoase', () => {
    for (const url of [
      'javascript:alert(1)',
      'https://evil.com/video/123',
      'https://tiktok.com.evil.com/@x/video/1',
      'https://vm.tiktok.com/ZMabc/',
      'https://www.tiktok.com/@x/video/12ab',
      'http://www.tiktok.com/@x/video/123',
      'nu e url',
    ]) expect(embedSrc(url), url).toBeNull();
  });
});
