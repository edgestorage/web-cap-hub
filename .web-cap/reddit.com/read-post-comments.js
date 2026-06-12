/**
 * web-cap script
 *
 * @description Read comments for one or more Reddit posts, using Reddit's public JSON representation.
 * @param {object} [input]
 * @param {string[]} [input.urls] Reddit post URLs. If omitted, visible post URLs on the current page are used.
 * @param {number} [input.postLimit=10] Maximum visible post URLs to infer when input.urls is omitted.
 * @param {number} [input.commentLimit=10] Maximum comments to return per post.
 * @param {number} [input.commentBodyLimit=1000] Maximum characters per comment body.
 * @param {boolean} [input.includeReplies=false] Include nested replies when available.
 * @returns {{ ok: boolean, url: string, title: string, count: number, posts: Array<object> }}
 * @match https://www.reddit.com/*, https://old.reddit.com/*
 */
export default async function (input = {}) {
  const postLimit = Math.max(1, Math.min(Number(input.postLimit ?? 10), 30));
  const commentLimit = Math.max(0, Math.min(Number(input.commentLimit ?? 10), 100));
  const commentBodyLimit = Math.max(120, Math.min(Number(input.commentBodyLimit ?? 1000), 5000));
  const includeReplies = Boolean(input.includeReplies);
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const absoluteUrl = (href) => {
    if (!href) return '';
    try {
      return new URL(href, location.origin).href;
    } catch {
      return '';
    }
  };
  const toJsonUrl = (href) => {
    const url = new URL(href, location.origin);
    url.search = '';
    url.hash = '';
    if (!url.pathname.endsWith('/')) {
      url.pathname += '/';
    }
    url.pathname += '.json';
    url.searchParams.set('limit', String(commentLimit));
    url.searchParams.set('raw_json', '1');
    return url.href;
  };
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const visiblePostUrls = () => {
    const selectors = ['shreddit-post', 'article', '[data-testid="post-container"]'];
    const candidates = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
    const urls = [];
    const seen = new Set();

    for (const el of candidates) {
      if (urls.length >= postLimit) break;
      if (!visible(el)) continue;

      const href = absoluteUrl(
        el.getAttribute('permalink') ||
        el.getAttribute('content-href') ||
        el.querySelector('a[href*="/comments/"]')?.getAttribute('href')
      );
      if (!href || seen.has(href)) continue;
      seen.add(href);
      urls.push(href);
    }

    return urls;
  };
  const flattenComments = (children, output, depth = 0) => {
    for (const child of children || []) {
      if (output.length >= commentLimit) return;
      if (child.kind !== 't1') continue;

      const data = child.data || {};
      const body = normalize(data.body || data.body_html || '');
      if (body) {
        output.push({
          author: data.author || '',
          body: body.slice(0, commentBodyLimit),
          score: data.score ?? null,
          depth,
          permalink: data.permalink ? absoluteUrl(data.permalink) : ''
        });
      }

      if (includeReplies && data.replies?.data?.children) {
        flattenComments(data.replies.data.children, output, depth + 1);
      }
    }
  };

  const urls = Array.isArray(input.urls) && input.urls.length
    ? input.urls.map(absoluteUrl).filter(Boolean)
    : visiblePostUrls();

  const posts = [];

  for (const postUrl of urls.slice(0, postLimit)) {
    try {
      const response = await fetch(toJsonUrl(postUrl), {
        credentials: 'include',
        headers: { accept: 'application/json' }
      });

      if (!response.ok) {
        posts.push({
          ok: false,
          url: postUrl,
          error: `HTTP ${response.status}`
        });
        continue;
      }

      const payload = await response.json();
      const postData = payload?.[0]?.data?.children?.[0]?.data || {};
      const commentChildren = payload?.[1]?.data?.children || [];
      const comments = [];
      flattenComments(commentChildren, comments);

      posts.push({
        ok: true,
        url: postUrl,
        title: postData.title || '',
        subreddit: postData.subreddit_name_prefixed || '',
        author: postData.author || '',
        score: postData.score ?? null,
        commentTotal: postData.num_comments ?? null,
        commentCount: comments.length,
        comments
      });
    } catch (error) {
      posts.push({
        ok: false,
        url: postUrl,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: posts.length,
    posts
  };
}
