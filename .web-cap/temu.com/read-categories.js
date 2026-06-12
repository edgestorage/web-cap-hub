/**
 * web-cap script
 *
 * @description Read visible Temu category, filter, or channel entries from the current page.
 * @param {object} [input]
 * @param {number} [input.limit=60] Maximum categories to return.
 * @returns {{ ok: boolean, url: string, title: string, count: number, categories: Array<object> }}
 * @match https://www.temu.com/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 60), 150));
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
  const categories = [];
  const seen = new Set();
  const candidates = [
    ...document.querySelectorAll('.splide__slide'),
    ...document.querySelectorAll('a[href*="/channel/"], a[href*="/cat-"], a[href*="/category/"]')
  ].filter(visible);

  for (const item of candidates) {
    if (categories.length >= limit) break;

    const link = item.matches('a[href]') ? item : item.querySelector('a[href]');
    const text = normalize(item.textContent).replace(/(.+)\1$/, '$1');
    const href = absoluteUrl(link?.getAttribute('href'));
    const key = href || text;
    if (!text || seen.has(key)) continue;
    seen.add(key);

    categories.push({
      name: text,
      href,
      selected: item.classList.contains('is-active') || item.getAttribute('aria-selected') === 'true'
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: categories.length,
    categories
  };
}
