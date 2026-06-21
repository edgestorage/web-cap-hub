/**
 * web-cap script
 *
 * @description Read visible comments from the currently open Xiaohongshu note detail.
 * @param {object} [input]
 * @param {number} [input.limit=30] Maximum visible comments to return.
 * @param {boolean} [input.includeReplies=true] Include visible reply comments.
 * @returns {{ ok: boolean, url: string, title: string, count?: number, totalCommentCountNumber?: number|null, comments?: object[], error?: string }}
 * @match https://www.xiaohongshu.com/explore/:noteId, https://www.xiaohongshu.com/discovery/item/:noteId
 */
export default async function (input = {}) {
  const limit = clampNumber(input.limit, 30, 1, 200);
  const includeReplies = input.includeReplies !== false;
  const root = findNoteRoot();

  if (!root) {
    return {
      ok: false,
      url: location.href,
      title: document.title,
      error: 'No visible Xiaohongshu note detail was found.'
    };
  }

  const commentsRoot = root.querySelector('.comments-container, .comments-el') || root;
  const items = [...commentsRoot.querySelectorAll('.comment-item')]
    .filter(isVisible)
    .filter((item) => includeReplies || !item.className.includes('comment-item-sub'))
    .slice(0, limit)
    .map(readComment);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    noteId: extractNoteId(location.href),
    totalCommentCountNumber: parseCount(normalize(root.innerText).match(/共\s*([\d.]+万?\+?)\s*条评论/)?.[1]),
    count: items.length,
    comments: items
  };
}

function readComment(item, index) {
  const text = normalize(item.innerText);
  const authorLink = item.querySelector('a.name, .name[href], a[href*="/user/profile/"]');
  const counts = [...item.querySelectorAll('.interactions .count, .like .count, .count')]
    .map((count) => normalize(count.textContent))
    .filter(Boolean);
  const contentNode = item.querySelector('.content, .note-text, [class*="content"]');
  const id = item.id || '';
  const contentWithoutAuthor = extractCommentContent(item, '');
  const author = normalize(authorLink?.textContent) || extractAuthorFromText(text, contentWithoutAuthor);
  const content = extractCommentContent(item, author) || contentWithoutAuthor;

  return {
    index,
    id,
    type: item.className.includes('comment-item-sub') ? 'reply' : 'comment',
    author,
    authorHref: absoluteUrl(authorLink?.getAttribute('href')),
    content: normalize(contentNode?.textContent) || content,
    likeCountNumber: parseCount(counts.find((value) => value !== '回复')),
    replyCountNumber: parseReplyCount(text),
    timeLocation: extractTimeLocation(text),
    rawText: text
  };
}

function extractCommentContent(item, author) {
  const clone = item.cloneNode(true);
  clone.querySelectorAll('a.name, .name, .avatar, img, svg, .interactions, .comment-menu, button').forEach((node) => node.remove());
  let text = normalize(clone.textContent);
  if (author && text.startsWith(author)) text = text.slice(author.length).trim();
  text = text.replace(/\b\d+(?:\.\d+)?万?\+?\s*回复?$/, '').trim();
  text = text.replace(/\d{1,2}[-:]\d{1,2}[\u4e00-\u9fa5A-Za-z]*$/, '').trim();
  return text;
}

function extractAuthorFromText(rawText, content) {
  const text = normalize(rawText);
  if (!text || !content) return '';
  const index = text.indexOf(content);
  if (index <= 0) return '';
  return text.slice(0, index).trim();
}

function findNoteRoot() {
  return [...document.querySelectorAll('.note-detail-mask, .note-container, [class*="note-detail"], [class*="NoteDetail"]')]
    .find((element) => isVisible(element) && normalize(element.innerText).length > 120)
    || (/xiaohongshu\.com\/(explore|discovery\/item)\//.test(location.href) ? document.body : null);
}

function extractTimeLocation(text) {
  return text.match(/\b\d{2}-\d{2}[\u4e00-\u9fa5A-Za-z]*|\d+\s*(?:天前|小时前|分钟前)[\u4e00-\u9fa5A-Za-z]*/)?.[0] || '';
}

function parseReplyCount(text) {
  const match = text.match(/展开\s*([\d.]+万?\+?)\s*条回复/);
  return parseCount(match?.[1]);
}

function extractNoteId(value) {
  return String(value || '').match(/\/(?:explore|discovery\/item)\/([0-9a-fA-F]+)/)?.[1] || '';
}

function parseCount(value) {
  const text = String(value || '').trim();
  if (!text || text === '赞' || text === '回复') return null;
  const match = text.match(/^([\d.]+)(万)?\+?$/);
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return null;
  return match[2] ? Math.round(number * 10000) : number;
}

function isVisible(element) {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
}

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(href) {
  if (!href) return '';
  try {
    return new URL(href, location.origin).href;
  } catch {
    return '';
  }
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(number, max));
}
