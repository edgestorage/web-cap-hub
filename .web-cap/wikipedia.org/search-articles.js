/**
 * web-cap script
 *
 * @description Search Wikipedia and read article result summaries.
 * @param {object} input
 * @param {string} input.query Search query.
 * @param {string} [input.language=en] Wikipedia language subdomain, such as en, zh, ja, or de.
 * @param {number} [input.limit=20] Maximum search results to return.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, query?: string, language?: string, url: string, title: string, count?: number, results?: Array<object> }}
 * @match https://*.wikipedia.org/w/index.php?search=*
 */
export default async function (input = {}) {
  const query = String(input.query || '').trim();
  if (!query) return { ok: false, error: 'query is required', url: location.href, title: document.title };

  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';
  const limit = Math.max(1, Math.min(Number(input.limit ?? 20), 100));

  if (input.step !== 'read') {
    const url = new URL(`https://${language}.wikipedia.org/w/index.php`);
    url.searchParams.set('search', query);
    url.searchParams.set('title', 'Special:Search');
    url.searchParams.set('profile', 'advanced');
    url.searchParams.set('fulltext', '1');
    return cap.goto(url.href, { ...input, query, language, limit, step: 'read' });
  }

  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const absoluteUrl = (href) => {
    if (!href) return '';
    try {
      const url = new URL(href, location.origin);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  const resultNodes = [...document.querySelectorAll('.mw-search-result')].slice(0, limit);
  const results = resultNodes.map((node) => {
    const link = node.querySelector('.mw-search-result-heading a[href], a[href^="/wiki/"]');
    const href = absoluteUrl(link?.getAttribute('href'));
    const fallbackTitle = href ? decodeURIComponent(new URL(href).pathname.split('/').pop() || '').replace(/_/g, ' ') : '';
    return {
      title: normalize(link?.textContent || link?.getAttribute('title')) || fallbackTitle,
      href,
      snippet: normalize(node.querySelector('.searchresult')?.textContent),
      metadata: normalize(node.querySelector('.mw-search-result-data')?.textContent)
    };
  }).filter((item) => item.title || item.href);

  const suggestionLink = document.querySelector('.searchdidyoumean a, .mw-search-createlink a');
  if (!results.length && location.pathname.startsWith('/wiki/')) {
    results.push({
      title: normalize(document.querySelector('#firstHeading, h1')?.textContent) || document.title.replace(/ - Wikipedia$/, ''),
      href: location.href,
      snippet: normalize([...document.querySelectorAll('#mw-content-text p, #bodyContent p, main p')]
        .map((p) => p.textContent)
        .find((text) => normalize(text))),
      metadata: 'direct article match'
    });
  }

  return {
    ok: true,
    query,
    language,
    url: location.href,
    title: document.title,
    count: results.length,
    suggestion: normalize(suggestionLink?.textContent),
    suggestionHref: absoluteUrl(suggestionLink?.getAttribute('href')),
    results
  };
}
