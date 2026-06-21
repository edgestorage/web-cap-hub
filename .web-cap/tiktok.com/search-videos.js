/**
 * web-cap script
 *
 * @description Search TikTok videos and read visible search results.
 * @param {object} input
 * @param {string} input.query Search query.
 * @param {string} [input.step] Internal workflow step.
 * @param {number} [input.limit] Maximum number of visible results to return, from 1 to 50.
 * @param {number} [input.waitMs] Optional delay before reading results.
 * @returns {{ ok: boolean, url: string, title: string, query: string, count?: number, videos?: object[], error?: string }}
 * @match https://www.tiktok.com/search*, https://www.tiktok.com/*
 */
export default async function (input = {}) {
  const query = String(input.query || "").trim();
  const limit = clampNumber(input.limit ?? 20, 1, 50);
  const waitMs = clampNumber(input.waitMs ?? 1200, 0, 10000);

  if (!query) {
    return { ok: false, error: "Provide input.query.", url: location.href, title: document.title, query };
  }

  if (input.step !== "read") {
    const url = `https://www.tiktok.com/search/video?q=${encodeURIComponent(query)}`;
    return cap.goto(url, { ...input, query, limit, waitMs, step: "read" });
  }

  if (waitMs > 0) await page.waitForTimeout(waitMs);

  const payload = await page.evaluate(({ limit }) => {
    const pageError = readPageError();
    if (pageError) return { pageError, videos: [] };

    const results = [];
    const seen = new Set();
    for (const card of findResultCards()) {
      if (results.length >= limit) break;
      if (!isVisible(card)) continue;
      const item = readCard(card, results.length + 1);
      const identity = item.videoUrl || `${item.author}|${item.description}`;
      if (!item.description && !item.videoUrl) continue;
      if (seen.has(identity)) continue;
      seen.add(identity);
      results.push(item);
    }
    return { videos: results };
  }, { limit });

  return {
    ok: !payload.pageError,
    error: payload.pageError,
    url: location.href,
    title: document.title,
    query,
    count: payload.videos.length,
    videos: payload.videos
  };
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(number, max));
}

function findResultCards() {
  const selectors = [
    '[data-e2e="search-card-video"]',
    '[data-e2e="user-post-item"]',
    'div[class*="DivSearchVideoCard"]',
    'div[class*="DivItemContainer"]'
  ];
  const direct = uniqueElements(document.querySelectorAll(selectors.join(",")));
  if (direct.length > 0) return direct;

  return uniqueElements([...document.querySelectorAll("div, article")].filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width >= 120
      && rect.height >= 120
      && element.querySelector('a[href*="/video/"]');
  }));
}

function readPageError() {
  const explicit = normalize(document.querySelector('[data-e2e="search-error-desc"]')?.innerText || "");
  if (explicit) return { code: "tiktok_search_page_error", message: explicit };

  const hasGenericError = [...document.querySelectorAll("p, h1, h2, div")]
    .some((element) => {
      if (!isVisible(element)) return false;
      const text = normalize(element.innerText || element.textContent || "");
      return /^(server.*problem|something went wrong|服务器出现问题|出错了|抱歉，服务器出现问题，请重试。)$/i.test(text);
    });
  if (hasGenericError) {
    return { code: "tiktok_search_page_error", message: "TikTok search page returned an error state." };
  }
  return null;
}

function readCard(root, index) {
  const authorLink = [...root.querySelectorAll('a[href*="/@"]')].filter(isVisible)[0];
  const videoLink = [...root.querySelectorAll('a[href*="/video/"]')].filter(isVisible)[0] || authorLink;
  const descNode = firstText(root, [
    '[data-e2e="search-card-video-caption"]',
    '[data-e2e^="video-card-desc"]',
    '[data-e2e="video-desc"]',
    'img[alt]'
  ]);
  const image = [...root.querySelectorAll("img")].find((element) => isVisible(element) && element.currentSrc);

  return {
    index,
    author: cleanAuthor(normalize(authorLink?.innerText || authorLink?.textContent || "")),
    authorUrl: toAbsolute(authorLink?.getAttribute("href") || ""),
    description: normalize(descNode?.getAttribute?.("alt") || descNode?.innerText || descNode?.textContent || ""),
    videoUrl: toAbsolute(videoLink?.getAttribute("href") || ""),
    thumbnailUrl: image?.currentSrc || image?.src || "",
    metrics: readVisibleMetrics(root)
  };
}

function readVisibleMetrics(root) {
  const text = normalize(root.innerText || root.textContent || "");
  const values = [...text.matchAll(/\b\d[\d,.]*\s*[KMB万亿]?\b/gi)].map((match) => match[0].replace(/\s+/g, ""));
  return { visibleCounts: values.slice(0, 6) };
}

function firstText(root, selectors) {
  for (const selector of selectors) {
    const element = [...root.querySelectorAll(selector)].find((node) => {
      if (!isVisible(node)) return false;
      return normalize(node.getAttribute?.("alt") || node.innerText || node.textContent || "");
    });
    if (element) return element;
  }
  return null;
}

function uniqueElements(elements) {
  return [...new Set([...elements])];
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

function isVisible(element) {
  if (!element) return false;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function normalize(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}
