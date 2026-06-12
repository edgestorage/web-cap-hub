/**
 * web-cap script
 *
 * @description Read the current Zhihu question header and visible answers.
 * @param {object} [input]
 * @param {number} [input.limit=10] Maximum answers to return.
 * @param {number} [input.bodyLimit=1500] Maximum characters per answer body.
 * @returns {{ ok: boolean, url: string, title: string, question: object, count: number, answers: Array<object> }}
 * @match https://www.zhihu.com/question/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 10), 50));
  const bodyLimit = Math.max(200, Math.min(Number(input.bodyLimit ?? 1500), 6000));
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const absoluteUrl = (href) => {
    if (!href) return '';
    try {
      const url = new URL(href, location.origin);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const questionId = location.pathname.match(/\/question\/(\d+)/)?.[1] || '';
  const header = document.querySelector('.QuestionHeader');
  const question = {
    id: questionId,
    title: normalize(document.querySelector('.QuestionHeader-title')?.textContent ||
      document.querySelector('.QuestionHeader-main h1, .QuestionHeader-main')?.textContent),
    detail: normalize(document.querySelector('.QuestionRichText, .QuestionHeader-detail')?.textContent),
    stats: normalize(header?.querySelector('.NumberBoard, .QuestionHeader-footer, .QuestionFollowStatus')?.textContent)
  };
  const answers = [];
  const seen = new Set();

  for (const answer of [...document.querySelectorAll('.AnswerItem, .List-item .ContentItem')].filter(visible)) {
    if (answers.length >= limit) break;

    const author = [...answer.querySelectorAll('.UserLink-link[href], .AuthorInfo-name a[href]')]
      .find((link) => normalize(link.textContent)) ||
      answer.querySelector('.UserLink-link[href], .AuthorInfo-name a[href]');
    const answerUrl = absoluteUrl(answer.querySelector('a[href*="/answer/"]')?.getAttribute('href')) ||
      location.href;
    const body = normalize(answer.querySelector('.RichContent-inner, .RichText, .ContentItem-excerpt')?.textContent ||
      answer.textContent).slice(0, bodyLimit);
    const key = answerUrl + body.slice(0, 80);
    if (!body || seen.has(key)) continue;
    seen.add(key);

    answers.push({
      author: normalize(author?.textContent),
      authorHref: absoluteUrl(author?.getAttribute('href')),
      answerUrl,
      excerpt: body,
      actions: [...answer.querySelectorAll('.ContentItem-actions button, .ContentItem-action, .VoteButton')]
        .map((el) => normalize(el.textContent))
        .filter(Boolean)
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    question,
    count: answers.length,
    answers
  };
}
