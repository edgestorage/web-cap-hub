/**
 * web-cap script
 *
 * @description Read visible product cards from an Amazon search results page.
 * @param {object} [input]
 * @param {number} [input.limit=20] Maximum products to return.
 * @param {boolean} [input.includeSponsored=true] Include sponsored product cards.
 * @param {number} [input.deliveryTextLimit=240] Maximum characters for delivery/offer text.
 * @returns {{ ok: boolean, url: string, title: string, count: number, products: Array<object> }}
 * @match https://www.amazon.com/s*, https://www.amazon.co.jp/s*, https://www.amazon.co.uk/s*, https://www.amazon.de/s*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 20), 50));
  const includeSponsored = input.includeSponsored !== false;
  const deliveryTextLimit = Math.max(80, Math.min(Number(input.deliveryTextLimit ?? 240), 1000));
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
  const cleanPrice = (card) => {
    const offscreen = normalize(card.querySelector('.a-price .a-offscreen')?.textContent);
    if (offscreen) return offscreen;

    const whole = normalize(card.querySelector('.a-price .a-price-whole')?.textContent).replace(/[.,]$/, '');
    const fraction = normalize(card.querySelector('.a-price .a-price-fraction')?.textContent);
    const symbol = normalize(card.querySelector('.a-price .a-price-symbol')?.textContent) || '$';
    return whole ? `${symbol}${whole}${fraction ? `.${fraction}` : ''}` : '';
  };
  const readDelivery = (card) => {
    const lines = [...card.querySelectorAll([
      '[data-cy="delivery-recipe"]',
      '[data-cy="secondary-offer-recipe"]',
      '[data-cy="free-shipping-recipe"]',
      '[data-cy="purchase-history-recipe"]',
      '.s-align-children-center',
      '.a-row.a-size-base.a-color-secondary'
    ].join(','))]
      .map((el) => normalize(el.textContent))
      .filter(Boolean)
      .filter((text, index, arr) => arr.indexOf(text) === index);

    return lines.find((line) => line.length < deliveryTextLimit) || lines[0]?.slice(0, deliveryTextLimit) || '';
  };

  const cards = [...document.querySelectorAll('div[data-component-type="s-search-result"]')].filter(visible);
  const products = [];

  for (const card of cards) {
    if (products.length >= limit) break;

    const title = normalize(
      card.querySelector('h2 span, h2 a span, [data-cy="title-recipe"] span')?.textContent
    );
    if (!title) continue;

    const sponsored = Boolean(card.querySelector('.puis-sponsored-label-text'));
    if (sponsored && !includeSponsored) continue;

    products.push({
      asin: card.getAttribute('data-asin') || '',
      title,
      price: cleanPrice(card),
      rating: normalize(card.querySelector('.a-icon-alt')?.textContent),
      reviews: normalize(card.querySelector('a[href*="customerReviews"] span, span[aria-label$="ratings"]')?.textContent),
      badge: normalize(card.querySelector('.a-badge-text')?.textContent),
      delivery: readDelivery(card),
      sponsored,
      href: absoluteUrl(card.querySelector('h2 a, a.a-link-normal.s-no-outline')?.getAttribute('href'))
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
