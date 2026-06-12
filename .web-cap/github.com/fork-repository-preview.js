/**
 * web-cap script
 *
 * @description Preview GitHub repository fork options without creating a fork.
 * @param {object} [input]
 * @param {string} [input.url] Repository URL.
 * @param {string} [input.owner] Repository owner, used with repo.
 * @param {string} [input.repo] Repository name, used with owner.
 * @returns {{ ok: boolean, url: string, title: string, repository?: string, options: Array<object>, message?: string }}
 * @match https://github.com/*
 */
export default async function (input = {}) {
  const repoUrl = repoUrlFromInput(input);
  if (!repoUrl) return errorResult('Provide input.url or input.owner and input.repo, or run on a repository page.');
  const [owner, repo] = repoUrl.pathname.split('/').filter(Boolean);
  const forkUrl = new URL(`/${owner}/${repo}/fork`, location.origin);
  const doc = await fetchDocument(forkUrl);
  const text = normalize(doc.body?.innerText || '');
  const options = parseForkOptions(doc);
  return {
    ok: true,
    url: forkUrl.href,
    title: doc.title,
    repository: `${owner}/${repo}`,
    options,
    message: options.length ? '' : (text.includes('fork') ? 'Fork page loaded, but no fork owner options were parsed.' : 'Fork page may be unavailable or already redirected.')
  };
}

function parseForkOptions(doc) {
  const options = [];
  const seen = new Set();
  const ignored = new Set([
    'Search or jump to...',
    'Search or jump to…',
    'Open Copilot...',
    'Open Copilot…',
    'Give feedback',
    'Close',
    'Cancel',
    'Submit feedback',
    'Create saved search',
    'Manage cookies',
    'Do not share my personal information',
    'Dismiss error'
  ]);
  for (const element of doc.querySelectorAll('input[type="radio"], option, button[type="submit"], a[href*="/fork"]')) {
    const label = normalize(
      element.getAttribute('aria-label') ||
      element.getAttribute('value') ||
      element.textContent ||
      element.closest('label')?.textContent
    );
    if (!label || ignored.has(label) || seen.has(label)) continue;
    if (!/fork|owner|organization|personal|create|repository|edgestorage|^[A-Za-z0-9_.-]+$/.test(label)) continue;
    seen.add(label);
    options.push({
      label,
      disabled: Boolean(element.disabled || element.getAttribute('aria-disabled') === 'true')
    });
  }
  return options;
}

function repoUrlFromInput(input) {
  if (input.owner && input.repo) return new URL(`/${input.owner}/${input.repo}`, location.origin);
  const source = input.url ? new URL(input.url, location.origin) : new URL(location.href);
  if (source.origin !== location.origin) return null;
  const parts = source.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return new URL(`/${parts[0]}/${parts[1]}`, location.origin);
}

async function fetchDocument(url) {
  const html = await fetch(url.href, { credentials: 'include' }).then((response) => response.text());
  return new DOMParser().parseFromString(html, 'text/html');
}

function errorResult(error) {
  return { ok: false, error, url: location.href, title: document.title, options: [] };
}

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}
