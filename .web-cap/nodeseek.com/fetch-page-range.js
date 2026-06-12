/**
 * web-cap script
 *
 * @description Fetch post titles from a range of NodeSeek list pages.
 * @param {object} input
 * @param {number} input.startPage First page number to fetch.
 * @param {number} [input.count=5] Number of pages to fetch.
 * @param {number} [input.limitPerPage=80] Maximum posts to return per page.
 * @param {boolean} [input.includeContext=false] Include compact row text for each post.
 * @returns {{ ok: boolean, startPage: number, count: number, totalPostCount: number, pages: Array<object> }}
 * @match https://www.nodeseek.com/, https://www.nodeseek.com/page-*
 */
export default async function (input) {
  const isFooterLink = (title) => ['商家申请规则', 'Premium Provider', '广告合作'].includes(title);
  const findCompactRowText = (link, title) => {
    let node = link;
    let bestText = '';

    for (let depth = 0; depth < 5 && node; depth += 1) {
      const text = (node.innerText || '').replace(/\s+/g, ' ').trim();
      if (text.includes(title) && text.length > bestText.length && text.length < 600) {
        bestText = text;
      }
      node = node.parentElement;
    }

    return bestText;
  };

  const startPage = Number(input.startPage);
  const count = Number(input.count ?? 5);
  const limitPerPage = Math.max(1, Math.min(Number(input.limitPerPage ?? 80), 200));
  const includeContext = Boolean(input.includeContext);

  if (!Number.isInteger(startPage) || startPage < 1) {
    return {
      ok: false,
      error: 'startPage must be a positive integer',
      url: location.href,
      title: document.title
    };
  }

  if (!Number.isInteger(count) || count < 1 || count > 20) {
    return {
      ok: false,
      error: 'count must be an integer between 1 and 20',
      url: location.href,
      title: document.title
    };
  }

  const parser = new DOMParser();
  const pages = [];

  for (let offset = 0; offset < count; offset += 1) {
    const pageNumber = startPage + offset;
    const pageUrl = pageNumber === 1 ? new URL('/', location.origin).href : new URL(`/page-${pageNumber}`, location.origin).href;
    const html = await fetch(pageUrl, { credentials: 'include' }).then((response) => response.text());
    const doc = parser.parseFromString(html, 'text/html');
    const postLinks = [...doc.querySelectorAll('a[href]')].filter((link) => {
      const path = new URL(link.getAttribute('href'), location.origin).pathname;
      return /\/post-\d+-1$/.test(path);
    });

    const seen = new Set();
    const posts = [];

    for (const link of postLinks) {
      if (posts.length >= limitPerPage) break;

      const href = new URL(link.getAttribute('href'), location.origin).href;
      const postId = href.match(/post-(\d+)-1/)?.[1] ?? href;
      const postTitle = (link.textContent || '').replace(/\s+/g, ' ').trim();

      if (!postTitle || seen.has(postId) || isFooterLink(postTitle)) {
        continue;
      }

      seen.add(postId);

      const post = {
        id: postId,
        title: postTitle,
        href
      };

      if (includeContext) {
        post.context = findCompactRowText(link, postTitle);
      }

      posts.push(post);
    }

    pages.push({
      page: pageNumber,
      url: pageUrl,
      postCount: posts.length,
      posts
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    startPage,
    count,
    totalPostCount: pages.reduce((total, page) => total + page.postCount, 0),
    pages
  };
}
