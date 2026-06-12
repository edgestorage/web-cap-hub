/**
 * web-cap script
 *
 * @description Read visible similar, related, or carousel products from the current Amazon page.
 * @param {object} [input]
 * @param {number} [input.limit=20] Maximum products to return.
 * @returns {{ ok: boolean, url: string, title: string, count: number, products: Array<object> }}
 * @match https://www.amazon.com/*, https://www.amazon.co.jp/*, https://www.amazon.co.uk/*, https://www.amazon.de/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 20), 80));
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const absoluteUrl = (href) => {
    if (!href) return '';
    try {
      return new URL(href, location.origin).href;
    } catch {
      return '';
    }
  };
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const cards = [...document.querySelectorAll('.a-carousel-card, .p13n-sc-uncoverable-faceout')]
    .filter(visible);
  const products = [];
  const seen = new Set();

  for (const card of cards) {
    if (products.length >= limit) break;

    const href = absoluteUrl(card.querySelector('a[href*="/dp/"]')?.getAttribute('href'));
    const asin = href.match(/\/dp\/([A-Z0-9]+)/)?.[1] || card.getAttribute('data-asin') || '';
    const title = normalize(
      card.querySelector('img[alt]')?.getAttribute('alt') ||
      card.querySelector('.p13n-sc-truncate, .a-size-base-plus, .a-size-base')?.textContent
    );
    const text = normalize(card.textContent);
    const key = asin || href || title;
    if (!href || !key || seen.has(key) || !title) continue;
    seen.add(key);

    const price = normalize(card.querySelector('.a-price .a-offscreen')?.textContent) ||
      text.match(/(?:JPY|US\$|￥|\$|£|€)\s?[0-9][0-9,.]*/)?.[0] ||
      '';
    const rating = normalize(card.querySelector('.a-icon-alt')?.textContent);
    const reviews = text.match(/\(([0-9,.万]+)\)|\b[0-9,]{3,}\b/)?.[0] || '';

    products.push({
      asin,
      title,
      price,
      rating,
      reviews,
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
