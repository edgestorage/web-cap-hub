/**
 * web-cap script
 *
 * @description Click the "换一换" (refresh) button on bilibili.com homepage to get new recommendations.
 * @param {object} [input]
 * @param {boolean} [input.readAfterRefresh] Also read video list after refreshing (default false).
 * @param {number} [input.limit] Max videos to return when readAfterRefresh is true (default 20).
 * @returns {{ ok: boolean, url: string, refreshed: boolean, videos?: Array }}
 * @match https://www.bilibili.com/
 */
export default async function (input = {}) {
  const readAfterRefresh = input.readAfterRefresh ?? false;
  const limit = input.limit ?? 20;

  // 点击换一换
  const btn = page.locator('text=换一换').first();
  if (await btn.count() === 0) {
    return { ok: false, error: '换一换 button not found', url: location.href };
  }

  await btn.click();
  await page.waitForTimeout(2000);

  if (!readAfterRefresh) {
    return { ok: true, refreshed: true, url: location.href };
  }

  // 刷新后读取视频列表
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

    if (title && !isAd) {
      items.push({ title, author, views, danmaku, duration, link: link.slice(0, 120) });
    }
  });

  return {
    ok: true,
    refreshed: true,
    url: location.href,
    title: document.title,
    count: Math.min(items.length, limit),
    videos: items.slice(0, limit)
  };
}
