/**
 * web-cap script
 *
 * @description Read visible Temu product links from home, search, category, or recommendation sections.
 * @param {object} [input]
 * @param {number} [input.limit=40] Maximum products to return.
 * @param {number} [input.textLimit=500] Maximum title/text characters per product.
 * @returns {{ ok: boolean, url: string, title: string, count: number, products: Array<object> }}
 * @match https://www.temu.com/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 40), 120));
  const textLimit = Math.max(80, Math.min(Number(input.textLimit ?? 500), 2000));
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
  const goodsIdFromUrl = (href) => href.match(/-g-(\d+)\.html/)?.[1] || '';
  const cleanTitle = (text) => normalize(text)
    .replace(/\s*在新标签页中打开。?$/i, '')
    .slice(0, textLimit);
  const products = [];
  const seen = new Set();

  for (const link of [...document.querySelectorAll('a[href*="-g-"][href$=".html"], a[href*="-g-"][href*=".html?"]')].filter(visible)) {
    if (products.length >= limit) break;

    const href = absoluteUrl(link.getAttribute('href'));
    const goodsId = goodsIdFromUrl(href);
    const container = link.closest('li, article, [data-testid], div') || link;
    const text = cleanTitle(link.textContent || container.textContent);
    const image = absoluteUrl(link.querySelector('img[src]')?.getAttribute('src') || container.querySelector('img[src]')?.getAttribute('src'));
    const price = normalize(container.textContent).match(/(?:JPY|¥|￥|円|\$|€|£)\s?[0-9][0-9,.]*/)?.[0] || '';
    const key = goodsId || href || text;
    if (!key || seen.has(key) || !text) continue;
    seen.add(key);

    products.push({
      goodsId,
      title: text,
      price,
      image,
      href
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: products.length,
    products
  };
}
