/**
 * web-cap script
 *
 * @description Read product details from the current Amazon product detail page.
 * @param {object} [input]
 * @param {number} [input.bulletLimit=10] Maximum feature bullets to return.
 * @param {number} [input.textLimit=800] Maximum characters for long text fields.
 * @returns {{ ok: boolean, url: string, title: string, product: object }}
 * @match https://www.amazon.com/*, https://www.amazon.co.jp/*, https://www.amazon.co.uk/*, https://www.amazon.de/*
 */
export default async function (input = {}) {
  const bulletLimit = Math.max(0, Math.min(Number(input.bulletLimit ?? 10), 30));
  const textLimit = Math.max(120, Math.min(Number(input.textLimit ?? 800), 3000));
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const absoluteUrl = (href) => {
    if (!href) return '';
    try {
      return new URL(href, location.origin).href;
    } catch {
      return '';
    }
  };
  const firstText = (selectors) => {
    for (const selector of selectors) {
      const text = normalize(document.querySelector(selector)?.textContent);
      if (text) return text;
    }
    return '';
  };
  const cleanPriceText = (text) => {
    const normalized = normalize(text);
    return normalized.match(/(?:JPY|US\$|CA\$|AU\$|￥|\$|£|€)\s?[0-9][0-9,.]*/)?.[0] || normalized;
  };
  const price = cleanPriceText(firstText([
    '#apex_price .apex-pricetopay-accessibility-label',
    '#apex_price .apex-pricetopay-value .a-offscreen',
    '#apex_price .apex-pricetopay-value',
    '#corePrice_feature_div .a-offscreen',
    '#corePriceDisplay_desktop_feature_div .a-offscreen',
    '#priceblock_ourprice',
    '#priceblock_dealprice',
    '.apexPriceToPay .a-offscreen',
    '.a-price .a-offscreen'
  ]));
  const listPrice = cleanPriceText(firstText([
    '#apex_price .apex-basisprice-value .a-offscreen',
    '#apex_price .apex-basisprice-value',
    '#corePriceDisplay_desktop_feature_div .basisPrice .a-offscreen'
  ]));
  const bullets = [...document.querySelectorAll('#feature-bullets li span.a-list-item, #feature-bullets li')]
    .map((el) => normalize(el.textContent))
    .filter(Boolean)
    .filter((text, index, arr) => arr.indexOf(text) === index)
    .slice(0, bulletLimit);
  const asin = (
    location.pathname.match(/\/dp\/([A-Z0-9]+)/)?.[1] ||
    document.querySelector('#ASIN')?.getAttribute('value') ||
    ''
  );
  const rawAvailability = firstText([
    '#availability span',
    '#availability',
    '#outOfStock',
    '#exports_desktop_qualifiedBuybox_tlc_feature_div'
  ]);
  const availability = /P\.when|function|ueLogError|setTimeout/.test(rawAvailability) ? '' : rawAvailability;
  const buyBoxText = normalize(document.querySelector('#buybox, #desktop_buybox')?.innerText || '')
    .replace(/P\.when\([\s\S]*?;\s*/g, '')
    .slice(0, textLimit);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    product: {
      asin,
      title: firstText(['#productTitle']) || document.title,
      brand: firstText(['#bylineInfo']),
      price,
      listPrice,
      rating: firstText(['#acrPopover .a-icon-alt', '.reviewCountTextLinkedHistogram .a-icon-alt']),
      reviews: firstText(['#acrCustomerReviewText']),
      availability,
      image: absoluteUrl(document.querySelector('#landingImage')?.getAttribute('src')),
      bullets,
      buyBoxText,
      canonicalUrl: asin ? absoluteUrl(`/dp/${asin}`) : location.href
    }
  };
}
