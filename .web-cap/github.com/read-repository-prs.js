/**
 * web-cap script
 *
 * @description Read GitHub repository pull requests.
 * @param {object} [input]
 * @param {string} [input.url] Repository or pulls URL.
 * @param {string} [input.owner] Repository owner, used with repo.
 * @param {string} [input.repo] Repository name, used with owner.
 * @param {string} [input.state=open] Pull request state: open, closed, or all.
 * @param {number} [input.limit=30] Maximum pull requests to return.
 * @returns {{ ok: boolean, url: string, title: string, count: number, pullRequests: Array<object> }}
 * @match https://github.com/*
 */
export default async function (input = {}) {
  const limit = clampInteger(input.limit, 1, 100, 30);
  const pullsUrl = repoSubpageUrl(input, 'pulls');
  if (!pullsUrl) return errorResult('Provide input.url or input.owner and input.repo, or run on a repository page.');
  const state = ['open', 'closed', 'all'].includes(input.state) ? input.state : 'open';
  pullsUrl.searchParams.set('q', `is:pr${state === 'all' ? '' : ` is:${state}`}`);

  const doc = await fetchDocument(pullsUrl);
  const pullRequests = parsePullRequests(doc, pullsUrl).slice(0, limit);
  return { ok: true, url: pullsUrl.href, title: doc.title, count: pullRequests.length, pullRequests };
}

function parsePullRequests(doc, baseUrl) {
  const items = [];
  const seen = new Set();
  for (const link of doc.querySelectorAll('a[href*="/pull/"]')) {
    const href = new URL(link.getAttribute('href'), baseUrl).href;
    const path = new URL(href).pathname;
    if (!/\/[^/]+\/[^/]+\/pull\/\d+$/.test(path) || seen.has(href)) continue;
    const title = normalize(link.textContent);
    if (!title || /^\d+$/.test(title)) continue;
    seen.add(href);
    const context = compactAncestorText(link, title, 1000);
    items.push({
      number: path.match(/\/pull\/(\d+)$/)?.[1] || '',
      title,
      href,
      state: /Merged|merged/.test(context) ? 'merged' : (/Closed|closed/.test(context) ? 'closed' : 'open'),
      checks: inferChecks(context),
      context
    });
  }
  return items;
}

function inferChecks(context) {
  if (/failing checks|failed/i.test(context)) return 'failing';
  if (/passing checks|passed/i.test(context)) return 'passing';
  if (/pending checks|pending/i.test(context)) return 'pending';
  return '';
}

function repoSubpageUrl(input, subpage) {
  const repo = repositoryParts(input);
  if (!repo) return null;
  return new URL(`/${repo.owner}/${repo.repo}/${subpage}`, location.origin);
}

function repositoryParts(input) {
  if (input.owner && input.repo) return { owner: input.owner, repo: input.repo };
  const source = input.url ? new URL(input.url, location.origin) : new URL(location.href);
  if (source.origin !== location.origin) return null;
  const [owner, repo] = source.pathname.split('/').filter(Boolean);
  return owner && repo ? { owner, repo } : null;
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
