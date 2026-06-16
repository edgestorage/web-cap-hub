/**
 * web-cap script
 *
 * @description Read a Wikipedia user's public contribution list.
 * @param {object} [input]
 * @param {string} [input.user] Username or IP address.
 * @param {string} [input.url] User contributions URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain.
 * @param {number} [input.limit=100] Maximum contributions to return.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, count?: number, contributions?: Array<object> }}
 * @match https://*.wikipedia.org/wiki/Special:Contributions/*
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';
  if (input.step !== 'read' && (input.url || input.user)) {
    const targetUrl = input.url || `https://${language}.wikipedia.org/wiki/Special:Contributions/${encodeURIComponent(String(input.user).trim())}`;
    return cap.goto(targetUrl, { ...input, language, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 100), 500));
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
  const contributions = [...document.querySelectorAll('.mw-contributions-list li, #mw-content-text li')]
    .slice(0, limit)
    .map((item) => {
      const pageLink = [...item.querySelectorAll('a[href^="/wiki/"]')]
        .find((link) => !link.href.includes('/wiki/Special:') && normalize(link.textContent));
      const diffLink = [...item.querySelectorAll('a[href]')].find((link) => link.href.includes('diff='));
      return {
        date: normalize(item.querySelector('.mw-changeslist-date, a.mw-changeslist-date')?.textContent),
        pageTitle: normalize(pageLink?.textContent),
        pageHref: absoluteUrl(pageLink?.getAttribute('href')),
        diffHref: absoluteUrl(diffLink?.getAttribute('href')),
        comment: normalize(item.querySelector('.comment, .autocomment')?.textContent),
        delta: normalize(item.querySelector('.mw-plusminus-pos, .mw-plusminus-neg, .mw-plusminus-null')?.textContent),
        text: normalize(item.textContent).slice(0, 500)
      };
    })
    .filter((item) => item.pageTitle || item.text);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: contributions.length,
    contributions
  };
}
