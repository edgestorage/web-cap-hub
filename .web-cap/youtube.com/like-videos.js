/**
 * web-cap script
 *
 * @description Like YouTube videos selected by visible list indexes or explicit video URLs.
 * @param {object} input
 * @param {string} [input.step] Internal workflow step.
 * @param {number[]} [input.videoIndexes] One-based visible video indexes to like when videoUrls is not supplied.
 * @param {string[]} [input.videoUrls] Explicit YouTube video URLs to like.
 * @param {Array<object>} [input.targets] Internal resolved video targets.
 * @param {Array<object>} [input.results] Internal like results collected so far.
 * @param {number} [input.cursor] Internal target cursor.
 * @param {number} [input.waitMs] Optional delay after each video load.
 * @returns {object} Structured result with per-video like status.
 * @match https://www.youtube.com/, https://www.youtube.com/feed/*, https://www.youtube.com/results*, https://www.youtube.com/@:handle/videos, https://www.youtube.com/watch*
 */
export default async function (input = {}) {
  const waitMs = Math.max(0, Number(input.waitMs ?? 1500));

  if (input.step === "like") {
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(waitMs);

    const target = input.targets[input.cursor];
    const likeResult = await likeCurrentVideo(target);
    const results = [...(input.results || []), likeResult];
    const nextCursor = input.cursor + 1;

    if (nextCursor >= input.targets.length) {
      return {
        ok: results.every((result) => result.ok || result.alreadyLiked),
        count: results.length,
        results
      };
    }

    return cap.goto(input.targets[nextCursor].url, {
      step: "like",
      targets: input.targets,
      cursor: nextCursor,
      results,
      waitMs
    });
  }

  const targets = input.videoUrls?.length
    ? input.videoUrls.map((url, index) => ({ index: index + 1, title: "", url }))
    : await page.evaluate((videoIndexes) => {
      const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
      const wanted = new Set(videoIndexes);
      const seen = new Set();
      const videos = [];
      const cards = document.querySelectorAll("ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-compact-video-renderer");

      for (const card of cards) {
        const candidates = Array.from(card.querySelectorAll("a[href*='/watch']"));
        const link = candidates.find((candidate) => {
          const text = normalize(candidate.textContent);
          return text && !/^(Mix|\d{1,2}:\d{2}(?::\d{2})?)$/.test(text);
        }) || candidates[0];
        if (!link) continue;

        const url = new URL(link.getAttribute("href"), location.href).href;
        if (seen.has(url)) continue;
        seen.add(url);

        const title = normalize(link.textContent || link.getAttribute("aria-label") || link.getAttribute("title"));
        const index = videos.length + 1;
        videos.push({ index, title, url });
      }

      return videos.filter((video) => wanted.has(video.index));
    }, input.videoIndexes?.length ? input.videoIndexes : [1, 2, 3]);

  if (!targets.length) {
    return { ok: false, error: "No target videos found.", url: location.href, title: document.title };
  }

  return cap.goto(targets[0].url, { step: "like", targets, cursor: 0, results: [], waitMs });
}

async function likeCurrentVideo(target) {
  const title = await page.title().catch(() => "");
  const result = {
    ok: false,
    alreadyLiked: false,
    title: target.title || title.replace(/ - YouTube$/, ""),
    url: location.href,
    index: target.index
  };

  const selectors = [
    "ytd-watch-metadata #top-level-buttons-computed segmented-like-button-view-model button",
    "ytd-watch-metadata #top-level-buttons-computed ytd-segmented-like-dislike-button-renderer #segmented-like-button button",
    "ytd-watch-metadata #top-level-buttons-computed ytd-toggle-button-renderer:first-of-type button[aria-label*='like' i]",
    "ytd-watch-metadata #actions button[aria-label*='like this video' i]",
    "ytd-watch-metadata #actions button[title='I like this']"
  ];

  let button = null;
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      button = locator;
      break;
    }
  }

  if (!button) {
    return { ...result, error: "Like button not found." };
  }

  const before = await button.evaluate((node) => ({
    ariaPressed: node.getAttribute("aria-pressed"),
    ariaLabel: node.getAttribute("aria-label"),
    title: node.getAttribute("title"),
    className: node.className?.toString()
  })).catch(() => ({}));

  const isLiked = before.ariaPressed === "true" || /liked/i.test(before.ariaLabel || "") || /unlike/i.test(before.ariaLabel || "");
  if (isLiked) {
    return { ...result, ok: true, alreadyLiked: true, before };
  }

  await button.click();
  await page.waitForTimeout(700);

  const after = await button.evaluate((node) => ({
    ariaPressed: node.getAttribute("aria-pressed"),
    ariaLabel: node.getAttribute("aria-label"),
    title: node.getAttribute("title"),
    className: node.className?.toString()
  })).catch(() => ({}));

  const nowLiked = after.ariaPressed === "true" || /liked/i.test(after.ariaLabel || "") || /unlike/i.test(after.ariaLabel || "");
  return { ...result, ok: nowLiked, alreadyLiked: false, before, after };
}
