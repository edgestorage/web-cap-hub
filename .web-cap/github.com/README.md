# github.com Web Cap Scripts

Reusable Web Cap scripts for reading and carefully operating on GitHub pages.

Most scripts are read-only. `star-repository.js` and `watch-repository.js` only change account state when `confirm: true` is explicitly passed.

## Scripts

### read-dashboard-feed.js

- Description: Reads the GitHub dashboard feed, top repositories, and trending repositories from the current homepage.
- Pages: `https://github.com/`
- Input: `limit` optional max feed items, default 30; `repositoryLimit` optional max top repositories, default 20; `trendingLimit` optional max trending repositories, default 10.
- Output: `ok`, `url`, `title`, `feed`, `topRepositories`, and `trendingRepositories`.

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/github.com/read-dashboard-feed.js --input '{"limit":20}'
```

### read-repository-summary.js

- Description: Reads repository metadata and README text.
- Pages: Any GitHub repository page.
- Input: `url` optional repository URL, or `owner` and `repo`; `readmeLimit` optional max README characters, default 3000.
- Output: `ok`, `url`, `title`, and `repository` with description, stats, latest release, topics, languages, and README excerpt.

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/github.com/read-repository-summary.js --input '{"owner":"edgestorage","repo":"web-cap"}'
```

### read-repository-releases.js

- Description: Reads repository releases.
- Pages: Any GitHub repository or releases page.
- Input: `url` optional repository or releases URL, or `owner` and `repo`; `limit` optional max releases, default 20; `bodyLimit` optional max release-note characters per release, default 1200.
- Output: `ok`, `url`, `title`, `count`, and `releases`.

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/github.com/read-repository-releases.js --input '{"owner":"edgestorage","repo":"web-cap","limit":5}'
```

### read-repository-issues.js

- Description: Reads repository issues.
- Input: `url`, or `owner` and `repo`; `state` optional `open`, `closed`, or `all`; `limit` optional.
- Output: `ok`, `url`, `title`, `count`, and `issues`.

### read-repository-prs.js

- Description: Reads repository pull requests.
- Input: `url`, or `owner` and `repo`; `state` optional `open`, `closed`, or `all`; `limit` optional.
- Output: `ok`, `url`, `title`, `count`, and `pullRequests`.

### read-notifications.js

- Description: Reads GitHub notifications.
- Pages: `https://github.com/notifications*`
- Input: `limit` optional; `unreadOnly` optional boolean.
- Output: `ok`, `url`, `title`, `count`, and `notifications`.

### search-github-repositories.js

- Description: Searches GitHub repositories.
- Pages: `https://github.com/search*`
- Input: `query` required; `limit` optional max repositories, default 20; `sort` optional GitHub search sort such as `stars`, `forks`, or `updated`; `order` optional `asc` or `desc`.
- Output: `ok`, `url`, `title`, `query`, `count`, and `repositories`.

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/github.com/search-github-repositories.js --input '{"query":"browser automation cli","sort":"stars","limit":10}'
```

### search-github-code.js

- Description: Searches GitHub code.
- Input: `query` required; `limit` optional.
- Output: `ok`, `url`, `title`, `query`, `count`, and `results`.

### search-github-issues.js

- Description: Searches GitHub issues or pull requests.
- Input: `query` required; `type` optional `issues` or `pulls`; `limit`, `sort`, and `order` optional.
- Output: `ok`, `url`, `title`, `query`, `count`, and `items`.

### star-repository.js

- Description: Previews or toggles repository star state through the visible UI.
- Input: `url`, or `owner` and `repo`; `star` optional desired boolean, default true; `confirm` must be true to click.
- Output: `ok`, `repository`, current/desired state, action, and `executed`.
- Notes: Uses GitHub's current `aria-label` values such as `Star this repository` and `click to unstar` so it can recover after toggling. Verified by toggling `edgestorage/web-cap` off and back on.

Preview only:

```bash
web-cap script-execute --tab-id <tab-id> --script-file .web-cap/github.com/star-repository.js --input '{"owner":"edgestorage","repo":"web-cap","star":true}'
```

### watch-repository.js

- Description: Previews or changes repository notification level through the visible UI.
- Input: `url`, or `owner` and `repo`; `level` optional `watching`, `not_watching`, `releases`, `ignoring`, or `custom`; `confirm` must be true to click.
- Output: `ok`, `repository`, current/desired state, and `executed`.
- Notes: GitHub's current UI maps `watching` to `All Activity`, `not_watching` to `Participating and @mentions`, and `ignoring` to `Ignore`. Verified by switching `edgestorage/web-cap` to `watching` and then restoring it to `not_watching`.

### fork-repository-preview.js

- Description: Opens the fork flow by fetch and returns available fork options without creating a fork.
- Input: `url`, or `owner` and `repo`.
- Output: `ok`, `repository`, `options`, and `message`.

### read-my-recent-repos.js

- Description: Reads repositories visible on the dashboard sidebar and recent contexts.
- Pages: `https://github.com/`
- Input: `limit` optional.
- Output: `ok`, `url`, `title`, `count`, and `repositories`.

### read-repo-activity.js

- Description: Reads repository activity page.
- Input: `url`, or `owner` and `repo`; `limit` optional.
- Output: `ok`, `url`, `title`, `count`, and `activity`.

### read-repo-security-alerts.js

- Description: Reads repository security overview links when available to the current session.
- Input: `url`, or `owner` and `repo`.
- Output: `ok`, `url`, `title`, `accessible`, `alerts`, and optional `message`.
