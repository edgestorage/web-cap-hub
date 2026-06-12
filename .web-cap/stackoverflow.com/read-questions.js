/**
 * web-cap script
 *
 * @description Read Stack Overflow question summaries from the current list page.
 * @param {object} [input]
 * @param {number} [input.limit=30] Maximum questions to return.
 * @param {"newest"|"active"|"bountied"|"bounties"|"unanswered"|"votes"|"frequent"|"week"|"month"} [input.tab] Optional tab to open before reading.
 * @param {string} [input.tag] Optional tag page to open before reading.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, blocked?: boolean, url: string, title: string, count?: number, questions?: Array<object> }}
 * @match https://stackoverflow.com/*
 */
export default async function (input = {}) {
  if ((input.tab || input.tag) && input.step !== 'read') {
    const url = new URL(input.tag ? `/questions/tagged/${encodeURIComponent(input.tag)}` : '/questions', location.origin);
    const tabMap = {
      newest: 'Newest',
      active: 'Active',
      bountied: 'Bounties',
      bounties: 'Bounties',
      unanswered: 'Unanswered',
      votes: 'Votes',
      frequent: 'Frequent',
      week: 'Week',
      month: 'Month'
    };
    if (input.tab) url.searchParams.set('tab', tabMap[String(input.tab).toLowerCase()] || input.tab);
    return cap.goto(url.href, { ...input, step: 'read' });
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
    return { ok: false, blocked: true, reason: 'Stack Overflow human verification page', url: location.href, title: document.title };
  }

  const numberFrom = (text) => normalize(text).match(/-?\d[\d,]*/)?.[0]?.replace(/,/g, '') || '';
  const questions = [];
  const cards = document.querySelectorAll('.s-post-summary, [id^="question-summary-"]');

  for (const card of cards) {
    if (questions.length >= limit) break;
    const titleLink = card.querySelector('.s-post-summary--content-title a.s-link[href^="/questions/"], a.s-link[href^="/questions/"]');
    if (!titleLink) continue;

    const statsText = [...card.querySelectorAll('.s-post-summary--stats-item')]
      .map((item) => normalize(item.textContent));
    const text = normalize(card.innerText);
    const href = absoluteUrl(titleLink.getAttribute('href'));
    const id = card.id?.match(/question-summary-(\d+)/)?.[1] || href.match(/\/questions\/(\d+)\//)?.[1] || '';
    const userLink = [...card.querySelectorAll('a[href^="/users/"]')]
      .filter((link) => normalize(link.textContent))
      .at(-1);

    questions.push({
      id,
      title: normalize(titleLink.textContent),
      href,
      excerpt: normalize(card.querySelector('.s-post-summary--content-excerpt')?.textContent),
      tags: [...card.querySelectorAll('.post-tag')].map((tag) => normalize(tag.textContent)).filter(Boolean),
      votes: numberFrom(statsText.find((item) => /vote/i.test(item)) || text.match(/-?\d[\d,]*\s+votes?/i)?.[0] || ''),
      answers: numberFrom(statsText.find((item) => /answer|repl/i.test(item)) || text.match(/\d[\d,]*\s+(answers?|replies?)/i)?.[0] || ''),
      views: numberFrom(statsText.find((item) => /view/i.test(item)) || text.match(/\d[\d,]*\s+views?/i)?.[0] || ''),
      hasAcceptedAnswer: card.querySelector('.has-accepted-answer, .answered-accepted, [title*="accepted"]') !== null,
      user: normalize(userLink?.textContent),
      userHref: absoluteUrl(userLink?.getAttribute('href')),
      asked: normalize(card.querySelector('time, .relativetime, .relativetime-clean')?.textContent)
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: questions.length,
    questions
  };
}
