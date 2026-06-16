/**
 * web-cap script
 *
 * @description Read visible Xiaohongshu feed note cards with note IDs, titles, authors, metrics, hrefs, and cover images.
 * @param {object} [input]
 * @param {number} [input.limit=30] Maximum visible feed cards to return.
 * @param {boolean} [input.openExplore=false] Navigate to the Xiaohongshu explore feed before reading.
 * @param {number} [input.waitMs=1800] Milliseconds to wait after optional navigation.
 * @returns {{ ok: boolean, url: string, title: string, count?: number, notes?: object[], error?: string }}
 * @match https://www.xiaohongshu.com/explore, https://www.xiaohongshu.com/explore/*
 */
export default async function (input = {}) {
  const limit = clampNumber(input.limit, 30, 1, 100);
  const waitMs = clampNumber(input.waitMs, 1800, 200, 8000);

  if (input.openExplore && location.href !== 'https://www.xiaohongshu.com/explore') {
    return cap.goto('https://www.xiaohongshu.com/explore', {
      ...input,
      openExplore: false,
      step: 'read'
    });
  }

  if (input.step === 'read') {
    await page.waitForTimeout(waitMs);
  }

  const cards = [...document.querySelectorAll('#exploreFeeds .note-item, .feeds-container .note-item')]
    .filter(isVisible)
    .slice(0, limit)
    .map(readCard)
    .filter((card) => card.title || card.href || card.noteId);

  if (!cards.length) {
    return {
      ok: false,
      url: location.href,
      title: document.title,
      error: 'No visible Xiaohongshu feed note cards were found.'
    };
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: cards.length,
    notes: cards
  };
}

function readCard(card, index) {
  const rect = card.getBoundingClientRect();
  const text = normalize(card.innerText);
  const link = card.querySelector('a[href*="/explore/"], a[href*="/discovery/item/"], a[href]');
  const href = absoluteUrl(link?.getAttribute('href')) || noteHrefFromCard(card);
  const noteId = extractNoteId(href) || card.getAttribute('data-note-id') || '';
  const image = findImage(card);
  const lines = text.split(' ').filter(Boolean);
  const title = normalize(card.querySelector('.title, .note-title, [class*="title"]')?.textContent)
    || lines.slice(0, Math.max(1, lines.length - 2)).join(' ');
  const author = normalize(card.querySelector('.author, .name, [class*="author"], [class*="name"]')?.textContent)
    || lines.at(-2)
    || '';
  const metric = lines.at(-1) || '';

  return {
    index,
    noteId,
    title,
    author,
    metric,
    href,
    coverImage: image,
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  };
}

function findImage(root) {
  const image = [...root.querySelectorAll('img')]
    .map((img) => {
      const rect = img.getBoundingClientRect();
      return {
        src: img.currentSrc || img.src || '',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        area: rect.width * rect.height
      };
    })
    .filter((img) => img.src && img.width >= 40 && img.height >= 40)
    .sort((a, b) => b.area - a.area)[0];

  if (image) return image.src;

  const background = [...root.querySelectorAll('*')]
    .map((element) => {
      const match = getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
      return match?.[1] || '';
    })
    .find(Boolean);

  return background || '';
}

function noteHrefFromCard(card) {
  const html = card.outerHTML;
  const match = html.match(/\/(?:explore|discovery\/item)\/[0-9a-fA-F]+[^"' <]*/);
  return match ? absoluteUrl(match[0]) : '';
}

function extractNoteId(value) {
  const match = String(value || '').match(/\/(?:explore|discovery\/item)\/([0-9a-fA-F]+)/);
  return match?.[1] || '';
}

function isVisible(element) {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 20 && rect.height > 20 && rect.bottom > 0 && rect.right > 0;
}

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(href) {
  if (!href) return '';
  try {
    return new URL(href, location.origin).href;
  } catch {
    return '';
  }
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(number, max));
}
