# wikipedia.org Web Cap Scripts

## Description

Reusable read-only Web Cap scripts for Wikipedia article discovery, extraction, references, media, revision history, categories, related pages, current events, and metadata.

## Scripts

### search-articles.js

- Description: Searches Wikipedia and reads visible article result summaries.
- Pages: `https://*.wikipedia.org/w/index.php?search=*`.
- Input: `query`; optional `language`, `limit`.
- Output: `ok`, `query`, `language`, `url`, `title`, `count`, `suggestion`, `suggestionHref`, and `results[]` with title, href, snippet, and metadata.
- State: none.

### read-article.js

- Description: Reads a Wikipedia article's title, lead text, sections, infobox, categories, last-modified text, and selected internal links.
- Pages: `https://*.wikipedia.org/wiki/*`.
- Input: optional `title` or `url` to navigate first; optional `language`, `leadLimit`, `sectionLimit`, `sectionTextLimit`, `linkLimit`.
- Output: `ok`, `url`, `title`, and `article` with pageTitle, language, canonicalUrl, description, disambiguation, lead, infobox, sections, categories, links, and lastModified.
- State: none.

### read-article-references.js

- Description: Reads references and citation links from an article.
- Pages: `https://*.wikipedia.org/wiki/*`.
- Input: optional `title` or `url`; optional `language`, `limit`, `textLimit`.
- Output: `ok`, `url`, `title`, `pageTitle`, `count`, and `references[]` with id, text, doi, archiveHref, and links.
- State: none.

### read-article-media.js

- Description: Reads images and media captions from an article.
- Pages: `https://*.wikipedia.org/wiki/*`.
- Input: optional `title` or `url`; optional `language`, `limit`.
- Output: `ok`, `url`, `title`, `pageTitle`, `count`, and `media[]` with alt, caption, thumbSrc, originalSrc, filePageHref, width, and height.
- State: none.

### read-table-of-contents.js

- Description: Reads article headings as a compact table of contents.
- Pages: `https://*.wikipedia.org/wiki/*`.
- Input: optional `title` or `url`; optional `language`, `limit`.
- Output: `ok`, `url`, `title`, `pageTitle`, `count`, and `sections[]` with level, title, id, and href.
- State: none.

### read-language-links.js

- Description: Reads available language versions for an article.
- Pages: `https://*.wikipedia.org/wiki/*`.
- Input: optional `title` or `url`; optional `language`, `limit`.
- Output: `ok`, `url`, `title`, `pageTitle`, `count`, and `languages[]` with code, name, localName, and href.
- State: none.

### read-external-links.js

- Description: Reads and classifies external links from an article.
- Pages: `https://*.wikipedia.org/wiki/*`.
- Input: optional `title` or `url`; optional `language`, `limit`, `includeReferences`.
- Output: `ok`, `url`, `title`, `pageTitle`, `count`, and `links[]` with text, href, type, and section.
- State: none.

### read-navboxes.js

- Description: Reads bottom navbox templates and related article links.
- Pages: `https://*.wikipedia.org/wiki/*`.
- Input: optional `title` or `url`; optional `language`, `limit`, `linkLimit`.
- Output: `ok`, `url`, `title`, `pageTitle`, `count`, and `navboxes[]` with title, groups, and links.
- State: none.

### read-disambiguation-options.js

- Description: Reads candidate article options from a disambiguation page.
- Pages: `https://*.wikipedia.org/wiki/*` disambiguation pages.
- Input: optional `title` or `url`; optional `language`, `limit`.
- Output: `ok`, `url`, `title`, `pageTitle`, `disambiguation`, `count`, and `options[]` with title, href, and description.
- State: none.

### read-revision-history.js

- Description: Reads recent revision history for an article.
- Pages: `https://*.wikipedia.org/w/index.php?title=*&action=history`.
- Input: `title` or `url`; optional `language`, `limit`.
- Output: `ok`, `url`, `title`, `count`, and `revisions[]` with revisionId, date, user, size, delta, comment, minor, diffHref, and oldHref.
- State: none.

### read-what-links-here.js

- Description: Reads pages that link to an article.
- Pages: `https://*.wikipedia.org/wiki/Special:WhatLinksHere/*`.
- Input: `title` or `url`; optional `language`, `limit`.
- Output: `ok`, `url`, `title`, `count`, and `links[]` with title, href, redirect, transclusion, and text.
- State: none.

### read-category-members.js

- Description: Reads subcategories, pages, and files from a category page.
- Pages: `https://*.wikipedia.org/wiki/Category:*`.
- Input: `category` or `url`; optional `language`, `limit`.
- Output: `ok`, `url`, `title`, and `category` with name, description, counts, subcategories, pages, files, and nextHref.
- State: none.

### read-random-article.js

- Description: Opens a random article and reads a compact summary.
- Pages: `https://*.wikipedia.org/wiki/Special:Random`, then a random article.
- Input: optional `language`, `leadLimit`.
- Output: `ok`, `url`, `title`, and `article` with pageTitle, language, lead, and canonicalUrl.
- State: none.

### read-current-events.js

- Description: Reads visible event items from Wikipedia current events pages.
- Pages: `https://*.wikipedia.org/wiki/Portal:Current_events*`.
- Input: optional `url`, `language`, `limit`.
- Output: `ok`, `url`, `title`, `count`, and `events[]` with text and links.
- State: none.

### read-user-contributions.js

- Description: Reads a user's public contribution list.
- Pages: `https://*.wikipedia.org/wiki/Special:Contributions/*`.
- Input: `user` or `url`; optional `language`, `limit`.
- Output: `ok`, `url`, `title`, `count`, and `contributions[]` with date, pageTitle, pageHref, diffHref, comment, delta, and text.
- State: none.

### read-page-info.js

- Description: Reads page metadata, protection hints, canonical URL, last-modified text, and tool links.
- Pages: `https://*.wikipedia.org/wiki/*` or page info pages.
- Input: optional `title` or `url`; optional `language`.
- Output: `ok`, `url`, `title`, and `info` with pageTitle, language, canonicalUrl, description, lastModified, indicators, toolLinks, and pageInfoRows.
- State: none.

## Examples

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/wikipedia.org/search-articles.js --input '{"query":"Alan Turing","language":"en","limit":5}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/wikipedia.org/read-article.js --input '{"title":"Alan Turing","language":"en","sectionLimit":8}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/wikipedia.org/read-article-references.js --input '{"title":"Alan Turing","language":"en","limit":20}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/wikipedia.org/read-article-media.js --input '{"title":"Alan Turing","language":"en","limit":10}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/wikipedia.org/read-revision-history.js --input '{"title":"Alan Turing","language":"en","limit":10}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/wikipedia.org/read-category-members.js --input '{"category":"Category:Computer scientists","language":"en","limit":50}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/wikipedia.org/read-what-links-here.js --input '{"title":"Alan Turing","language":"en","limit":20}'
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/wikipedia.org/read-random-article.js --input '{"language":"en"}'
```
