/**
 * web-cap script
 *
 * @description Read GitHub notifications.
 * @param {object} [input]
 * @param {number} [input.limit=50] Maximum notifications to return.
 * @param {boolean} [input.unreadOnly=false] Whether to request only unread notifications.
 * @returns {{ ok: boolean, url: string, title: string, count: number, notifications: Array<object> }}
 * @match https://github.com/notifications*
 */
export default async function (input = {}) {
  const limit = clampInteger(input.limit, 1, 100, 50);
  const url = new URL('/notifications', location.origin);
  if (input.unreadOnly) url.searchParams.set('query', 'is:unread');

  const doc = await fetchDocument(url);
  const notifications = parseNotifications(doc).slice(0, limit);
  return { ok: true, url: url.href, title: doc.title, count: notifications.length, notifications };
}

function parseNotifications(doc) {
  const candidates = [...doc.querySelectorAll('a[href*="/issues/"], a[href*="/pull/"], a[href*="/discussions/"], a[href*="/releases/"]')];
  const items = [];
  const seen = new Set();
  for (const link of candidates) {
    const href = new URL(link.getAttribute('href'), location.origin).href;
    if (seen.has(href)) continue;
    const title = normalize(link.textContent);
    if (!title) continue;
    seen.add(href);
    const context = compactAncestorText(link, title, 1000);
    items.push({
      title,
      href,
      repository: context.match(/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/)?.[0] || '',
      unread: /Unread|unread/.test(context),
      reason: inferReason(context),
      context
    });
  }
  return items;
}

function inferReason(context) {
  for (const reason of ['assign', 'author', 'comment', 'mention', 'review requested', 'subscribed']) {
    if (context.toLowerCase().includes(reason)) return reason;
  }
  return '';
}

async function fetchDocument(url) {
  const html = await fetch(url.href, { credentials: 'include' }).then((response) => response.text());
  return new DOMParser().parseFromString(html, 'text/html');
}

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number)) return fallback;
  return Math.max(min, Math.min(number, max));
}

function compactAncestorText(element, title, maxLength) {
  let node = element;
  let bestText = '';
  for (let depth = 0; depth < 9 && node; depth += 1) {
    const text = normalize(node.innerText || node.textContent || '');
    if (text.includes(title) && text.length > bestText.length && text.length <= maxLength) bestText = text;
    node = node.parentElement;
  }
  return bestText;
}
