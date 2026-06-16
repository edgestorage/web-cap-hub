/**
 * web-cap script
 *
 * @description Read Wikipedia navbox templates and related links from an article.
 * @param {object} [input]
 * @param {string} [input.title] Article title to open before reading.
 * @param {string} [input.url] Wikipedia article URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain used with input.title.
 * @param {number} [input.limit=20] Maximum navboxes to return.
 * @param {number} [input.linkLimit=80] Maximum links per navbox.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, count?: number, navboxes?: Array<object> }}
 * @match https://*.wikipedia.org/wiki/*
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';
  if (input.step !== 'read' && (input.url || input.title)) {
    const targetUrl = input.url || `https://${language}.wikipedia.org/wiki/${encodeURIComponent(String(input.title).trim()).replace(/%20/g, '_')}`;
    return cap.goto(targetUrl, { ...input, language, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 20), 100));
  const linkLimit = Math.max(1, Math.min(Number(input.linkLimit ?? 80), 300));
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
  const navboxes = [...document.querySelectorAll('.navbox')]
    .slice(0, limit)
    .map((box) => {
      const cleanNodeText = (node) => {
        const clone = node?.cloneNode(true);
        if (!clone) return '';
        clone.querySelectorAll('style, script, .navbar, .navbox-abovebelow').forEach((item) => item.remove());
        return normalize(clone.textContent).replace(/^(show|hide|vte)+/i, '').trim();
      };
      return {
        title: cleanNodeText(box.querySelector('.navbox-title, th')),
        groups: [...box.querySelectorAll('.navbox-group')]
          .map((group) => normalize(group.textContent))
          .filter(Boolean)
          .slice(0, 30),
        links: [...box.querySelectorAll('a[href^="/wiki/"]')]
          .map((link) => ({
            text: normalize(link.textContent),
            href: absoluteUrl(link.getAttribute('href')),
            title: normalize(link.getAttribute('title'))
          }))
          .filter((link) => link.text && !/^(v|t|e)$/i.test(link.text) && !/\/wiki\/(Template|Template_talk|Special):/i.test(link.href))
          .slice(0, linkLimit)
      };
    })
    .filter((box) => box.title || box.links.length);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    pageTitle: normalize(document.querySelector('#firstHeading, h1')?.textContent),
    count: navboxes.length,
    navboxes
  };
}
