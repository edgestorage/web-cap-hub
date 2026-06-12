# reddit.com Web Cap Scripts

## Description

Reusable Web Cap scripts for reading Reddit pages.

## Scripts

### read-visible-posts.js

- Description: Reads visible posts from the current Reddit feed, subreddit listing, or search-style listing page.
- Pages: `https://www.reddit.com/*`, `https://old.reddit.com/*`
- Input: `limit` optional maximum posts, default 12; `includeText` optional visible text samples; `includePromoted` optional ads/promoted posts; `textLimit` optional max characters per text sample.
- Output: `ok`, `url`, `title`, `postCount`, and `posts[]` with `title`, `href`, `subreddit`, `author`, `score`, `comments`, `promoted`, and optional `text`.
- State: Requires the Reddit page/feed to be loaded in the target browser tab. Does not click or change account state.

### read-post-comments.js

- Description: Reads comments for one or more Reddit posts using Reddit's public JSON representation.
- Pages: `https://www.reddit.com/*`, `https://old.reddit.com/*`
- Input: `urls` optional post URLs; when omitted, visible post URLs are inferred from the current page. `postLimit` optional max posts, default 10; `commentLimit` optional comments per post, default 10; `commentBodyLimit` optional max characters per comment; `includeReplies` optional nested replies.
- Output: `ok`, `url`, `title`, `count`, and `posts[]` with post metadata plus `comments[]`.
- State: Requires Reddit to be loaded in the target browser tab. Reads public comments only and does not change account state.

### read-subscribed-communities.js

- Description: Reads communities subscribed by the signed-in Reddit account.
- Pages: `https://www.reddit.com/*`, `https://old.reddit.com/*`
- Input: `limit` optional maximum communities per page, default 100; `after` optional pagination cursor.
- Output: `ok`, `url`, `title`, `count`, `after`, and `communities[]` with `name`, `title`, `subscribers`, `publicDescription`, `over18`, and `url`.
- State: Requires a signed-in Reddit session. Reads account subscription data only and does not change account state.

### read-explore-communities.js

- Description: Reads visible communities from Reddit Explore and groups them by visible section.
- Pages: `https://www.reddit.com/explore`, `https://www.reddit.com/explore/*`
- Input: `limit` optional maximum communities, default 80; `groupBySection` optional boolean, default true.
- Output: `ok`, `url`, `title`, `count`, `communities[]`, and optional `sections[]` with community cards grouped by Explore section.
- State: Requires Reddit Explore to be open in the target tab. Does not change account state.

Example:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/reddit.com/read-visible-posts.js --input '{"limit":10,"includeText":true}'
```

Read comments for visible posts:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/reddit.com/read-post-comments.js --input '{"postLimit":5,"commentLimit":10}'
```

Read subscribed communities:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/reddit.com/read-subscribed-communities.js --input '{"limit":100}'
```

Read Explore communities:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/reddit.com/read-explore-communities.js --input '{"limit":80}'
```
