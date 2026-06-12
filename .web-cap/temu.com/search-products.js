/**
 * web-cap script
 *
 * @description Open a Temu search page and read visible product links.
 * @param {object} input
 * @param {string} input.query Search query.
 * @param {number} [input.limit=40] Maximum products to return.
 * @param {number} [input.waitMs=3000] Wait time after navigation.
 * @param {boolean} [input.scroll=true] Scroll once before reading lazy-loaded products.
 * @returns {{ ok: boolean, url: string, title: string, query: string, count: number, products: Array<object>, warning?: string }}
 * @match https://www.temu.com/*
 */
export default async function (input = {}) {
  const query = String(input.query || '').trim();
  if (!query) {
    return { ok: false, error: 'query is required', url: location.href, title: document.title };
  }

  const waitMs = Math.max(0, Math.min(Number(input.waitMs ?? 3000), 8000));
  const url = new URL('/search_result.html', location.origin);
  url.searchParams.set('search_key', query);
  let warning = '';

  const currentQuery = (new URLSearchParams(location.search).get('search_key') || '').replace(/\+/g, ' ');
  if (!location.pathname.includes('/search_result.html') || currentQuery !== query) {
    return cap.goto(url.href, { ...input, query, step: 'read' });
  }

  if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
  if (input.scroll !== false) {
    window.scrollBy(0, 900);
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, Math.min(waitMs, 2500)));
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 40), 120));
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const absoluteUrl = (href) => {
    if (!href) return '';
    try {
      const absolute = new URL(href, location.origin);
      return /^https?:$/.test(absolute.protocol) ? absolute.href : '';
    } catch {
      return '';
    }
  };
  const goodsIdFromUrl = (href) => href.match(/-g-(\d+)\.html/)?.[1] || '';
  const products = [];
  const seen = new Set();

  for (const link of document.querySelectorAll('a[href*="-g-"][href*=".html"]')) {
    if (products.length >= limit) break;

    const href = absoluteUrl(link.getAttribute('href'));
    const goodsId = goodsIdFromUrl(href);
    const container = link.closest('li, article, [data-testid], div') || link;
    const title = normalize(link.textContent || container.textContent)
      .replace(/\s*在新标签页中打开。?$/i, '')
      .slice(0, 700);
    const image = absoluteUrl(link.querySelector('img[src]')?.getAttribute('src') || container.querySelector('img[src]')?.getAttribute('src'));
    const price = normalize(container.textContent).match(/(?:JPY|¥|￥|円|\$|€|£)\s?[0-9][0-9,.]*/)?.[0] || '';
    const key = goodsId || href || title;
    if (!key || seen.has(key) || !title) continue;
    seen.add(key);

    products.push({ goodsId, title, price, image, href });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    query,
    count: products.length,
    products,
    warning
  };
}
