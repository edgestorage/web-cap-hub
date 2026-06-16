/**
 * web-cap script
 *
 * @description Read visible items from Wikipedia current events pages.
 * @param {object} [input]
 * @param {string} [input.url] Current events URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain.
 * @param {number} [input.limit=80] Maximum event items to return.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, count?: number, events?: Array<object> }}
 * @match https://*.wikipedia.org/wiki/Portal:Current_events*
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';
  if (input.step !== 'read') {
    const targetUrl = input.url || `https://${language}.wikipedia.org/wiki/Portal:Current_events`;
    return cap.goto(targetUrl, { ...input, language, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 80), 300));
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
  const events = [...root.querySelectorAll('li')]
    .map((item) => ({
      text: normalize(item.textContent).slice(0, 1000),
      links: [...item.querySelectorAll('a[href^="/wiki/"]')]
        .map((link) => ({
          text: normalize(link.textContent),
          href: absoluteUrl(link.getAttribute('href'))
        }))
        .filter((link) => link.text)
        .slice(0, 12)
    }))
    .filter((event) => event.text && event.links.length)
    .filter((event) => !/^(This portal's subpages|Sports events|Recent deaths|Entry views by week list)/i.test(event.text))
    .slice(0, limit);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: events.length,
    events
  };
}
