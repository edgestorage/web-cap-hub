/**
 * web-cap script
 *
 * @description Read GitHub repository activity page.
 * @param {object} [input]
 * @param {string} [input.url] Repository or activity URL.
 * @param {string} [input.owner] Repository owner, used with repo.
 * @param {string} [input.repo] Repository name, used with owner.
 * @param {number} [input.limit=40] Maximum activity items to return.
 * @returns {{ ok: boolean, url: string, title: string, count: number, activity: Array<object>, message?: string }}
 * @match https://github.com/*
 */
export default async function (input = {}) {
  const limit = clampInteger(input.limit, 1, 100, 40);
  const activityUrl = repoSubpageUrl(input, 'activity');
  if (!activityUrl) return errorResult('Provide input.url or input.owner and input.repo, or run on a repository page.');

  const doc = await fetchDocument(activityUrl);
  const activity = parseActivity(doc).slice(0, limit);
  return {
    ok: true,
    url: activityUrl.href,
    title: doc.title,
    count: activity.length,
    activity,
    message: activity.length ? '' : 'No activity items were parsed; GitHub may have rendered this activity feed client-side.'
  };
}

function parseActivity(doc) {
  const items = [];
  const seen = new Set();
  const links = [...doc.querySelectorAll('a[href]')].filter((link) => {
    const href = new URL(link.getAttribute('href'), location.origin).href;
    return /\/(commit|pull|issues|releases|compare)\//.test(href) || /\/commit\//.test(href);
  });

  for (const link of links) {
    const href = new URL(link.getAttribute('href'), location.origin).href;
    const label = normalize(link.textContent);
    const context = compactAncestorText(link, label || href, 1000);
    const key = `${href}:${context}`;
    if (seen.has(key) || (!label && !context)) continue;
    seen.add(key);
    items.push({
      type: inferType(href, context),
      title: label || inferType(href, context),
      href,
      time: normalize(link.closest('li, div')?.querySelector('relative-time, time-ago, time')?.getAttribute('datetime') || ''),
      context
    });
  }
  return items;
}

function inferType(href, context) {
  if (href.includes('/commit/')) return 'commit';
  if (href.includes('/pull/')) return /merged/i.test(context) ? 'merged_pull_request' : 'pull_request';
  if (href.includes('/issues/')) return 'issue';
  if (href.includes('/releases/')) return 'release';
  if (href.includes('/compare/')) return 'compare';
  return 'activity';
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
    if ((!title || text.includes(title)) && text.length > bestText.length && text.length <= maxLength) bestText = text;
    node = node.parentElement;
  }
  return bestText;
}
