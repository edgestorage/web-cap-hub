# producthunt.com Web Cap Scripts

## Description

Reusable scripts for reading visible Product Hunt product listings.

## Scripts

### read-visible-products.js

- Description: Reads visible product cards from the current Product Hunt page.
- Pages: Product Hunt homepage, topic pages, search pages, and list pages.
- Input: `limit` optional maximum number of products; `waitMs` optional delay before reading.
- Output: `ok`, `url`, `title`, `count`, and `products` with name, tagline, votes, comments, and URL.
- State: Requires the Product Hunt page to be open and loaded.
