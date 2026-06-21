/**
 * web-cap script
 *
 * @description Read the TikTok video item currently closest to the viewport center.
 * @param {object} [input]
 * @param {number} [input.waitMs] Optional delay before reading the page.
 * @returns {{ ok: boolean, url: string, title: string, video?: object, error?: string }}
 * @match https://www.tiktok.com/*, https://www.tiktok.com/@:handle/video/:videoId
 */
export default async function (input = {}) {
  const waitMs = clampNumber(input.waitMs ?? 500, 0, 10000);
  if (waitMs > 0) await page.waitForTimeout(waitMs);

  const result = await page.evaluate(() => {
    const item = findCurrentItem();
    if (!item) return { ok: false, error: "No visible TikTok video item found." };
    return { ok: true, video: readVideoItem(item) };
  });

  return {
    ...result,
    url: location.href,
    title: document.title
  };
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(number, max));
}

function findCurrentItem() {
  const candidates = findVideoItems().filter(isVisible);
  if (candidates.length === 0) return null;

  const centerY = window.innerHeight / 2;
  return candidates
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      return { element, score: overlap - Math.abs((rect.top + rect.height / 2) - centerY) / 4 };
    })
    .sort((a, b) => b.score - a.score)[0]?.element || null;
}

function findVideoItems() {
  const selectors = [
    '[data-e2e="recommend-list-item-container"]',
    'article[data-e2e*="list-item"]',
    '[data-e2e="user-post-item"]',
    '[data-e2e="challenge-item"]',
    '[data-e2e="search-card-video"]'
  ];
  const direct = uniqueElements(document.querySelectorAll(selectors.join(",")));
  if (direct.length > 0) return direct;

  return uniqueElements([...document.querySelectorAll("article, section, div")].filter((element) => {
    const text = normalize(element.innerText || element.textContent || "");
    const rect = element.getBoundingClientRect();
    return rect.width >= 220
      && rect.height >= 120
      && (element.querySelector('a[href*="/@"]') || element.querySelector('a[href*="/music/"]'))
      && (/\b\d[\d,.]*\s*[KM]\b/i.test(text) || text.includes("#") || /\d{1,2}:\d{2}/.test(text));
  }));
}

function readVideoItem(root) {
  const authorLink = firstVisible(root, ['a[href^="/@"]', 'a[href*="tiktok.com/@"]']);
  const musicLink = firstVisible(root, ['[data-e2e="video-music"]', 'a[href*="/music/"]']);
  const description = normalize(firstVisible(root, [
    '[data-e2e="video-desc"]',
    '[data-e2e^="video-card-desc"]',
    '[class*="DivDescription"]'
  ])?.innerText || "");

  const video = {
    author: cleanAuthor(normalize(authorLink?.innerText || authorLink?.textContent || "")),
    authorUrl: toAbsolute(authorLink?.getAttribute("href") || ""),
    description,
    hashtags: readHashtags(root),
    music: readMusicText(musicLink),
    musicUrl: toAbsolute(musicLink?.getAttribute("href") || ""),
    videoUrl: findVideoLink(root),
    metrics: {
      likes: textByDataE2e(root, "like-count"),
      comments: textByDataE2e(root, "comment-count"),
      favorites: textByDataE2e(root, "favorite-count"),
      shares: textByDataE2e(root, "share-count")
    },
    rect: rectOf(root)
  };

  fillMissingMetricsFromButtons(root, video.metrics);
  return video;
}

function findVideoLink(root) {
  return [...root.querySelectorAll('a[href*="/video/"]')]
    .filter(isVisible)
    .find((element) => /\/@[^/]+\/video\/\d+/.test(element.href))?.href || "";
}

function readHashtags(root) {
  return uniqueValues([...root.querySelectorAll('a[href*="/tag/"]')]
    .filter(isVisible)
    .map((element) => normalize(element.innerText || element.textContent || ""))
    .map((value) => value.startsWith("#") ? value : `#${value}`)
    .filter((value) => value.length > 1));
}

function readMusicText(musicLink) {
  const text = normalize(musicLink?.innerText || musicLink?.textContent || "");
  const aria = normalize(musicLink?.getAttribute("aria-label") || musicLink?.getAttribute("title") || "");
  return text || aria.replace(/^Watch more videos with music\s+/i, "");
}

function textByDataE2e(root, value) {
  return normalize(root.querySelector(`[data-e2e="${value}"]`)?.innerText || "");
}

function fillMissingMetricsFromButtons(root, metrics) {
  for (const button of root.querySelectorAll("button[aria-label]")) {
    const aria = normalize(button.getAttribute("aria-label") || "");
    const value = normalize(button.innerText || button.textContent || "") || extractMetricFromAria(aria);
    if (!value) continue;
    if (!metrics.likes && /like|likes|赞/i.test(aria)) metrics.likes = value;
    if (!metrics.comments && /comment|comments|评论/i.test(aria)) metrics.comments = value;
    if (!metrics.favorites && /favorite|favorites|收藏/i.test(aria)) metrics.favorites = value;
    if (!metrics.shares && /share|shares|分享/i.test(aria)) metrics.shares = value;
  }
}

function extractMetricFromAria(value) {
  const match = value.match(/(\d[\d,.]*\s*[KMB万亿]?)/i);
  return match ? match[1].replace(/\s+/g, "") : "";
}

function firstVisible(root, selectors) {
  for (const selector of selectors) {
    const element = [...root.querySelectorAll(selector)].find(isVisible);
    if (element) return element;
  }
  return null;
}

function uniqueElements(elements) {
  return [...new Set([...elements])];
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function cleanAuthor(value) {
  return value.replace(/^@/, "");
}

function toAbsolute(href) {
  if (!href) return "";
  try {
    return new URL(href, location.href).href;
  } catch {
    return href;
  }
}

function rectOf(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

function isVisible(element) {
  if (!element) return false;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function normalize(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}
