# x.com Web Cap Scripts

## Description

Reusable scripts for reading visible X feed posts.

## Scripts

### read-visible-posts.js

- Description: Reads visible posts from the current X feed page.
- Pages: X home, profile, search, and timeline pages.
- Input: `limit` optional maximum number of visible posts; `waitMs` optional delay before reading.
- Output: `ok`, `url`, `title`, `count`, and `posts` with author, text, time, URL, and visible metrics.
- State: Requires X to be open and logged in when viewing authenticated feeds.

### like-visible-posts.js

- Description: Likes visible X posts by one-based feed index.
- Pages: X home, profile, search, and timeline pages.
- Input: `indexes` optional list of one-based visible post indexes; `waitMs` optional delay before acting.
- Output: `ok`, `count`, and `results` with per-post like status.
- State: Requires X to be open and logged in. Clicks the visible Like button for target posts when not already liked.
