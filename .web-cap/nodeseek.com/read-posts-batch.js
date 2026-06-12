/**
 * web-cap script
 *
 * @description Sequentially read multiple NodeSeek posts with optional comments.
 * @param {object} input
 * @param {string[]} input.urls Post URLs to read.
 * @param {number} [input.commentLimit=10] Maximum comments per post.
 * @param {number} [input.bodyLimit=1000] Maximum body characters per post.
 * @param {number} [input.commentBodyLimit=500] Maximum characters per comment.
 * @param {number} [input.index] Internal workflow cursor.
 * @param {Array<object>} [input.results] Internal accumulated results.
 * @returns {{ ok: boolean, done: boolean, posts: Array<object> }}
 * @match https://www.nodeseek.com/post-*
 */
export default async function (input = {}) {
  const urls = input.urls || [];
  const index = Number(input.index ?? 0);
  const commentLimit = Math.max(0, Math.min(Number(input.commentLimit ?? 10), 100));
  const bodyLimit = Math.max(100, Math.min(Number(input.bodyLimit ?? 1000), 10000));
  const commentBodyLimit = Math.max(80, Math.min(Number(input.commentBodyLimit ?? 500), 3000));

  if (!urls.length) {
    return { ok: false, error: 'urls is required and must contain at least one post URL.' };
  }

  if (!input.results) {
    return cap.goto(urls[0], { urls, index: 0, results: [], commentLimit, bodyLimit, commentBodyLimit });
  }

  const post = readCurrentPost({ commentLimit, bodyLimit, commentBodyLimit });
  const results = [...input.results, post];
  const nextIndex = index + 1;

  if (nextIndex < urls.length) {
    return cap.goto(urls[nextIndex], { urls, index: nextIndex, results, commentLimit, bodyLimit, commentBodyLimit });
  }

  return { ok: true, done: true, count: results.length, posts: results };
}

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function readCurrentPost({ commentLimit, bodyLimit, commentBodyLimit }) {
  const title = normalize(document.querySelector('.post-title, .post-title-link, .post-title a, h1')?.textContent || document.title);
  const author = normalize(document.querySelector('.author-name, .user-name, .author')?.textContent);
  const bodyEl = document.querySelector('article.post-content, .markdown-body, .post-content, .topic-content, article');
  const body = normalize(bodyEl?.innerText).slice(0, bodyLimit);

  const commentEls = document.querySelectorAll('li.content-item, .comment-item, .reply-item, .comment');
  const comments = [];
  for (let index = 0; index < Math.min(commentEls.length, commentLimit); index += 1) {
    const element = commentEls[index];
    const commentAuthor = normalize(element.querySelector('.author-name, .user-name, .author')?.textContent);
    const floor = normalize(element.querySelector('.floor-link-wrapper')?.textContent);
    let commentBody = normalize(element.querySelector('.post-content, .comment-body, .reply-body, .content-body, .content')?.innerText);

    if (!commentBody) {
      const fullText = element.innerText || '';
      const authorIndex = commentAuthor ? fullText.indexOf(commentAuthor) : -1;
      commentBody = normalize(authorIndex >= 0 ? fullText.slice(authorIndex + commentAuthor.length) : fullText);
      commentBody = commentBody.replace(/^\d+[a-z]+\s*ago\s*#\d+\s*/i, '').trim();
    }

    if (commentAuthor || commentBody) {
      comments.push({
        author: commentAuthor,
        floor,
        body: commentBody.slice(0, commentBodyLimit)
      });
    }
  }

  return {
    url: location.href,
    title,
    author,
    body,
    commentCount: comments.length,
    comments
  };
}
