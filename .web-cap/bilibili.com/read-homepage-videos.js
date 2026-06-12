/**
 * web-cap script
 *
 * @description Read recommended video list from bilibili.com homepage.
 * @param {object} [input]
 * @param {number} [input.limit] Maximum number of videos to return (default 20).
 * @param {boolean} [input.includeAds] Whether to include ad cards (default false).
 * @returns {{ ok: boolean, url: string, title: string, count: number, videos: Array<{ title: string, author: string, views: string, danmaku: string, duration: string, link: string }> }}
 * @match https://www.bilibili.com/
 */
export default async function (input = {}) {
  const limit = input.limit ?? 20;
  const includeAds = input.includeAds ?? false;

  const cards = document.querySelectorAll('.bili-video-card');
  const items = [];

  cards.forEach(card => {
    const titleEl = card.querySelector('.bili-video-card__info--tit a, .bili-video-card__info--tit');
    const title = titleEl?.getAttribute('title') || titleEl?.textContent?.trim() || '';
    const author = card.querySelector('[class*="author"], [class*="up-name"]')?.textContent?.trim() || '';

    const statsItems = card.querySelectorAll('[class*="stats"] span, [class*="stat"]');
    let views = '', danmaku = '';
    statsItems.forEach(s => {
      const t = s.textContent?.trim();
      if (t && t.match(/[0-9.]+万?/)) {
        if (!views) views = t;
        else if (!danmaku) danmaku = t;
      }
    });

    const duration = card.querySelector('[class*="duration"]')?.textContent?.trim() || '';
    const link = card.querySelector('a')?.href || '';
    const isAd = link.includes('cm.bilibili.com') || card.querySelector('[class*="ad"], [class*="promotion"]');

    if (title && (includeAds || !isAd)) {
      items.push({ title, author, views, danmaku, duration, link: link.slice(0, 120) });
    }
  });

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: Math.min(items.length, limit),
    videos: items.slice(0, limit)
  };
}
