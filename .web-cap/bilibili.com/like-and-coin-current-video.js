/**
 * web-cap script
 *
 * @description Coin the currently playing video, optionally like it via the dialog checkbox.
 * @param {object} [input]
 * @param {number} [input.coinCount] Number of coins to give (1 or 2), default 1.
 * @param {boolean} [input.alsoLike] Also like the video via dialog checkbox, default true.
 * @returns {{ ok: boolean, before: object, after: object }}
 * @match https://www.bilibili.com/video/*
 */
export default async function (input = {}) {
  const coinCount = input.coinCount ?? 1;
  const alsoLike = input.alsoLike ?? true;

  function readState() {
    const like = document.querySelector(".video-like");
    const coin = document.querySelector(".video-coin");
    return {
      url: location.href,
      title: document.title,
      likeClass: like?.className?.toString() || "",
      coinClass: coin?.className?.toString() || "",
      likeText: (like?.textContent || "").replace(/\s+/g, " ").trim(),
      coinText: (coin?.textContent || "").replace(/\s+/g, " ").trim()
    };
  }

  const before = await page.evaluate(readState);

  // 点击投币按钮打开弹窗
  await page.locator(".video-coin").click();
  await page.waitForTimeout(1000);

  // 检查弹窗是否打开
  const dialogText = await page
    .locator(".coin-operated-m-exp")
    .first()
    .textContent()
    .catch(() => "");

  if (!dialogText) {
    return {
      ok: false,
      reason: "coin dialog did not open",
      before,
      after: await page.evaluate(readState)
    };
  }

  // 选择投币数量（.mc-box 第0个=1币，第1个=2币）
  const coinBtn = page.locator(".coin-operated-m-exp .mc-box").nth(coinCount - 1);
  if ((await coinBtn.count()) > 0) {
    await coinBtn.click();
  }

  // 处理"同时点赞"复选框
  const checkbox = page.locator(".coin-operated-m-exp input[type=checkbox]").first();
  if ((await checkbox.count()) > 0) {
    const checked = await checkbox.isChecked().catch(() => false);
    if (alsoLike && !checked) {
      // 需要点赞但未勾选 → 勾选
      await page.locator(".coin-operated-m-exp .like-checkbox label").click();
    } else if (!alsoLike && checked) {
      // 不需要点赞但已勾选 → 取消勾选
      await page.locator(".coin-operated-m-exp .like-checkbox label").click();
    }
  }

  await page.waitForTimeout(300);

  // 确认投币
  await page.locator(".coin-operated-m-exp .coin-bottom .bi-btn").click();
  await page.waitForTimeout(2500);

  const after = await page.evaluate(readState);
  return {
    ok: after.coinClass.includes(" on") && (!alsoLike || after.likeClass.includes(" on")),
    before,
    after
  };
}
