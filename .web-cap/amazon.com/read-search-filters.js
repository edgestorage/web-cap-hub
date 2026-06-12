/**
 * web-cap script
 *
 * @description Read visible filter/refinement links from an Amazon search results page.
 * @param {object} [input]
 * @param {number} [input.limit=120] Maximum filters to return.
 * @returns {{ ok: boolean, url: string, title: string, count: number, filters: Array<object> }}
 * @match https://www.amazon.com/s*, https://www.amazon.co.jp/s*, https://www.amazon.co.uk/s*, https://www.amazon.de/s*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 120), 300));
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
  const groupFor = (link) => {
    let node = link.parentElement;
    for (let depth = 0; depth < 8 && node; depth += 1) {
      const heading = normalize(node.querySelector?.('h2, .a-size-base.a-text-bold')?.textContent);
      if (heading && heading !== normalize(link.textContent)) return heading;
      node = node.parentElement;
    }
    return '';
  };

  const links = [...document.querySelectorAll('#s-refinements a[href], [data-component-type="s-search-refinements"] a[href]')]
    .filter(visible);
  const seen = new Set();
  const filters = [];

  for (const link of links) {
    if (filters.length >= limit) break;

    const label = normalize(link.textContent);
    const href = absoluteUrl(link.getAttribute('href'));
    if (!label || !href) continue;

    const key = `${label} ${href}`;
    if (seen.has(key)) continue;
    seen.add(key);

    filters.push({
      label,
      group: groupFor(link),
      href,
      selected: link.getAttribute('aria-checked') === 'true' ||
        link.querySelector('input')?.checked === true ||
        (link.getAttribute('aria-current') === 'true') ||
        (/rh=/.test(href) && /p_n_|p_/.test(location.search))
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: filters.length,
    filters
  };
}
