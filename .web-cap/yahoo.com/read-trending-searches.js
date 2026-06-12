/**
 * web-cap script
 *
 * @description Read visible Yahoo trending search links from the current page.
 * @param {object} [input]
 * @param {number} [input.limit=20] Maximum trends to return.
 * @param {boolean} [input.visibleOnly=false] Only include currently visible links.
 * @returns {{ ok: boolean, url: string, title: string, count: number, trends: Array<object> }}
 * @match https://*.yahoo.com/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 20), 50));
  const visibleOnly = input.visibleOnly === true;
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
  const trends = [];
  const seen = new Set();

  const links = [...document.querySelectorAll('a[href*="search.yahoo.com/search"][href*="p="]')]
    .filter((link) => !visibleOnly || visible(link));

  for (const link of links) {
    if (trends.length >= limit) break;

    const url = absoluteUrl(link.getAttribute('href'));
    const query = new URL(url).searchParams.get('p') || normalize(link.textContent);
    const text = normalize(link.textContent).replace(/^\d+\s*/, '') || query;
    const key = query || url;
    if (!key || seen.has(key)) continue;
    seen.add(key);

    trends.push({
      rank: normalize(link.closest('li')?.textContent).match(/^\d+/)?.[0] || '',
      query,
      text,
      href: url
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: trends.length,
    trends
  };
}
