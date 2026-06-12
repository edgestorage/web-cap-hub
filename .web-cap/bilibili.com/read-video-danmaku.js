/**
 * web-cap script
 *
 * @description Fetch all danmaku (弹幕) for the current bilibili video via API.
 * @param {object} [input]
 * @param {string} [input.bvid] Video BV ID. If omitted, extracts from current page URL.
 * @param {number} [input.limit] Maximum number of danmaku to return (default 50).
 * @returns {{ ok: boolean, aid: number, cid: number, title: string, danmakuCount: number, danmakus: string[] }}
 * @match https://www.bilibili.com/video/*
 */
export default async function (input = {}) {
  const limit = input.limit ?? 50;

  // 从 URL 或 input 获取 bvid
  const bvid = input.bvid || location.pathname.match(/\/(BV\w+)/)?.[1] || '';
  if (!bvid) return { ok: false, error: 'No bvid found' };

  // 获取视频信息（aid, cid）
  const infoRes = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
  const info = await infoRes.json();
  if (info.code !== 0) return { ok: false, error: 'Failed to get video info', detail: info };

  const { aid, cid, title } = info.data;

  // 获取弹幕 XML
  const dmRes = await fetch(`https://comment.bilibili.com/${cid}.xml`);
  const dmText = await dmRes.text();

  // 解析弹幕文本
  const danmakus = [];
  const regex = /<d [^>]*>([^<]+)<\/d>/g;
  let match;
  while ((match = regex.exec(dmText)) !== null) {
    danmakus.push(match[1]);
  }

  return {
    ok: true,
    aid,
    cid,
    title,
    bvid,
    danmakuCount: danmakus.length,
    danmakus: danmakus.slice(0, limit)
  };
}
