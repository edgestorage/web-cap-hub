/**
 * web-cap script
 *
 * @description Read Stack Overflow tag cards from the current tags page.
 * @param {object} [input]
 * @param {number} [input.limit=36] Maximum tags to return.
 * @param {"popular"|"name"|"new"} [input.tab] Optional tags tab to open before reading.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, blocked?: boolean, url: string, title: string, count?: number, tags?: Array<object> }}
 * @match https://stackoverflow.com/*
 */
export default async function (input = {}) {
  if (input.tab && input.step !== 'read') {
    const url = new URL('/tags', location.origin);
    url.searchParams.set('tab', input.tab);
    return cap.goto(url.href, { ...input, step: 'read' });
  }

  const limit = Math.max(1, Math.min(Number(input.limit ?? 36), 100));
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

  const tags = [];
  const cards = document.querySelectorAll('.js-tag-cell, [data-tag-name], .s-card');
  for (const card of cards) {
    if (tags.length >= limit) break;
    const tagLink = card.querySelector('a.post-tag, a[href^="/questions/tagged/"]');
    if (!tagLink) continue;
    const href = absoluteUrl(tagLink.getAttribute('href'));
    tags.push({
      name: normalize(tagLink.textContent),
      href,
      description: normalize(card.querySelector('.v-truncate4, .fc-medium, .excerpt')?.textContent),
      questionCount: normalize(card.textContent).match(/[\d,.]+[km]?\s+questions?/i)?.[0] || '',
      todayCount: normalize(card.textContent).match(/[\d,.]+[km]?\s+asked today/i)?.[0] || '',
      weekCount: normalize(card.textContent).match(/[\d,.]+[km]?\s+this week/i)?.[0] || ''
    });
  }

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: tags.length,
    tags
  };
}
