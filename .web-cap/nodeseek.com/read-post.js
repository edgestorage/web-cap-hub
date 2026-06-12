/**
 * web-cap script
 *
 * @description Read the full content of a NodeSeek post, including title, author, body, and comments.
 * @param {object} input
 * @param {string} [input.url] NodeSeek post URL to read. If omitted, reads the current post page.
 * @param {number} [input.commentLimit=20] Maximum number of comments to return.
 * @param {number} [input.bodyLimit=20000] Maximum body characters to return.
 * @param {number} [input.commentBodyLimit=1000] Maximum characters per comment.
 * @param {boolean} [input.allPages=true] Whether to read comments from all detected comment pages.
 * @param {number} [input.commentPageStart] First comment page to read.
 * @param {number} [input.commentPageEnd] Last comment page to read.
 * @param {number} [input.maxPages] Maximum number of comment pages to read.
 * @returns {{ ok: boolean, url: string, title: string, author: string, body: string, commentCount: number, comments: Array<object>, pagesRead?: number, pageNumbersRead?: number[] }}
 * @match https://www.nodeseek.com/post-*
 */
export default async function (input = {}) {
  const allPages = input.allPages ?? true;
  const targetUrl = input.url ? new URL(input.url, location.origin) : null;
  if (targetUrl) {
    if (targetUrl.origin !== location.origin || !/^\/post-\d+-\d+$/.test(targetUrl.pathname)) {
      return {
        ok: false,
        error: 'url must be a NodeSeek post URL',
        url: location.href,
        title: document.title
      };
    }

    const [, postId] = targetUrl.pathname.match(/^\/post-(\d+)-(\d+)$/);
    const gotoUrl = allPages ? new URL(`/post-${postId}-1`, location.origin).href : targetUrl.href;
    if (location.href !== gotoUrl) {
      return cap.goto(gotoUrl, { ...input, ready: true });
    }
  }

  const commentLimit = Math.max(0, Math.min(Number(input.commentLimit ?? 20), 100));
  const bodyLimit = Math.max(100, Math.min(Number(input.bodyLimit ?? 20000), 50000));
  const commentBodyLimit = Math.max(80, Math.min(Number(input.commentBodyLimit ?? 1000), 5000));
  const commentPageStart = parsePositiveInteger(input.commentPageStart ?? input.pageStart);
  const commentPageEnd = parsePositiveInteger(input.commentPageEnd ?? input.pageEnd);
  const maxPages = parsePositiveInteger(input.maxPages);

  if (commentPageStart && commentPageEnd && commentPageEnd < commentPageStart) {
    return {
      ok: false,
      error: 'commentPageEnd must be greater than or equal to commentPageStart',
      url: location.href,
      title: document.title
    };
  }

  const firstPageUrl = new URL(location.href);
  const [, postId, currentPageNumberText = '1'] = firstPageUrl.pathname.match(/^\/post-(\d+)-(\d+)$/) || [];
  const currentPageNumber = Number(currentPageNumberText);
  const canonicalUrl = postId ? new URL(`/post-${postId}-1`, location.origin).href : location.href;
  const current = readPostPage(document, location.href, { bodyLimit, commentLimit, commentBodyLimit });
  const meta = currentPageNumber === 1
    ? current
    : readPostPage(
      new DOMParser().parseFromString(await fetch(canonicalUrl, { credentials: 'include' }).then((response) => response.text()), 'text/html'),
      canonicalUrl,
      { bodyLimit, commentLimit: 0, commentBodyLimit }
    );

  const pageNumbers = selectCommentPageNumbers({
    allPages,
    detectedPageNumbers: postId ? findPostPageNumbers(document, postId) : [currentPageNumber],
    currentPageNumber,
    commentPageStart,
    commentPageEnd,
    maxPages
  });
  const comments = pageNumbers.includes(currentPageNumber) ? [...current.comments] : [];
  const seenFloors = new Set(comments.map((comment) => comment.floor).filter(Boolean));
  const pageNumbersRead = pageNumbers.includes(currentPageNumber) ? [currentPageNumber] : [];

  if (postId) {
    for (const pageNumber of pageNumbers) {
      if (comments.length >= commentLimit) break;
      const pageUrl = new URL(`/post-${postId}-${pageNumber}`, location.origin).href;
      if (pageUrl === location.href) continue;

      const html = await fetch(pageUrl, { credentials: 'include' }).then((response) => response.text());
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const page = readPostPage(doc, pageUrl, {
        bodyLimit,
        commentLimit: commentLimit - comments.length,
        commentBodyLimit
      });
      pageNumbersRead.push(pageNumber);

      for (const comment of page.comments) {
        if (comments.length >= commentLimit) break;
        if (comment.floor && seenFloors.has(comment.floor)) continue;
        if (comment.floor) seenFloors.add(comment.floor);
        comments.push(comment);
      }
    }
  }

  return {
    ok: true,
    url: canonicalUrl,
    currentUrl: location.href,
    title: meta.title,
    author: meta.author,
    body: meta.body,
    commentCount: comments.length,
    pagesRead: pageNumbersRead.length,
    pageNumbersRead,
    comments
  };
}

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function findPostPageNumbers(doc, postId) {
  const pages = new Set([1]);
  const pattern = new RegExp(`/post-${postId}-(\\d+)$`);

  for (const link of doc.querySelectorAll('a[href]')) {
    const url = new URL(link.getAttribute('href'), location.origin);
    const pageNumber = Number(url.pathname.match(pattern)?.[1]);
    if (Number.isInteger(pageNumber) && pageNumber > 0) {
      pages.add(pageNumber);
    }
  }

  return [...pages].sort((a, b) => a - b);
}

function parsePositiveInteger(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) return null;
  return number;
}

function selectCommentPageNumbers({
  allPages,
  detectedPageNumbers,
  currentPageNumber,
  commentPageStart,
  commentPageEnd,
  maxPages
}) {
  let pageNumbers;

  if (commentPageStart || commentPageEnd) {
    const start = commentPageStart ?? currentPageNumber;
    const end = commentPageEnd ?? Math.max(...detectedPageNumbers.filter((page) => page >= start), start);
    pageNumbers = [];
    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      pageNumbers.push(pageNumber);
    }
  } else {
    pageNumbers = allPages ? detectedPageNumbers : [currentPageNumber];
  }

  pageNumbers = [...new Set(pageNumbers)].sort((a, b) => a - b);
  if (maxPages) pageNumbers = pageNumbers.slice(0, maxPages);
  return pageNumbers;
}

function readPostPage(doc, pageUrl, { bodyLimit, commentLimit, commentBodyLimit }) {
  const title = normalize(doc.querySelector('.post-title, .post-title-link, .post-title a, h1')?.textContent || doc.title);
  const author = normalize(doc.querySelector('.author-name, .user-name, .author')?.textContent);

  const bodyEl = doc.querySelector('article.post-content, .markdown-body, .post-content, .topic-content, article');
  const body = normalize(bodyEl?.innerText).slice(0, bodyLimit);

  const commentEls = doc.querySelectorAll('li.content-item, .comment-item, .reply-item, .comment');
  const comments = [];

  for (let index = 0; index < commentEls.length && comments.length < commentLimit; index += 1) {
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
        body: commentBody.slice(0, commentBodyLimit),
        pageUrl
      });
    }
  }

  return { title, author, body, comments };
}
