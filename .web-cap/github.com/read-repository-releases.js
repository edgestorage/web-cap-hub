/**
 * web-cap script
 *
 * @description Read GitHub repository releases.
 * @param {object} [input]
 * @param {string} [input.url] Repository or releases URL.
 * @param {string} [input.owner] Repository owner, used with repo.
 * @param {string} [input.repo] Repository name, used with owner.
 * @param {number} [input.limit=20] Maximum releases to return.
 * @param {number} [input.bodyLimit=1200] Maximum release note characters per release.
 * @returns {{ ok: boolean, url: string, title: string, count: number, releases: Array<object> }}
 * @match https://github.com/*
 */
export default async function (input = {}) {
  const limit = clampInteger(input.limit, 1, 100, 20);
  const bodyLimit = clampInteger(input.bodyLimit, 100, 5000, 1200);
  const releasesUrl = releasesUrlFromInput(input);
  if (!releasesUrl) {
    return {
      ok: false,
      error: 'Provide input.url or input.owner and input.repo, or run on a repository page.',
      url: location.href,
      title: document.title
    };
  }

  const html = await fetch(releasesUrl.href, { credentials: 'include' }).then((response) => response.text());
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const releaseSections = [
    ...doc.querySelectorAll('[data-view-component="true"].Box, .release, div[id^="release-"]')
  ];
  const releases = [];
  const seen = new Set();

  for (const section of releaseSections) {
    if (releases.length >= limit) break;
    const tagLink = section.querySelector('a[href*="/releases/tag/"]');
    if (!tagLink) continue;

    const href = new URL(tagLink.getAttribute('href'), location.origin).href;
    if (seen.has(href)) continue;
    seen.add(href);

    const titleLink = section.querySelector('a.Link--primary[href*="/releases/tag/"], h2 a[href*="/releases/tag/"], a[href*="/releases/tag/"]');
    const assetLinks = [...section.querySelectorAll('a[href]')]
      .map((link) => ({
        name: normalize(link.textContent),
        href: new URL(link.getAttribute('href'), location.origin).href
      }))
      .filter((asset) => asset.name && /\/releases\/download\//.test(new URL(asset.href).pathname));

    releases.push({
      name: normalize(titleLink?.textContent) || normalize(tagLink.textContent),
      tag: normalize(tagLink.textContent),
      href,
      date: normalize(section.querySelector('relative-time, time-ago, time')?.getAttribute('datetime') || section.querySelector('relative-time, time-ago, time')?.textContent),
      isLatest: /Latest/.test(section.textContent || ''),
      notes: cleanReleaseNotes(normalize(section.querySelector('.markdown-body, .Box-body')?.innerText)).slice(0, bodyLimit),
      assets: assetLinks
    });
  }

  return {
    ok: true,
    url: releasesUrl.href,
    title: doc.title,
    count: releases.length,
    releases
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

function releasesUrlFromInput(input) {
  if (input.owner && input.repo) {
    return new URL(`/${input.owner}/${input.repo}/releases`, location.origin);
  }

  const source = input.url ? new URL(input.url, location.origin) : new URL(location.href);
  if (source.origin !== location.origin) return null;
  const parts = source.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return new URL(`/${parts[0]}/${parts[1]}/releases`, location.origin);
}

function cleanReleaseNotes(value) {
  return normalize(value)
    .replace(/\bLatest\s+Latest\b/g, 'Latest')
    .replace(/Delete this release\?.*?Cancel\s+Delete this release\s*/g, '')
    .replace(/Edit:\s*\S+(?:\s+Delete:\s*\S+)?/g, '')
    .trim();
}
