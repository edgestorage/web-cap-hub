/**
 * web-cap script
 *
 * @description Read external links from a Wikipedia article and classify common link types.
 * @param {object} [input]
 * @param {string} [input.title] Article title to open before reading.
 * @param {string} [input.url] Wikipedia article URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain used with input.title.
 * @param {number} [input.limit=200] Maximum links to return.
 * @param {boolean} [input.includeReferences=true] Include external links from references.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, count?: number, links?: Array<object> }}
 * @match https://*.wikipedia.org/wiki/*
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';
  if (input.step !== 'read' && (input.url || input.title)) {
    const targetUrl = input.url || `https://${language}.wikipedia.org/wiki/${encodeURIComponent(String(input.title).trim()).replace(/%20/g, '_')}`;
    return cap.goto(targetUrl, { ...input, language, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 200), 1000));
  const includeReferences = input.includeReferences !== false;
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const classify = (href) => {
    if (/doi\.org\//i.test(href)) return 'doi';
    if (/web\.archive\.org/i.test(href)) return 'archive';
    if (/isbn|books\.google|worldcat/i.test(href)) return 'book';
    if (/wikidata\.org/i.test(href)) return 'wikidata';
    if (/commons\.wikimedia\.org/i.test(href)) return 'commons';
    if (/\.pdf($|[?#])/i.test(href)) return 'pdf';
    return 'external';
  };
  const root = document.querySelector('#mw-content-text') || document.body;
  const links = [];
  const seen = new Set();
  for (const link of root.querySelectorAll('a.external[href], a[href^="http"]')) {
    if (links.length >= limit) break;
    if (!includeReferences && link.closest('ol.references, .reflist, li[id^="cite_note-"]')) continue;
    const href = link.href;
    if (!href || seen.has(href)) continue;
    seen.add(href);
    links.push({
      text: normalize(link.textContent),
      href,
      type: classify(href),
      section: normalize(link.closest('section, .mw-heading')?.querySelector('h2, h3, h4')?.textContent)
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    pageTitle: normalize(document.querySelector('#firstHeading, h1')?.textContent),
    count: links.length,
    links
  };
}
