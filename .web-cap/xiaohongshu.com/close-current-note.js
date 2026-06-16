/**
 * web-cap script
 *
 * @description Close the currently open Xiaohongshu note detail overlay and return to the existing feed without navigating to Explore.
 * @param {object} [input]
 * @param {number} [input.waitMs=800] Milliseconds to wait after closing.
 * @returns {{ ok: boolean, url: string, title: string, closed: boolean, method?: string, error?: string }}
 * @match https://www.xiaohongshu.com/explore/*, https://www.xiaohongshu.com/discovery/item/:noteId
 */
export default async function (input = {}) {
  const waitMs = clampNumber(input.waitMs, 800, 100, 5000);
  const beforeUrl = location.href;
  const detail = findDetailRoot();

  if (!detail) {
    return {
      ok: true,
      url: location.href,
      title: document.title,
      closed: false,
      method: 'none',
      error: 'No visible note detail overlay was found.'
    };
  }

  const closeTarget = findCloseTarget(detail);
  if (closeTarget) {
    closeTarget.click();
    await page.waitForTimeout(waitMs);
    return closeResult(beforeUrl, 'click');
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(waitMs);
  if (!findDetailRoot() || location.href !== beforeUrl) {
    return closeResult(beforeUrl, 'escape');
  }

  history.back();
  await page.waitForTimeout(waitMs);
  return closeResult(beforeUrl, 'history.back');
}

function closeResult(beforeUrl, method) {
  const closed = !findDetailRoot() || location.href !== beforeUrl;
  return {
    ok: closed,
    url: location.href,
    title: document.title,
    closed,
    method,
    error: closed ? undefined : 'Tried to close the note detail, but it still appears to be open.'
  };
}

function findDetailRoot() {
  return [...document.querySelectorAll('.note-detail-mask, .note-container, [class*="note-detail"], [class*="NoteDetail"]')]
    .find((element) => isVisible(element) && normalize(element.innerText).length > 80) || null;
}

function findCloseTarget(detail) {
  const selectors = [
    '.close',
    '.close-btn',
    '[class*="close"]',
    '[aria-label*="关闭"]',
    '[aria-label*="Close"]',
    'button'
  ];

  const candidates = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
  const visible = candidates
    .filter(isVisible)
    .map((element) => ({
      element,
      text: normalize(element.innerText || element.textContent),
      rect: element.getBoundingClientRect()
    }))
    .filter((item) => /关闭|close|×|✕|x/i.test(item.text) || item.rect.x < detail.getBoundingClientRect().x || item.rect.y < detail.getBoundingClientRect().y + 80);

  return visible
    .sort((a, b) => {
      const detailRect = detail.getBoundingClientRect();
      const aScore = Math.abs(a.rect.x - detailRect.x) + Math.abs(a.rect.y - detailRect.y);
      const bScore = Math.abs(b.rect.x - detailRect.x) + Math.abs(b.rect.y - detailRect.y);
      return aScore - bScore;
    })[0]?.element || null;
}

function isVisible(element) {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(number, max));
}
