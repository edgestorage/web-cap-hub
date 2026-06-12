# youtube.com Web Cap Scripts

## Description

Reusable scripts for reading visible YouTube page data.

## Scripts

### read-current-video-list.js

- Description: Reads the visible video cards from the current YouTube page.
- Pages: `https://www.youtube.com/`, feed pages, search results, and channel video tabs.
- Input: `limit` optional maximum number of videos; `waitMs` optional delay before reading.
- Output: `ok`, `url`, `title`, `count`, and `videos` with index, title, URL, channel, and metadata.
- State: Requires the target YouTube page to be open and loaded in the browser tab.

### read-video-comments.js

- Description: Opens a video by visible list index or explicit URL, scrolls to the comments, and reads visible comments.
- Pages: `https://www.youtube.com/`, feed pages, search results, and watch pages.
- Input: `videoIndex` optional one-based visible video index; `videoUrl` optional explicit video URL; `limit` optional maximum number of comments; `waitMs` optional delay after load.
- Output: `ok`, `url`, `title`, `sourceVideoUrl`, `sourceVideoIndex`, `commentCount`, `count`, and `comments` with author, time, likes, and content.
- State: Requires a loaded YouTube page. The script navigates the current tab to the video page.

### read-channel-videos.js

- Description: Opens a channel videos page from a watch page or explicit channel URL and reads visible videos.
- Pages: YouTube watch pages, channel home pages, and channel videos tabs.
- Input: `channelUrl` optional explicit channel URL; `limit` optional maximum number of videos; `waitMs` optional delay before reading.
- Output: `ok`, `url`, `title`, `channelName`, `count`, and `videos` with title, URL, and metadata.
- State: Requires a loaded YouTube watch or channel page. The script navigates the current tab to the channel videos page.

### like-videos.js

- Description: Likes YouTube videos by visible list indexes or explicit video URLs.
- Pages: YouTube list pages, channel videos tabs, and watch pages.
- Input: `videoIndexes` optional one-based visible video indexes; `videoUrls` optional explicit video URLs; `waitMs` optional delay after each video load.
- Output: `ok`, `count`, and `results` with per-video title, URL, status, and button state evidence.
- State: Requires the user to be signed in. The script navigates the current tab through each target video and clicks the visible Like button when it is not already liked.

### read-subscriptions.js

- Description: Reads visible subscribed channels from YouTube's subscriptions channel page.
- Pages: YouTube pages; the script navigates to `https://www.youtube.com/feed/channels`.
- Input: `limit` optional maximum number of channels; `scrolls` optional number of scrolls to load more; `waitMs` optional delay before reading.
- Output: `ok`, `url`, `title`, `count`, and `channels` with name, URL, subscriber text, and description when visible.
- State: Requires the user to be signed in. The script navigates the current tab to the subscriptions channel page.
