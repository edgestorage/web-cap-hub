/**
 * web-cap script
 *
 * @description Read subcategories, pages, and files from a Wikipedia category page.
 * @param {object} [input]
 * @param {string} [input.category] Category name without or with Category: prefix.
 * @param {string} [input.url] Category URL to open before reading.
 * @param {string} [input.language=en] Wikipedia language subdomain used with input.category.
 * @param {number} [input.limit=200] Maximum total members to return.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, category?: object }}
 * @match https://*.wikipedia.org/wiki/Category:*
 */
export default async function (input = {}) {
  const language = String(input.language || location.hostname.split('.')[0] || 'en').replace(/[^a-z0-9-]/gi, '') || 'en';
  if (input.step !== 'read' && (input.url || input.category)) {
    let targetUrl = input.url;
    if (!targetUrl) {
      const name = String(input.category).trim().replace(/^Category:/i, 'Category:').replace(/\s+/g, '_');
      targetUrl = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(name).replace(/%20/g, '_').replace('Category%3A', 'Category:')}`;
    }
    return cap.goto(targetUrl, { ...input, language, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 200), 1000));
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const absoluteUrl = (href) => {
    if (!href) return '';
    try {
      const url = new URL(href, location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };
  const readLinks = (root, selector, max) => [...root.querySelectorAll(selector)]
    .map((link) => ({
      title: normalize(link.textContent),
      href: absoluteUrl(link.getAttribute('href'))
    }))
    .filter((item) => item.title && item.href)
    .slice(0, max);

  const subcategoryRoot = document.querySelector('#mw-subcategories') || document.createElement('div');
  const pagesRoot = document.querySelector('#mw-pages') || document.createElement('div');
  const filesRoot = document.querySelector('#mw-category-media') || document.createElement('div');
  const subcategories = readLinks(subcategoryRoot, 'li a[href], .CategoryTreeItem a[href], .mw-category-group a[href]', limit);
  const pages = readLinks(pagesRoot, 'li a[href], .mw-category-group a[href]', Math.max(0, limit - subcategories.length))
    .filter((item) => !item.href.includes('/wiki/Category:'));
  const files = readLinks(filesRoot, 'li a[href], .galleryfilename a[href]', Math.max(0, limit - subcategories.length - pages.length));
  const nextLink = [...document.querySelectorAll('a[href]')].find((link) => /^next page$/i.test(normalize(link.textContent)));
  const description = [...document.querySelectorAll('#mw-content-text > p')]
    .map((p) => normalize(p.textContent))
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 1000);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    category: {
      name: normalize(document.querySelector('#firstHeading, h1')?.textContent),
      description,
      subcategoryCount: subcategories.length,
      pageCount: pages.length,
      fileCount: files.length,
      subcategories,
      pages,
      files,
      nextHref: absoluteUrl(nextLink?.getAttribute('href'))
    }
  };
}
