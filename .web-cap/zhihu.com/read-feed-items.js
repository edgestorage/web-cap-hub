/**
 * web-cap script
 *
 * @description Read visible Zhihu feed/search content cards from the current page.
 * @param {object} [input]
 * @param {number} [input.limit=20] Maximum items to return.
 * @param {number} [input.textLimit=800] Maximum characters for each excerpt.
 * @returns {{ ok: boolean, url: string, title: string, count: number, items: Array<object> }}
 * @match https://www.zhihu.com/*, https://zhuanlan.zhihu.com/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 20), 80));
  const textLimit = Math.max(120, Math.min(Number(input.textLimit ?? 800), 3000));
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
  const contentLink = (card) => {
    const link = card.querySelector([
      '.ContentItem-title a[href]',
      '.QuestionItem-title a[href]',
      'h2 a[href]',
      'a[href*="/question/"]',
      'a[href*="zhuanlan.zhihu.com/p/"]'
    ].join(','));
    return absoluteUrl(link?.getAttribute('href'));
  };
  const contentTitle = (card) => normalize(
    card.querySelector('.ContentItem-title, .QuestionItem-title, ' +
      'h2, a[href*="/question/"], a[href*="zhuanlan.zhihu.com/p/"]')?.textContent
  );
  const inferredAuthor = (card, title) => {
    const text = normalize(card.textContent);
    const afterTitle = title && text.startsWith(title) ? text.slice(title.length) : text;
    const match = afterTitle.match(/^([^:：]{1,80})[:：]/);
    return normalize(match?.[1]);
  };
  const authorLink = (card) => [...card.querySelectorAll('.UserLink-link[href], .AuthorInfo-name a[href]')]
    .find((link) => normalize(link.textContent)) ||
    card.querySelector('.UserLink-link[href], .AuthorInfo-name a[href]');
  const cards = [...document.querySelectorAll([
    '.TopstoryItem .ContentItem',
    '.SearchResult-Card .ContentItem',
    '.List-item .ContentItem',
    '.ContentItem'
  ].join(','))].filter(visible);
  const items = [];
  const seen = new Set();

  for (const card of cards) {
    if (items.length >= limit) break;

    const href = contentLink(card);
    const title = contentTitle(card);
    const key = href || title;
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const author = authorLink(card);
    const actions = [...card.querySelectorAll('.ContentItem-actions button, .ContentItem-action, .VoteButton')]
      .map((el) => normalize(el.textContent))
      .filter(Boolean);

    items.push({
      type: card.classList.contains('ArticleItem') ? 'article' :
        card.classList.contains('AnswerItem') ? 'answer' :
          card.classList.contains('QuestionItem') ? 'question' : 'content',
      title,
      href,
      author: normalize(author?.textContent) || inferredAuthor(card, title),
      authorHref: absoluteUrl(author?.getAttribute('href')),
      excerpt: normalize(card.querySelector('.RichContent, .RichText, .ContentItem-excerpt')?.textContent ||
        card.textContent).slice(0, textLimit),
      actions
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: items.length,
    items
  };
}
