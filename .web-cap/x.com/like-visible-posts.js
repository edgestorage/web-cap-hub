/**
 * web-cap script
 *
 * @description Like visible X posts by one-based feed index.
 * @param {object} input
 * @param {number[]} [input.indexes] One-based visible post indexes to like.
 * @param {number} [input.waitMs] Optional delay before acting.
 * @returns {object} Per-post like results.
 * @match https://x.com/*
 */
export default async function (input = {}) {
  const indexes = input.indexes?.length ? input.indexes.map(Number) : [1, 2, 3];
  await page.waitForTimeout(input.waitMs ?? 800);

  const articles = page.locator("article[role='article']");
  const total = await articles.count();
  const results = [];

  for (const index of indexes) {
    if (index < 1 || index > total) {
      results.push({ index, ok: false, error: "Post index not visible." });
      continue;
    }

    const article = articles.nth(index - 1);
    const author = await article.locator('[data-testid="User-Name"]').first().innerText().catch(() => "");
    const text = await article.locator('[data-testid="tweetText"]').allInnerTexts().then((parts) => parts.join("\n")).catch(() => "");
    const alreadyLiked = await article.locator('[data-testid="unlike"]').first().isVisible().catch(() => false);
    if (alreadyLiked) {
      results.push({ index, ok: true, alreadyLiked: true, author, text });
      continue;
    }

    const likeButton = article.locator('[data-testid="like"]').first();
    if (!(await likeButton.isVisible().catch(() => false))) {
      results.push({ index, ok: false, error: "Like button not found.", author, text });
      continue;
    }

    await likeButton.click();
    await page.waitForTimeout(500);
    const nowLiked = await article.locator('[data-testid="unlike"]').first().isVisible().catch(() => false);
    results.push({ index, ok: nowLiked, alreadyLiked: false, author, text });
  }

  return {
    ok: results.every((result) => result.ok),
    count: results.length,
    results
  };
}
