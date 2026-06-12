/**
 * web-cap script
 *
 * @description Read the video list from a bilibili space (UP主主页) with full stats.
 * @param {object} input
 * @param {string} [input.uid] Bilibili user UID. If omitted, reads videos from the current space page.
 * @param {number} [input.limit] Maximum number of videos to return (default 20).
 * @returns {{ ok: boolean, url: string, title: string, count: number, videos: Array<{ title: string, views: string, danmaku: string, duration: string, date: string, link: string }> }}
 * @match https://space.bilibili.com/:uid/video, https://space.bilibili.com/:uid/upload/video
 */
export default async function (input = {}) {
  const limit = input.limit ?? 20;

  if (input.step === 'videos' || !input.uid) {
    await page.waitForTimeout(2000);

    const cards = document.querySelectorAll('.upload-video-card');
    const items = [];

    cards.forEach(card => {
      const titleEl = card.querySelector('.bili-video-card__title');
      const title = titleEl?.getAttribute('title') || titleEl?.textContent?.trim() || '';

      const linkEl = card.querySelector('a.bili-cover-card');
      const href = linkEl?.getAttribute('href') || '';
      const link = href.startsWith('//') ? 'https:' + href : href;

      const stats = card.querySelectorAll('.bili-cover-card__stat');
      const views = stats[0]?.textContent?.trim() || '';
      const danmaku = stats[1]?.textContent?.trim() || '';
      const duration = stats[2]?.textContent?.trim() || '';

      const date = card.querySelector('.bili-video-card__subtitle')?.textContent?.trim() || '';

      if (title) {
        items.push({ title, views, danmaku, duration, date, link });
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

  // 导航到指定UID的视频页
  if (input.uid) {
    return cap.goto(`https://space.bilibili.com/${input.uid}/video`, { step: 'videos', uid: input.uid, limit });
  }

  return { ok: false, error: 'Unable to read space videos' };
}
