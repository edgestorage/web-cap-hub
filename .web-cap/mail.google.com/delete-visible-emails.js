/**
 * web-cap script
 *
 * @description Delete visible Gmail messages matching sender, subject, or snippet keywords.
 * @param {object} input
 * @param {string[]} input.keywords Keywords matched against visible sender, subject, and snippet.
 * @param {boolean} [input.dryRun] Preview matches without deleting. Defaults to true.
 * @param {number} [input.limit] Maximum number of visible matches to delete.
 * @returns {object} Matched messages and delete status.
 * @match https://mail.google.com/mail/*
 */
export default async function (input = {}) {
  const keywords = (input.keywords || []).map((keyword) => String(keyword).toLowerCase()).filter(Boolean);
  const dryRun = input.dryRun !== false;
  const limit = Math.max(1, Math.min(Number(input.limit ?? 20), 50));
  if (!keywords.length) return { ok: false, error: "No keywords supplied." };

  await page.waitForTimeout(input.waitMs ?? 500);

  const matches = await page.evaluate(({ keywords, limit }) => {
    const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
    const rows = Array.from(document.querySelectorAll("tr[role='row']"));
    const found = [];

    for (const row of rows) {
      if (found.length >= limit) break;
      const subject = normalize(row.querySelector(".bog")?.textContent);
      const senderEl = row.querySelector(".yW span[email], .yW span[name], .yW span");
      const sender = normalize(senderEl?.getAttribute("name") || senderEl?.getAttribute("email") || senderEl?.textContent);
      const snippet = normalize(row.querySelector(".y2")?.textContent).replace(/^-\s*/, "");
      const haystack = `${sender}\n${subject}\n${snippet}`.toLowerCase();
      if (!keywords.some((keyword) => haystack.includes(keyword))) continue;

      row.setAttribute("data-web-cap-delete-match", "true");
      found.push({
        index: found.length + 1,
        sender,
        subject,
        snippet
      });
    }

    return found;
  }, { keywords, limit });

  if (dryRun || matches.length === 0) {
    return { ok: true, dryRun, matchedCount: matches.length, matches, deleted: false };
  }

  const rows = page.locator('tr[role="row"][data-web-cap-delete-match="true"]');
  const count = await rows.count();
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const checkbox = row.locator('[role="checkbox"]').first();
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.click();
      await page.waitForTimeout(120);
    }
  }

  const deleteButton = page.locator('[aria-label="Delete"], [data-tooltip="Delete"], [aria-label="删除"], [data-tooltip="删除"]').first();
  if (!(await deleteButton.isVisible().catch(() => false))) {
    return { ok: false, error: "Delete button not found after selecting messages.", matchedCount: matches.length, matches };
  }

  await deleteButton.click();
  await page.waitForTimeout(1000);

  return {
    ok: true,
    dryRun: false,
    matchedCount: matches.length,
    deleted: true,
    matches
  };
}
