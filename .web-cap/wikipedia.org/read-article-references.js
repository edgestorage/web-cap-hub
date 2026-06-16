/**
 * web-cap script
 *
 * @description Read references and citation links from a Wikipedia article.
 * @param {object} [input]
 * @param {string} [input.title] Article title to open before reading.
 * @param {string} [input.url] Wikipedia article URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain used with input.title.
 * @param {number} [input.limit=100] Maximum references to return.
 * @param {number} [input.textLimit=800] Maximum characters per reference.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, count?: number, references?: Array<object> }}
 * @match https://*.wikipedia.org/wiki/*
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';
  if (input.step !== 'read' && (input.url || input.title)) {
    const targetUrl = input.url || `https://${language}.wikipedia.org/wiki/${encodeURIComponent(String(input.title).trim()).replace(/%20/g, '_')}`;
    return cap.goto(targetUrl, { ...input, language, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 100), 500));
  const textLimit = Math.max(100, Math.min(Number(input.textLimit ?? 800), 5000));
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
  const cleanText = (node) => {
    const clone = node.cloneNode(true);
    clone.querySelectorAll('.mw-cite-backlink, .reference-accessdate, style, script').forEach((item) => item.remove());
    return normalize(clone.textContent);
  };

  const root = document.querySelector('#mw-content-text') || document.body;
  const references = [...root.querySelectorAll('ol.references li, .reflist li, li[id^="cite_note-"]')]
    .slice(0, limit)
    .map((item) => {
      const links = [...item.querySelectorAll('a[href]')]
        .map((link) => ({
          text: normalize(link.textContent),
          href: absoluteUrl(link.getAttribute('href')),
          title: normalize(link.getAttribute('title'))
        }))
        .filter((link) => link.href && !link.href.includes('#cite_ref-'))
        .slice(0, 20);
      const doiLink = links.find((link) => /doi\.org\//i.test(link.href));
      const archiveLink = links.find((link) => /web\.archive\.org/i.test(link.href));
      return {
        id: item.id || '',
        text: cleanText(item).slice(0, textLimit),
        doi: doiLink?.href || '',
        archiveHref: archiveLink?.href || '',
        links
      };
    })
    .filter((reference) => reference.text || reference.links.length);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    pageTitle: normalize(document.querySelector('#firstHeading, h1')?.textContent),
    count: references.length,
    references
  };
}
