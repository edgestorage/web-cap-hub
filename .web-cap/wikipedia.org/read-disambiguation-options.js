/**
 * web-cap script
 *
 * @description Read candidate article options from a Wikipedia disambiguation page.
 * @param {object} [input]
 * @param {string} [input.title] Disambiguation page title to open before reading.
 * @param {string} [input.url] Disambiguation page URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain used with input.title.
 * @param {number} [input.limit=100] Maximum options to return.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, disambiguation?: boolean, options?: Array<object> }}
 * @match https://*.wikipedia.org/wiki/*
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';
  if (input.step !== 'read' && (input.url || input.title)) {
    const targetUrl = input.url || `https://${language}.wikipedia.org/wiki/${encodeURIComponent(String(input.title).trim()).replace(/%20/g, '_')}`;
    return cap.goto(targetUrl, { ...input, language, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 100), 300));
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
  const root = document.querySelector('#mw-content-text') || document.body;
  const options = [...root.querySelectorAll('li')]
    .map((item) => {
      const link = item.querySelector('a[href^="/wiki/"]:not([href*=":"])');
      return {
        title: normalize(link?.textContent),
        href: absoluteUrl(link?.getAttribute('href')),
        description: normalize(item.textContent).slice(0, 500)
      };
    })
    .filter((option) => option.title && option.href)
    .slice(0, limit);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    pageTitle: normalize(document.querySelector('#firstHeading, h1')?.textContent),
    disambiguation: Boolean(document.querySelector('#disambigbox, table.disambigbox, body.mw-disambig')) || /may refer to:/i.test(root.textContent),
    count: options.length,
    options
  };
}
