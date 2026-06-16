/**
 * web-cap script
 *
 * @description Read images and media captions from a Wikipedia article.
 * @param {object} [input]
 * @param {string} [input.title] Article title to open before reading.
 * @param {string} [input.url] Wikipedia article URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain used with input.title.
 * @param {number} [input.limit=50] Maximum media items to return.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, count?: number, media?: Array<object> }}
 * @match https://*.wikipedia.org/wiki/*
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';
  if (input.step !== 'read' && (input.url || input.title)) {
    const targetUrl = input.url || `https://${language}.wikipedia.org/wiki/${encodeURIComponent(String(input.title).trim()).replace(/%20/g, '_')}`;
    return cap.goto(targetUrl, { ...input, language, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 50), 200));
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const absoluteUrl = (href) => {
    if (!href) return '';
    try {
      const url = new URL(href, location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };
  const originalFromThumb = (src) => {
    if (!src) return '';
    const absolute = absoluteUrl(src);
    const match = absolute.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/(.+?)\/[^/]+)$/);
    return match ? `https://upload.wikimedia.org/wikipedia/commons/${match[2]}` : absolute;
  };

  const root = document.querySelector('#mw-content-text') || document.body;
  const captionFor = (img) => {
    const figure = img.closest('figure, .thumb, .gallerybox');
    if (figure) return normalize(figure.querySelector('figcaption, .thumbcaption, .gallerytext')?.textContent || figure.textContent).slice(0, 500);
    const infobox = img.closest('.infobox');
    if (infobox) {
      const rowCaption = normalize(img.closest('tr')?.textContent);
      if (rowCaption && rowCaption.length <= 250) return rowCaption;
      const caption = infobox.querySelector('.infobox-caption');
      if (caption) return normalize(caption.textContent).slice(0, 500);
      const fileTitle = normalize(img.closest('a[href*="/wiki/File:"], a[href*="/wiki/Image:"]')?.getAttribute('title'));
      return fileTitle.replace(/^(File|Image):/i, '').replace(/\.[a-z0-9]+$/i, '').replace(/_/g, ' ');
    }
    return normalize(img.getAttribute('alt')).slice(0, 500);
  };
  const seen = new Set();
  const media = [];
  for (const img of root.querySelectorAll('figure img, .thumb img, .infobox img, .mw-file-element')) {
    if (media.length >= limit) break;
    const src = absoluteUrl(img.currentSrc || img.getAttribute('src'));
    if (!src || seen.has(src)) continue;
    seen.add(src);
    const container = img.closest('figure, .thumb, .infobox, .gallerybox') || img.parentElement;
    const fileLink = img.closest('a[href*="/wiki/File:"], a[href*="/wiki/Image:"]') || container?.querySelector('a[href*="/wiki/File:"], a[href*="/wiki/Image:"]');
    media.push({
      alt: normalize(img.getAttribute('alt')),
      caption: captionFor(img),
      thumbSrc: src,
      originalSrc: originalFromThumb(src),
      filePageHref: absoluteUrl(fileLink?.getAttribute('href')),
      width: Number(img.naturalWidth || img.getAttribute('width') || 0),
      height: Number(img.naturalHeight || img.getAttribute('height') || 0)
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    pageTitle: normalize(document.querySelector('#firstHeading, h1')?.textContent),
    count: media.length,
    media
  };
}
