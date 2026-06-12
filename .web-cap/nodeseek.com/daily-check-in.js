/**
 * web-cap script
 *
 * @description Perform daily check-in on NodeSeek. Uses cap.goto to avoid navigation interruption.
 * @param {object} [input]
 * @param {boolean} [input.ready] Internal workflow flag.
 * @returns {{ ok: boolean, alreadySignedIn?: boolean, buttonClicked?: string, result?: string, message?: string, url: string }}
 * @match https://www.nodeseek.com/, https://www.nodeseek.com/board
 */
export default async function (input = {}) {
  // Step 1: Navigate to /board via cap.goto (no script interruption)
  if (!input.ready) {
    return cap.goto('https://www.nodeseek.com/board', { ready: true });
  }

  // Step 2: Wait for header content to fully load (not just "Loading")
  const headerLocator = page.locator('.head-info').filter({ hasNotText: 'Loading' });
  await headerLocator.first().waitFor({ timeout: 10000 });
  const headerText = (await headerLocator.first().textContent() || '').trim();
  if (headerText.includes('今日签到获得') || headerText.includes('已签到')) {
    return {
      ok: true,
      alreadySignedIn: true,
      message: headerText,
      url: location.href
    };
  }

  // Step 3: Find and click the daily check-in button
  const btn = document.querySelector('button.btn');
  if (!btn) {
    return { ok: false, error: 'Check-in button not found', url: location.href };
  }

  const btnText = btn.textContent?.trim() || '';
  btn.click();

  // Step 4: Wait for either dialog or updated header to appear
  const signedHeader = page.locator('.head-info').filter({ hasText: /今日签到获得|已签到/ });
  const dialogLocator = page.locator('.msc-confirm');
  await Promise.race([
    dialogLocator.waitFor({ state: 'attached', timeout: 5000 }).catch(() => null),
    signedHeader.first().waitFor({ timeout: 5000 }).catch(() => null)
  ]);

  const resultHeader = (await signedHeader.first().textContent().catch(() => '') || '').trim();
  const dialogVisible = await dialogLocator.isVisible().catch(() => false);
  const dialogText = dialogVisible ? (await dialogLocator.textContent() || '').trim() : '';

  // Step 5: Dismiss confirmation dialog if present
  if (dialogVisible) {
    const okBtn = dialogLocator.locator('button, .btn').first();
    const closeBtn = page.locator('.msc-close');
    if (await okBtn.isVisible().catch(() => false)) {
      await okBtn.click();
      await dialogLocator.waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
    } else if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
      await closeBtn.waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
    }
  }

  return {
    ok: true,
    alreadySignedIn: false,
    buttonClicked: btnText,
    result: resultHeader || dialogText || 'Check-in completed',
    url: location.href
  };
}
