/**
 * web-cap script
 *
 * @description Open a YouTube channel videos page from a watch page or channel URL and read visible videos.
 * @param {object} input
 * @param {string} [input.step] Internal workflow step.
 * @param {string} [input.channelUrl] Optional YouTube channel URL.
 * @param {number} [input.limit] Maximum number of videos to return, from 1 to 100.
 * @param {number} [input.waitMs] Optional delay before reading videos.
 * @returns {object} Structured result with channel page URL, title, count, and videos.
 * @match https://www.youtube.com/watch*, https://www.youtube.com/@:handle*, https://www.youtube.com/channel/:channelId*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 30), 100));
  const waitMs = Math.max(0, Number(input.waitMs ?? 1200));

  if (input.step === "read") {
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(waitMs);

    const data = await page.evaluate((limit) => {
      const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
      const toAbsolute = (href) => {
        try {
          return new URL(href, location.href).href;
        } catch {
          return href || "";
        }
      };

      const channelName =
        normalize(document.querySelector("yt-page-header-view-model h1, ytd-channel-name yt-formatted-string")?.textContent) ||
        normalize(document.querySelector("meta[property='og:title']")?.getAttribute("content"));

      const seen = new Set();
      const videos = [];
      const cards = document.querySelectorAll("ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer");

      for (const card of cards) {
        if (videos.length >= limit) break;
        const links = Array.from(card.querySelectorAll("a[href*='/watch']"));
        const link = links.find((candidate) => {
          const text = normalize(candidate.textContent);
          return text && !/^(Mix|\d{1,2}:\d{2}(?::\d{2})?)$/.test(text);
        }) || links[0];
        if (!link) continue;

        const href = toAbsolute(link.getAttribute("href"));
        const title = normalize(link.textContent || link.getAttribute("aria-label") || link.getAttribute("title"));
        if (!href || !title || seen.has(href)) continue;
        seen.add(href);

        const metadata = Array.from(card.querySelectorAll("#metadata-line span, .inline-metadata-item"))
          .map((node) => normalize(node.textContent))
          .filter(Boolean);

        videos.push({
          index: videos.length + 1,
          title,
          url: href,
          metadata
        });
      }

      return { channelName, videos };
    }, limit);

    return {
      ok: true,
      url: location.href,
      title: document.title,
      channelName: data.channelName,
      count: data.videos.length,
      videos: data.videos
    };
  }

  const channelUrl = input.channelUrl || await page.evaluate(() => {
    if (/^\/(@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)/.test(location.pathname)) {
      return location.origin + location.pathname.replace(/\/$/, "") + "/videos";
    }

    const link =
      document.querySelector("ytd-video-owner-renderer a[href^='/@'], ytd-video-owner-renderer a[href^='/channel/']") ||
      document.querySelector("ytd-watch-metadata ytd-channel-name a[href^='/@'], ytd-watch-metadata ytd-channel-name a[href^='/channel/']") ||
      document.querySelector("a[href^='/@'], a[href^='/channel/']");
    if (!link) return "";
    const url = new URL(link.getAttribute("href"), location.href);
    return url.href.replace(/\/$/, "") + "/videos";
  });

  if (!channelUrl) {
    return { ok: false, error: "No YouTube channel link found on the current page.", url: location.href, title: document.title };
  }

  const videosUrl = channelUrl.includes("/videos") ? channelUrl : channelUrl.replace(/\/$/, "") + "/videos";
  return cap.goto(videosUrl, { step: "read", channelUrl: videosUrl, limit, waitMs });
}
