/**
 * web-cap script
 *
 * @description Read post links from a NodeSeek list page.
 * @param {object} [input]
 * @param {number} [input.page=1] Page number to extract (1 = homepage).
 * @param {number} [input.limit=80] Maximum posts to return.
 * @param {boolean} [input.includeContext=false] Include compact surrounding row text.
 * @returns {{ ok: boolean, url: string, title: string, page: number, postCount: number, posts: Array<{ id: string, title: string, href: string, context?: string }> }}
 * @match https://www.nodeseek.com/, https://www.nodeseek.com/page-*
 */
export default async function (input = {}) {
  const page = Number(input.page ?? 1);
  const limit = Math.max(1, Math.min(Number(input.limit ?? 80), 200));
  const includeContext = Boolean(input.includeContext);

  if (!Number.isInteger(page) || page < 1) {
    return {
      ok: false,
      error: 'page must be a positive integer',
      url: location.href,
      title: document.title
    };
  }

  const pageUrl = page === 1 ? new URL('/', location.origin).href : new URL(`/page-${page}`, location.origin).href;
  const html = await fetch(pageUrl, { credentials: 'include' }).then((response) => response.text());
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const isFooterLink = (title) => ['商家申请规则', 'Premium Provider', '广告合作'].includes(title);
  const compactTextFor = (link, title) => {
    let node = link;
    let bestText = '';

    for (let depth = 0; depth < 6 && node; depth += 1) {
      const text = (node.innerText || '').replace(/\s+/g, ' ').trim();
      if (text.includes(title) && text.length > bestText.length && text.length < 700) {
        bestText = text;
      }
      node = node.parentElement;
    }

    return bestText;
  };

  const links = [...doc.querySelectorAll('a[href]')].filter((link) => {
    const href = link.getAttribute('href') || '';
    const path = new URL(href, location.origin).pathname;
    return /\/post-\d+-1$/.test(path);
  });

  const seen = new Set();
  const items = [];

  for (const link of links) {
    if (items.length >= limit) break;

    const href = new URL(link.getAttribute('href'), location.origin).href;
    const id = href.match(/post-(\d+)-1/)?.[1] || href;
    const titleText = (link.textContent || '').replace(/\s+/g, ' ').trim();
    if (!titleText || seen.has(id) || isFooterLink(titleText)) continue;

    seen.add(id);
    const post = { id, title: titleText, href };
    if (includeContext) post.context = compactTextFor(link, titleText);
    items.push(post);
  }

  return {
    ok: true,
    url: pageUrl,
    title: doc.title,
    page,
    postCount: items.length,
    posts: items
  };
}
