/**
 * web-cap script
 *
 * @description Read the current Yahoo article headline, source, dates, body, images, and links.
 * @param {object} [input]
 * @param {number} [input.bodyLimit=8000] Maximum body characters.
 * @param {number} [input.linkLimit=40] Maximum links to return.
 * @returns {{ ok: boolean, url: string, title: string, article: object }}
 * @match https://*.yahoo.com/*
 */
export default async function (input = {}) {
  const bodyLimit = Math.max(500, Math.min(Number(input.bodyLimit ?? 8000), 30000));
  const linkLimit = Math.max(0, Math.min(Number(input.linkLimit ?? 40), 200));
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
  const schema = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((script) => {
      try {
        return JSON.parse(script.textContent);
      } catch {
        return null;
      }
    })
    .find((item) => item && /Article$/.test(item['@type'] || '')) || {};
  const root = document.querySelector('article') || document.body;
  const paragraphs = [...root.querySelectorAll('p')]
    .map((p) => normalize(p.textContent))
    .filter(Boolean);
  const sourceLink = root.querySelector('a[href*="profiles.yahoo.com"], a[href*="/brands/"]');
  const links = [...root.querySelectorAll('a[href]')]
    .slice(0, linkLimit)
    .map((link) => ({
      text: normalize(link.textContent),
      href: absoluteUrl(link.getAttribute('href'))
    }))
    .filter((link) => link.text || link.href);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    article: {
      headline: normalize(document.querySelector('h1')?.textContent) || schema.headline || document.title,
      description: schema.description || '',
      source: normalize(sourceLink?.textContent) || schema.publisher?.name || '',
      author: schema.author?.name || schema.creator?.name || '',
      datePublished: schema.datePublished || normalize(document.querySelector('time')?.getAttribute('datetime') || document.querySelector('time')?.textContent),
      dateModified: schema.dateModified || '',
      body: paragraphs.join('\n\n').slice(0, bodyLimit),
      image: absoluteUrl(schema.image?.url || schema.image || root.querySelector('img')?.getAttribute('src')),
      images: [...root.querySelectorAll('img[src]')]
        .map((img) => absoluteUrl(img.getAttribute('src')))
        .filter(Boolean)
        .slice(0, 20),
      links
    }
  };
}
