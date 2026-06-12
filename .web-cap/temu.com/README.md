# temu.com Web Cap Scripts

## Description

Reusable read-only Web Cap scripts for Temu pages. These scripts avoid cart, checkout, login, and account state changes.

## Scripts

### read-visible-products.js

- Description: Reads visible product links from home, search, category, or recommendation sections.
- Pages: Temu pages containing product links such as `-g-<id>.html`.
- Input: `limit`, `textLimit`.
- Output: `ok`, `url`, `title`, `count`, and `products[]` with `goodsId`, `title`, `price`, `image`, and `href`.

### read-categories.js

- Description: Reads visible category, filter, or channel entries from the current page.
- Pages: Temu home, channel, and search result pages.
- Input: `limit`.
- Output: `ok`, `url`, `title`, `count`, and `categories[]` with `name`, `href`, and `selected`.

### search-products.js

- Description: Opens a Temu search page and reads visible product links.
- Pages: Any Temu page.
- Input: required `query`; optional `limit`, `waitMs`, and `scroll`.
- Output: `ok`, `url`, `title`, `query`, `count`, `products[]`, and optional `warning`.
- Note: The script uses `cap.goto` for controlled search navigation. Temu search pages may keep loading even after results are visible, so navigation can be slower than ordinary pages.

### read-product-detail.js

- Description: Reads the current product detail page and visible recommendation products.
- Pages: Temu product detail pages with `-g-<id>.html` URLs.
- Input: `recommendationLimit`.
- Output: `ok`, `url`, `title`, `product`, and `recommendations[]`.
- Note: Some Temu price widgets may not expose plain text in the DOM in every locale/session; `price` is best-effort.

## Examples

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/temu.com/read-visible-products.js --input '{"limit":20}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/temu.com/read-categories.js --input '{"limit":40}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/temu.com/search-products.js --input '{"query":"bluetooth earbuds","limit":20}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/temu.com/read-product-detail.js --input '{"recommendationLimit":10}'
```
