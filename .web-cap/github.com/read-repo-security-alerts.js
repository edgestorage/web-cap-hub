/**
 * web-cap script
 *
 * @description Read a GitHub repository security and Dependabot alerts overview when available.
 * @param {object} [input]
 * @param {string} [input.url] Repository URL.
 * @param {string} [input.owner] Repository owner, used with repo.
 * @param {string} [input.repo] Repository name, used with owner.
 * @returns {{ ok: boolean, url: string, title: string, accessible: boolean, alerts: Array<object>, message?: string }}
 * @match https://github.com/*
 */
export default async function (input = {}) {
  const securityUrl = repoSubpageUrl(input, 'security');
  if (!securityUrl) return errorResult('Provide input.url or input.owner and input.repo, or run on a repository page.');

  const doc = await fetchDocument(securityUrl);
  const text = normalize(doc.body?.innerText || '');
  const accessible = !/404|This is not the web page you are looking for|Access denied|Sign in/.test(doc.title + text);
  const alerts = [];

  for (const link of doc.querySelectorAll('a[href*="/security/dependabot"], a[href*="/security/code-scanning"], a[href*="/security/secret-scanning"]')) {
    const href = new URL(link.getAttribute('href'), location.origin).href;
    const label = normalize(link.textContent);
    if (!label) continue;
    alerts.push({
      type: inferAlertType(href, label),
      label,
      href,
      context: compactAncestorText(link, label, 900)
    });
  }

  return {
    ok: true,
    url: securityUrl.href,
    title: doc.title,
    accessible,
    alerts,
    message: accessible ? '' : 'Security page was not accessible with the current session.'
  };
}

function inferAlertType(href, label) {
  if (href.includes('dependabot') || /dependabot/i.test(label)) return 'dependabot';
  if (href.includes('code-scanning') || /code scanning/i.test(label)) return 'code_scanning';
  if (href.includes('secret-scanning') || /secret scanning/i.test(label)) return 'secret_scanning';
  return 'security';
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
