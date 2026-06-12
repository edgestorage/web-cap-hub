# bilibili.com Web Cap Scripts

## Description

Reusable Web Cap scripts for Bilibili (哔哩哔哩), the Chinese video sharing platform.

## Scripts

### read-homepage-videos.js

- Description: Read the recommended video list from bilibili.com homepage.
- Pages: `https://www.bilibili.com/`
- Input:
  - `limit` (number, optional) — max videos to return, default 20
  - `includeAds` (boolean, optional) — include ad cards, default false
- Output: `count`, `videos[]` with `title`, `author`, `views`, `danmaku`, `duration`, `link`
- State: None

### refresh-homepage.js

- Description: Click the "换一换" (refresh) button to get new recommendations, optionally read the refreshed list.
- Pages: `https://www.bilibili.com/`
- Input:
  - `readAfterRefresh` (boolean, optional) — also read videos after refresh, default false
  - `limit` (number, optional) — max videos to return when readAfterRefresh is true, default 20
- Output: `ok`, `refreshed`, and optionally `count`, `videos[]`
- State: Must be on bilibili homepage

### read-space-videos.js

- Description: Read the video list from a UP主 space page with full stats (views, danmaku, duration, date).
- Pages: `https://space.bilibili.com/:uid/video`, `https://space.bilibili.com/:uid/upload/video`
- Input:
  - `uid` (string, optional) — Bilibili user UID; if omitted, reads from current page
  - `limit` (number, optional) — max videos to return, default 20
- Output: `count`, `videos[]` with `title`, `views`, `danmaku`, `duration`, `date`, `link`
- State: None

### like-current-video.js

- Description: Like or unlike the currently playing video.
- Pages: `https://www.bilibili.com/video/*`
- Input:
  - `action` (string, optional) — `"like"` (default), `"unlike"`, or `"toggle"`
- Output: `ok`, `action`, `before`, `after`, `sideEffects`
- State: Must be on a video playback page

### like-and-coin-current-video.js

- Description: Coin the currently playing video, optionally like it via the dialog checkbox.
- Pages: `https://www.bilibili.com/video/*`
- Input:
  - `coinCount` (number, optional) — number of coins to give (1 or 2), default 1
  - `alsoLike` (boolean, optional) — also like via dialog checkbox, default true
- Output: `ok`, `before`, `after`
- State: Must be on a video playback page, logged in recommended

### read-video-danmaku.js

- Description: Fetch all danmaku (弹幕) for a bilibili video via API.
- Pages: `https://www.bilibili.com/video/*`
- Input:
  - `bvid` (string, optional) — video BV ID; if omitted, extracts from current page URL
  - `limit` (number, optional) — max danmaku to return, default 50
- Output: `aid`, `cid`, `title`, `danmakuCount`, `danmakus[]`
- State: None

### read-video-comments.js

- Description: Fetch top-level comments for a bilibili video via the public reply API.
- Pages: `https://www.bilibili.com/video/*`
- Input:
  - `bvid` (string, optional) — video BV ID
  - `url` (string, optional) — video URL used to extract BV ID
  - `limit` (number, optional) — max comments to return, default 100
- Output: `aid`, `bvid`, `title`, `commentCount`, `count`, `comments[]` with `user`, `message`, `like`, `time`
- State: None
