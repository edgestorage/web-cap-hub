/**
 * web-cap script
 *
 * @description Read visible YouTube subscribed channels from the subscriptions channels page.
 * @param {object} input
 * @param {string} [input.step] Internal workflow step.
 * @param {number} [input.limit] Maximum number of channels to return, from 1 to 300.
 * @param {number} [input.scrolls] Number of page scrolls to load more channels.
 * @param {number} [input.waitMs] Optional delay before reading channels.
 * @returns {object} Structured result with subscribed channel names and URLs.
 * @match https://www.youtube.com/feed/channels, https://www.youtube.com/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 200), 300));
  const scrolls = Math.max(0, Math.min(Number(input.scrolls ?? 6), 30));
  const waitMs = Math.max(0, Number(input.waitMs ?? 1200));

  if (input.step === "read") {
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    await page.waitForTimeout(waitMs);

    for (let index = 0; index < scrolls; index += 1) {
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(500);
    }

    const channels = await page.evaluate((limit) => {
      const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
      const toAbsolute = (href) => {
        try {
          return new URL(href, location.href).href;
        } catch {
          return href || "";
        }
      };

      const seen = new Set();
      const items = [];
      const contentRoot = document.querySelector("ytd-browse #primary, ytd-two-column-browse-results-renderer #primary, ytd-section-list-renderer") || document;
      const links = Array.from(contentRoot.querySelectorAll(
        "ytd-channel-renderer a[href^='/@'], ytd-channel-renderer a[href^='/channel/'], " +
        "ytd-grid-channel-renderer a[href^='/@'], ytd-grid-channel-renderer a[href^='/channel/'], " +
        "ytd-rich-item-renderer a[href^='/@'], ytd-rich-item-renderer a[href^='/channel/']"
      ));

      for (const link of links) {
        if (items.length >= limit) break;
        const href = toAbsolute(link.getAttribute("href"));
        const name =
          normalize(link.querySelector("#text, yt-formatted-string, h3, span")?.textContent) ||
          normalize(link.textContent) ||
          normalize(link.getAttribute("title")) ||
          normalize(link.getAttribute("aria-label"));
        if (!name || !href || seen.has(href)) continue;
        if (/^(Home|Shorts|Subscriptions|You|History|Explore|More from YouTube)$/i.test(name)) continue;
        seen.add(href);

        const card = link.closest("ytd-channel-renderer, ytd-grid-channel-renderer, ytd-rich-item-renderer, ytd-shelf-renderer, tp-yt-paper-item") || link;
        const subscribers = normalize(card.querySelector("#subscribers, #metadata, .metadata")?.textContent);
        const description = normalize(card.querySelector("#description, #description-text")?.textContent);

        items.push({
          index: items.length + 1,
          name,
          url: href,
          subscribers,
          description
        });
      }

      return items;
    }, limit);

    return {
      ok: true,
      url: location.href,
      title: document.title,
      count: channels.length,
      channels
    };
  }

  return cap.goto("https://www.youtube.com/feed/channels", {
    step: "read",
    limit,
    scrolls,
    waitMs
  });
}
