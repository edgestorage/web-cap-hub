# xiaohongshu.com Web Cap Scripts

## Description

Reusable read-only Web Cap scripts for Xiaohongshu note pages and feed cards.

## Scripts

### read-feed-notes.js

- Description: Reads visible Xiaohongshu feed cards and returns note IDs, titles, authors, metrics, hrefs, cover images, and card positions.
- Pages: `https://www.xiaohongshu.com/explore` and feed-style `https://www.xiaohongshu.com/explore/*` pages.
- Input: `limit`, `openExplore`, `waitMs`.
- Output: `ok`, `url`, `title`, `count`, and `notes[]` with `noteId`, `title`, `author`, `metric`, `href`, `coverImage`, and `rect`.
- State: Requires a loaded Xiaohongshu feed. Use `{"openExplore":true}` to navigate to the explore feed first.

### read-note-by-id.js

- Description: Opens a Xiaohongshu note by clicking a visible feed card matching `noteId`, then reads title, author, body text, tags, main image URL, image candidates, publish text, and raw stats.
- Pages: Xiaohongshu feed pages with visible cards, or an already-open note detail that matches `noteId`.
- Input: required `noteId`; optional `bodyLimit`, `waitMs`, `readIfAlreadyOpen`, `closeBeforeClick`, `coverImage`.
- Output: `ok`, `url`, `title`, and `note` with `noteId`, `title`, `author`, `body`, `tags`, `mainImage`, `mediaType`, `images`, `videos`, `publishedAt`, `stats`, and `feedCard`. `stats` only contains numeric fields: `likeCountNumber`, `collectCountNumber`, and `commentCountNumber`.
- State: Requires the target note card to be visible in the current Xiaohongshu feed, unless the matching note is already open. This script intentionally clicks the card instead of navigating by URL because direct note URLs may trigger Xiaohongshu anti-abuse controls.
- Notes: For video notes, Xiaohongshu often renders the playable video as a blob without a poster URL. The script carries the feed card cover into `note.feedCard.coverImage` and uses it as `note.mainImage` when the detail page has no stable poster.

### close-current-note.js

- Description: Closes the currently open Xiaohongshu note detail overlay and returns to the existing feed without navigating to Explore.
- Pages: Xiaohongshu note detail overlays on feed pages.
- Input: `waitMs`.
- Output: `ok`, `url`, `title`, `closed`, `method`, and optional `error`.
- State: Use after reading a note detail when you want to preserve the current feed DOM for opening another note from the same cached `notes[]` list.

## Examples

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/xiaohongshu.com/read-feed-notes.js --input '{"openExplore":true,"limit":20}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/xiaohongshu.com/read-note-by-id.js --input '{"noteId":"6a1034f90000000006023586","bodyLimit":8000}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/xiaohongshu.com/read-note-by-id.js --input '{"noteId":"6a1034f90000000006023586","closeBeforeClick":true}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/xiaohongshu.com/close-current-note.js
```
