/**
 * web-cap script
 *
 * @description Read the current Zhihu/Zhuanlan article title, author, body, headings, and links.
 * @param {object} [input]
 * @param {number} [input.bodyLimit=6000] Maximum characters of article body.
 * @param {number} [input.linkLimit=40] Maximum article links to return.
 * @returns {{ ok: boolean, url: string, title: string, article: object }}
 * @match https://zhuanlan.zhihu.com/p/*, https://www.zhihu.com/*
 */
export default async function (input = {}) {
  const bodyLimit = Math.max(500, Math.min(Number(input.bodyLimit ?? 6000), 20000));
  const linkLimit = Math.max(0, Math.min(Number(input.linkLimit ?? 40), 200));
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
  const root = document.querySelector('article, .Post-Main, .Post-RichTextContainer, .RichText') || document.body;
  const author = [...document.querySelectorAll('.Post-Header .UserLink-link[href], .AuthorInfo-name a[href], .UserLink-link[href]')]
    .find((link) => normalize(link.textContent)) ||
    root.querySelector('.UserLink-link[href], .AuthorInfo-name a[href]');
  const bodyRoot = document.querySelector('.Post-RichTextContainer .RichText, .Post-RichTextContainer, article .RichText, .RichText');
  const links = [...(bodyRoot || root).querySelectorAll('a[href]')]
    .slice(0, linkLimit)
    .map((link) => ({
      text: normalize(link.textContent),
      href: absoluteUrl(link.getAttribute('href'))
    }))
    .filter((link) => link.text || link.href);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    article: {
      title: normalize(document.querySelector('.Post-Title, article h1, h1')?.textContent),
      author: normalize(author?.textContent),
      authorHref: absoluteUrl(author?.getAttribute('href')),
      meta: normalize(document.querySelector('.Post-Header, .ContentItem-meta')?.textContent),
      body: normalize(bodyRoot?.textContent || root.textContent).slice(0, bodyLimit),
      headings: [...(bodyRoot || root).querySelectorAll('h1, h2, h3')]
        .map((heading) => normalize(heading.textContent))
        .filter(Boolean),
      links
    }
  };
}
