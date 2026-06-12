# Web Cap Hub

[中文说明](./README.zh-CN.md)

[Web Cap](https://github.com/edgestorage/web-cap) reusable capability scripts shared by the community.

This repository is a script hub for Web Cap. It collects browser automation workflows that can be reused across agents and projects, such as reading page content, extracting structured data, and carefully operating on common websites through the visible browser UI.

## What This Repository Contains

Scripts live under `.web-cap/<domain>/`:

```text
.web-cap/
  github.com/
    README.md
    read-repository-summary.js
    search-github-repositories.js
  youtube.com/
    README.md
    read-video-comments.js
```

Each domain directory should include:

- One or more reusable Web Cap scripts.
- A `README.md` describing what each script does, where it can run, expected input, and returned output.

## Use With Web Cap

Install and connect Web Cap first. See the main [Web Cap README](https://github.com/edgestorage/web-cap) for CLI setup, browser extension setup, and script execution details.

After cloning this repository, run scripts with `web-cap script-execute`:

```bash
git clone https://github.com/edgestorage/web-cap-hub.git
cd web-cap-hub

web-cap session-status
web-cap script-execute \
  --tab-id <tab-id> \
  --script-file .web-cap/github.com/read-repository-summary.js \
  --input '{"owner":"edgestorage","repo":"web-cap"}'
```

Agents can also use this repository as a source of examples when creating new reusable capability scripts. The script format and authoring guidance are documented in [Web Cap's reusable script guide](https://github.com/edgestorage/web-cap/blob/main/skills/web-cap/references/how-to-write-reusable-scripts.md).

## Contributing Scripts

Pull requests are welcome. A good contribution should:

- Put scripts under `.web-cap/<domain>/`.
- Use a clear capability name, such as `read-visible-posts.js` or `search-repositories.js`.
- Include Web Cap script metadata at the top of the file.
- Return structured JSON with an `ok` field.
- Avoid destructive actions by default. Scripts that can change account or site state should preview the action first and require an explicit confirmation input before clicking.
- Update the domain `README.md` with usage notes and examples.

If a new website is added, create a new `.web-cap/<domain>/README.md` so future agents can quickly understand what is available.

## Relationship To Web Cap

[Web Cap](https://github.com/edgestorage/web-cap) is the browser automation toolkit and CLI. This repository is the shared script library. Use Web Cap to execute scripts; use Web Cap Hub to discover, reuse, and contribute site-specific workflows.

## License

Unless a script states otherwise, contributions are intended to be shared under the same license terms as Web Cap.
