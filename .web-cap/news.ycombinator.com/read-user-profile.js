/**
 * web-cap script
 *
 * @description Read a Hacker News user profile page.
 * @param {object} [input]
 * @param {string} [input.user] Optional username to open before reading.
 * @param {string} [input.step] Internal continuation step.
 * @returns {{ ok: boolean, url: string, title: string, profile: object }}
 * @match https://news.ycombinator.com/*
 */
export default async function (input = {}) {
  if (input.user && input.step !== 'read') {
    const url = new URL('/user', location.origin);
    url.searchParams.set('id', input.user);
    return cap.goto(url.href, { ...input, step: 'read' });
  }

  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const absoluteUrl = (href) => {
    if (!href) return '';
    try {
      const url = new URL(href, location.origin);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };
  const rows = [...document.querySelectorAll('tr')];
  const fields = {};
  for (const row of rows) {
    const cells = [...row.querySelectorAll('td')].map((td) => normalize(td.textContent));
    if (cells.length >= 2 && cells[0]) fields[cells[0].replace(/:$/, '')] = cells[1];
  }
  const user = fields.user || new URLSearchParams(location.search).get('id') || '';
  const linkByHref = (href) => [...document.querySelectorAll('a[href]')]
    .find((link) => link.getAttribute('href') === href);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    profile: {
      user,
      created: fields.created || '',
      karma: fields.karma || '',
      about: fields.about || '',
      submissionsHref: absoluteUrl(linkByHref(`submitted?id=${user}`)?.getAttribute('href')),
      commentsHref: absoluteUrl(linkByHref(`threads?id=${user}`)?.getAttribute('href')),
      favoritesHref: absoluteUrl(linkByHref(`favorites?id=${user}`)?.getAttribute('href'))
    }
  };
}
