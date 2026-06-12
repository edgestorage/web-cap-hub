/**
 * web-cap script
 *
 * @description Read visible product cards from the current Product Hunt page.
 * @param {object} input
 * @param {number} [input.limit] Maximum number of products to return.
 * @param {number} [input.waitMs] Optional delay before reading the page.
 * @returns {object} Structured result with visible Product Hunt products.
 * @match https://www.producthunt.com/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 30), 100));
  await page.waitForTimeout(input.waitMs ?? 1200);

  const products = await page.evaluate((limit) => {
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
    const links = Array.from(document.querySelectorAll("a[href^='/products/'], a[href^='/posts/']"));

    for (const link of links) {
      if (items.length >= limit) break;
      const url = toAbsolute(link.getAttribute("href"));
      if (seen.has(url)) continue;

      const card = link.closest("article, li, div[data-test], div") || link;
      const text = normalize(card.textContent);
      const name =
        normalize(link.querySelector("h2, h3, strong")?.textContent) ||
        normalize(link.textContent).split(/\s{2,}| — | - /)[0];
      if (!name || !url) continue;

      const tagline =
        normalize(card.querySelector("p")?.textContent) ||
        text.replace(name, "").slice(0, 220);
      const voteMatch = text.match(/(\d[\d,]*)\s*(?:upvotes?|votes?)/i) || text.match(/▲\s*(\d[\d,]*)/);
      const commentsMatch = text.match(/(\d[\d,]*)\s*(?:comments?|reviews?)/i);

      seen.add(url);
      items.push({
        index: items.length + 1,
        name,
        tagline,
        votes: voteMatch?.[1] || "",
        comments: commentsMatch?.[1] || "",
        url
      });
    }

    return items;
  }, limit);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: products.length,
    products
  };
}
