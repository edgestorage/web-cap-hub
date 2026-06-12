/**
 * web-cap script
 *
 * @description Read Hacker News story rows from the current listing page.
 * @param {object} [input]
 * @param {number} [input.limit=30] Maximum stories to return.
 * @param {"news"|"newest"|"front"|"ask"|"show"|"jobs"} [input.page] Optional HN section to open before reading.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, count: number, stories: Array<object>, moreHref?: string }}
 * @match https://news.ycombinator.com/*
 */
export default async function (input = {}) {
  if (input.page && input.step !== 'read') {
    const path = input.page === 'news' ? '/news' : `/${input.page}`;
    return cap.goto(new URL(path, location.origin).href, { ...input, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 30), 100));
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
  const stories = [];

  for (const row of document.querySelectorAll('tr.athing')) {
    if (stories.length >= limit) break;
    if (row.classList.contains('comtr') || !row.classList.contains('submission')) continue;

    const titleLink = row.querySelector('.titleline > a, .title a[href]');
    if (!titleLink) continue;
    const subtext = row.nextElementSibling;
    const itemHref = absoluteUrl(subtext?.querySelector('a[href^="item?id="], a[href*="item?id="]')?.getAttribute('href'));
    const itemId = row.id || itemHref.match(/id=(\d+)/)?.[1] || '';
    const scoreText = normalize(subtext?.querySelector('.score')?.textContent);
    const commentsLink = [...(subtext?.querySelectorAll('a[href*="item?id="]') || [])].at(-1);
    const commentsText = normalize(commentsLink?.textContent);

    stories.push({
      rank: normalize(row.querySelector('.rank')?.textContent).replace(/\.$/, ''),
      id: itemId,
      title: normalize(titleLink?.textContent),
      href: absoluteUrl(titleLink?.getAttribute('href')),
      site: normalize(row.querySelector('.sitestr')?.textContent),
      score: scoreText.match(/\d+/)?.[0] || '',
      user: normalize(subtext?.querySelector('.hnuser')?.textContent),
      userHref: absoluteUrl(subtext?.querySelector('.hnuser')?.getAttribute('href')),
      age: normalize(subtext?.querySelector('.age')?.textContent),
      itemHref,
      comments: commentsText.match(/\d+/)?.[0] || (commentsText === 'discuss' ? '0' : ''),
      commentsText
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: stories.length,
    stories,
    moreHref: absoluteUrl(document.querySelector('a.morelink')?.getAttribute('href'))
  };
}
