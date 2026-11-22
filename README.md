# ELP365 学员端源码审阅

这是 ELP365 学员端前端源码的审阅快照，取自原项目提交 `877212a`。表中列出各页面的阅读入口。

| 页面 | 代码 | 样式 |
| --- | --- | --- |
| 登录页 | [页面结构](web/account.html)、[表单交互](web/account.js) | [表单](web/management.css)、[品牌](web/brand.css) |
| 登录后首页 | [页面入口](web/index.html)、[课程目录与筛选](web/trial-directory.js) | [课程目录](web/trial-directory.css)、[通用样式](web/style.css) |
| 整期播放器 | [播放器](web/episode-study.js)、[场景渲染](web/scene-render.js)、[角色动作](web/host-motion.js) | [播放器](web/episode-study.css)、[场景](web/scene-render.css) |
| 核心对话学习页 | [逐句字幕、词组与练习](web/app.js#L419)、[片段播放](web/trial-audio.js) | [通用样式](web/style.css)、[播放器样式](web/episode-study.css) |

正式页面运行时需要课程数据、媒体资源和账号服务。这个快照提供 HTML、CSS 和 JavaScript，可用于代码审阅。涉及视觉呈现和浏览器行为的结论，可标为待运行验证。

审阅时请比较桌面宽屏与 390px 手机视口，检查信息层级、找课流程、播放器控制、字幕和单句重听。已知现象是电脑进入全屏后，部分人物或道具没有随着舞台一起放大。请沿播放器的全屏样式和场景渲染逻辑，检查背景、人物、道具、黑板和例句卡如何计算尺寸和位置，并给出保持宽高比的修改建议。每条意见附文件和行号，说明影响和验收方法。
