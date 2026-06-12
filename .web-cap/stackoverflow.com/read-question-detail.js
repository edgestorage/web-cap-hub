/**
 * web-cap script
 *
 * @description Read a Stack Overflow question page, including visible answers and comments.
 * @param {object} [input]
 * @param {string|number} [input.questionId] Optional question id to open before reading.
 * @param {string} [input.questionUrl] Optional question URL to open before reading.
 * @param {number} [input.answerLimit=10] Maximum answers to return.
 * @param {number} [input.commentLimit=20] Maximum comments per post to return.
 * @param {number} [input.textLimit=4000] Maximum body text length per post.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, blocked?: boolean, url: string, title: string, question?: object, answers?: Array<object>, replies?: Array<object> }}
 * @match https://stackoverflow.com/*
 */
export default async function (input = {}) {
  if ((input.questionUrl || input.questionId) && input.step !== 'read') {
    const url = input.questionUrl
      ? new URL(input.questionUrl, location.origin)
      : new URL(`/questions/${input.questionId}`, location.origin);
    return cap.goto(url.href, { ...input, step: 'read' });
  }

  const answerLimit = Math.max(0, Math.min(Number(input.answerLimit ?? 10), 50));
  const commentLimit = Math.max(0, Math.min(Number(input.commentLimit ?? 20), 100));
  const textLimit = Math.max(200, Math.min(Number(input.textLimit ?? 4000), 20000));
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const absoluteUrl = (href) => {
    if (!href) return '';
    try {
      const url = new URL(href, location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };
  const pageText = normalize(document.body.innerText).slice(0, 800);
  if (/Human verification|Are you a human being|正在进行安全验证|Cloudflare/i.test(`${document.title} ${pageText}`) || location.pathname.includes('/nocaptcha')) {
    return { ok: false, blocked: true, reason: 'Stack Overflow human verification page', url: location.href, title: document.title };
  }

  const readComments = (post) => [...post.querySelectorAll('.comment')].slice(0, commentLimit).map((comment) => {
    const userLink = comment.querySelector('.comment-user[href], a.comment-user');
    return {
      id: comment.id?.replace(/^comment-/, '') || '',
      text: normalize(comment.querySelector('.comment-copy')?.textContent),
      score: normalize(comment.querySelector('.comment-score')?.textContent).replace(/[()]/g, ''),
      user: normalize(userLink?.textContent),
      userHref: absoluteUrl(userLink?.getAttribute('href')),
      age: normalize(comment.querySelector('.relativetime-clean, .relativetime, time')?.textContent)
    };
  }).filter((comment) => comment.text);

  const readPost = (post) => {
    const userLink = [...post.querySelectorAll('.user-details a[href^="/users/"]')]
      .filter((link) => normalize(link.textContent))
      .at(-1);
    return {
      id: post.getAttribute('data-questionid') || post.getAttribute('data-answerid') || post.id?.replace(/^answer-/, '') || '',
      votes: post.querySelector('.js-vote-count, [itemprop="upvoteCount"]')?.getAttribute('data-value')
        || normalize(post.querySelector('.js-vote-count, [itemprop="upvoteCount"]')?.textContent),
      body: normalize(post.querySelector('.js-post-body, .s-prose')?.textContent).slice(0, textLimit),
      user: normalize(userLink?.textContent) || post.getAttribute('data-author-username') || '',
      userHref: absoluteUrl(userLink?.getAttribute('href')),
      created: normalize(post.querySelector('time, .relativetime, .relativetime-clean')?.textContent),
      comments: readComments(post)
    };
  };

  const questionEl = document.querySelector('#question');
  if (!questionEl) {
    return { ok: false, error: 'No question element found', url: location.href, title: document.title };
  }

  const question = {
    ...readPost(questionEl),
    title: normalize(document.querySelector('#question-header h1 a, #question-header h1')?.textContent),
    href: absoluteUrl(document.querySelector('#question-header h1 a')?.getAttribute('href') || location.href),
    tags: [...questionEl.querySelectorAll('a.post-tag[href^="/questions/tagged/"]')].map((tag) => normalize(tag.textContent)).filter(Boolean),
    asked: normalize(document.querySelector('#question-header .asked .relativetime, #question-header time')?.textContent)
  };
  const answers = [...document.querySelectorAll('#answers .answer')].slice(0, answerLimit).map((answer) => ({
    ...readPost(answer),
    accepted: answer.classList.contains('accepted-answer') || answer.querySelector('.js-accepted-answer-indicator, [title*="accepted"]') !== null,
    href: absoluteUrl(`#${answer.id}`)
  }));
  const replies = [...document.querySelectorAll('#answers [id^="reply-"]')].slice(0, answerLimit).map((reply) => {
    const userLink = reply.querySelector('a.comment-user[href], .s-user-card--link[href], a[href^="/users/"]');
    return {
      id: reply.id.replace(/^reply-/, ''),
      score: normalize(reply.querySelector('.js-vote-count, [itemprop="upvoteCount"]')?.textContent),
      body: normalize(reply.querySelector('.js-post-body, [itemprop="text"]')?.textContent).slice(0, textLimit),
      user: normalize(userLink?.textContent) || reply.getAttribute('data-author-username') || '',
      userHref: absoluteUrl(userLink?.getAttribute('href')),
      created: normalize(reply.querySelector('time, .relativetime, .relativetime-clean')?.textContent),
      href: absoluteUrl(`#${reply.id}`)
    };
  });

  return {
    ok: true,
    url: location.href,
    title: document.title,
    question,
    answerCount: normalize(document.querySelector('[itemprop="answerCount"], #answers-header h2, .answers-subheader h2')?.textContent),
    replyCount: normalize(document.querySelector('#answers h2')?.textContent),
    answers,
    replies
  };
}
