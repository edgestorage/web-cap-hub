/**
 * web-cap script
 *
 * @description Read the current Temu product detail page and visible recommendation products.
 * @param {object} [input]
 * @param {number} [input.recommendationLimit=20] Maximum recommendation products to return.
 * @returns {{ ok: boolean, url: string, title: string, product: object, recommendations: Array<object> }}
 * @match https://www.temu.com/*
 */
export default async function (input = {}) {
  const recommendationLimit = Math.max(0, Math.min(Number(input.recommendationLimit ?? 20), 80));
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
  const goodsIdFromUrl = (href) => href.match(/-g-(\d+)\.html/)?.[1] || '';
  const visibleText = (selector) => normalize(document.querySelector(selector)?.textContent);
  const pageText = normalize(document.body?.textContent);
  const goodsId = goodsIdFromUrl(location.href);
  const headline = visibleText('h1') ||
    decodeURIComponent(location.pathname.split('/').pop()?.replace(/-g-\d+\.html$/, '').replace(/-/g, ' ') || '') ||
    document.title;
  const imageUrls = [...document.querySelectorAll('img[src]')]
    .map((img) => absoluteUrl(img.getAttribute('src')))
    .filter((src) => src && !src.startsWith('data:image'))
    .filter((src, index, arr) => arr.indexOf(src) === index)
    .slice(0, 30);
  const price = pageText.match(/(?:JPY|¥|￥|円|\$|€|£)\s?[0-9][0-9,.]*/)?.[0] || '';
  const sections = [...document.querySelectorAll('h2')]
    .map((heading) => normalize(heading.textContent))
    .filter(Boolean)
    .slice(0, 30);
  const recommendations = [];
  const seen = new Set([goodsId]);

  for (const link of document.querySelectorAll('a[href*="-g-"][href*=".html"]')) {
    if (recommendations.length >= recommendationLimit) break;

    const href = absoluteUrl(link.getAttribute('href'));
    const recGoodsId = goodsIdFromUrl(href);
    const container = link.closest('li, article, [data-testid], div') || link;
    const title = normalize(link.textContent || container.textContent)
      .replace(/\s*在新标签页中打开。?$/i, '')
      .slice(0, 700);
    if (!recGoodsId || seen.has(recGoodsId) || !title) continue;
    seen.add(recGoodsId);

    recommendations.push({
      goodsId: recGoodsId,
      title,
      price: normalize(container.textContent).match(/(?:JPY|¥|￥|円|\$|€|£)\s?[0-9][0-9,.]*/)?.[0] || '',
      image: absoluteUrl(link.querySelector('img[src]')?.getAttribute('src') || container.querySelector('img[src]')?.getAttribute('src')),
      href
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    product: {
      goodsId,
      title: headline,
      price,
      images: imageUrls,
      sections
    },
    recommendations
  };
}
