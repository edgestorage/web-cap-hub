# tiktok.com Web Cap Scripts

## Description

Reusable Web Cap scripts for reading visible TikTok web pages.

## Scripts

### read-current-video.js

- Description: Read the TikTok video item currently closest to the viewport center.
- Pages: `https://www.tiktok.com/*`, `https://www.tiktok.com/@:handle/video/:videoId`
- Input:
  - `waitMs` (number, optional) — delay before reading, default 500
- Output: `video` with `author`, `authorUrl`, `description`, `hashtags`, `music`, `musicUrl`, `videoUrl`, `metrics`, and `rect`
- State: None

### read-visible-videos.js

- Description: Read visible videos from the current TikTok page.
- Pages: `https://www.tiktok.com/`, `https://www.tiktok.com/foryou`, `https://www.tiktok.com/explore`, `https://www.tiktok.com/following`, `https://www.tiktok.com/@:handle`, `https://www.tiktok.com/tag/:tag`, `https://www.tiktok.com/music/*`
- Input:
  - `limit` (number, optional) — max videos to return, default 20
  - `waitMs` (number, optional) — delay before reading, default 1000
  - `includeDiagnostics` (boolean, optional) — include selector diagnostics, default false
  - `includeRects` (boolean, optional) — include viewport rectangles, default false
- Output: `count`, `videos[]` with `author`, `authorUrl`, `description`, `hashtags`, `music`, `musicUrl`, `videoUrl`, and `metrics`
- State: None; logged-in pages may expose more feed items.

### read-visible-comments.js

- Description: Read visible comments from the current TikTok video page or comment panel.
- Pages: `https://www.tiktok.com/*`, `https://www.tiktok.com/@:handle/video/:videoId`
- Input:
  - `limit` (number, optional) — max comments to return, default 50
  - `waitMs` (number, optional) — delay before reading, default 800
- Output: `count`, `comments[]` with `author`, `authorUrl`, `text`, `likes`, and `time`
- State: A video detail page or comment panel must be visible.

### search-videos.js

- Description: Search TikTok videos and read visible search results.
- Pages: `https://www.tiktok.com/search*`, `https://www.tiktok.com/*`
- Input:
  - `query` (string, required) — search query
  - `limit` (number, optional) — max results to return, default 20
  - `waitMs` (number, optional) — delay before reading, default 1200
- Output: `query`, `count`, `videos[]` with `author`, `authorUrl`, `description`, `videoUrl`, `thumbnailUrl`, and visible count metrics
- State: None; the script navigates to the TikTok search results page.

### navigate-feed.js

- Description: Move to the next or previous TikTok feed video and optionally read the visible videos after navigation.
- Pages: `https://www.tiktok.com/*`, `https://www.tiktok.com/`
- Input:
  - `direction` (string, optional) — `next`, `previous`, `down`, or `up`, default `next`
  - `count` (number, optional) — number of navigation steps, default 1
  - `waitMs` (number, optional) — maximum delay after each step, default 1200
  - `readAfter` (boolean, optional) — read visible videos after moving, default true
- Output: `direction`, `requestedSteps`, `completedSteps`, `moved`, `before`, `after`, and optionally `count`, `videos[]`
- State: None; changes only the current page scroll/feed position.
