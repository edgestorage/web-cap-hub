/**
 * web-cap script
 *
 * @description Read recent revision history for a Wikipedia article.
 * @param {object} [input]
 * @param {string} [input.title] Article title.
 * @param {string} [input.url] Article or history URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain used with input.title.
 * @param {number} [input.limit=50] Maximum revisions to return.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, count?: number, revisions?: Array<object> }}
 * @match https://*.wikipedia.org/w/index.php?title=*&action=history
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';
  if (input.step !== 'read' && (input.url || input.title)) {
    let targetUrl = input.url;
    if (!targetUrl) {
      const url = new URL(`https://${language}.wikipedia.org/w/index.php`);
      url.searchParams.set('title', String(input.title).trim().replace(/\s+/g, '_'));
      url.searchParams.set('action', 'history');
      targetUrl = url.href;
    } else if (!/[?&]action=history\b/.test(targetUrl) && /\/wiki\//.test(targetUrl)) {
      const pageTitle = decodeURIComponent(new URL(targetUrl).pathname.split('/wiki/')[1] || '').replace(/\s+/g, '_');
      const url = new URL('/w/index.php', targetUrl);
      url.searchParams.set('title', pageTitle);
      url.searchParams.set('action', 'history');
      targetUrl = url.href;
    }
    return cap.goto(targetUrl, { ...input, language, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 50), 500));
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

  const revisions = [...document.querySelectorAll('#pagehistory li, li[data-mw-revid]')]
    .slice(0, limit)
    .map((row) => {
      const links = [...row.querySelectorAll('a[href]')];
      const diffLink = links.find((link) => link.href.includes('diff='));
      const oldLink = links.find((link) => link.href.includes('oldid='));
      return {
        revisionId: row.getAttribute('data-mw-revid') || oldLink?.href.match(/oldid=(\d+)/)?.[1] || '',
        date: normalize(row.querySelector('.mw-changeslist-date, a.mw-changeslist-date')?.textContent),
        user: normalize(row.querySelector('.mw-userlink, .history-user')?.textContent),
        size: normalize(row.querySelector('.history-size, .mw-changeslist-separator + span')?.textContent),
        delta: normalize(row.querySelector('.mw-plusminus-pos, .mw-plusminus-neg, .mw-plusminus-null')?.textContent),
        comment: normalize(row.querySelector('.comment, .autocomment')?.textContent),
        minor: Boolean(row.querySelector('.minoredit')),
        diffHref: absoluteUrl(diffLink?.getAttribute('href')),
        oldHref: absoluteUrl(oldLink?.getAttribute('href'))
      };
    });

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: revisions.length,
    revisions
  };
}
