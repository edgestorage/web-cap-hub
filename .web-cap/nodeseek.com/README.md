# nodeseek.com Web Cap Scripts

Reusable Web Cap scripts for reading and operating on NodeSeek pages.

## Scripts

### fetch-posts.js

- Description: Reads post links from a NodeSeek list page by page number.
- Pages: `https://www.nodeseek.com/`, `https://www.nodeseek.com/page-*`
- Input: `page` optional page number, default 1; `limit` optional maximum posts; `includeContext` optional compact surrounding row text.
- Output: `ok`, `url`, `title`, `page`, `postCount`, and `posts` with `id`, `title`, `href`, and optional `context`.
- State: None.

### fetch-page-range.js

- Description: Fetches post links from a range of NodeSeek list pages without navigating the visible tab for each page.
- Pages: Any same-origin NodeSeek page.
- Input: `startPage` required positive integer; `count` optional number of pages, 1-20; `limitPerPage` optional maximum posts per page; `includeContext` optional compact row text.
- Output: `ok`, `startPage`, `count`, `totalPostCount`, and `pages[]` with per-page post lists.
- State: None.

### read-post.js

- Description: Reads a NodeSeek post body and visible comments, either from `url` or the current post page.
- Pages: `https://www.nodeseek.com/post-*`
- Input: `url` optional post URL, including comment pages like `/post-123-2`; `commentLimit` optional max comments; `bodyLimit` optional max body characters; `commentBodyLimit` optional max characters per comment; `allPages` optional boolean, default `true`, to fetch detected comment pages; `commentPageStart` and `commentPageEnd` optional inclusive comment page range; `maxPages` optional cap on comment pages read. `pageStart`/`pageEnd` are accepted aliases for `commentPageStart`/`commentPageEnd`.
- Output: `ok`, canonical `url`, `currentUrl`, `title`, `author`, `body`, `commentCount`, `pagesRead`, `pageNumbersRead`, and `comments`.
- State: Navigates to `url` when provided; with `allPages: true`, navigates to the first page of that post before fetching detected comment pages; otherwise requires a NodeSeek post page to be open.

### read-posts-batch.js

- Description: Sequentially opens and reads multiple NodeSeek posts with optional comments.
- Pages: NodeSeek post pages, started from any NodeSeek page.
- Input: `urls` required post URLs; `commentLimit`, `bodyLimit`, and `commentBodyLimit` optional limits.
- Output: `ok`, `done`, `count`, and `posts[]`.
- State: Navigates the current tab through each target post URL.

### daily-check-in.js

- Description: Performs NodeSeek daily check-in via the visible UI and closes the confirmation dialog when present.
- Pages: `https://www.nodeseek.com/`, `https://www.nodeseek.com/board`
- Input: None for normal use. `ready` is an internal workflow flag.
- Output: `ok`, `alreadySignedIn`, `buttonClicked`, `result`, `message`, and `url` depending on the state.
- State: Requires a logged-in NodeSeek session. Navigates the current tab to `/board`.

## Recommended Workflows

Read the current homepage:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/nodeseek.com/fetch-posts.js --input '{"page":1,"includeContext":true}'
```

Read a page range:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/nodeseek.com/fetch-page-range.js --input '{"startPage":1,"count":3,"limitPerPage":20}'
```

Read a single post:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/nodeseek.com/read-post.js --input '{"url":"https://www.nodeseek.com/post-123-1","commentLimit":30}'
```

Read multiple posts:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/nodeseek.com/read-posts-batch.js --input '{"urls":["https://www.nodeseek.com/post-123-1"],"commentLimit":10}'
```
