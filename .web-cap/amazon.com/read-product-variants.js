/**
 * web-cap script
 *
 * @description Read visible product variant dimensions and options from an Amazon product detail page.
 * @param {object} [input]
 * @param {number} [input.limit=80] Maximum variant options to return.
 * @returns {{ ok: boolean, url: string, title: string, asin: string, count: number, dimensions: Array<object> }}
 * @match https://www.amazon.com/*, https://www.amazon.co.jp/*, https://www.amazon.co.uk/*, https://www.amazon.de/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 80), 200));
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
  const asin = (
    location.pathname.match(/\/dp\/([A-Z0-9]+)/)?.[1] ||
    document.querySelector('#ASIN')?.getAttribute('value') ||
    ''
  );
  const rows = [...document.querySelectorAll('[id^="inline-twister-row-"], .twisterSwatchWrapper, #twister, #variation_color_name, #variation_size_name, #variation_style_name')]
    .filter(visible);
  const dimensions = [];
  const seenRows = new Set();

  for (const row of rows) {
    const rowId = row.id || normalize(row.querySelector('label, .a-form-label')?.textContent);
    if (!rowId || seenRows.has(rowId)) continue;
    seenRows.add(rowId);

    const rawName = normalize(row.querySelector('.a-form-label, label, [class*="dimension-title"]')?.textContent);
    const selectedValue = normalize(row.querySelector('.selection, [class*="selection"], .a-color-state')?.textContent);
    const name = rawName.replace(/[:：]\s*.*$/, '') || rowId.replace(/^inline-twister-row-/, '').replace(/^variation_/, '');
    const optionEls = [...row.querySelectorAll('li, .a-button, [role="button"], a[href]')].filter(visible);
    const options = [];
    const seenOptions = new Set();

    for (const option of optionEls) {
      if (options.length >= limit) break;

      const text = normalize(option.innerText || option.textContent);
      const imageAlt = normalize(option.querySelector('img')?.getAttribute('alt'));
      const label = imageAlt || text.slice(0, 240);
      const href = absoluteUrl(option.querySelector('a[href]')?.getAttribute('href') || option.getAttribute('href'));
      const key = `${label} ${href}`;
      if (!label || seenOptions.has(key)) continue;
      seenOptions.add(key);

      const price = text.match(/(?:JPY|US\$|￥|\$)\s?[0-9][0-9,.]*/)?.[0] || '';
      const availability = normalize(option.getAttribute('aria-label') || option.getAttribute('title'));

      options.push({
        label,
        href,
        selected: option.classList.contains('a-button-selected') ||
          option.getAttribute('aria-checked') === 'true' ||
          option.getAttribute('aria-selected') === 'true',
        price,
        availability
      });
    }

    if (name || options.length) {
      dimensions.push({
        name,
        selectedValue,
        optionCount: options.length,
        options
      });
    }
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    asin,
    count: dimensions.length,
    dimensions
  };
}
