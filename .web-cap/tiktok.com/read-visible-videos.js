/**
 * web-cap script
 *
 * @description Read visible videos from the current TikTok page.
 * @param {object} [input]
 * @param {number} [input.limit] Maximum number of visible videos to return, from 1 to 50.
 * @param {number} [input.waitMs] Optional delay before reading the page.
 * @param {boolean} [input.includeDiagnostics=false] Include compact diagnostic data for selector tuning.
 * @param {boolean} [input.includeRects=false] Include viewport rectangles for each video item.
 * @returns {{ ok: boolean, url: string, title: string, count: number, videos: object[], diagnostics?: object }}
 * @match https://www.tiktok.com/, https://www.tiktok.com/foryou, https://www.tiktok.com/explore, https://www.tiktok.com/following, https://www.tiktok.com/@:handle, https://www.tiktok.com/tag/:tag, https://www.tiktok.com/music/*
 */
export default async function (input = {}) {
  const limit = clampNumber(input.limit ?? 20, 1, 50);
  const waitMs = clampNumber(input.waitMs ?? 1000, 0, 10000);
  const includeDiagnostics = input.includeDiagnostics === true;
  const includeRects = input.includeRects === true;

  if (waitMs > 0) await page.waitForTimeout(waitMs);

  const payload = await page.evaluate(({ limit, includeRects, includeDiagnostics }) => {
    const articles = findVideoItems();
    const videos = [];
    const seen = new Set();

    for (const article of articles) {
      if (videos.length >= limit) break;
      if (!isVisible(article)) continue;

      const item = readVideoItem(article, videos.length + 1, { includeRects });
      const identity = item.videoUrl || `${item.author}|${item.description}|${item.musicUrl}`;
      if (!item.author && !item.description && !item.music && !hasAnyMetric(item.metrics)) continue;
      if (seen.has(identity)) continue;

      seen.add(identity);
      videos.push(item);
    }

    return {
      videos,
      diagnostics: includeDiagnostics ? {
        candidateCount: articles.length,
        selectors: {
          feedItem: document.querySelectorAll('[data-e2e="recommend-list-item-container"]').length,
          videoCard: document.querySelectorAll('[data-e2e="user-post-item"], [data-e2e="challenge-item"], [data-e2e="search-card-video"]').length
        }
      } : undefined
    };
  }, { limit, includeRects, includeDiagnostics });

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: payload.videos.length,
    videos: payload.videos,
    ...(includeDiagnostics ? { diagnostics: payload.diagnostics } : {})
  };
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(number, max));
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
  }).filter((element) => !hasAncestorInList(element, direct)));
}

function readVideoItem(root, index, options) {
  const authorLink = firstVisible(root, [
    'a[href^="/@"]',
    'a[href*="tiktok.com/@"]'
  ]);
  const musicLink = firstVisible(root, [
    '[data-e2e="video-music"]',
    'a[href*="/music/"]'
  ]);
  const videoLink = findVideoLink(root);

  const description = normalize(firstVisible(root, [
    '[data-e2e="video-desc"]',
    '[data-e2e^="video-card-desc"]',
    '[class*="DivDescription"]'
  ])?.innerText || "");

  const item = {
    index,
    author: cleanAuthor(normalize(authorLink?.innerText || authorLink?.textContent || "")),
    authorUrl: toAbsolute(authorLink?.getAttribute("href") || ""),
    description,
    hashtags: readHashtags(root),
    music: readMusicText(musicLink),
    musicUrl: toAbsolute(musicLink?.getAttribute("href") || ""),
    videoUrl: videoLink,
    metrics: {
      likes: textByDataE2e(root, "like-count"),
      comments: textByDataE2e(root, "comment-count"),
      favorites: textByDataE2e(root, "favorite-count"),
      shares: textByDataE2e(root, "share-count")
    }
  };

  fillMissingMetricsFromButtons(root, item.metrics);

  if (options.includeRects) item.rect = rectOf(root);

  return item;
}

function findVideoLink(root) {
  const link = [...root.querySelectorAll('a[href*="/video/"]')]
    .filter(isVisible)
    .find((element) => /\/@[^/]+\/video\/\d+/.test(element.href));
  return link?.href || "";
}

function readHashtags(root) {
  return uniqueValues([...root.querySelectorAll('a[href*="/tag/"]')]
    .filter(isVisible)
    .map((element) => normalize(element.innerText || element.textContent || ""))
    .map((value) => value.startsWith("#") ? value : `#${value}`)
    .filter((value) => value.length > 1));
}

function readMusicText(musicLink) {
  if (!musicLink) return "";
  const text = normalize(musicLink.innerText || musicLink.textContent || "");
  const aria = normalize(musicLink.getAttribute("aria-label") || musicLink.getAttribute("title") || "");
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

function hasAnyMetric(metrics) {
  return Boolean(metrics.likes || metrics.comments || metrics.favorites || metrics.shares);
}

function firstVisible(root, selectors) {
  for (const selector of selectors) {
    const element = [...root.querySelectorAll(selector)].find(isVisible);
    if (element) return element;
  }
  return null;
}

function hasAncestorInList(element, ancestors) {
  return ancestors.some((ancestor) => ancestor !== element && ancestor.contains(element));
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
