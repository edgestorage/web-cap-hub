/**
 * web-cap script
 *
 * @description Move to the next or previous TikTok feed video and optionally read visible videos after navigation.
 * @param {object} [input]
 * @param {"next"|"previous"|"down"|"up"} [input.direction="next"] Feed direction.
 * @param {number} [input.count=1] Number of navigation steps, from 1 to 20.
 * @param {number} [input.waitMs=1200] Maximum delay after each step.
 * @param {boolean} [input.readAfter=true] Read visible videos after navigation.
 * @returns {{ ok: boolean, url: string, title: string, direction: string, requestedSteps: number, completedSteps: number, moved: boolean, before?: object, after?: object, count?: number, videos?: object[] }}
 * @match https://www.tiktok.com/*, https://www.tiktok.com/
 */
export default async function (input = {}) {
  const direction = normalizeDirection(input.direction || "next");
  const requestedSteps = clampNumber(input.count ?? 1, 1, 20);
  const waitMs = clampNumber(input.waitMs ?? 1200, 300, 10000);
  const readAfter = input.readAfter !== false;
  const before = await page.evaluate(() => readCurrentVideoSummary());
  let completedSteps = 0;

  for (let index = 0; index < requestedSteps; index += 1) {
    const movedOneStep = await moveOneStep(direction, waitMs);
    if (!movedOneStep) break;
    completedSteps += 1;
  }

  const after = await page.evaluate(() => readCurrentVideoSummary());
  const moved = Boolean(before && after && videoIdentity(before) !== videoIdentity(after));
  const videos = readAfter ? await page.evaluate(() => readVisibleVideos(10)) : undefined;

  return {
    ok: true,
    url: location.href,
    title: document.title,
    direction,
    requestedSteps,
    completedSteps,
    moved,
    before,
    after,
    ...(readAfter ? { count: videos.length, videos } : {})
  };
}

async function moveOneStep(direction, waitMs) {
  const before = await page.evaluate(() => videoIdentity(readCurrentVideoSummary()));
  const clicked = await clickFeedNavigationButton(direction);

  if (!clicked) await fallbackMove(direction);
  if (await waitForVideoChange(before, waitMs)) return true;

  if (clicked) {
    await fallbackMove(direction);
    return waitForVideoChange(before, waitMs);
  }

  return false;
}

async function clickFeedNavigationButton(direction) {
  const buttonIndex = await page.evaluate((direction) => {
    const current = readCurrentVideoSummary();
    if (!current?.rect) return -1;

    const minX = current.rect.x + current.rect.width - 12;
    const maxX = current.rect.x + current.rect.width + 140;
    const minY = Math.max(0, current.rect.y - 80);
    const maxY = Math.min(window.innerHeight, current.rect.y + current.rect.height + 80);

    const buttons = [...document.querySelectorAll("button")]
      .map((button, index) => ({ button, index, rect: button.getBoundingClientRect(), style: getComputedStyle(button) }))
      .filter(({ button, rect, style }) => {
        const className = String(button.className || "");
        const aria = String(button.getAttribute("aria-label") || "").toLowerCase();
        const disabled = button.disabled || button.getAttribute("aria-disabled") === "true" || className.includes("disabled");
        return !disabled
          && aria !== "exit"
          && style.display !== "none"
          && style.visibility !== "hidden"
          && rect.width >= 24
          && rect.width <= 64
          && rect.height >= 24
          && rect.height <= 64
          && rect.x >= minX
          && rect.x <= maxX
          && rect.y >= minY
          && rect.y <= maxY
          && !/点赞|评论|收藏|分享|like|comment|favorite|share/i.test(aria)
          && !normalize(button.innerText || button.textContent || "");
      })
      .sort((a, b) => a.rect.y - b.rect.y);

    if (buttons.length === 0) return -1;
    return direction === "previous" ? buttons[0].index : buttons[buttons.length - 1].index;
  }, direction);

  if (buttonIndex < 0) return false;
  await page.locator("button").nth(buttonIndex).click();
  return true;
}

async function fallbackMove(direction) {
  const delta = direction === "next" ? 1 : -1;
  if (direction === "next") {
    await page.keyboard.press("PageDown");
    await page.keyboard.press("ArrowDown");
  } else {
    await page.keyboard.press("PageUp");
    await page.keyboard.press("ArrowUp");
  }
  await page.evaluate((delta) => {
    const candidates = [
      document.getElementById("column-list-container"),
      document.querySelector('[class*="DivColumnListContainer"]'),
      document.scrollingElement,
      document.documentElement,
      document.body
    ].filter(Boolean);

    for (const element of candidates) {
      const before = element.scrollTop;
      element.scrollBy({ top: delta * window.innerHeight, behavior: "smooth" });
      if (element.scrollTop !== before || element.scrollHeight > element.clientHeight) break;
    }
  }, delta).catch(() => {});
}

async function waitForVideoChange(before, waitMs) {
  const deadline = Date.now() + waitMs;

  while (Date.now() < deadline) {
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => videoIdentity(readCurrentVideoSummary()));
    if (after && after !== before) return true;
  }

  return false;
}

function normalizeDirection(value) {
  return /^(previous|up|prev)$/i.test(String(value)) ? "previous" : "next";
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(number, max));
}

function readVisibleVideos(limit) {
  const videos = [];
  const seen = new Set();

  for (const item of findVideoItems().filter(isVisible)) {
    const video = readVideoItem(item, videos.length + 1);
    const identity = videoIdentity(video);
    if (!identity || seen.has(identity)) continue;

    seen.add(identity);
    videos.push(video);
    if (videos.length >= limit) break;
  }

  return videos;
}

function readCurrentVideoSummary() {
  const candidates = findVideoItems().filter(isVisible);
  if (candidates.length === 0) return null;

  const centerY = window.innerHeight / 2;
  const current = candidates
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
      return { element, score: overlap - Math.abs((rect.top + rect.height / 2) - centerY) / 4 };
    })
    .sort((a, b) => b.score - a.score)[0]?.element;

  return current ? readVideoItem(current, 1) : null;
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

function readVideoItem(root, index) {
  const authorLink = firstVisible(root, ['a[href^="/@"]', 'a[href*="tiktok.com/@"]']);
  const musicLink = firstVisible(root, ['[data-e2e="video-music"]', 'a[href*="/music/"]']);
  return {
    index,
    author: cleanAuthor(normalize(authorLink?.innerText || authorLink?.textContent || "")),
    authorUrl: toAbsolute(authorLink?.getAttribute("href") || ""),
    description: normalize(firstVisible(root, ['[data-e2e="video-desc"]', '[data-e2e^="video-card-desc"]'])?.innerText || ""),
    hashtags: uniqueValues([...root.querySelectorAll('a[href*="/tag/"]')].filter(isVisible).map((element) => {
      const value = normalize(element.innerText || element.textContent || "");
      return value.startsWith("#") ? value : `#${value}`;
    }).filter((value) => value.length > 1)),
    music: readMusicText(musicLink),
    musicUrl: toAbsolute(musicLink?.getAttribute("href") || ""),
    metrics: {
      likes: textByDataE2e(root, "like-count"),
      comments: textByDataE2e(root, "comment-count"),
      favorites: textByDataE2e(root, "favorite-count"),
      shares: textByDataE2e(root, "share-count")
    },
    rect: rectOf(root)
  };
}

function videoIdentity(video) {
  if (!video) return "";
  return [
    video.authorUrl,
    video.author,
    video.description,
    video.musicUrl,
    video.metrics?.likes,
    video.metrics?.comments
  ].filter(Boolean).join("|");
}

function firstVisible(root, selectors) {
  for (const selector of selectors) {
    const element = [...root.querySelectorAll(selector)].find(isVisible);
    if (element) return element;
  }
  return null;
}

function textByDataE2e(root, value) {
  return normalize(root.querySelector(`[data-e2e="${value}"]`)?.innerText || "");
}

function readMusicText(musicLink) {
  const text = normalize(musicLink?.innerText || musicLink?.textContent || "");
  const aria = normalize(musicLink?.getAttribute("aria-label") || musicLink?.getAttribute("title") || "");
  return text || aria.replace(/^Watch more videos with music\s+/i, "");
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
