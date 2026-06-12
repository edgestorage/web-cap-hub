/**
 * web-cap script
 *
 * @description Search GitHub issues and pull requests.
 * @param {object} input
 * @param {string} input.query Search query.
 * @param {number} [input.limit=30] Maximum results to return.
 * @param {string} [input.type=issues] Search type: issues or pulls.
 * @param {string} [input.sort] GitHub search sort.
 * @param {string} [input.order] GitHub search order, asc or desc.
 * @returns {{ ok: boolean, url: string, title: string, query: string, count: number, items: Array<object> }}
 * @match https://github.com/search*
 */
export default async function (input = {}) {
  const query = normalize(input.query);
  if (!query) return errorResult('query is required');
  const limit = clampInteger(input.limit, 1, 100, 30);
  const searchType = input.type === 'pulls' ? 'pullrequests' : 'issues';
  const url = new URL('/search', location.origin);
  url.searchParams.set('q', query);
  url.searchParams.set('type', searchType);
  if (input.sort) url.searchParams.set('s', input.sort);
  if (input.order) url.searchParams.set('o', input.order);

  const doc = await fetchDocument(url);
  const items = parseItems(doc, url).slice(0, limit);
  return { ok: true, url: url.href, title: doc.title, query, count: items.length, items };
}

function parseItems(doc, baseUrl) {
  const items = [];
  const seen = new Set();
  for (const link of doc.querySelectorAll('a[href*="/issues/"], a[href*="/pull/"]')) {
    const href = new URL(link.getAttribute('href'), baseUrl).href;
    const path = new URL(href).pathname;
    if (!/\/[^/]+\/[^/]+\/(issues|pull)\/\d+$/.test(path) || seen.has(href)) continue;
    const title = normalize(link.textContent);
    if (!title || /^\d+$/.test(title)) continue;
    seen.add(href);
    const parts = path.split('/').filter(Boolean);
    const type = path.includes('/pull/') ? 'pull_request' : 'issue';
    const context = compactAncestorText(link, title, 1200);
    items.push({
      repository: parts.slice(0, 2).join('/'),
      type,
      number: parts[3],
      title,
      href,
      state: /closed|merged/i.test(context) ? (type === 'pull_request' && /merged/i.test(context) ? 'merged' : 'closed') : 'open',
      context
    });
  }
  return items;
}

async function fetchDocument(url) {
  const html = await fetch(url.href, { credentials: 'include' }).then((response) => response.text());
  return new DOMParser().parseFromString(html, 'text/html');
}

function errorResult(error) {
  return { ok: false, error, url: location.href, title: document.title };
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
  for (let depth = 0; depth < 8 && node; depth += 1) {
    const text = normalize(node.innerText || node.textContent || '');
    if (text.includes(title) && text.length > bestText.length && text.length <= maxLength) bestText = text;
    node = node.parentElement;
  }
  return bestText;
}
