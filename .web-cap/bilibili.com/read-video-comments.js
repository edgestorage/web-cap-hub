/**
 * web-cap script
 *
 * @description Read comments from a bilibili video via public reply API.
 * @param {object} input
 * @param {string} [input.bvid] Video BV ID. If omitted, extracts from current page URL.
 * @param {string} [input.url] Bilibili video URL. Used to extract BV ID when bvid is omitted.
 * @param {number} [input.limit] Maximum number of comments to return.
 * @returns {{ ok: boolean, bvid: string, aid: number, title: string, commentCount: number, comments: Array<{ index: number, user: string, message: string, like: number, time: string }> }}
 * @match https://www.bilibili.com/video/*
 */
export default async function (input = {}) {
  const limit = Math.max(1, Math.min(Number(input.limit ?? 100), 300));
  const source = input.bvid || input.url || location.href;
  const bvid = source.match(/BV[\w]+/)?.[0] || '';
  if (!bvid) return { ok: false, error: 'No bvid found', url: location.href };

  const viewRes = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`, {
    credentials: 'include'
  });
  const view = await viewRes.json();
  if (view.code !== 0) return { ok: false, error: 'Failed to get video info', detail: view };

  const aid = view.data.aid;
  const title = view.data.title;
  const comments = [];
  let pageNumber = 1;
  let total = 0;

  while (comments.length < limit && pageNumber <= 10) {
    const pageSize = Math.min(20, limit - comments.length);
    const replyRes = await fetch(`https://api.bilibili.com/x/v2/reply?type=1&oid=${aid}&pn=${pageNumber}&ps=${pageSize}&sort=2`, {
      credentials: 'include'
    });
    const reply = await replyRes.json();
    if (reply.code !== 0) return { ok: false, error: 'Failed to get comments', detail: reply, aid, bvid, title };

    total = reply.data?.page?.count ?? total;
    const replies = reply.data?.replies || [];
    if (replies.length === 0) break;

    for (const item of replies) {
      comments.push({
        index: comments.length + 1,
        user: item.member?.uname || '',
        message: item.content?.message || '',
        like: item.like || 0,
        time: item.ctime ? new Date(item.ctime * 1000).toISOString() : ''
      });
      if (comments.length >= limit) break;
    }
    pageNumber += 1;
  }

  return {
    ok: true,
    bvid,
    aid,
    title,
    commentCount: total,
    count: comments.length,
    comments
  };
}
