/**
 * web-cap script
 *
 * @description Read a Xiaohongshu user profile and visible profile note cards, optionally opening the current note author first.
 * @param {object} [input]
 * @param {boolean} [input.openCurrentAuthor=false] Click the author link in the currently open note detail before reading.
 * @param {number} [input.limit=20] Maximum visible profile notes to return.
 * @param {number} [input.waitMs=2000] Milliseconds to wait after opening the author profile.
 * @returns {{ ok: boolean, url: string, title: string, profile?: object, notes?: object[], error?: string }}
 * @match https://www.xiaohongshu.com/user/profile/*, https://www.xiaohongshu.com/explore/*
 */
export default async function (input = {}) {
  const limit = clampNumber(input.limit, 20, 1, 100);
  const waitMs = clampNumber(input.waitMs, 2000, 300, 10000);

  if (input.openCurrentAuthor) {
    const clicked = await clickCurrentAuthor();
    if (!clicked.ok) {
      return {
        ok: false,
        url: location.href,
        title: document.title,
        error: clicked.error
      };
    }
    await page.waitForTimeout(waitMs);
  }

  if (!isProfilePage()) {
    return {
      ok: false,
      url: location.href,
      title: document.title,
      error: 'This script requires a Xiaohongshu user profile page. Open a profile first, or use openCurrentAuthor:true from an open note detail.'
    };
  }

  const profile = readProfile();
  const notes = readProfileNotes(limit);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    profile,
    notes
  };
}

function isProfilePage() {
  return /xiaohongshu\.com\/user\/profile\//.test(location.href);
}

async function clickCurrentAuthor() {
  const detail = [...document.querySelectorAll('.note-detail-mask, .note-container, [class*="note-detail"], [class*="NoteDetail"]')]
    .find((element) => isVisible(element) && normalize(element.innerText).length > 80);
  if (!detail) {
    return {
      ok: false,
      error: 'openCurrentAuthor requires a visible note detail. Open a note first, then run this script.'
    };
  }

  const link = [...detail.querySelectorAll('a[href*="/user/profile/"]')]
    .filter(isVisible)
    .sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y)[0];

  if (!link) {
    return {
      ok: false,
      error: 'No visible author profile link was found on the current page.'
    };
  }

  link.click();
  return { ok: true };
}

function readProfile() {
  const root = document.querySelector('#userPageContainer, .user-page, [class*="user-page"], [class*="UserPage"]') || document.body;
  const text = normalize(root.innerText);
  const avatar = [...document.querySelectorAll('img')]
    .map((img) => ({ src: img.currentSrc || img.src || '', area: img.getBoundingClientRect().width * img.getBoundingClientRect().height }))
    .filter((img) => img.src && img.src.includes('avatar'))
    .sort((a, b) => b.area - a.area)[0]?.src || '';
  const name = normalize(document.querySelector('.user-name, .name, h1, [class*="userName"], [class*="nickname"]')?.textContent)
    || text.split(' ').find((part) => part && !/关注|粉丝|获赞|收藏/.test(part))
    || '';

  return {
    userId: location.href.match(/\/user\/profile\/([^/?#]+)/)?.[1] || '',
    name,
    avatar,
    description: readDescription(text),
    stats: readProfileStats(text),
    rawText: text.slice(0, 3000)
  };
}

function readDescription(text) {
  const markerIndex = text.search(/\d+\s*关注|\d+\s*粉丝|\d+\s*获赞|笔记\s*收藏\s*点赞/);
  if (markerIndex <= 0) return '';
  return text.slice(0, markerIndex)
    .replace(/^.*?小红书号：\S+/, '')
    .replace(/IP属地：\S+/, '')
    .trim()
    .slice(0, 500);
}

function readProfileStats(text) {
  const stat = (label) => {
    const before = text.match(new RegExp(`([\\d.]+万?\\+?)\\s*${label}`))?.[1];
    const after = text.match(new RegExp(`${label}\\s*([\\d.]+万?\\+?)`))?.[1];
    return parseCount(before || after);
  };

  return {
    followingCountNumber: stat('关注'),
    followerCountNumber: stat('粉丝'),
    likedAndCollectedCountNumber: stat('获赞与收藏|获赞')
  };
}

function readProfileNotes(limit) {
  return [...document.querySelectorAll('#exploreFeeds .note-item, .feeds-container .note-item, .note-item')]
    .filter(isVisibleInViewport)
    .slice(0, limit)
    .map(readCard)
    .filter((card) => card.noteId || card.title);
}

function readCard(card, index) {
  const rect = card.getBoundingClientRect();
  const text = normalize(card.innerText);
  const link = card.querySelector('a[href*="/explore/"], a[href*="/discovery/item/"], a[href]');
  const href = absoluteUrl(link?.getAttribute('href')) || noteHrefFromCard(card);
  const lines = text.split(' ').filter(Boolean);

  return {
    index,
    noteId: extractNoteId(href) || card.getAttribute('data-note-id') || '',
    title: normalize(card.querySelector('.title, .note-title, [class*="title"]')?.textContent) || lines.slice(0, Math.max(1, lines.length - 2)).join(' '),
    metric: lines.at(-1) || '',
    href,
    coverImage: findImage(card),
    text,
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
      return { src: img.currentSrc || img.src || '', width: rect.width, height: rect.height, area: rect.width * rect.height };
    })
    .filter((img) => img.src && img.width >= 40 && img.height >= 40 && !img.src.includes('avatar'))
    .sort((a, b) => b.area - a.area)[0];
  if (image) return image.src;
  return [...root.querySelectorAll('*')].map((element) => getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1] || '').find(Boolean) || '';
}

function noteHrefFromCard(card) {
  const match = card.outerHTML.match(/\/(?:explore|discovery\/item)\/[0-9a-fA-F]+[^"' <]*/);
  return match ? absoluteUrl(match[0]) : '';
}

function extractNoteId(value) {
  return String(value || '').match(/\/(?:explore|discovery\/item)\/([0-9a-fA-F]+)/)?.[1] || '';
}

function parseCount(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const match = text.match(/^([\d.]+)(万)?\+?$/);
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return null;
  return match[2] ? Math.round(number * 10000) : number;
}

function isVisible(element) {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

function isVisibleInViewport(element) {
  const rect = element.getBoundingClientRect();
  return isVisible(element) && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
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
