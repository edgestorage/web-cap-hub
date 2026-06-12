/**
 * web-cap script
 *
 * @description Open a YouTube video by visible list index or URL and read visible comments.
 * @param {object} input
 * @param {string} [input.step] Internal workflow step.
 * @param {string} [input.videoUrl] Optional YouTube video URL to read.
 * @param {number} [input.videoIndex] One-based index of the visible video to open when videoUrl is not supplied.
 * @param {number} [input.limit] Maximum number of comments to return, from 1 to 100.
 * @param {number} [input.waitMs] Optional delay after loading comments.
 * @returns {object} Structured result with the video URL, title, comment count text, and comments.
 * @match https://www.youtube.com/, https://www.youtube.com/feed/*, https://www.youtube.com/results*, https://www.youtube.com/@:handle/videos, https://www.youtube.com/watch*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 30), 100));
  const waitMs = Math.max(0, Number(input.waitMs ?? 1200));
  const videoIndex = Math.max(1, Number(input.videoIndex ?? 1));

  if (input.step === "comments") {
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(waitMs);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const commentsVisible = await page.locator("ytd-comments#comments, ytd-item-section-renderer#sections").first().isVisible().catch(() => false);
      if (commentsVisible) break;
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(700);
    }

    await page.locator("ytd-comment-thread-renderer").first().waitFor({ timeout: 10000 }).catch(() => {});

    const collected = new Map();
    let commentCountText = "";
    let stableRounds = 0;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const data = await page.evaluate((limit) => {
        const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
        const commentCount =
          normalize(document.querySelector("ytd-comments-header-renderer #count")?.textContent) ||
          normalize(document.querySelector("ytd-comments-header-renderer h2")?.textContent);

        const comments = Array.from(document.querySelectorAll("ytd-comment-thread-renderer"))
          .slice(0, limit)
          .map((thread) => {
            const author = normalize(thread.querySelector("#author-text")?.textContent);
            const content = normalize(thread.querySelector("#content-text")?.textContent);
            const published = normalize(thread.querySelector(".published-time-text, #published-time-text")?.textContent);
            const likeCount = normalize(thread.querySelector("#vote-count-middle")?.textContent);
            return { author, published, likeCount, content };
          })
          .filter((comment) => comment.content);

        return { commentCount, comments };
      }, limit);

      if (data.commentCount) commentCountText = data.commentCount;
      const beforeSize = collected.size;
      for (const comment of data.comments) {
        const key = `${comment.author}\n${comment.published}\n${comment.content}`;
        if (!collected.has(key)) collected.set(key, comment);
        if (collected.size >= limit) break;
      }

      if (collected.size >= limit) break;
      stableRounds = collected.size === beforeSize ? stableRounds + 1 : 0;
      if (stableRounds >= 10) break;
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(600);
    }

    const data = await page.evaluate(() => {
      const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
      const commentCount =
        normalize(document.querySelector("ytd-comments-header-renderer #count")?.textContent) ||
        normalize(document.querySelector("ytd-comments-header-renderer h2")?.textContent);

      return { commentCount };
    });

    const comments = Array.from(collected.values())
      .slice(0, limit)
      .map((comment, index) => ({ index: index + 1, ...comment }));

    return {
      ok: true,
      url: location.href,
      title: document.title,
      sourceVideoUrl: input.videoUrl || location.href,
      sourceVideoIndex: input.videoIndex,
      commentCount: commentCountText || data.commentCount,
      count: comments.length,
      comments
    };
  }

  const videoUrl = input.videoUrl || await page.evaluate((videoIndex) => {
    const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
    const seen = new Set();
    const links = [];

    const cards = document.querySelectorAll("ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer");
    for (const card of cards) {
      const candidates = Array.from(card.querySelectorAll("a[href*='/watch']"));
      const link = candidates.find((candidate) => {
        const text = normalize(candidate.textContent);
        return text && !/^(Mix|\d{1,2}:\d{2}(?::\d{2})?)$/.test(text);
      }) || candidates[0];
      if (!link) continue;

      const href = new URL(link.getAttribute("href"), location.href).href;
      if (seen.has(href)) continue;
      seen.add(href);
      links.push(href);
    }

    return links[videoIndex - 1] || "";
  }, videoIndex);

  if (!videoUrl) {
    return {
      ok: false,
      error: `No visible YouTube video link found for videoIndex ${videoIndex}.`,
      url: location.href,
      title: document.title
    };
  }

  return cap.goto(videoUrl, { step: "comments", videoUrl, videoIndex, limit, waitMs });
}
