# Web Cap Hub 中文说明

[English](./README.md)

这里是 [Web Cap](https://github.com/edgestorage/web-cap) 的社区可复用 capability scripts 仓库。

这个仓库是 Web Cap 的脚本 Hub，用来收集可以在不同 agent 和项目中复用的浏览器自动化工作流，例如读取页面内容、提取结构化数据，以及通过可见浏览器 UI 谨慎操作常见网站。

## 仓库内容

脚本放在 `.web-cap/<domain>/` 下：

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

每个站点目录应该包含：

- 一个或多个可复用 Web Cap 脚本。
- 一个 `README.md`，说明每个脚本的用途、适用页面、输入参数和返回结果。

## 配合 Web Cap 使用

先安装并连接 Web Cap。CLI 安装、浏览器扩展安装和脚本执行方式见主项目的 [Web Cap README](https://github.com/edgestorage/web-cap)。

克隆本仓库后，可以通过 `web-cap script-execute` 运行脚本：

```bash
git clone https://github.com/edgestorage/web-cap-hub.git
cd web-cap-hub

web-cap session-status
web-cap script-execute \
  --tab-id <tab-id> \
  --script-file .web-cap/github.com/read-repository-summary.js \
  --input '{"owner":"edgestorage","repo":"web-cap"}'
```

Agent 也可以把这个仓库作为编写新可复用 capability scripts 的示例来源。脚本格式和编写规范见 [Web Cap 的可复用脚本指南](https://github.com/edgestorage/web-cap/blob/main/skills/web-cap/references/how-to-write-reusable-scripts.md)。

## 贡献脚本

欢迎提交 pull request。一个好的脚本贡献应该：

- 放在 `.web-cap/<domain>/` 下。
- 使用清晰的 capability 名称，例如 `read-visible-posts.js` 或 `search-repositories.js`。
- 在文件顶部包含 Web Cap script metadata。
- 返回带有 `ok` 字段的结构化 JSON。
- 默认避免破坏性操作。可能改变账号或网站状态的脚本，应先返回预览，并要求传入明确的确认参数后才点击执行。
- 更新对应站点目录的 `README.md`，补充使用说明和示例。

如果新增一个网站，请同时创建新的 `.web-cap/<domain>/README.md`，让后续 agent 能快速理解这个目录里有哪些能力。

## 和 Web Cap 的关系

[Web Cap](https://github.com/edgestorage/web-cap) 是浏览器自动化工具和 CLI。这个仓库是共享脚本库。使用 Web Cap 执行脚本；使用 Web Cap Hub 发现、复用和贡献面向具体网站的工作流。

## 许可证

除非脚本另有说明，贡献内容默认按 Web Cap 相同的许可证条款共享。
