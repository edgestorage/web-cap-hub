/**
 * web-cap script
 *
 * @description Read a GitHub repository summary from the current repository page or a supplied repository.
 * @param {object} [input]
 * @param {string} [input.url] Repository URL.
 * @param {string} [input.owner] Repository owner, used with repo.
 * @param {string} [input.repo] Repository name, used with owner.
 * @param {number} [input.readmeLimit=3000] Maximum README characters to return.
 * @returns {{ ok: boolean, url: string, title: string, repository: object }}
 * @match https://github.com/*
 */
export default async function (input = {}) {
  const readmeLimit = clampInteger(input.readmeLimit, 200, 20000, 3000);
  const repoUrl = repositoryUrlFromInput(input);
  if (!repoUrl) {
    return {
      ok: false,
      error: 'Provide input.url or input.owner and input.repo, or run on a repository page.',
      url: location.href,
      title: document.title
    };
  }

  const html = await fetch(repoUrl.href, { credentials: 'include' }).then((response) => response.text());
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const [owner, repo] = repoUrl.pathname.split('/').filter(Boolean);
  const description = normalize(
    doc.querySelector('[itemprop="about"]')?.textContent ||
    doc.querySelector('meta[name="description"]')?.content
  );
  const readme = normalize(
    doc.querySelector('#readme article, article.markdown-body, .markdown-body')?.innerText
  ).slice(0, readmeLimit);
  const topics = [...doc.querySelectorAll('a.topic-tag, [data-ga-click*="Repository topic"]')]
    .map((element) => normalize(element.textContent))
    .filter(Boolean);
  const languageStats = [...doc.querySelectorAll('[data-view-component="true"] a[href*="/search?l="], .BorderGrid-row a[href*="/search?l="]')]
    .map((element) => normalize(element.textContent))
    .filter(Boolean);

  return {
    ok: true,
    url: repoUrl.href,
    title: doc.title,
    repository: {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      description,
      visibility: normalize(doc.querySelector('[title=\"Label: Public\"], [title=\"Label: Private\"], .Label')?.textContent),
      defaultBranch: normalize(doc.querySelector('summary .css-truncate-target, details[data-testid=\"branch-picker\"] summary')?.textContent),
      stars: statText(doc, 'stargazers'),
      forks: statText(doc, 'forks'),
      watchers: statText(doc, 'watchers'),
      issues: countText(doc, `/${owner}/${repo}/issues`),
      pullRequests: countText(doc, `/${owner}/${repo}/pulls`),
      latestRelease: latestRelease(doc),
      topics,
      languageStats,
      readme
    }
  };
}

function normalize(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number)) return fallback;
  return Math.max(min, Math.min(number, max));
}

function repositoryUrlFromInput(input) {
  if (input.owner && input.repo) {
    return new URL(`/${input.owner}/${input.repo}`, location.origin);
  }

  const source = input.url ? new URL(input.url, location.origin) : new URL(location.href);
  if (source.origin !== location.origin) return null;
  const parts = source.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return new URL(`/${parts[0]}/${parts[1]}`, location.origin);
}

function statText(doc, pathPart) {
  const link = [...doc.querySelectorAll('a[href]')]
    .find((element) => new URL(element.getAttribute('href'), location.origin).pathname.includes(pathPart));
  return normalize(link?.textContent);
}

function countText(doc, path) {
  const link = [...doc.querySelectorAll('a[href]')]
    .find((element) => new URL(element.getAttribute('href'), location.origin).pathname === path);
  return normalize(link?.textContent);
}

function latestRelease(doc) {
  const releaseLink = [...doc.querySelectorAll('a[href*="/releases/tag/"]')][0];
  if (!releaseLink) return null;
  return {
    name: normalize(releaseLink.textContent),
    href: new URL(releaseLink.getAttribute('href'), location.origin).href,
    context: compactAncestorText(releaseLink, normalize(releaseLink.textContent), 600)
  };
}

function compactAncestorText(element, title, maxLength) {
  let node = element;
  let bestText = '';

  for (let depth = 0; depth < 7 && node; depth += 1) {
    const text = normalize(node.innerText || node.textContent || '');
    if ((!title || text.includes(title)) && text.length > bestText.length && text.length <= maxLength) {
      bestText = text;
    }
    node = node.parentElement;
  }

  return bestText;
}
