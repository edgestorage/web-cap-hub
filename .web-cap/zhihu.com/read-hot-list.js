/**
 * web-cap script
 *
 * @description Read visible entries from Zhihu Hot.
 * @param {object} [input]
 * @param {number} [input.limit=50] Maximum hot items to return.
 * @param {string} [input.step] Internal continuation step.
 * @param {boolean} [input.openHot=false] Open the Zhihu hot page before reading.
 * @returns {{ ok: boolean, url: string, title: string, count: number, items: Array<object> }}
 * @match https://www.zhihu.com/*
 */
export default async function (input = {}) {
  if (input.openHot && input.step !== 'read') {
    return cap.goto('https://www.zhihu.com/hot', { ...input, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 50), 100));
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
  const items = [];

  for (const item of [...document.querySelectorAll('.HotItem')].filter(visible)) {
    if (items.length >= limit) break;

    const title = normalize(item.querySelector('.HotItem-title')?.textContent);
    const href = absoluteUrl(item.querySelector('.HotItem-content a[href], a[href]')?.getAttribute('href'));
    if (!title || !href) continue;

    items.push({
      rank: normalize(item.querySelector('.HotItem-rank, .HotItem-index')?.textContent),
      title,
      excerpt: normalize(item.querySelector('.HotItem-excerpt')?.textContent),
      metrics: normalize(item.querySelector('.HotItem-metrics')?.textContent),
      href,
      image: absoluteUrl(item.querySelector('img')?.getAttribute('src'))
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
