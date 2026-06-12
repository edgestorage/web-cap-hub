/**
 * web-cap script
 *
 * @description Search Stack Overflow and read visible question summaries.
 * @param {object} input
 * @param {string} input.query Search query.
 * @param {number} [input.limit=30] Maximum questions to return.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, blocked?: boolean, query?: string, url: string, title: string, count?: number, questions?: Array<object> }}
 * @match https://stackoverflow.com/*
 */
export default async function (input = {}) {
  const query = String(input.query || '').trim();
  if (!query) return { ok: false, error: 'query is required', url: location.href, title: document.title };

  if (input.step !== 'read') {
    const url = new URL('/search', location.origin);
    url.searchParams.set('q', query);
    return cap.goto(url.href, { ...input, query, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 30), 100));
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
  const pageText = normalize(document.body.innerText).slice(0, 800);
  if (/Human verification|Are you a human being|正在进行安全验证|Cloudflare/i.test(`${document.title} ${pageText}`) || location.pathname.includes('/nocaptcha')) {
    return { ok: false, blocked: true, reason: 'Stack Overflow human verification page', query, url: location.href, title: document.title };
  }

  const numberFrom = (text) => normalize(text).match(/-?\d[\d,]*/)?.[0]?.replace(/,/g, '') || '';
  const questions = [];
  for (const card of document.querySelectorAll('.s-post-summary, [id^="question-summary-"]')) {
    if (questions.length >= limit) break;
    const titleLink = card.querySelector('.s-post-summary--content-title a.s-link[href^="/questions/"], a.s-link[href^="/questions/"]');
    if (!titleLink) continue;
    const href = absoluteUrl(titleLink.getAttribute('href'));
    const statsText = [...card.querySelectorAll('.s-post-summary--stats-item')].map((item) => normalize(item.textContent));
    const userLink = [...card.querySelectorAll('a[href^="/users/"]')].filter((link) => normalize(link.textContent)).at(-1);

    questions.push({
      id: card.id?.match(/question-summary-(\d+)/)?.[1] || href.match(/\/questions\/(\d+)\//)?.[1] || '',
      title: normalize(titleLink.textContent),
      href,
      excerpt: normalize(card.querySelector('.s-post-summary--content-excerpt')?.textContent),
      tags: [...card.querySelectorAll('.post-tag')].map((tag) => normalize(tag.textContent)).filter(Boolean),
      votes: numberFrom(statsText.find((item) => /vote/i.test(item))),
      answers: numberFrom(statsText.find((item) => /answer|repl/i.test(item))),
      views: numberFrom(statsText.find((item) => /view/i.test(item))),
      user: normalize(userLink?.textContent),
      userHref: absoluteUrl(userLink?.getAttribute('href')),
      asked: normalize(card.querySelector('time, .relativetime, .relativetime-clean')?.textContent)
    });
  }

  return {
    ok: true,
    query,
    url: location.href,
    title: document.title,
    count: questions.length,
    questions
  };
}
