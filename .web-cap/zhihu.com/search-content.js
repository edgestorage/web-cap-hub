/**
 * web-cap script
 *
 * @description Open a Zhihu content search and read visible search result cards.
 * @param {object} input
 * @param {string} input.query Search query.
 * @param {number} [input.limit=20] Maximum results to return.
 * @param {number} [input.waitMs=1500] Wait time after opening or scrolling.
 * @param {boolean} [input.scroll=true] Scroll once before reading lazy-loaded results.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, query: string, count: number, results: Array<object> }}
 * @match https://www.zhihu.com/*
 */
export default async function (input = {}) {
  const query = String(input.query || '').trim();
  if (!query) {
    return { ok: false, error: 'query is required', url: location.href, title: document.title };
  }

  if (input.step !== 'read') {
    const url = new URL('/search', 'https://www.zhihu.com');
    url.searchParams.set('type', 'content');
    url.searchParams.set('q', query);
    return cap.goto(url.href, { ...input, step: 'read' });
  }

  const waitMs = Math.max(0, Math.min(Number(input.waitMs ?? 1500), 5000));
  const shouldScroll = input.scroll !== false;
  if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
  if (shouldScroll) {
    window.scrollBy(0, 700);
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 20), 80));
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const inferredAuthor = (card, title) => {
    const text = normalize(card.textContent);
    const afterTitle = title && text.startsWith(title) ? text.slice(title.length) : text;
    const match = afterTitle.match(/^([^:：]{1,80})[:：]/);
    return normalize(match?.[1]);
  };
  const absoluteUrl = (href) => {
    if (!href) return '';
    try {
      const url = new URL(href, location.origin);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };
  const results = [];
  const seen = new Set();

  for (const card of document.querySelectorAll('.SearchResult-Card')) {
    if (results.length >= limit) break;

    const link = card.querySelector('.ContentItem-title a[href], h2 a[href], a[href*="/question/"], a[href*="zhuanlan.zhihu.com/p/"]');
    const href = absoluteUrl(link?.getAttribute('href'));
    const title = normalize(link?.textContent || card.querySelector('.ContentItem-title, h2')?.textContent);
    const key = href || title;
    if (!href || !key || seen.has(key)) continue;
    seen.add(key);

    const author = [...card.querySelectorAll('.UserLink-link[href], .AuthorInfo-name a[href]')]
      .find((link) => normalize(link.textContent)) ||
      card.querySelector('.UserLink-link[href], .AuthorInfo-name a[href]');
    results.push({
      title,
      href,
      author: normalize(author?.textContent) || inferredAuthor(card, title),
      authorHref: absoluteUrl(author?.getAttribute('href')),
      excerpt: normalize(card.querySelector('.RichContent, .RichText, .ContentItem-excerpt')?.textContent ||
        card.textContent).slice(0, 1000),
      actions: [...card.querySelectorAll('.ContentItem-actions button, .ContentItem-action, .VoteButton')]
        .map((el) => normalize(el.textContent))
        .filter(Boolean)
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    query,
    count: results.length,
    results
  };
}
