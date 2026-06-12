/**
 * web-cap script
 *
 * @description Read visible GitHub dashboard feed, top repositories, and trending repositories.
 * @param {object} [input]
 * @param {number} [input.limit=30] Maximum feed items to return.
 * @param {number} [input.repositoryLimit=20] Maximum sidebar repositories to return.
 * @param {number} [input.trendingLimit=10] Maximum trending repositories to return.
 * @returns {{ ok: boolean, url: string, title: string, feed: Array<object>, topRepositories: Array<object>, trendingRepositories: Array<object> }}
 * @match https://github.com/
 */
export default async function (input = {}) {
  const limit = clampInteger(input.limit, 1, 100, 30);
  const repositoryLimit = clampInteger(input.repositoryLimit, 1, 100, 20);
  const trendingLimit = clampInteger(input.trendingLimit, 1, 50, 10);

  const feed = uniqueByHref(
    collectLinks(document, (link, text, url) => {
      const path = url.pathname;
      if (!/^\/[^/]+\/[^/]+/.test(path)) return null;
      if (path.includes('/stargazers') || path.includes('/releases/tag/')) return null;
      const context = compactAncestorText(link, text, 900);
      if (!context || !context.includes(text)) return null;
      if (!/(released|starred|forked|published|created|opened|merged|commented)/i.test(context)) return null;
      return {
        title: text,
        href: url.href,
        context,
        type: inferFeedType(context, url)
      };
    })
  ).slice(0, limit);

  const topRepositories = uniqueByHref(
    collectLinks(document, (link, text, url) => {
      if (!/^\/[^/]+\/[^/]+$/.test(url.pathname)) return null;
      const context = compactAncestorText(link, text, 320);
      if (!/Top repositories|New|Dashboard|Home/.test(document.body.innerText || '') && !context) return null;
      return {
        name: text,
        href: url.href
      };
    })
  ).slice(0, repositoryLimit);

  const trendingSection = findHeadingSection(document, 'Trending repositories');
  const trendingRepositories = uniqueByHref(
    collectLinks(document, (link, text, url) => {
      if (!trendingSection || !isInsideSection(link, trendingSection)) return null;
      if (!/^\/[^/]+\/[^/]+$/.test(url.pathname)) return null;
      const context = compactAncestorText(link, text, 500);
      if (!context.includes('Star')) return null;
      if (!/\b(TypeScript|JavaScript|Python|Go|Rust|Java|C\+\+|C#|Swift|Shell|Ruby|PHP|HTML|CSS)\b/.test(context)) return null;
      return {
        name: text,
        href: url.href,
        context
      };
    })
  ).slice(0, trendingLimit);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    feed,
    topRepositories,
    trendingRepositories
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

function compactAncestorText(element, title, maxLength) {
  let node = element;
  let bestText = '';

  for (let depth = 0; depth < 7 && node; depth += 1) {
    const text = normalize(node.innerText || node.textContent || '');
    if (text.includes(title) && text.length > bestText.length && text.length <= maxLength) {
      bestText = text;
    }
    node = node.parentElement;
  }

  return bestText;
}

function collectLinks(doc, mapper) {
  const items = [];
  for (const link of doc.querySelectorAll('a[href]')) {
    const text = normalize(link.textContent);
    if (!text) continue;
    const url = new URL(link.getAttribute('href'), location.origin);
    if (url.origin !== location.origin) continue;
    const item = mapper(link, text, url);
    if (item) items.push(item);
  }
  return items;
}

function uniqueByHref(items) {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    if (!item.href || seen.has(item.href)) continue;
    seen.add(item.href);
    unique.push(item);
  }
  return unique;
}

function inferFeedType(context, url) {
  if (context.includes('released')) return 'release';
  if (context.includes('starred')) return 'star';
  if (context.includes('forked')) return 'fork';
  if (context.includes('created')) return 'create';
  if (url.pathname.includes('/pull/')) return 'pull_request';
  if (url.pathname.includes('/issues/')) return 'issue';
  return 'activity';
}

function findHeadingSection(doc, label) {
  const headings = [...doc.querySelectorAll('h1,h2,h3,h4')];
  const start = headings.find((heading) => normalize(heading.textContent).startsWith(label));
  if (!start) return null;
  const next = headings.find((heading) => {
    if (heading === start) return false;
    if (['Lists', 'Sorry, something went wrong.', 'Uh oh!', "You don't have any lists yet."].includes(normalize(heading.textContent))) {
      return false;
    }
    return Boolean(start.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING);
  }) || null;
  return { start, next };
}

function isInsideSection(element, section) {
  const afterStart = Boolean(section.start.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
  if (!afterStart) return false;
  if (!section.next) return true;
  return Boolean(element.compareDocumentPosition(section.next) & Node.DOCUMENT_POSITION_FOLLOWING);
}
