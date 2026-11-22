# ELP365 学员端源码审阅

这是 ELP365 学员端前端源码的审阅快照，取自原项目提交 `877212a`。免登录预览复用同一套学员端页面和播放器。

| 预览页面 | 链接 |
| --- | --- |
| 学员首页 | [继续学习、进度筛选、列表和卡片](https://fundops-notes.github.io/elp365-ui-review/web/preview.html#study) |
| 整期播放器 | [演播室、场景对话、双语字幕和全屏](https://fundops-notes.github.io/elp365-ui-review/web/preview.html#lesson/ep-040/whole) |
| 核心对话 | [逐句重听、词组和练习](https://fundops-notes.github.io/elp365-ui-review/web/preview.html#lesson/ep-040/core) |

[复制给审阅 Agent 的提示词](REVIEW-PROMPT.md)

预览使用自编学习内容、合成语音和示例场景，展示三种学习状态的条目共用一组示例内容。学习记录存于当前浏览器，页脚有「重置示例进度」按钮。登录页的 HTML 与样式可直接审阅。

| 页面 | 代码 | 样式 |
| --- | --- | --- |
| 登录页 | [页面结构](web/account.html)、[表单交互](web/account.js) | [表单](web/management.css)、[品牌](web/brand.css) |
| 登录后首页 | [页面入口](web/index.html)、[课程目录与筛选](web/trial-directory.js) | [课程目录](web/trial-directory.css)、[通用样式](web/style.css) |
| 整期播放器 | [播放器](web/episode-study.js)、[场景渲染](web/scene-render.js)、[角色动作](web/host-motion.js) | [播放器](web/episode-study.css)、[场景](web/scene-render.css) |
| 核心对话学习页 | [逐句字幕、词组与练习](web/app.js#L419)、[片段播放](web/trial-audio.js) | [通用样式](web/style.css)、[播放器样式](web/episode-study.css) |

全屏复现时，用桌面 Chrome 打开整期播放器，暂停并把进度拖到约 0:02，再点「全屏」。在 1440 × 1100 的测试视口里，舞台由 778 px 增至 1386 px，Marco 的容器仍为 192 px，话筒的可见宽度仍为 37 px。进度拖到 0:12 可比较分层场景角色，0:28 可看黑板，0:38 可看例句卡。缩放问题可从 `web/episode-study.css` 和 `web/scene-render.js` 入手。
