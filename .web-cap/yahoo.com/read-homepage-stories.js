/**
 * web-cap script
 *
 * @description Read visible Yahoo homepage story cards and navigation links.
 * @param {object} [input]
 * @param {number} [input.limit=30] Maximum stories to return.
 * @param {number} [input.navLimit=20] Maximum navigation links to return.
 * @returns {{ ok: boolean, url: string, title: string, count: number, stories: Array<object>, nav: Array<object> }}
 * @match https://*.yahoo.com/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 30), 100));
  const navLimit = Math.max(0, Math.min(Number(input.navLimit ?? 20), 80));
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
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const storyLinks = [...document.querySelectorAll([
    'article a[href]',
    'li a[href*="/news/"]',
    'li a[href*="/finance/news/"]',
    'li a[href*="/style/"]',
    'li a[href*="/movies/"]',
    'a.stretched-box[href]'
  ].join(','))].filter(visible);
  const stories = [];
  const seen = new Set();

  for (const link of storyLinks) {
    if (stories.length >= limit) break;

    const href = absoluteUrl(link.getAttribute('href'));
    const container = link.closest('article, li, section, div') || link;
    const text = normalize(container.textContent || link.textContent);
    const title = normalize(link.textContent) || text.replace(/\b\d+of\s+\d+\b/i, '').slice(0, 180);
    const image = absoluteUrl(container.querySelector('img')?.getAttribute('src'));
    const key = href || title;
    if (!href || !title || seen.has(key) || href.includes('#') || /\/quote\//.test(href)) continue;
    seen.add(key);

    stories.push({
      title,
      href,
      image,
      text: text.slice(0, 500)
    });
  }

  const nav = [...document.querySelectorAll('nav a[href], header a[href]')]
    .filter(visible)
    .map((link) => ({
      text: normalize(link.textContent),
      href: absoluteUrl(link.getAttribute('href'))
    }))
    .filter((item) => item.text && item.href)
    .slice(0, navLimit);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: stories.length,
    stories,
    nav
  };
}
