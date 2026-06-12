/**
 * web-cap script
 *
 * @description Read visible customer reviews from an Amazon product or reviews page.
 * @param {object} [input]
 * @param {string} [input.asin] Optional ASIN. If provided from a product page, opens the reviews page first.
 * @param {boolean} [input.currentOnly=false] Only read reviews already visible on the current page.
 * @param {number} [input.limit=10] Maximum reviews to return.
 * @param {number} [input.bodyLimit=1200] Maximum characters per review body.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, asin: string, count: number, reviews: Array<object> }}
 * @match https://www.amazon.com/*, https://www.amazon.co.jp/*, https://www.amazon.co.uk/*, https://www.amazon.de/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 10), 50));
  const bodyLimit = Math.max(120, Math.min(Number(input.bodyLimit ?? 1200), 5000));
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const asin = (
    input.asin ||
    location.pathname.match(/\/(?:dp|product-reviews)\/([A-Z0-9]+)/)?.[1] ||
    new URLSearchParams(location.search).get('openid.return_to')?.match(/\/product-reviews\/([A-Z0-9]+)/)?.[1] ||
    ''
  );

  if (/\/ap\/signin/.test(location.pathname)) {
    return {
      ok: false,
      error: 'Amazon redirected to sign-in before reviews could be read.',
      url: location.href,
      title: document.title,
      asin,
      count: 0,
      reviews: []
    };
  }

  if (!input.currentOnly && asin && !/\/product-reviews\//.test(location.pathname) && input.step !== 'read') {
    return cap.goto(new URL(`/product-reviews/${asin}`, location.origin).href, {
      ...input,
      asin,
      step: 'read'
    });
  }

  const reviewEls = [...document.querySelectorAll('[data-hook="review"], .review')];
  const reviews = [];

  for (const review of reviewEls) {
    if (reviews.length >= limit) break;

    const title = normalize(review.querySelector('[data-hook="review-title"], .review-title')?.textContent);
    const rating = normalize(review.querySelector('[data-hook="review-star-rating"], [data-hook="cmps-review-star-rating"], .review-rating')?.textContent);
    const author = normalize(review.querySelector('.a-profile-name')?.textContent);
    const date = normalize(review.querySelector('[data-hook="review-date"], .review-date')?.textContent);
    const body = normalize(review.querySelector('[data-hook="review-body"], .review-text')?.textContent).slice(0, bodyLimit);
    const helpful = normalize(review.querySelector('[data-hook="helpful-vote-statement"]')?.textContent);

    if (title || body) {
      reviews.push({ author, rating, title, date, body, helpful });
    }
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    asin,
    count: reviews.length,
    reviews
  };
}
