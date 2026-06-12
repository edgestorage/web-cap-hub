/**
 * web-cap script
 *
 * @description Read a Hacker News item page and visible comments.
 * @param {object} [input]
 * @param {string|number} [input.itemId] Optional item id to open before reading.
 * @param {number} [input.limit=100] Maximum comments to return.
 * @param {number} [input.textLimit=2000] Maximum characters per comment.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, item: object, count: number, comments: Array<object> }}
 * @match https://news.ycombinator.com/*
 */
export default async function (input = {}) {
  if (input.itemId && input.step !== 'read') {
    const url = new URL('/item', location.origin);
    url.searchParams.set('id', String(input.itemId));
    return cap.goto(url.href, { ...input, step: 'read' });
  }

  const limit = Math.max(0, Math.min(Number(input.limit ?? 100), 500));
  const textLimit = Math.max(120, Math.min(Number(input.textLimit ?? 2000), 10000));
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
  const story = document.querySelector('tr.athing.submission, tr.athing:not(.comtr)');
  const subtext = story?.nextElementSibling;
  const titleLink = story?.querySelector('.titleline > a, .title a[href]');
  const comments = [];

  for (const row of document.querySelectorAll('tr.athing.comtr')) {
    if (comments.length >= limit) break;

    const indentWidth = Number(row.querySelector('.ind img')?.getAttribute('width') || 0);
    const text = normalize(row.querySelector('.commtext')?.textContent).slice(0, textLimit);
    if (!text) continue;

    comments.push({
      id: row.id || '',
      level: Math.floor(indentWidth / 40),
      indentWidth,
      user: normalize(row.querySelector('.hnuser')?.textContent),
      userHref: absoluteUrl(row.querySelector('.hnuser')?.getAttribute('href')),
      age: normalize(row.querySelector('.age')?.textContent),
      itemHref: absoluteUrl(row.querySelector('.age a[href]')?.getAttribute('href')),
      text,
      replyHref: absoluteUrl([...row.querySelectorAll('a[href]')].find((a) => normalize(a.textContent) === 'reply')?.getAttribute('href'))
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    item: {
      id: story?.id || new URLSearchParams(location.search).get('id') || '',
      title: normalize(titleLink?.textContent),
      href: absoluteUrl(titleLink?.getAttribute('href')),
      site: normalize(story?.querySelector('.sitestr')?.textContent),
      score: normalize(subtext?.querySelector('.score')?.textContent).match(/\d+/)?.[0] || '',
      user: normalize(subtext?.querySelector('.hnuser')?.textContent),
      age: normalize(subtext?.querySelector('.age')?.textContent)
    },
    count: comments.length,
    comments
  };
}
