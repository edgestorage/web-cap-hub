/**
 * web-cap script
 *
 * @description Like or unlike the currently playing video.
 * @param {object} [input]
 * @param {string} [input.action] "like" (default), "unlike", or "toggle".
 * @returns {{ ok: boolean, action: string, before: object, after: object, sideEffects: boolean }}
 * @match https://www.bilibili.com/video/*
 */
export default async function (input = {}) {
  const action = input.action ?? "like";

  function readState() {
    const get = (selector) => {
      const element = document.querySelector(selector);
      return {
        className: element?.className?.toString() || "",
        text: (element?.textContent || "").replace(/\s+/g, " ").trim(),
        title: element?.getAttribute("title") || ""
      };
    };

    return {
      url: location.href,
      title: document.title,
      like: get(".video-like"),
      coin: get(".video-coin"),
      favorite: get(".video-fav")
    };
  }

  const before = await page.evaluate(readState);
  const isLiked = before.like.className.includes(" on");

  // 判断是否需要点击
  let shouldClick = false;
  if (action === "toggle") {
    shouldClick = true;
  } else if (action === "like" && !isLiked) {
    shouldClick = true;
  } else if (action === "unlike" && isLiked) {
    shouldClick = true;
  }

  if (shouldClick) {
    await page.locator(".video-like").click();
    await page.waitForTimeout(1500);
  }

  const after = await page.evaluate(readState);
  const liked = after.like.className.includes(" on");
  const sideEffects =
    after.coin.className !== before.coin.className ||
    after.favorite.className !== before.favorite.className;

  let performedAction = "skipped";
  if (shouldClick) {
    performedAction = action === "toggle" ? (isLiked ? "unlike" : "like") : action;
  }

  return {
    ok: liked !== isLiked ? true : !shouldClick,
    action: performedAction,
    before,
    after,
    sideEffects
  };
}
