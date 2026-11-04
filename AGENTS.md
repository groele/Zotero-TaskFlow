# Zotero TaskFlow 仓库规范与架构指南

本文件是 `github-sources/Zotero-TaskFlow` 专属维护规范。开始工作前必须先通读并遵循工作区根目录 `AGENTS.md`（`d:\Dev Studio\Zotero Flow\AGENTS.md`）。

---

## 1. 项目概览与品牌定位

- **插件显示名称**：`Zotero TaskFlow`（品牌展示必须严格保留空格与大小写）
- **核心职责**：文献阅读任务推进、学术研读计划与精读里程碑追踪（Turn literature reading into trackable tasks and plans）
- **包标识与 ID**：
  - NPM 包名：`zotero-taskflow`
  - 内部 Add-on ID：`taskflow@groele.org`（兼容历史命名空间与偏好键）
- **宿主兼容性基准**：
  - 基于 **Zotero 10** 深度开发、完善与视觉调优；
  - 面向 Zotero 11/12 前瞻架构演进，声明兼容范围锁定为：
    ```json
    "strict_min_version": "10.0",
    "strict_max_version": "12.*"
    ```
  - 构建产物对齐现代 Gecko 标准运行时（Firefox 140+ / Gecko 153+）。

---

## 2. 模块架构与目录结构

TaskFlow 采用宿主注入层与前端工作区解耦的双核架构：

### 2.1 宿主启动与集成层 (`chrome/content/scripts/`)
- `bootstrap.js`：标准 Zotero XPI 启动入口，注册 chrome 协议资源并初始化。
- `chrome/content/scripts/index.js`：宿主单例 `Zotero.TaskFlow`（兼容别名 `Zotero.Todolist`）：
  - **窗口与 UI 注入**：主窗口工具栏徽标（未完成任务角标统计）、顶部菜单栏、条目详情侧边栏（ItemPane Section）、PDF 阅读器选区伴读入口；
  - **伴读窗口纳管**：轻量独立伴读窗口（`Todolist_SubWindow`）与桌面大窗口（`Todolist_Window`）的创建、对齐、定位与导航传参；
  - **生命周期闭环**：`shutdown()` 期间穿透枚举全量窗口（`Services.wm.getEnumerator(null)`），主动关闭打开的伴随独立窗口，注销定时器与事件监听器；
  - **文献子笔记同步**：`syncTasksToChildNote()` 将任务进度与引用摘录自动同步至文献下属的富文本 HTML 子笔记中；
  - **备份与导出引擎**：支持跨格式导出（JSON 全量备份、Excel 兼容 CSV、Markdown 清单、纯文本 TXT）。
- `chrome/content/scripts/preferences.js`：首选项设置面板运行时，驱动分组渲染、自定义标签 CRUD 以及灾备导入导出。

### 2.2 前端工作区逻辑 (`chrome/content/js/`)
- `index.html`：主看板与伴读子窗口主容器；
- `sidepanel.html`：Zotero 内置侧边栏容器；
- `taskManager.js`：前端任务领域核心，负责内存任务快照、CRUD 操作、乐观更新（Optimistic Updates）与优先级调度；
- `storage.js`：本地存储持久化适配器与代际修订号（Revision/Generation）乐观并发控制；
- `zoteroBridge.js`：宿主与前端页面通信桥梁，管理全屏/伴随窗口导航、深浅主题感知与双通道事件去重；
- `ui.js`：看板核心视图渲染（列表、看板、日历、四象限矩阵）、任务卡片交互与文献拖拽建立任务；
- `advanced.js`：高级工具链（多格式导出、搜索历史、统计报表生成）；
- `notifications.js`：Toast 提示、番茄钟专注冲刺（Pomodoro）与音频提醒调度。

### 2.3 设置界面与视觉规范 (`chrome/content/`)
- `preferences.xhtml`：自上而下自洽划分为六大业务流转模块，有且仅有第 1 张卡片默认展开：
  1. 工作区与主视图形态
  2. 学术模板与任务默认值
  3. Zotero 文献与阅读联动
  4. 文献子笔记云同步与自动标签
  5. 任务提醒与学术晨报
  6. 标签资产、备份与数据安全 + 底部独立版本信息卡片
- `chrome/content/assets/preferences.css`：严格遵守根规范 **4.2 三级层级与边缘距离标准规范**：
  - 卡片外框：`x = 0px`，内边距 `padding-inline: 16px`；
  - 一级标题与顶部概述：距离卡片外边缘 `16px`；
  - 二级主选项与图标：贴合 `16px` 内容线，文本标签确立 `40px` 黄金基准线；
  - 三级从属控件与子输入行（`.todolist-pref-tags-container`, `.todolist-tag-creator-bar`, `.todolist-export-grid`, `.todolist-import-bar`, `.todolist-shortcut-help`, `.todolist-pref-actions`, `.todolist-action-group`）：统一声明 `margin-inline-start: 24px`，严格与 `40px` 黄金基准线垂直对齐。

---

## 3. 安全与防御性编码规范

1. **DOM 注入与 HTML 转义**：
   - 向 `innerHTML` 插值的任何用户输入或 Zotero 元数据（标题、作者、年份、页码、标签、备注），必须先经过 `Utils.escapeHtml()` 转义，严防 XSS 漏洞；
2. **只读条目安全防护**：
   - 凡涉及条目修改或子笔记创建（如「同步子笔记」），必须通过 `typeof target.isEditable === 'function' && !target.isEditable()` 校验；只读条目必须禁用控件并给出明确提示，绝不能生成伪成功通知；
3. **CSV 导出公式注入防护**：
   - 宿主端与前端 CSV 导出必须使用统一的安全转义算法：对以 `=`, `+`, `@`, `-` 开头的单元格内容强制添加 `'` 单引号前缀转义；
4. **定时器与异步任务闭环**：
   - 伴读窗口递归重试投递定时器必须登记在 `_standaloneTimers` 集合中，并在窗口注销或插件 `shutdown()` 时彻底注销清理。

---

## 4. 构建与测试套件

```bash
# 1. 运行完整自动化测试套件 (包含 156+ 项 Node 测试与 Python 打包测试)
npm test

# 2. 独立运行 Python 打包逻辑验证
python -B -m unittest discover -s tests -p test_build_package.py

# 3. 运行 SemVer 发布标签与版本政策自检
python scripts/release-tags.py --self-test

# 4. 构建生产发布 XPI 包 (自动执行 update.json sha512 校验)
python scripts/build-package.py
```

---

## 5. 版本发布与一致性检查清单

每次版本升级发布前，必须确保以下 10 处版本号完全一致：
1. `manifest.json` (`version`)
2. `package.json` (`version`)
3. `package-lock.json` (`version`)
4. `prefs.js` (注释首行版本)
5. `docs/brand/product.json` (`version` 与 `releaseStatus: "released"`)
6. `chrome/content/preferences.xhtml` (徽标与下载链接版本)
7. `README.md` 与 `README.en.md` (版本徽章与下载链接)
8. `CHANGELOG.md` (顶部变更日志)
9. `docs/releases/vX.Y.Z.md` (发布说明)
10. `update.json` (对应版本条目、`strict_min_version: "10.0"` 与 `sha512` 校验和)
