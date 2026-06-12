/**
 * web-cap script
 *
 * @description Read subscribed Reddit communities for the signed-in account.
 * @param {object} [input]
 * @param {number} [input.limit=100] Maximum communities to return per page.
 * @param {string} [input.after] Optional pagination cursor from a previous result.
 * @returns {{ ok: boolean, url: string, title: string, count: number, after: string|null, communities: Array<object> }}
 * @match https://www.reddit.com/*, https://old.reddit.com/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 100), 100));
  const after = typeof input.after === 'string' ? input.after : '';
  const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const endpoint = new URL('/subreddits/mine/subscriber.json', location.origin);

  endpoint.searchParams.set('limit', String(limit));
  endpoint.searchParams.set('raw_json', '1');
  if (after) {
    endpoint.searchParams.set('after', after);
  }

  const response = await fetch(endpoint.href, {
    credentials: 'include',
    headers: { accept: 'application/json' }
  });

  if (!response.ok) {
    return {
      ok: false,
      url: location.href,
      title: document.title,
      status: response.status,
      error: await response.text().then((text) => text.slice(0, 500)).catch(() => '')
    };
  }

  const payload = await response.json();
  const communities = (payload?.data?.children || [])
    .map((child) => child.data || {})
    .map((data) => ({
      name: data.display_name_prefixed || (data.display_name ? `r/${data.display_name}` : ''),
      title: data.title || '',
      subscribers: data.subscribers ?? null,
      publicDescription: normalize(data.public_description).slice(0, 500),
      over18: Boolean(data.over18),
      url: data.url ? new URL(data.url, location.origin).href : ''
    }))
    .filter((community) => community.name);

  return {
    ok: true,
    url: location.href,
    title: document.title,
    count: communities.length,
    after: payload?.data?.after || null,
    communities
  };
}
