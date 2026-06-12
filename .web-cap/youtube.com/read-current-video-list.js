/**
 * web-cap script
 *
 * @description Read the visible video list from the current YouTube page.
 * @param {object} input
 * @param {number} [input.limit] Maximum number of videos to return, from 1 to 100.
 * @param {number} [input.waitMs] Optional delay before reading the page.
 * @returns {object} Structured result with page URL, title, count, and videos.
 * @match https://www.youtube.com/, https://www.youtube.com/feed/*, https://www.youtube.com/results*, https://www.youtube.com/@:handle/videos
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 30), 100));

  await page.waitForTimeout(input.waitMs ?? 800);

  const videos = await page.evaluate((limit) => {
    const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
    const toAbsolute = (href) => {
      if (!href) return "";
      try {
        return new URL(href, location.href).href;
      } catch {
        return href;
      }
    };
    const isVisible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };

    const selectors = [
      "ytd-rich-item-renderer",
      "ytd-video-renderer",
      "ytd-grid-video-renderer",
      "ytd-compact-video-renderer",
      "ytd-reel-item-renderer"
    ];

    const seen = new Set();
    const items = [];

    for (const card of document.querySelectorAll(selectors.join(","))) {
      if (items.length >= limit) break;
      if (!isVisible(card)) continue;

      const links = Array.from(card.querySelectorAll("a[href*='/watch'], a[href*='/shorts/']"));
      const link = links.find((candidate) => {
        const text = normalize(candidate.textContent);
        const aria = normalize(candidate.getAttribute("aria-label"));
        return text && !/^(Mix|\d{1,2}:\d{2}(?::\d{2})?)$/.test(text) && (aria || text.length > 8);
      }) || links.find((candidate) => normalize(candidate.textContent) === "Mix") || links[0];
      if (!link) continue;

      const title = normalize(link.getAttribute("title") || link.textContent || link.getAttribute("aria-label"));
      const href = toAbsolute(link.getAttribute("href"));
      if (!title || !href || seen.has(href)) continue;
      if (href.includes("googleadservices.com")) continue;
      seen.add(href);

      const channelLink =
        card.querySelector("ytd-channel-name a") ||
        card.querySelector("a[href^='/@']") ||
        card.querySelector("a[href^='/channel/']") ||
        card.querySelector("a.yt-simple-endpoint[href^='/@']") ||
        card.querySelector("a.yt-simple-endpoint[href^='/channel/']");
      const channel = normalize(channelLink?.textContent);

      const metadata = Array.from(card.querySelectorAll("#metadata-line span, .inline-metadata-item"))
        .map((node) => normalize(node.textContent))
        .filter(Boolean);
      if (metadata.length === 0) {
        const lines = normalize(card.innerText)
          .split(/(?<=\D)\s(?=\d[\d,.KM万亿]*\s+(?:views|次观看|觀看))|(?<=ago)\s|(?<=前)\s/)
          .map((line) => normalize(line))
          .filter(Boolean);
        const stats = lines.find((line) => /(views|次观看|觀看|ago|前)/i.test(line));
        if (stats) metadata.push(stats);
      }

      items.push({
        index: items.length + 1,
        title,
        url: href,
        channel,
        metadata
      });
    }

    return items;
  }, limit);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: videos.length,
    videos
  };
}
