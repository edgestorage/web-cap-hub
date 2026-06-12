# news.ycombinator.com Web Cap Scripts

## Description

Reusable read-only Web Cap scripts for Hacker News.

## Scripts

### read-stories.js

- Description: Reads HN story rows from a listing page.
- Pages: Front page, newest, past, ask, show, and jobs pages.
- Input: `limit`; optional `page` set to `news`, `newest`, `front`, `ask`, `show`, or `jobs` to navigate first via `cap.goto`.
- Output: `ok`, `url`, `title`, `count`, `stories[]`, and `moreHref`.

### read-item-comments.js

- Description: Reads an HN item page and visible comment tree.
- Pages: `https://news.ycombinator.com/item?id=<id>`.
- Input: optional `itemId` to navigate first via `cap.goto`; `limit`; `textLimit`.
- Output: `ok`, `url`, `title`, `item`, `count`, and `comments[]` with id, level, user, age, text, and replyHref.

### read-user-profile.js

- Description: Reads an HN user profile page.
- Pages: `https://news.ycombinator.com/user?id=<username>`.
- Input: optional `user` to navigate first via `cap.goto`.
- Output: `ok`, `url`, `title`, and `profile` with user, created, karma, about, submissionsHref, commentsHref, and favoritesHref.

## Examples

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/news.ycombinator.com/read-stories.js --input '{"page":"news","limit":30}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/news.ycombinator.com/read-item-comments.js --input '{"itemId":48463808,"limit":25}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/news.ycombinator.com/read-user-profile.js --input '{"user":"pg"}'
```
