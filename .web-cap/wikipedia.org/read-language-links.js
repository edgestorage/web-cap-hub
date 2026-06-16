/**
 * web-cap script
 *
 * @description Read available language versions for the current or requested Wikipedia article.
 * @param {object} [input]
 * @param {string} [input.title] Article title to open before reading.
 * @param {string} [input.url] Wikipedia article URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain used with input.title.
 * @param {number} [input.limit=200] Maximum language links to return.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, count?: number, languages?: Array<object> }}
 * @match https://*.wikipedia.org/wiki/*
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';

  if (input.step !== 'read' && (input.url || input.title)) {
    let targetUrl = input.url;
    if (!targetUrl && input.title) {
      targetUrl = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(String(input.title).trim()).replace(/%20/g, '_')}`;
    }
    return cap.goto(targetUrl, { ...input, language, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 200), 500));
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
  const byHref = new Map();
  const addLanguage = (item) => {
    if (!item.href || byHref.has(item.href)) return;
    byHref.set(item.href, item);
  };

  for (const link of document.querySelectorAll('.interlanguage-link a[href], a.interlanguage-link-target[href]')) {
    addLanguage({
      code: normalize(link.getAttribute('lang') || link.getAttribute('hreflang')),
      name: normalize(link.getAttribute('title')),
      localName: normalize(link.textContent),
      href: absoluteUrl(link.getAttribute('href'))
    });
  }

  for (const link of document.querySelectorAll('link[rel="alternate"][hreflang][href*=".wikipedia.org/wiki/"]')) {
    addLanguage({
      code: normalize(link.getAttribute('hreflang')),
      name: '',
      localName: '',
      href: absoluteUrl(link.getAttribute('href'))
    });
  }

  const languages = [...byHref.values()]
    .filter((item) => item.code || item.localName || item.name)
    .slice(0, limit);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    pageTitle: normalize(document.querySelector('#firstHeading, h1')?.textContent),
    count: languages.length,
    languages
  };
}
