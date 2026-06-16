/**
 * web-cap script
 *
 * @description Open a Xiaohongshu note by clicking a visible feed card by note ID, then read title, author, body text, tags, and main image URL.
 * @param {object} input
 * @param {string} [input.noteId] Xiaohongshu note ID, usually returned by read-feed-notes.js.
 * @param {number} [input.bodyLimit=6000] Maximum characters of note body text to return.
 * @param {number} [input.waitMs=2200] Milliseconds to wait after navigation.
 * @param {boolean} [input.readIfAlreadyOpen=true] Read immediately when the currently open detail matches input.noteId.
 * @param {boolean} [input.closeBeforeClick=false] Close any open note detail before looking for the target card in the current feed.
 * @param {string} [input.coverImage] Optional cover image from read-feed-notes.js, used as a fallback for video notes.
 * @returns {{ ok: boolean, url: string, title: string, note?: object, error?: string }}
 * @match https://www.xiaohongshu.com/explore, https://www.xiaohongshu.com/explore/*, https://www.xiaohongshu.com/discovery/item/:noteId
 */
export default async function (input = {}) {
  const bodyLimit = clampNumber(input.bodyLimit, 6000, 500, 20000);
  const waitMs = clampNumber(input.waitMs, 2200, 200, 10000);
  const noteId = String(input.noteId || '').trim();

  if (input.step === 'read') {
    await page.waitForTimeout(waitMs);
    return readCurrentNote(bodyLimit, input.feedCard || { coverImage: input.coverImage || '' });
  }

  if (!noteId) {
    return {
      ok: false,
      url: location.href,
      title: document.title,
      error: 'Provide input.noteId.'
    };
  }

  if (input.readIfAlreadyOpen !== false && extractNoteId(location.href) === noteId && findNoteRoot()) {
    await page.waitForTimeout(Math.min(waitMs, 1000));
    return readCurrentNote(bodyLimit, { coverImage: input.coverImage || '' });
  }

  if (input.closeBeforeClick) {
    const closed = await closeCurrentNote(Math.min(waitMs, 1200));
    if (!closed.ok && closed.hadDetail) {
      return {
        ok: false,
        url: location.href,
        title: document.title,
        error: closed.error || 'Could not close the current note detail before clicking the target card.',
        noteId
      };
    }
  }

  const clicked = await clickFeedCardByNoteId(noteId);
  if (!clicked.ok) {
    return {
      ok: false,
      url: location.href,
      title: document.title,
      error: clicked.error,
      noteId,
      visibleCards: clicked.visibleCards
    };
  }

  await page.waitForTimeout(waitMs);
  return readCurrentNote(bodyLimit, clicked.card);
}

async function closeCurrentNote(waitMs) {
  const beforeUrl = location.href;
  const detail = findOverlayNoteRoot();
  if (!detail) {
    return {
      ok: true,
      hadDetail: false,
      method: 'none'
    };
  }

  const closeTarget = findCloseTarget(detail);
  if (closeTarget) {
    closeTarget.click();
    await page.waitForTimeout(waitMs);
    return {
      ok: !findOverlayNoteRoot() || location.href !== beforeUrl,
      hadDetail: true,
      method: 'click',
      error: findOverlayNoteRoot() && location.href === beforeUrl ? 'Clicking the close control did not close the detail overlay.' : undefined
    };
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(waitMs);
  if (!findOverlayNoteRoot() || location.href !== beforeUrl) {
    return {
      ok: true,
      hadDetail: true,
      method: 'escape'
    };
  }

  history.back();
  await page.waitForTimeout(waitMs);
  return {
    ok: !findOverlayNoteRoot() || location.href !== beforeUrl,
    hadDetail: true,
    method: 'history.back',
    error: findOverlayNoteRoot() && location.href === beforeUrl ? 'History back did not close the detail overlay.' : undefined
  };
}

function findOverlayNoteRoot() {
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
  const detailRect = detail.getBoundingClientRect();

  return selectors
    .flatMap((selector) => [...document.querySelectorAll(selector)])
    .filter(isVisible)
    .map((element) => ({
      element,
      text: normalize(element.innerText || element.textContent),
      rect: element.getBoundingClientRect()
    }))
    .filter((item) => /关闭|close|×|✕|x/i.test(item.text) || item.rect.x < detailRect.x || item.rect.y < detailRect.y + 80)
    .sort((a, b) => {
      const aScore = Math.abs(a.rect.x - detailRect.x) + Math.abs(a.rect.y - detailRect.y);
      const bScore = Math.abs(b.rect.x - detailRect.x) + Math.abs(b.rect.y - detailRect.y);
      return aScore - bScore;
    })[0]?.element || null;
}

function readCurrentNote(bodyLimit, feedCard = {}) {
  const root = findNoteRoot();
  if (!root) {
    return {
      ok: false,
      url: location.href,
      title: document.title,
      error: 'No visible Xiaohongshu note detail was found.'
    };
  }

  const rawText = normalize(root.innerText);
  const body = extractBodyText(root, bodyLimit);
  const images = extractImages(root);
  const videos = extractVideos(root);
  const mainImage = videos.length
    ? feedCard.coverImage || videos.find((video) => video.poster)?.poster || chooseMainImage(images)
    : chooseMainImage(images) || feedCard.coverImage || '';
  const mediaType = videos.length ? 'video' : images.length ? 'image' : 'unknown';

  return {
    ok: true,
    url: location.href,
    title: document.title,
    note: {
      noteId: extractNoteId(location.href),
      title: extractNoteTitle(root, body, feedCard),
      author: extractAuthor(root),
      body,
      tags: extractTags(root),
      mainImage,
      mediaType,
      images,
      videos,
      publishedAt: extractPublishedAt(rawText),
      stats: extractStats(root),
      feedCard
    }
  };
}

function findNoteRoot() {
  const selectors = [
    '.note-detail-mask',
    '.note-container',
    '[class*="note-detail"]',
    '[class*="NoteDetail"]',
    'main'
  ];

  for (const selector of selectors) {
    const candidate = [...document.querySelectorAll(selector)]
      .find((element) => isVisible(element) && normalize(element.innerText).length > 120);
    if (candidate) return candidate;
  }

  if (/xiaohongshu\.com\/(explore|discovery\/item)\//.test(location.href)) {
    return document.body;
  }

  return null;
}

function extractNoteTitle(root, body, feedCard = {}) {
  const heading = [...root.querySelectorAll('h1, h2, [class*="title"], [id*="title"]')]
    .map((element) => normalize(element.textContent))
    .find((text) => text && text.length <= 120 && !/^共\s*\d+\s*条评论/.test(text) && text !== '猜你想搜');

  if (heading) return heading;

  const documentTitle = normalize(document.title.replace(/ - 小红书$/, ''));
  if (documentTitle && !documentTitle.startsWith('#')) return documentTitle;
  if (feedCard.title) return feedCard.title;
  if (documentTitle) return documentTitle;

  return normalize(body).split(/[。！？!?]/)[0].slice(0, 120);
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

  if (documentTitle && !documentTitle.startsWith('#') && body.startsWith(documentTitle)) {
    body = body.slice(documentTitle.length);
  }

  body = body.replace(/猜你想搜\s+.*$/, '');
  body = body.replace(/@\S+/g, '');

  return normalize(body).slice(0, bodyLimit);
}

function extractTags(root) {
  const matches = normalize(root.innerText).match(/#[\p{L}\p{N}_-]+/gu) || [];
  return [...new Set(matches)];
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
      return {
        src: match[1],
        alt: '',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        visible: isVisible(element),
        kind: 'background'
      };
    })
    .filter(Boolean);

  const seen = new Set();
  return [...imageNodes, ...backgroundImages]
    .filter((image) => {
      if (seen.has(image.src)) return false;
      seen.add(image.src);
      return image.visible && image.width >= 80 && image.height >= 80 && !image.src.includes('sns-avatar');
    })
    .map((image) => ({
      ...image,
      area: image.width * image.height
    }))
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
    .sort((a, b) => {
      const aScore = Math.abs(a.x) + Math.abs(a.y) + (a.kind === 'background' ? 1000 : 0);
      const bScore = Math.abs(b.x) + Math.abs(b.y) + (b.kind === 'background' ? 1000 : 0);
      return aScore - bScore;
    });

  return sorted[0]?.src || images[0]?.src || '';
}

function extractPublishedAt(text) {
  const match = text.match(/\b\d{2}-\d{2}\s+[\u4e00-\u9fa5A-Za-z]+|\d+\s*天前[\u4e00-\u9fa5A-Za-z]*/);
  return match?.[0] || '';
}

function extractStats(root) {
  const text = normalize(root.innerText);
  const engage = [...root.querySelectorAll('.interactions.engage-bar, .engage-bar-container, .engage-bar, .input-box')]
    .map((element) => ({
      element,
      text: normalize(element.innerText || element.textContent),
      rect: element.getBoundingClientRect()
    }))
    .filter((item) => item.text.includes('说点什么') || /发送\s*取消/.test(item.text) || /\d+\s+\d+\s+\d+/.test(item.text))
    .sort((a, b) => b.rect.y - a.rect.y)[0]?.element;
  const buttonRoot = engage?.querySelector('.buttons.engage-bar-style, .buttons') || engage?.querySelector('.interact-container') || engage;
  let buttonCounts = buttonRoot
    ? [...buttonRoot.querySelectorAll(':scope > span')]
      .map((button) => normalize(button.querySelector('.count')?.textContent || button.textContent))
      .filter(Boolean)
      .filter((value) => value !== '赞' && value !== '回复')
    : [];
  if (buttonCounts.length < 3 && buttonRoot) {
    buttonCounts = [...buttonRoot.querySelectorAll('.count')]
      .map((count) => normalize(count.textContent))
      .filter((value) => value && value !== '赞' && value !== '回复')
      .filter((value, index, values) => index === 0 || value !== values[index - 1]);
  }
  const commentMatch = text.match(/共\s*([\d.]+万?\+?)\s*条评论/);
  const fallbackNumbers = text.split(/说点什么|发送|取消/)[0].match(/\b\d+(?:\.\d+)?万?\+?\b/g) || [];
  const likeCount = buttonCounts[0] || '';
  const collectCount = buttonCounts[1] || '';
  const commentCount = buttonCounts[2] || commentMatch?.[1] || '';

  return {
    likeCountNumber: parseCount(likeCount),
    collectCountNumber: parseCount(collectCount),
    commentCountNumber: parseCount(commentCount)
  };
}

async function clickFeedCardByNoteId(noteId) {
  const cards = await page.locator('#exploreFeeds .note-item, .feeds-container .note-item').evaluateAll((nodes) => (
    nodes.map((node, index) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const html = node.outerHTML;
      const href = node.querySelector('a[href*="/explore/"], a[href*="/discovery/item/"], a[href]')?.getAttribute('href') || '';
      const dataNoteId = node.getAttribute('data-note-id') || node.dataset?.noteId || '';
      const text = (node.innerText || '').replace(/\s+/g, ' ').trim();
      const matchedId = dataNoteId
        || href.match(/\/(?:explore|discovery\/item)\/([0-9a-fA-F]+)/)?.[1]
        || html.match(/\/(?:explore|discovery\/item)\/([0-9a-fA-F]+)/)?.[1]
        || '';

      const coverImage = findFeedCardImage(node);
      return {
        index,
        noteId: matchedId,
        title: text.replace(/\s+\S+\s+\d+(?:\.\d+)?万?\+?$/, '').slice(0, 120),
        coverImage,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 20 && rect.height > 20 && rect.bottom > 0 && rect.right > 0
      };
    }).filter((card) => card.visible)
  )).catch(() => []);

  const card = cards.find((candidate) => candidate.noteId === noteId);
  if (!card) {
    return {
      ok: false,
      error: 'No visible feed card matched input.noteId. Run read-feed-notes.js first and pass a noteId from its visible notes.',
      visibleCards: cards.map((candidate) => ({
        index: candidate.index,
        noteId: candidate.noteId,
        title: candidate.title
      }))
    };
  }

  await page.mouse.click(card.x + card.width / 2, card.y + Math.min(card.height / 2, 180));
  return {
    ok: true,
    card: {
      noteId: card.noteId,
      title: card.title,
      coverImage: card.coverImage
    }
  };
}

function findFeedCardImage(root) {
  const image = [...root.querySelectorAll('img')]
    .map((img) => {
      const rect = img.getBoundingClientRect();
      return {
        src: img.currentSrc || img.src || '',
        area: rect.width * rect.height,
        width: rect.width,
        height: rect.height
      };
    })
    .filter((img) => img.src && img.width >= 40 && img.height >= 40 && !img.src.includes('sns-avatar'))
    .sort((a, b) => b.area - a.area)[0];

  if (image) return image.src;

  return [...root.querySelectorAll('*')]
    .map((element) => {
      const match = getComputedStyle(element).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
      return match?.[1] || '';
    })
    .find(Boolean) || '';
}

function extractNoteId(value) {
  const match = String(value || '').match(/\/(?:explore|discovery\/item)\/([0-9a-fA-F]+)/);
  return match?.[1] || '';
}

function isVisible(element) {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 20 && rect.height > 20;
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

function parseCount(value) {
  const text = String(value || '').trim();
  if (!text || text === '赞' || text === '回复') return null;
  const match = text.match(/^([\d.]+)(万)?\+?$/);
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return null;
  return match[2] ? Math.round(number * 10000) : number;
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(number, max));
}
