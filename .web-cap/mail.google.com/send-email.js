/**
 * web-cap script
 *
 * @description Compose and send an email in Gmail using the visible UI.
 * @param {object} input
 * @param {string} input.to Recipient email address.
 * @param {string} input.subject Email subject.
 * @param {string} input.body Plain text email body.
 * @returns {object} Send status and message metadata.
 * @match https://mail.google.com/mail/*
 */
export default async function (input = {}) {
  if (!input.to || !input.subject || !input.body) {
    return { ok: false, error: "Missing to, subject, or body." };
  }

  const composeButton = page.getByRole("button", { name: /Compose|撰写|寫信/i }).first();
  await composeButton.click();
  await page.waitForTimeout(1000);

  const toField = page.locator('textarea[name="to"], input[aria-label*="To"], textarea[aria-label*="To"]').last();
  await toField.fill(input.to);
  await page.keyboard.press("Enter");

  await page.locator('input[name="subjectbox"]').last().fill(input.subject);

  const bodyField = page.locator('div[aria-label="Message Body"], div[aria-label="邮件正文"], div[role="textbox"][g_editable="true"]').last();
  await bodyField.fill(input.body);

  const sendButton = page.locator('div[role="button"][aria-label*="Send"], div[role="button"][data-tooltip*="Send"], div[role="button"][aria-label*="发送"], div[role="button"][data-tooltip*="发送"]').last();
  await sendButton.click();
  await page.waitForTimeout(1500);

  return {
    ok: true,
    to: input.to,
    subject: input.subject,
    bodyLength: input.body.length
  };
}
