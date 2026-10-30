# Zotero TaskFlow


**Zotero Flow Series · 任务推进**

*让研究的每一步衔接起来。 / Connect each step of research.*

将文献研读转化为可追踪的任务与计划。

[简体中文](README.md) · [English](README.en.md)

[![当前版本](https://img.shields.io/badge/version-12.8.3-245ac7?style=flat-square)](https://github.com/groele/Zotero-TaskFlow/releases/tag/v12.8.3) · [下载 XPI](https://github.com/groele/Zotero-TaskFlow/releases/download/v12.8.3/zotero-taskflow-12.8.3.xpi) · [问题反馈](https://github.com/groele/Zotero-TaskFlow/issues)

[产品定位](#overview) · [安装与更新](#installation) · [快速开始](#quick-start) · [核心功能](#features) · [设置与使用](#settings) · [数据、同步与外部服务](#data) · [兼容性与验证范围](#compatibility) · [常见问题](#troubleshooting) · [开发与详细文档](#development) · [系列产品](#series) · [项目来源与许可](#license)

<a id="overview"></a>

## 产品定位

面向需要安排阅读、写作和研究工作的用户，把待办、截止日期、子任务和研读进度关联到 Zotero 文献与 PDF 位置。

本插件可以独立安装，按需与系列其他插件组合使用。

<a id="installation"></a>

## 安装与更新

1. 下载 [zotero-taskflow-12.8.3.xpi](https://github.com/groele/Zotero-TaskFlow/releases/download/v12.8.3/zotero-taskflow-12.8.3.xpi)（插件版本 **12.8.3**），不要安装 Source code ZIP。
2. 在 Zotero 打开 **工具 → 插件／附加组件**，从齿轮菜单选择 **从文件安装插件**。
3. 选择 XPI，完成安装；按提示重启 Zotero。

后续可在插件管理器中检查更新。自动检查／安装取决于 Zotero 与该插件的更新设置和兼容范围。升级或迁移前备份重要数据。

更新清单: [update.json](https://github.com/groele/Zotero-TaskFlow/blob/main/update.json) · 插件 ID: `todolist@groele.org`.

<a id="quick-start"></a>

## 快速开始

1. 选择文献并创建研读任务，补充截止日期和清单。
2. 阅读 PDF 时使用 Ctrl/Cmd+Shift+T 将选区和可用页码转成任务。
3. 在侧栏或任务视图推进进度，并定期导出 JSON 备份。

<a id="features"></a>

## 核心功能

| 特色能力 | 能解决什么问题 | 实际边界 |
|---|---|---|
| 研究任务的完整结构 | 管理标题、描述、截止日期、优先级、分类、标签、子任务与重复计划；支持批量处理、筛选和排序。 | 数据库保存在本机 Zotero 数据目录；不因安装插件自动同步到其他设备。 |
| 列表、看板、日历与统计 | 用列表推进待办、在看板中改变状态与顺序、用日历安排截止日期，并查看完成率、逾期和趋势。 | 统计反映当前本地任务数据，不能替代实验记录、日程系统或时间审计。 |
| 文献、PDF 与阅读位置联动 | 从选中文献或 PDF 选区创建任务，保存可用摘录、页码与批注锚点；可从任务返回条目或 PDF 位置。 | 跳转依赖原 PDF、页码或锚点仍可用；不是对 PDF 内容的永久镜像。 |
| 五类研读清单与专注计时 | 为一般、理论、实验、综述、算法/复现论文提供步骤模板，逐项跟踪并记录专注时长。 | 模板是可编辑的工作框架，不等同于研究质量评估或自动完成任务。 |
| 原生侧栏和可选子笔记 | 在 Zotero ItemPane 查看关联任务/进度，快速新增或勾选子任务；可将研读信息写入 Zotero 子笔记。 | 子笔记由 Zotero 自身同步；TaskFlow 任务库与子笔记是不同存储层。 |
| 可靠提醒、备份与恢复 | 在 Zotero 运行时检查提醒与每日摘要，等待实际投递确认后完成；失败释放预约以便重试，并可导出/导入本地备份。 | 提醒取决于 Zotero 正在运行及宿主通知能力；备份是恢复手段，不是自动云同步。 |

<a id="settings"></a>

## 设置与使用

在 **Zotero → 设置 → Zotero TaskFlow** 中查看插件偏好页。

配置窗口、默认视图、文献联动、提醒和数据维护。标为“尚未接入”的选项不可用；番茄钟倒计时、自动归档与声音提醒不作为当前已完成功能宣传。

- 文献拖入：将 Zotero 文献列表中的条目拖到任务区，按实际拖入的文献批量创建研读任务；附件关联到父文献，已有未完成研读任务会跳过。关闭“从文献库拖拽”后不接收文献拖入。
- 点击定位：开启后，点击关联任务卡片或文献徽标会定位 Zotero 条目；关闭后打开任务编辑。明确的编辑与“定位文献”按钮始终保留各自操作。
- PDF 跳页：开启后按已保存的页码或批注定位；关闭后仅打开 PDF，不强制切换阅读位置。
- 紧凑伴读：仅控制伴读子窗口布局，关闭后恢复普通任务布局，不改变已保存的侧边栏展开偏好。

<a id="data"></a>

## 数据、同步与外部服务

- 任务数据库保存在 Zotero 数据目录中的 taskflow-data.json。它不会随 Zotero 条目自动跨设备同步。
- 子笔记与标签的同步由 Zotero 控制；JSON 用于备份恢复，CSV/Markdown/TXT 用于阅读或分享。
- 提醒依赖 Zotero 运行，不能替代操作系统或云端提醒。

<a id="compatibility"></a>

## 兼容性与验证范围

| 项目 | 范围 |
|---|---|
| 当前插件版本 | 13.1.0 |
| 清单声明的 Zotero 范围 | `10.0.0` 至 `12.*` |
| 当前说明 | 12.8.3 优化文献详情侧栏：更名为\u201cZotero TaskFlow待办事项\u201d，突出快速新建待办与添加按钮，精简空状态与重复入口，补强 HTML 转义。 |

插件版本与 Zotero 版本分别管理。清单允许安装，不代表所有版本、操作系统和外部服务均已验证。本轮未安装到用户主配置。

<a id="troubleshooting"></a>

## 常见问题

换设备后任务未出现时，检查是否恢复了任务 JSON；子笔记同步不会自动还原整个任务库。PDF 跳转需要可用附件和已保存的定位信息。

反馈时提供插件与 Zotero 版本、系统、操作步骤、预期／实际结果和脱敏错误。

<a id="development"></a>

## 开发与详细文档

普通安装无需开发环境。以下为仓库已有开发入口，涉及原生测试时使用独立配置。

```powershell
npm ci
npm test
python scripts/build-package.py
```

- [版本说明 / Release notes](docs/releases/v12.8.3.md)
- [产品简介 / Product profile](docs/brand/PRODUCT.md)
- [品牌规范 / Brand guide](docs/brand/BRAND.md)
- [README 模板 / README template](docs/brand/README-TEMPLATE.md)
- [后续提升清单 / Improvement priorities](docs/brand/IMPROVEMENTS.md)
- [原详细指南 · README.md](docs/reference/README.md)
- [原详细指南 · README_en.md](docs/reference/README_en.md)

原详细指南保留功能细节、快捷键、历史验证与完整致谢；其中版本和测试结果属于各自记录时间。

<a id="series"></a>

## 系列产品

| 产品 | 定位 |
|---|---|
| [Zotero RefFlow](https://github.com/groele/Zotero-RefFlow) | 文献发现 · 检索参考文献、被引文献与相关研究。 |
| [Zotero MetaFlow](https://github.com/groele/Zotero-MetaFlow) | 元数据整理 · 校验、规范并补全文献元数据。 |
| [Zotero ViewFlow](https://github.com/groele/Zotero-ViewFlow) | 阅读预览 · 在 Zotero 侧栏预览并复制格式化引文。 |
| [Zotero MindFlow](https://github.com/groele/Zotero-MindFlow) | 知识组织 · 将文献、批注与思路组织为可编辑导图。 |
| [Zotero TaskFlow](https://github.com/groele/Zotero-TaskFlow) | 任务推进 · 将文献研读转化为可追踪的任务与计划。 |
| [Zotero CiteFlow](https://github.com/groele/Zotero-CiteFlow) | 写作引用 · 追踪 Word 文档引用，并连接 Zotero 文献操作。 |
| [Zotero PaperFlow](https://github.com/groele/Zotero-PaperFlow) | 投稿审稿 · 管理手稿、投稿轮次与审稿回复。 |

各插件分别安装和更新；同属一个系列不意味着共享数据库或已自动联通所有流程。

<a id="license"></a>

## 项目来源与许可

**开发来源声明：** 当前维护仓库的 README、包元数据和许可证未声明 TaskFlow 基于某个第三方 Zotero 插件二次开发；它作为独立维护的 Zotero Flow 插件发布。MIT 许可和 LICENSE 中的作者/版权声明仍须保留。

许可: [MIT](LICENSE).

本系列独立维护，并非 Zotero 官方产品。Zotero 及第三方名称、商标与材料归各自权利人所有。

[Release/tag policy](docs/release-tag-policy.md)
