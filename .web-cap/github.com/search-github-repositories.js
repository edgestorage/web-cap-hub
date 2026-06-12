/**
 * web-cap script
 *
 * @description Search GitHub repositories and return compact result metadata.
 * @param {object} input
 * @param {string} input.query Search query.
 * @param {number} [input.limit=20] Maximum repositories to return.
 * @param {string} [input.sort] GitHub search sort, such as stars, forks, updated.
 * @param {string} [input.order] GitHub search order, asc or desc.
 * @returns {{ ok: boolean, url: string, title: string, query: string, count: number, repositories: Array<object> }}
 * @match https://github.com/search*
 */
export default async function (input = {}) {
  const query = normalize(input.query);
  if (!query) {
    return {
      ok: false,
      error: 'query is required',
      url: location.href,
      title: document.title
    };
  }

  const limit = clampInteger(input.limit, 1, 100, 20);
  const searchUrl = new URL('/search', location.origin);
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('type', 'repositories');
  if (input.sort) searchUrl.searchParams.set('s', input.sort);
  if (input.order) searchUrl.searchParams.set('o', input.order);

  const html = await fetch(searchUrl.href, { credentials: 'include' }).then((response) => response.text());
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const repositories = parseRepositoryResults(doc).slice(0, limit);

  return {
    ok: true,
    url: searchUrl.href,
    title: doc.title,
    query,
    count: repositories.length,
    repositories
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

function parseRepositoryResults(doc) {
  const links = [...doc.querySelectorAll('a[href]')].filter((link) => {
    const url = new URL(link.getAttribute('href'), location.origin);
    return url.origin === location.origin && /^\/[^/]+\/[^/]+$/.test(url.pathname) && normalize(link.textContent).includes('/');
  });
  const results = [];
  const seen = new Set();

  for (const link of links) {
    const href = new URL(link.getAttribute('href'), location.origin).href;
    if (seen.has(href)) continue;
    seen.add(href);

    const name = normalize(link.textContent);
    const context = compactAncestorText(link, name, 1200);
    const language = context.match(/(TypeScript|JavaScript|Python|Go|Rust|Java|C\+\+|C#|Swift|Shell|Ruby|PHP|HTML|CSS)·/)?.[1] ||
      context.match(/\b(TypeScript|JavaScript|Python|Go|Rust|Java|C\+\+|C#|Swift|Shell|Ruby|PHP|HTML|CSS)\b/)?.[1] ||
      '';
    const stars = context.match(/(?:TypeScript|JavaScript|Python|Go|Rust|Java|C\+\+|C#|Swift|Shell|Ruby|PHP|HTML|CSS)·([\d,.]+[kKmM]?)/)?.[1] ||
      context.match(/(?:^|\s)([\d,.]+[kKmM]?)\s+stars?\b/i)?.[1] ||
      '';
    const updated = context.match(/Updated\s+[^·\n]+/)?.[0] || '';

    results.push({
      name,
      href,
      description: descriptionFromContext(context, name),
      language,
      stars,
      updated,
      context
    });
  }

  return results;
}

function compactAncestorText(element, title, maxLength) {
  let node = element;
  let bestText = '';

  for (let depth = 0; depth < 8 && node; depth += 1) {
    const text = normalize(node.innerText || node.textContent || '');
    if (text.includes(title) && text.length > bestText.length && text.length <= maxLength) {
      bestText = text;
    }
    node = node.parentElement;
  }

  return bestText;
}

function descriptionFromContext(context, name) {
  const withoutName = normalize(context.replace(name, ''));
  return withoutName
    .replace(/(TypeScript|JavaScript|Python|Go|Rust|Java|C\+\+|C#|Swift|Shell|Ruby|PHP|HTML|CSS)·.*$/, '')
    .replace(/\b(TypeScript|JavaScript|Python|Go|Rust|Java|C\+\+|C#|Swift|Shell|Ruby|PHP|HTML|CSS)\b.*$/, '')
    .replace(/Updated\s+.*$/, '')
    .trim();
}
