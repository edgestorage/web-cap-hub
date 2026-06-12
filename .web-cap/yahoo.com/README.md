# yahoo.com Web Cap Scripts

## Description

Reusable read-only Web Cap scripts for Yahoo pages. The scripts use Yahoo page structures shared across regional Yahoo sites; this pass was tested on Yahoo UK pages.

## Scripts

### read-homepage-stories.js

- Description: Reads visible Yahoo homepage story cards and navigation links.
- Pages: Yahoo front pages such as `https://www.yahoo.com/`, `https://uk.yahoo.com/`, and other regional Yahoo front pages.
- Input: `limit`, `navLimit`.
- Output: `ok`, `url`, `title`, `count`, `stories[]`, and `nav[]`.

### read-trending-searches.js

- Description: Reads visible trending search links from Yahoo pages.
- Pages: Yahoo front pages that show trending searches.
- Input: `limit`; optional `visibleOnly:true` to include only currently visible trend links.
- Output: `ok`, `url`, `title`, `count`, and `trends[]` with rank, query, text, and href.

### read-article.js

- Description: Reads the current Yahoo article.
- Pages: Yahoo News, Finance News, Style, Sports, and other article pages.
- Input: `bodyLimit`, `linkLimit`.
- Output: `ok`, `url`, `title`, and `article` with headline, description, source, author, dates, body, images, and links.

### read-finance-quotes.js

- Description: Reads visible Yahoo Finance quote tiles or rows.
- Pages: Yahoo Finance pages and front pages with market widgets.
- Input: `limit`; optional `openFinance:true` to open a matching Yahoo Finance page. From UK Yahoo it opens `https://uk.finance.yahoo.com/`; otherwise it defaults to `https://finance.yahoo.com/`.
- Output: `ok`, `url`, `title`, `count`, and `quotes[]` with symbol, name, price, change, percentChange, href, and raw text.

## Notes

Yahoo Search showed a browser error page in this browser session, so no reusable search-result script was added in this pass.

## Examples

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/yahoo.com/read-homepage-stories.js --input '{"limit":20}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/yahoo.com/read-trending-searches.js --input '{"limit":10}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/yahoo.com/read-article.js --input '{"bodyLimit":3000}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/yahoo.com/read-finance-quotes.js --input '{"openFinance":true,"limit":10}'
```
