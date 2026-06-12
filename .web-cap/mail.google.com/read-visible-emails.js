/**
 * web-cap script
 *
 * @description Read visible emails from the current Gmail message list.
 * @param {object} input
 * @param {number} [input.limit] Maximum number of visible emails to return.
 * @param {number} [input.waitMs] Optional delay before reading the page.
 * @returns {object} Structured result with visible email rows.
 * @match https://mail.google.com/mail/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 30), 100));
  await page.waitForTimeout(input.waitMs ?? 800);

  const emails = await page.evaluate((limit) => {
    const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
    const rows = Array.from(document.querySelectorAll("tr[role='row']"));
    const items = [];

    for (const row of rows) {
      if (items.length >= limit) break;
      const subjectEl = row.querySelector(".bog");
      const senderEl = row.querySelector(".yW span[email], .yW span[name], .yW span");
      const snippetEl = row.querySelector(".y2");
      const timeEl = row.querySelector(".xW span, .xW");
      const linkEl = row.querySelector("a[href*='#inbox/'], a[href*='#all/'], a[href*='#search/']");

      const subject = normalize(subjectEl?.textContent);
      const sender = normalize(senderEl?.getAttribute("name") || senderEl?.getAttribute("email") || senderEl?.textContent);
      const snippet = normalize(snippetEl?.textContent).replace(/^-\s*/, "");
      const time = normalize(timeEl?.getAttribute("title") || timeEl?.textContent);
      if (!subject && !sender && !snippet) continue;

      items.push({
        index: items.length + 1,
        sender,
        subject,
        snippet,
        time,
        unread: row.classList.contains("zE"),
        starred: Boolean(row.querySelector("[aria-label*='Starred'], [aria-label*='已加星标']")),
        href: linkEl?.href || ""
      });
    }

    return items;
  }, limit);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: emails.length,
    emails
  };
}
