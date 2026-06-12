/**
 * web-cap script
 *
 * @description Read visible posts from the current Reddit feed or listing page.
 * @param {object} [input]
 * @param {number} [input.limit=12] Maximum posts to return.
 * @param {boolean} [input.includeText=false] Include a compact visible text sample for each post.
 * @param {boolean} [input.includePromoted=false] Include promoted posts and ads.
 * @param {number} [input.textLimit=600] Maximum characters per post text sample.
 * @returns {{ ok: boolean, url: string, title: string, postCount: number, posts: Array<object> }}
 * @match https://www.reddit.com/*, https://old.reddit.com/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 12), 50));
  const includeText = Boolean(input.includeText);
  const includePromoted = Boolean(input.includePromoted);
  const textLimit = Math.max(120, Math.min(Number(input.textLimit ?? 600), 2000));
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
  const firstLink = (el) => (
    el.querySelector('a[href*="/comments/"]') ||
    el.querySelector('a[href^="/r/"]') ||
    el.querySelector('a[href^="https://www.reddit.com/r/"]')
  );
  const extractSubreddit = (el, text) => {
    const attr = el.getAttribute('subreddit-prefixed-name') || el.getAttribute('subreddit-name');
    if (attr) return attr.startsWith('r/') ? attr : `r/${attr}`;

    const subredditLink = [...el.querySelectorAll('a[href*="/r/"]')]
      .map((a) => normalize(a.textContent))
      .find((label) => /^r\/[A-Za-z0-9_]+/.test(label));
    if (subredditLink) return subredditLink.match(/^r\/[A-Za-z0-9_]+/)?.[0] || subredditLink;

    return text.match(/\br\/[A-Za-z0-9_]+\b/)?.[0] || '';
  };
  const extractNumber = (value) => {
    const text = normalize(String(value || ''));
    return text || '';
  };

  const selectors = [
    'shreddit-post',
    'article',
    '[data-testid="post-container"]'
  ];
  const candidates = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
  const seen = new Set();
  const posts = [];

  for (const el of candidates) {
    if (posts.length >= limit) break;
    if (!visible(el)) continue;

    const text = normalize(el.innerText || el.textContent);
    if (!text || text.length < 20) continue;

    const promoted = /(^|\s)(Promoted|Ad|Sponsored)(\s|$)/i.test(text) || el.hasAttribute('promoted');
    if (promoted && !includePromoted) continue;

    const link = firstLink(el);
    const href = absoluteUrl(el.getAttribute('permalink') || el.getAttribute('content-href') || link?.getAttribute('href'));
    const titleText = normalize(
      el.getAttribute('post-title') ||
      el.querySelector('[slot="title"], a[slot="title"], h1, h2, h3')?.textContent
    );
    const title = titleText || text.slice(0, 180);
    const key = href || title;
    if (!title || seen.has(key)) continue;
    seen.add(key);

    const post = {
      title,
      href,
      subreddit: extractSubreddit(el, text),
      author: normalize(el.getAttribute('author') || el.querySelector('a[href*="/user/"], a[href*="/u/"]')?.textContent),
      score: extractNumber(el.getAttribute('score') || el.querySelector('[id*="score"], [aria-label*="upvote"]')?.textContent),
      comments: extractNumber(el.getAttribute('comment-count') || el.querySelector('a[href*="/comments/"] [slot], a[href*="/comments/"]')?.textContent),
      promoted
    };

    if (includeText) {
      post.text = text.slice(0, textLimit);
    }

    posts.push(post);
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    postCount: posts.length,
    posts
  };
}
