# stackoverflow.com Web Cap Scripts

## Description

Reusable read-only Web Cap scripts for Stack Overflow.

## Scripts

### read-questions.js

- Description: Reads question summaries from Stack Overflow question list pages.
- Pages: `/questions` and `/questions/tagged/<tag>`.
- Input: `limit`; optional `tab` (`newest`, `active`, `bountied`, `bounties`, `unanswered`, `votes`, `frequent`, `week`, `month`); optional `tag`.
- Output: `ok`, `url`, `title`, `count`, and `questions[]` with id, title, href, excerpt, tags, votes, answers, views, user, and asked.

### search-questions.js

- Description: Opens Stack Overflow search and reads visible question summaries.
- Pages: `/search?q=<query>`.
- Input: required `query`; optional `limit`.
- Output: `ok`, `query`, `url`, `title`, `count`, and `questions[]`.

### read-question-detail.js

- Description: Reads a Stack Overflow question page with visible answers and comments.
- Pages: `/questions/<id>/<slug>`.
- Input: optional `questionId` or `questionUrl`; optional `answerLimit`, `commentLimit`, and `textLimit`.
- Output: `ok`, `url`, `title`, `question`, `answerCount`, `replyCount`, `answers[]`, and `replies[]`.

### read-tags.js

- Description: Reads tag cards from Stack Overflow tags pages.
- Pages: `/tags`.
- Input: `limit`; optional `tab` (`popular`, `name`, `new`).
- Output: `ok`, `url`, `title`, `count`, and `tags[]`.

## Notes

Stack Overflow may occasionally show Cloudflare or human verification pages. These scripts detect that state and return `ok: false` with `blocked: true` instead of reporting empty data.

## Examples

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/stackoverflow.com/read-questions.js --input '{"tab":"newest","limit":20}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/stackoverflow.com/read-questions.js --input '{"tag":"javascript","tab":"newest","limit":20}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/stackoverflow.com/search-questions.js --input '{"query":"react useeffect","limit":10}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/stackoverflow.com/read-question-detail.js --input '{"questionId":79954726,"answerLimit":5}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/stackoverflow.com/read-tags.js --input '{"tab":"popular","limit":20}'
```
