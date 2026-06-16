/**
 * web-cap script
 *
 * @description Read pages that link to a Wikipedia article.
 * @param {object} [input]
 * @param {string} [input.title] Article title.
 * @param {string} [input.url] WhatLinksHere URL or article URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain used with input.title.
 * @param {number} [input.limit=100] Maximum linked pages to return.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, count?: number, links?: Array<object> }}
 * @match https://*.wikipedia.org/wiki/Special:WhatLinksHere/*
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';
  if (input.step !== 'read' && (input.url || input.title)) {
    let targetUrl = input.url;
    if (!targetUrl) {
      targetUrl = `https://${language}.wikipedia.org/wiki/Special:WhatLinksHere/${encodeURIComponent(String(input.title).trim()).replace(/%20/g, '_')}`;
    } else if (/\/wiki\/(?!Special:WhatLinksHere\/)/.test(targetUrl)) {
      const pageTitle = decodeURIComponent(new URL(targetUrl).pathname.split('/wiki/')[1] || '').replace(/\s+/g, '_');
      targetUrl = new URL(`/wiki/Special:WhatLinksHere/${encodeURIComponent(pageTitle).replace(/%20/g, '_')}`, targetUrl).href;
    }
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
  const rows = [...document.querySelectorAll('#mw-whatlinkshere-list li')]
    .slice(0, limit)
    .map((item) => {
      const link = [...item.querySelectorAll('a[href^="/wiki/"]')]
        .find((candidate) => !candidate.href.includes('/wiki/Special:') && normalize(candidate.textContent));
      return {
        title: normalize(link?.textContent),
        href: absoluteUrl(link?.getAttribute('href')),
        redirect: /redirect page/i.test(item.textContent),
        transclusion: /transclusion/i.test(item.textContent),
        text: normalize(item.textContent)
      };
    })
    .filter((item) => item.title || item.href);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: rows.length,
    links: rows
  };
}
