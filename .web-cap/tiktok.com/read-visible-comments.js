/**
 * web-cap script
 *
 * @description Read visible comments from the current TikTok video page or comment panel.
 * @param {object} [input]
 * @param {number} [input.limit] Maximum number of comments to return, from 1 to 100.
 * @param {number} [input.waitMs] Optional delay before reading the page.
 * @returns {{ ok: boolean, url: string, title: string, count: number, comments: object[], error?: string }}
 * @match https://www.tiktok.com/*, https://www.tiktok.com/@:handle/video/:videoId
 */
export default async function (input = {}) {
  const limit = clampNumber(input.limit ?? 50, 1, 100);
  const waitMs = clampNumber(input.waitMs ?? 800, 0, 10000);
  if (waitMs > 0) await page.waitForTimeout(waitMs);

  const comments = await page.evaluate(({ limit }) => {
    return findCommentItems().slice(0, limit).map((item, index) => readComment(item, index + 1));
  }, { limit });

  return {
    ok: comments.length > 0,
    error: comments.length > 0 ? undefined : "No visible TikTok comments found. Open a video detail page or comment panel first.",
    url: location.href,
    title: document.title,
    count: comments.length,
    comments
  };
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(number, max));
}

function findCommentItems() {
  const selectors = [
    '[data-e2e="comment-item"]',
    'div[class*="DivCommentItemContainer"]',
    'div[class*="CommentItem"]'
  ];
  const direct = uniqueElements(document.querySelectorAll(selectors.join(","))).filter(isVisible);
  if (direct.length > 0) return direct;

  return uniqueElements([...document.querySelectorAll("div, li")].filter((element) => {
    const text = normalize(element.innerText || element.textContent || "");
    const rect = element.getBoundingClientRect();
    return rect.width >= 220
      && rect.height >= 32
      && rect.height <= 260
      && element.querySelector('a[href*="/@"]')
      && hasCommentContext(element)
      && /Reply|回复|Like|喜欢|赞|\d/.test(text)
      && !hasVisibleAncestorMatching(element, (ancestor) => direct.includes(ancestor));
  })).filter((element) => !hasVisibleAncestorMatching(element, (ancestor) => {
    const rect = ancestor.getBoundingClientRect();
    return rect.height <= 260
      && ancestor.querySelector?.('a[href*="/@"]')
      && hasCommentContext(ancestor)
      && normalize(ancestor.innerText || "").length >= normalize(element.innerText || "").length;
  }));
}

function readComment(root, index) {
  const authorNode = firstText(root, ['[data-e2e^="comment-username"]', 'a[href*="/@"] p', 'a[href*="/@"]']);
  const authorLink = authorNode?.closest?.('a[href*="/@"]') || [...root.querySelectorAll('a[href*="/@"]')].filter(isVisible)[0];
  const likeNode = firstText(root, [
    '[data-e2e="comment-like-count"]',
    '[aria-label*="赞"]',
    '[aria-label*="like" i]',
    '[class*="LikeContainer"]'
  ]);
  const timeNode = readTime(root);

  const text = commentText(root, authorLink);
  const comment = {
    index,
    author: cleanAuthor(normalize(authorNode?.innerText || authorNode?.textContent || "")),
    authorUrl: toAbsolute(authorLink?.getAttribute("href") || ""),
    text,
    likes: readLikeCount(likeNode),
    time: timeNode
  };
  return comment;
}

function commentText(root, authorLink) {
  const explicit = firstText(root, [
    '[data-e2e="comment-level-1"]',
    '[data-e2e="comment-text"]',
    'p',
    'span[class*="SpanText"]'
  ]);
  const value = normalize(explicit?.innerText || explicit?.textContent || "");
  if (value) return value;

  const author = normalize(authorLink?.innerText || authorLink?.textContent || "");
  return normalize(root.innerText || root.textContent || "")
    .replace(author, "")
    .replace(/\b(Reply|回复|Like|喜欢|赞)\b.*$/i, "")
    .trim();
}

function readTime(root) {
  const subContent = [...root.querySelectorAll('[class*="SubContent"]')].find(isVisible);
  const fromSubContent = [...(subContent?.querySelectorAll("span") || [])]
    .map((element) => normalize(element.innerText || element.textContent || ""))
    .find(looksLikeTime);
  if (fromSubContent) return fromSubContent;

  return [...root.querySelectorAll("span, div")]
    .filter(isVisible)
    .map((element) => normalize(element.innerText || element.textContent || ""))
    .find(looksLikeTime) || "";
}

function looksLikeTime(text) {
  return /^(\d+[smhdw]|now|just now|刚刚|\d+秒|\d+分钟|\d+小时|\d+天|\d{1,2}-\d{1,2}|[\d-]{6,})$/i.test(text);
}

function readLikeCount(element) {
  if (!element) return "";
  const text = normalize(element.innerText || element.textContent || "");
  if (text) return text;

  const aria = normalize(element.getAttribute("aria-label") || "");
  const match = aria.match(/(\d[\d,.]*\s*[KMB万亿]?)/i);
  return match ? match[1].replace(/\s+/g, "") : "";
}

function firstText(root, selectors) {
  for (const selector of selectors) {
    const element = [...root.querySelectorAll(selector)].find((node) => isVisible(node) && normalize(node.innerText || node.textContent || ""));
    if (element) return element;
  }
  return null;
}

function hasCommentContext(element) {
  let node = element;
  while (node && node !== document.body) {
    const dataE2e = String(node.getAttribute?.("data-e2e") || "").toLowerCase();
    const className = String(node.className || "").toLowerCase();
    const aria = String(node.getAttribute?.("aria-label") || "").toLowerCase();
    if (dataE2e.includes("comment") || className.includes("comment") || aria.includes("comment")) return true;
    node = node.parentElement;
  }
  return false;
}

function hasVisibleAncestorMatching(element, predicate) {
  let node = element.parentElement;
  while (node) {
    if (isVisible(node) && predicate(node)) return true;
    node = node.parentElement;
  }
  return false;
}

function uniqueElements(elements) {
  return [...new Set([...elements])];
}

function cleanAuthor(value) {
  return value.replace(/^@/, "");
}

function toAbsolute(href) {
  if (!href) return "";
  try {
    return new URL(href, location.href).href;
  } catch {
    return href;
  }
}

function isVisible(element) {
  if (!element) return false;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
}

function normalize(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}
