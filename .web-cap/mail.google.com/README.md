# mail.google.com Web Cap Scripts

## Description

Reusable scripts for reading visible Gmail page data.

## Scripts

### read-visible-emails.js

- Description: Reads visible rows from the current Gmail message list.
- Pages: Gmail inbox, labels, searches, and other message-list views.
- Input: `limit` optional maximum number of visible emails; `waitMs` optional delay before reading.
- Output: `ok`, `url`, `title`, `count`, and `emails` with sender, subject, snippet, time, unread, starred, and link when visible.
- State: Requires Gmail to be open and logged in.

### delete-visible-emails.js

- Description: Deletes visible Gmail messages matching sender, subject, or snippet keywords.
- Pages: Gmail inbox, labels, searches, and other message-list views.
- Input: `keywords` required list of match keywords; `dryRun` optional preview mode, default true; `limit` optional maximum matches.
- Output: `ok`, `matchedCount`, `matches`, and `deleted`.
- State: Requires Gmail to be open and logged in. Moves selected matching messages to Trash via the visible Gmail UI.

### send-email.js

- Description: Composes and sends a plain text email in Gmail.
- Pages: Gmail pages.
- Input: `to`, `subject`, and `body`.
- Output: `ok`, recipient, subject, and body length.
- State: Requires Gmail to be open and logged in. Sends an email via the visible Gmail UI.
