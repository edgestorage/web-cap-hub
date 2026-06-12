# zhihu.com Web Cap Scripts

## Description

Reusable read-only Web Cap scripts for Zhihu pages.

## Scripts

### read-feed-items.js

- Description: Reads visible feed, list, and search content cards from the current page.
- Pages: Zhihu home, follow, search, question lists, and similar card feeds.
- Input: `limit`, `textLimit`.
- Output: `ok`, `url`, `title`, `count`, and `items[]` with `type`, `title`, `href`, `author`, `authorHref`, `excerpt`, and `actions`.

### read-hot-list.js

- Description: Reads visible entries from Zhihu Hot.
- Pages: `https://www.zhihu.com/hot`.
- Input: `limit`; optional `openHot:true` to navigate to Hot first.
- Output: `ok`, `url`, `title`, `count`, and `items[]` with `rank`, `title`, `excerpt`, `metrics`, `href`, and `image`.

### search-content.js

- Description: Opens a Zhihu content search and reads visible results.
- Pages: `https://www.zhihu.com/search?...`.
- Input: required `query`; optional `limit`, `waitMs`, and `scroll`.
- Output: `ok`, `url`, `title`, `query`, `count`, and `results[]`.

### read-question-answers.js

- Description: Reads the current question header and visible answers.
- Pages: `https://www.zhihu.com/question/<id>`.
- Input: `limit`, `bodyLimit`.
- Output: `ok`, `url`, `title`, `question`, `count`, and `answers[]`.

### read-article.js

- Description: Reads the current Zhihu/Zhuanlan article.
- Pages: `https://zhuanlan.zhihu.com/p/<id>` and article pages rendered on `www.zhihu.com`.
- Input: `bodyLimit`, `linkLimit`.
- Output: `ok`, `url`, `title`, and `article` with title, author, meta, body, headings, and links.

## Examples

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/zhihu.com/read-feed-items.js --input '{"limit":10}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/zhihu.com/read-hot-list.js --input '{"openHot":true,"limit":20}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/zhihu.com/search-content.js --input '{"query":"web-cap","limit":10}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/zhihu.com/read-question-answers.js --input '{"limit":5,"bodyLimit":1200}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/zhihu.com/read-article.js --input '{"bodyLimit":3000}'
```
