/**
 * web-cap script
 *
 * @description Read repositories visible on the GitHub dashboard sidebar and recent dashboard contexts.
 * @param {object} [input]
 * @param {number} [input.limit=30] Maximum repositories to return.
 * @returns {{ ok: boolean, url: string, title: string, count: number, repositories: Array<object> }}
 * @match https://github.com/
 */
export default async function (input = {}) {
  const limit = clampInteger(input.limit, 1, 100, 30);
  const doc = location.pathname === '/' ? document : await fetchDocument(new URL('/', location.origin));
  const repositories = parseRepositories(doc).slice(0, limit);
  return { ok: true, url: new URL('/', location.origin).href, title: doc.title, count: repositories.length, repositories };
}

function parseRepositories(doc) {
  const items = [];
  const seen = new Set();
  for (const link of doc.querySelectorAll('a[href]')) {
    const url = new URL(link.getAttribute('href'), location.origin);
    if (url.origin !== location.origin || !/^\/[^/]+\/[^/]+$/.test(url.pathname)) continue;
    const name = normalize(link.textContent);
    if (!name.includes('/') || seen.has(url.href)) continue;
    seen.add(url.href);
    const context = compactAncestorText(link, name, 600);
    items.push({
      name,
      href: url.href,
      source: context.includes('Top repositories') ? 'top_repository' : (context.includes('Trending repositories') ? 'trending' : 'feed'),
      context
    });
  }
  return items;
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
  for (let depth = 0; depth < 8 && node; depth += 1) {
    const text = normalize(node.innerText || node.textContent || '');
    if (text.includes(title) && text.length > bestText.length && text.length <= maxLength) bestText = text;
    node = node.parentElement;
  }
  return bestText;
}
