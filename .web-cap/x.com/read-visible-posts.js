/**
 * web-cap script
 *
 * @description Read visible posts from the current X feed page.
 * @param {object} input
 * @param {number} [input.limit] Maximum number of visible posts to return.
 * @param {number} [input.waitMs] Optional delay before reading the page.
 * @returns {object} Structured result with visible X posts.
 * @match https://x.com/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 20), 100));
  await page.waitForTimeout(input.waitMs ?? 1000);

  const posts = await page.evaluate((limit) => {
    const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
    const items = [];
    const articles = Array.from(document.querySelectorAll("article[role='article']"));

    for (const article of articles) {
      if (items.length >= limit) break;
      const text = normalize(article.innerText);
      if (!text) continue;

      const authorLine = normalize(article.querySelector('[data-testid="User-Name"]')?.innerText);
      const timeEl = article.querySelector("time");
      const link = timeEl?.closest("a")?.href || "";
      const postText = Array.from(article.querySelectorAll('[data-testid="tweetText"]'))
        .map((node) => normalize(node.innerText || node.textContent))
        .filter(Boolean)
        .join("\n");

      const metrics = Array.from(article.querySelectorAll('[role="group"] [aria-label]'))
        .map((node) => normalize(node.getAttribute("aria-label")))
        .filter(Boolean);

      items.push({
        index: items.length + 1,
        author: authorLine,
        text: postText || text.slice(0, 800),
        time: timeEl?.getAttribute("datetime") || "",
        url: link,
        metrics
      });
    }

    return items;
  }, limit);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: posts.length,
    posts
  };
}
