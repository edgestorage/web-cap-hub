/**
 * web-cap script
 *
 * @description Sort an Amazon search results page by a supported sort order.
 * @param {object} input
 * @param {"featured"|"price-asc"|"price-desc"|"reviews"|"newest"} input.sort Sort order to apply.
 * @param {string} [input.query] Optional search query to open before sorting.
 * @returns {{ ok: boolean, url: string, title: string, sort: string }}
 * @match https://www.amazon.com/s*, https://www.amazon.co.jp/s*, https://www.amazon.co.uk/s*, https://www.amazon.de/s*
 */
export default async function (input = {}) {
  if (input.step === 'done') {
    return {
      ok: true,
      url: location.href,
      title: document.title,
      sort: input.sort,
      applied: true
    };
  }

  const sortMap = {
    featured: 'relevanceblender',
    'price-asc': 'price-asc-rank',
    'price-desc': 'price-desc-rank',
    reviews: 'review-rank',
    newest: 'date-desc-rank'
  };
  const sort = input.sort;
  if (!sortMap[sort]) {
    return {
      ok: false,
      error: 'sort must be one of featured, price-asc, price-desc, reviews, newest',
      url: location.href,
      title: document.title
    };
  }

  const url = input.query ? new URL('/s', location.origin) : new URL(location.href);
  if (input.query) {
    url.searchParams.set('k', input.query);
  }
  url.searchParams.set('s', sortMap[sort]);

  return cap.goto(url.href, { step: 'done', sort });
}
