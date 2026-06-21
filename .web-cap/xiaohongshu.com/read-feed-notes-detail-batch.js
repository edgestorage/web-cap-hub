/**
 * web-cap script
 *
 * @description Read multiple visible Xiaohongshu feed notes by clicking cards from the current feed, preserving the feed between notes.
 * @param {object} [input]
 * @param {Array<string|object>} [input.notes] Note IDs or note objects from read-feed-notes.js. When omitted, visible feed cards are used.
 * @param {number} [input.limit=5] Maximum notes to read.
 * @param {number} [input.bodyLimit=4000] Maximum characters of note body text to return for each note.
 * @param {number} [input.waitMs=1800] Milliseconds to wait after each click/close.
 * @returns {{ ok: boolean, url: string, title: string, count: number, results: object[] }}
 * @match https://www.xiaohongshu.com/explore, https://www.xiaohongshu.com/explore/*
 */
export default async function (input = {}) {
  const limit = clampNumber(input.limit, 5, 1, 30);
  const bodyLimit = clampNumber(input.bodyLimit, 4000, 500, 20000);
  const waitMs = clampNumber(input.waitMs, 1800, 200, 8000);
  const requested = normalizeRequestedNotes(input.notes).slice(0, limit);
  const cards = readVisibleFeedCards();
  const queue = requested.length ? requested : cards.slice(0, limit);
  const results = [];

  for (const item of queue) {
    await closeCurrentNote(waitMs);
    const currentCards = readVisibleFeedCards();
    const target = currentCards.find((card) => card.noteId === item.noteId) || currentCards[item.index];

    if (!target) {
      results.push({
        ok: false,
        noteId: item.noteId || '',
        error: 'Target note card is not visible in the current feed.'
      });
      continue;
    }

    await page.mouse.click(target.x + target.width / 2, target.y + Math.min(target.height / 2, 180));
    await page.waitForTimeout(waitMs);
    const detail = readCurrentNote(bodyLimit, target);
    results.push(detail.ok ? detail.note : detail);
  }

  await closeCurrentNote(waitMs);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: results.length,
    results
  };
}

function normalizeRequestedNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes
    .map((note, index) => {
      if (typeof note === 'string') return { noteId: note, index };
      return {
        noteId: String(note?.noteId || '').trim(),
        index: Number.isFinite(Number(note?.index)) ? Number(note.index) : index,
        coverImage: note?.coverImage || ''
      };
    })
    .filter((note) => note.noteId || Number.isFinite(note.index));
}

function readVisibleFeedCards() {
  return [...document.querySelectorAll('#exploreFeeds .note-item, .feeds-container .note-item')]
    .filter(isVisibleInViewport)
    .map((node, index) => {
      const rect = node.getBoundingClientRect();
      const text = normalize(node.innerText);
      const html = node.outerHTML;
      const href = node.querySelector('a[href*="/explore/"], a[href*="/discovery/item/"], a[href]')?.getAttribute('href') || '';
      const noteId = node.getAttribute('data-note-id')
        || node.dataset?.noteId
        || href.match(/\/(?:explore|discovery\/item)\/([0-9a-fA-F]+)/)?.[1]
        || html.match(/\/(?:explore|discovery\/item)\/([0-9a-fA-F]+)/)?.[1]
        || '';

      return {
        index,
        noteId,
        title: normalize(node.querySelector('.title, .note-title, [class*="title"]')?.textContent) || text.replace(/\s+\S+\s+\d+(?:\.\d+)?万?\+?$/, ''),
        coverImage: findImage(node),
        text,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };
    })
    .filter((card) => card.noteId);
}

function readCurrentNote(bodyLimit, feedCard = {}) {
  const root = findNoteRoot();
  if (!root) {
    return {
      ok: false,
      error: 'No visible note detail was found after clicking the card.',
      noteId: feedCard.noteId || ''
    };
  }

  const rawText = normalize(root.innerText);
  const body = extractBodyText(root, bodyLimit);
  const images = extractImages(root);
  const videos = extractVideos(root);
  const mainImage = videos.length
    ? feedCard.coverImage || videos.find((video) => video.poster)?.poster || chooseMainImage(images)
    : chooseMainImage(images) || feedCard.coverImage || '';

  return {
    ok: true,
    note: {
      noteId: extractNoteId(location.href) || feedCard.noteId || '',
      title: extractNoteTitle(root, body, feedCard),
      author: extractAuthor(root),
      body,
      tags: extractTags(root),
      mainImage,
      mediaType: videos.length ? 'video' : images.length ? 'image' : 'unknown',
      images,
      videos,
      publishedAt: extractPublishedAt(rawText),
      stats: extractStats(root),
      feedCard,
      rawText: rawText.slice(0, bodyLimit)
    }
  };
}

async function closeCurrentNote(waitMs) {
  const detail = findOverlayNoteRoot();
  if (!detail) return { ok: true, closed: false };
  const beforeUrl = location.href;
  const closeTarget = findCloseTarget(detail);

  if (closeTarget) {
    closeTarget.click();
    await page.waitForTimeout(waitMs);
    return { ok: !findOverlayNoteRoot() || location.href !== beforeUrl, closed: true, method: 'click' };
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(waitMs);
  if (!findOverlayNoteRoot() || location.href !== beforeUrl) return { ok: true, closed: true, method: 'escape' };

  history.back();
  await page.waitForTimeout(waitMs);
  return { ok: !findOverlayNoteRoot() || location.href !== beforeUrl, closed: true, method: 'history.back' };
}

function findNoteRoot() {
  return findOverlayNoteRoot() || (/xiaohongshu\.com\/(explore|discovery\/item)\//.test(location.href) ? document.body : null);
}

function findOverlayNoteRoot() {
  return [...document.querySelectorAll('.note-detail-mask, .note-container, [class*="note-detail"], [class*="NoteDetail"]')]
    .find((element) => isVisible(element) && normalize(element.innerText).length > 80) || null;
}

function findCloseTarget(detail) {
  const detailRect = detail.getBoundingClientRect();
  return ['.close', '.close-btn', '[class*="close"]', '[aria-label*="关闭"]', '[aria-label*="Close"]', 'button']
    .flatMap((selector) => [...document.querySelectorAll(selector)])
    .filter(isVisible)
    .map((element) => ({ element, text: normalize(element.innerText || element.textContent), rect: element.getBoundingClientRect() }))
    .filter((item) => /关闭|close|×|✕|x/i.test(item.text) || item.rect.x < detailRect.x || item.rect.y < detailRect.y + 80)
    .sort((a, b) => (Math.abs(a.rect.x - detailRect.x) + Math.abs(a.rect.y - detailRect.y)) - (Math.abs(b.rect.x - detailRect.x) + Math.abs(b.rect.y - detailRect.y)))[0]?.element || null;
}

function extractNoteTitle(root, body, feedCard = {}) {
  const heading = [...root.querySelectorAll('h1, h2, [class*="title"], [id*="title"]')]
    .map((element) => normalize(element.textContent))
    .find((text) => text && text.length <= 120 && !/^共\s*\d+\s*条评论/.test(text) && text !== '猜你想搜');
  const documentTitle = normalize(document.title.replace(/ - 小红书$/, ''));
  return heading || (!documentTitle.startsWith('#') ? documentTitle : '') || feedCard.title || documentTitle || normalize(body).split(/[。！？!?]/)[0].slice(0, 120);
}

function extractAuthor(root) {
  const link = [...root.querySelectorAll('a[href]')]
    .find((candidate) => {
      const href = candidate.getAttribute('href') || '';
      const text = normalize(candidate.textContent);
      return text && (/\/user\/profile\//.test(href) || text.length <= 40);
    });
  const avatar = [...root.querySelectorAll('img')]
    .find((image) => (image.currentSrc || image.src || '').includes('sns-avatar'));
  return {
    name: normalize(link?.textContent),
    href: absoluteUrl(link?.getAttribute('href')),
    avatar: avatar?.currentSrc || avatar?.src || ''
  };
}

function extractBodyText(root, bodyLimit) {
  const text = normalize(root.innerText);
  const documentTitle = normalize(document.title.replace(/ - 小红书$/, ''));
  const commentIndex = text.search(/共\s*\d+\s*条评论|说点什么|THE END/i);
  let body = commentIndex >= 0 ? text.slice(0, commentIndex) : text;
  body = body.replace(/^(\d+\/\d+\s*)?/, '');
  body = body.replace(/^[^ ]{1,40}\s+关注\s+/, '');
  if (documentTitle && !documentTitle.startsWith('#') && body.startsWith(documentTitle)) body = body.slice(documentTitle.length);
  body = body.replace(/猜你想搜\s+.*$/, '');
  body = body.replace(/@\S+/g, '');
  return normalize(body).slice(0, bodyLimit);
}

function extractTags(root) {
  return [...new Set(normalize(root.innerText).match(/#[\p{L}\p{N}_-]+/gu) || [])];
}

function extractImages(root) {
  const imageNodes = [...root.querySelectorAll('img')]
    .map((image) => {
      const rect = image.getBoundingClientRect();
      return {
        src: image.currentSrc || image.src || '',
        alt: image.alt || '',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        visible: isVisible(image),
        kind: (image.currentSrc || image.src || '').includes('sns-avatar') ? 'avatar' : 'image'
      };
    })
    .filter((image) => image.src);
  const backgroundImages = [...root.querySelectorAll('*')]
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const match = getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
      if (!match) return null;
      return { src: match[1], alt: '', width: Math.round(rect.width), height: Math.round(rect.height), x: Math.round(rect.x), y: Math.round(rect.y), visible: isVisible(element), kind: 'background' };
    })
    .filter(Boolean);
  const seen = new Set();
  return [...imageNodes, ...backgroundImages]
    .filter((image) => {
      if (seen.has(image.src)) return false;
      seen.add(image.src);
      return image.visible && image.width >= 80 && image.height >= 80 && !image.src.includes('sns-avatar');
    })
    .map((image) => ({ ...image, area: image.width * image.height }))
    .sort((a, b) => b.area - a.area)
    .slice(0, 20);
}

function extractVideos(root) {
  return [...root.querySelectorAll('video')]
    .map((video) => {
      const rect = video.getBoundingClientRect();
      return {
        src: video.currentSrc || video.src || '',
        poster: video.poster || '',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        visible: isVisible(video),
        duration: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) / 1000 : null,
        currentTime: Number.isFinite(video.currentTime) ? Math.round(video.currentTime * 1000) / 1000 : null
      };
    })
    .filter((video) => video.visible || video.src || video.poster);
}

function chooseMainImage(images) {
  const sorted = images
    .filter((image) => image.visible && image.area > 10000)
    .sort((a, b) => (Math.abs(a.x) + Math.abs(a.y) + (a.kind === 'background' ? 1000 : 0)) - (Math.abs(b.x) + Math.abs(b.y) + (b.kind === 'background' ? 1000 : 0)));
  return sorted[0]?.src || images[0]?.src || '';
}

function extractPublishedAt(text) {
  const match = text.match(/\b\d{2}-\d{2}\s+[\u4e00-\u9fa5A-Za-z]+|\d+\s*天前[\u4e00-\u9fa5A-Za-z]*/);
  return match?.[0] || '';
}

function extractStats(root) {
  const text = normalize(root.innerText);
  const engage = [...root.querySelectorAll('.interactions.engage-bar, .engage-bar-container, .engage-bar, .input-box')]
    .map((element) => ({ element, text: normalize(element.innerText || element.textContent), rect: element.getBoundingClientRect() }))
    .filter((item) => item.text.includes('说点什么') || /发送\s*取消/.test(item.text) || /\d+\s+\d+\s+\d+/.test(item.text))
    .sort((a, b) => b.rect.y - a.rect.y)[0]?.element;
  const buttonRoot = engage?.querySelector('.buttons.engage-bar-style, .buttons') || engage?.querySelector('.interact-container') || engage;
  let counts = buttonRoot
    ? [...buttonRoot.querySelectorAll(':scope > span')].map((button) => normalize(button.querySelector('.count')?.textContent || button.textContent)).filter((value) => value && value !== '赞' && value !== '回复')
    : [];
  if (counts.length < 3 && buttonRoot) {
    counts = [...buttonRoot.querySelectorAll('.count')].map((count) => normalize(count.textContent)).filter((value) => value && value !== '赞' && value !== '回复').filter((value, index, values) => index === 0 || value !== values[index - 1]);
  }
  const commentMatch = text.match(/共\s*([\d.]+万?\+?)\s*条评论/);
  return {
    likeCountNumber: parseCount(counts[0]),
    collectCountNumber: parseCount(counts[1]),
    commentCountNumber: parseCount(counts[2] || commentMatch?.[1])
  };
}

function findImage(root) {
  const image = [...root.querySelectorAll('img')]
    .map((img) => {
      const rect = img.getBoundingClientRect();
      return { src: img.currentSrc || img.src || '', area: rect.width * rect.height, width: rect.width, height: rect.height };
    })
    .filter((img) => img.src && img.width >= 40 && img.height >= 40 && !img.src.includes('sns-avatar'))
    .sort((a, b) => b.area - a.area)[0];
  if (image) return image.src;
  return [...root.querySelectorAll('*')].map((element) => getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1] || '').find(Boolean) || '';
}

function extractNoteId(value) {
  return String(value || '').match(/\/(?:explore|discovery\/item)\/([0-9a-fA-F]+)/)?.[1] || '';
}

function parseCount(value) {
  const text = String(value || '').trim();
  if (!text || text === '赞' || text === '回复') return null;
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
