/**
 * web-cap script
 *
 * @description Search GitHub code.
 * @param {object} input
 * @param {string} input.query Code search query.
 * @param {number} [input.limit=20] Maximum results to return.
 * @returns {{ ok: boolean, url: string, title: string, query: string, count: number, results: Array<object> }}
 * @match https://github.com/search*
 */
export default async function (input = {}) {
  const query = normalize(input.query);
  if (!query) return errorResult('query is required');
  const limit = clampInteger(input.limit, 1, 100, 20);
  const url = new URL('/search', location.origin);
  url.searchParams.set('q', query);
  url.searchParams.set('type', 'code');

  const apiResults = await searchCodeApi(query, limit).catch(() => null);
  if (apiResults) {
    return { ok: true, url: url.href, title: 'GitHub code search', query, count: apiResults.length, results: apiResults };
  }

  const doc = await fetchDocument(url);
  const results = parseCodeResults(doc, url).slice(0, limit);
  return { ok: true, url: url.href, title: doc.title, query, count: results.length, results };
}

async function searchCodeApi(query, limit) {
  const apiUrl = new URL('https://api.github.com/search/code');
  apiUrl.searchParams.set('q', query);
  apiUrl.searchParams.set('per_page', String(limit));
  const response = await fetch(apiUrl.href, {
    headers: { Accept: 'application/vnd.github+json' }
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (!Array.isArray(data.items)) return null;
  return data.items.map((item) => ({
    repository: item.repository?.full_name || '',
    path: item.path || item.name || '',
    href: item.html_url || '',
    snippet: '',
    score: item.score
  }));
}

function parseCodeResults(doc, baseUrl) {
  const items = [];
  const seen = new Set();
  for (const link of doc.querySelectorAll('a[href*="/blob/"]')) {
    const href = new URL(link.getAttribute('href'), baseUrl).href;
    if (seen.has(href)) continue;
    const path = normalize(link.textContent);
    if (!path) continue;
    seen.add(href);
    const url = new URL(href);
    const parts = url.pathname.split('/').filter(Boolean);
    const repository = parts.slice(0, 2).join('/');
    items.push({
      repository,
      path,
      href,
      snippet: compactAncestorText(link, path, 1500)
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
