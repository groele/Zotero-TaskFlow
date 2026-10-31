# Zotero TaskFlow

**Zotero Flow Series · 科研研读任务推进工作台**

*让文献研读转化为清晰可推进的研究成果。 / Turn literature reading into trackable tasks and actionable plans.*

[简体中文](README.md) · [English](README.en.md)

[![当前版本](https://img.shields.io/badge/version-14.1.0-245ac7?style=flat-square)](https://github.com/groele/Zotero-TaskFlow/releases/tag/v14.1.0)
[![兼容范围](https://img.shields.io/badge/Zotero-10.0%20至%2012.*-059669?style=flat-square)](https://github.com/groele/Zotero-TaskFlow)
[![开源协议](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)](LICENSE)
[![本地私有](https://img.shields.io/badge/storage-100%25%20Local%20Privacy-success?style=flat-square)](https://github.com/groele/Zotero-TaskFlow)
[![发布下载](https://img.shields.io/badge/download-XPI%20Release-blue?style=flat-square)](https://github.com/groele/Zotero-TaskFlow/releases/download/v14.1.0/zotero-taskflow-14.1.0.xpi)

[核心亮点](#highlights) · [快捷键速查](#shortcuts) · [快速开始](#quick-start) · [多维研读视图](#views) · [学术研读模板体系](#academic-templates) · [Zotero 深度联动](#integration) · [设置与使用偏好](#settings) · [数据存储与备份](#data) · [常见问题 FAQ](#troubleshooting) · [安装与更新](#installation) · [Zotero Flow 系列生态](#series) · [许可证与说明](#license)

---

<a id="highlights"></a>

## 🌟 核心亮点与学术特色

**Zotero TaskFlow** 是专为学者、研究生与科研工作者设计的学术任务推进与文献研读管理插件。它消除了传统待办工具与学术文献脱节的问题，将 Zotero 资料库、PDF 阅读器与任务看板融为一体：

1. **文献与 PDF 锚点双向联动**：阅读 PDF 时一键将划词选区或关键批注转为研读待办，自动保存原文摘录与精确页码；点击卡片即可秒级回跳原文位置。
2. **专业级 5 大学术研读模板**：涵盖理论推导、实证实验、文献综述、算法与代码复现及通用学术研读，快速将长篇大作拆解为阶段化里程碑。
3. **多维工作流视图全覆盖**：提供看板 (Kanban)、清单 (List)、日历 (Calendar) 与统计分析 (Analytics) 四大视图，直观把控研读进度与投稿截止期。
4. **Zotero 原生深度融合**：在文献详情右侧栏（Item Pane）原生嵌入折叠任务卡片，在阅读器内提供右键菜单，在主工具栏实时提示待办与逾期状态。
5. **本地安全与纯粹隐私**：采用纯本地 `taskflow-data.json` 存储，绝无任何第三方云端上报；支持一键导出为 Markdown、CSV 和标准 JSON 备份。
6. **纯净轻量与现代架构**：去除所有历史冗余包袱，体积相比历史版本大幅缩减 30%+，专为高强度科研研读打造。

---

<a id="shortcuts"></a>

## ⚡ 常用快捷键速查

| 快捷键 (Windows / Linux) | 快捷键 (macOS) | 适用场景 | 执行操作 |
|---|---|---|---|
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd> | <kbd>Cmd</kbd> + <kbd>Opt</kbd> + <kbd>T</kbd> | Zotero 任意窗口 | 打开 / 激活 TaskFlow 学术任务工作台 |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> | <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> | PDF 阅读器选区 / 批注 | 将选中文本与当前页码转换为研读待办 |
| <kbd>Enter</kbd> | <kbd>Return</kbd> | 快速输入框 | 提交并保存新待办事项 |
| <kbd>Esc</kbd> | <kbd>Esc</kbd> | 模态编辑框 / 筛选弹窗 | 关闭弹窗并返回主视图 |

---

<a id="quick-start"></a>

## 🚀 快速开始

### 场景一：边读 PDF 边捕捉灵感与后续待办
1. 在 Zotero 内置 PDF 阅读器中阅读论文。
2. 选中需要深入推导的公式、实验方案或待查参考文献。
3. 按下 <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd>（或右键选择 **“将选中文本/批注转为研读待办”**）。
4. 插件将自动抓取原文引句、当前页码、关联文献元数据，并设置默认截止日。
5. 后续在任何地方点击该任务上的文献徽标，均可**一键直达 PDF 对应页码**。

### 场景二：导入一组新文献并批量制定研读计划
1. 在 Zotero 文献列表中选中多篇待读论文（或选定一个分类集合）。
2. 右键点击选区，选择 **“为此分类所有文献批量生成研读清单”**；或直接将文献拖入 TaskFlow 看板区域。
3. 插件自动跳过已有任务的文献，为每篇论文建立独立的研读卡片，并自动关联条目。

### 场景三：拆解攻克核心顶会/顶刊大论文
1. 打开 TaskFlow 主工作台，点击 **“新建学术任务”**。
2. 在 **学术类型 (Academic Profile)** 中选择对应的论文类别（如“算法与代码复现”或“实证/实验研究”）。
3. 勾选应用预置学术清单，自动生成包含“模型复现”、“基线比对”、“数据集验证”等全套子任务。

---

<a id="views"></a>

## 📊 多维研读视图

TaskFlow 提供了专为科研场景优化的 4 种主视图模式：

### 1. 看板视图 (Kanban Board)
- **四阶学术流转**：默认划分为 **待研读 (To Read)**、**精读中 (In Progress)**、**复现/整理中 (Reviewing)**、**已吸收 (Completed)**。
- **拖拽即更新**：直接在列之间拖动卡片，快速变更研读状态与优先级。
- **直观卡片信息**：每张卡片直观显示关联论文标题、作者年份、当前子任务进度条、截止倒计时及色彩标签。

### 2. 清单列表 (List View)
- **多层级任务展开**：支持清晰查看父任务与其下属的各子任务清单，支持键盘上下切换与快速勾选。
- **分组与排序**：可按截止日期、优先级（P1 紧急重要至 P4 低优先级）、文献分类、自定义标签进行动态分组。
- **快速筛选器**：一键过滤“今日到期”、“本周待研读”、“逾期预警”或“特定分类论文”。

### 3. 日历视图 (Calendar View)
- **文献日程一览**：按月/周视图呈现各论文的阅读排期与汇报节点。
- **防拖延时间线**：直观发现任务堆积峰值，合理匀称分配研读精力。

### 4. 统计与分析 (Analytics)
- **科研投入沉淀**：直观汇总已研读论文总数、子任务完成率、累计研读专注时长。
- **研读趋势图表**：展示周期研读完成走势，为文献综述与毕业答辩准备坚实的进度支撑。

---

<a id="academic-templates"></a>

## 🎯 5 大学术研读清单模板体系

针对不同学科与体裁的文献特点，内置经过学术验证的标准研读步骤：

| 研读模板类型 | 适用对象 | 预置里程碑清单 |
|---|---|---|
| **理论研究 (Theoretical)** | 数理基础、算法证明、机制推导类论文 | 1. 核心假设验证<br>2. 关键引理与定理推导<br>3. 边界条件与极端情况讨论<br>4. 论文理论局限性梳理 |
| **实证与实验 (Experimental)** | 生物医药、材料工程、临床、化学实验类论文 | 1. 实验受试与对照组设计核对<br>2. 核心实验步骤与变量控制记录<br>3. 关键图表数据与统计显著性复核<br>4. 潜在误差来源与复现难点排查 |
| **文献综述 (Review)** | Survey, Meta-Analysis, 综述指南 | 1. 研究脉络与分类范式提炼<br>2. 核心参考文献追溯与交叉对比<br>3. 现有方案优缺点对比矩阵绘制<br>4. 领域未来发展方向与空白挖掘 |
| **算法与代码复现 (Algorithm)** | 计算机、人工智能、开源工程论文 | 1. 数据集与评估指标准备<br>2. 核心网络/算法架构搭建与权重调取<br>3. 主干结果指标与消融实验复现<br>4. 代码重构与自研实验集成 |
| **通用学术研读 (General)** | 日常泛读、泛选文献速通 | 1. 摘要与引言核心贡献提炼<br>2. 方案图解与核心创新点提炼<br>3. 实验效果初探与结论速览<br>4. 对自身课题的借鉴价值总结 |

---

<a id="integration"></a>

## 🧩 Zotero 深度联动

TaskFlow 并非孤立的外部看板，而是深深扎根于 Zotero 宿主中：

- **文献详情侧边栏 (Item Pane)**：
  - 点击任意文献，右侧栏内将即时显示与该论文关联的研读待办卡片与完成百分比。
  - 原生提供快速新增、勾选完成与“📝 同步为文献笔记”操作。
- **一键同步生成子笔记**：
  - 支持将研读任务及其完成情况一键沉淀为该文献的 Zotero 子笔记，自动跟随 Zotero 官方云端跨设备同步。
- **工具栏状态徽标**：
  - 顶栏常驻当前待读、进行中及逾期篇目数量，随时掌握当前文献研读负荷。

---

<a id="settings"></a>

## ⚙️ 设置与偏好指南

在 **Zotero → 设置 → Zotero TaskFlow** 中可根据个人习惯微调交互：

- **文献列表右键菜单开关**：控制文献库条目右键菜单中的“添加为待办”与“批量加入研读待办”选项；默认均不开启，保持右键菜单整洁。
- **从文献库拖拽**：启用后，可直接将文献树或条目列表中的论文拖动到任务面板建立待办。
- **点击定位文献**：开启后，点击任务卡片上的文献条目即可使 Zotero 主列表自动滚屏并高亮该文献；关闭后则优先打开任务详情。
- **PDF 精准跳页**：开启后，点击 PDF 关联任务可直接定位到摘录时的原页码或批注区域；关闭后则仅打开附件首页。
- **窗口模式偏好**：支持灵活选择“独立弹窗”、“伴读分屏”或“全屏工作区”。

---

<a id="data"></a>

## 💾 数据存储、备份与跨设备同步

- **数据存储位置**：所有任务、子任务、进度与设置均以结构化 JSON 保存在您本机 Zotero 数据目录下的 `taskflow-data.json` 中。
- **完全离线私有**：不依赖任何外网接口或第三方云服务器，严格保证未发表手稿与保密科研课题的数据安全。
- **备份与迁移**：
  - 支持在设置页一键导出标准 JSON 备份。
  - 换电脑或重装系统时，只需将导出的备份文件在另一台电脑上导入即可完全恢复。
- **跨平台联动**：支持将任务成果导出为标准的 Markdown 清单或 CSV 表格，无缝联动 Obsidian、Notion 或 Excel。

---

<a id="troubleshooting"></a>

## ❓ 常见问题排查 (FAQ)

<details>
<summary><strong>Q1: 为什么在另一台电脑上登录了 Zotero 账号，TaskFlow 里的任务没有同步过去？</strong></summary>

> **解答**：Zotero 官方数据同步仅同步文献条目、附件和笔记，默认不会同步插件私有数据文件。如果需要跨设备保持一致：
> 1. 可以使用 TaskFlow 内置的“📝 同步为文献笔记”功能，将任务内容同步为条目的子笔记，子笔记将通过 Zotero 自带同步走；
> 2. 或者在主设备点击“导出备份数据”，在副设备点击“导入合并/覆盖数据”。
</details>

<details>
<summary><strong>Q2: 点击任务卡片上的 PDF 按钮无法跳转到特定页码？</strong></summary>

> **解答**：请确保：
> 1. 该文献确实包含可用的有效 PDF 附件；
> 2. 在 **Zotero 设置 → Zotero TaskFlow** 中确认开启了 **“启用 PDF 导航”**；
> 3. 该任务是在阅读器划词或明确指定了页码时创建的。
</details>

<details>
<summary><strong>Q3: 快捷键 Ctrl+Alt+T 无法打开工作台？</strong></summary>

> **解答**：这通常是因为与操作系统或其他软件（如输入法、屏幕录制工具）的全局热键冲突。您可以直接点击 Zotero 主界面顶部工具栏的 **TaskFlow 图标** 打开，或在菜单栏 **“工具 → Zotero TaskFlow 学术任务看板”** 中打开。
</details>

---

<a id="installation"></a>

## 📦 安装与更新

### 手动安装步骤
1. 前往 [GitHub Releases](https://github.com/groele/Zotero-TaskFlow/releases/tag/v14.1.0) 下载最新安装包 [zotero-taskflow-14.1.0.xpi](https://github.com/groele/Zotero-TaskFlow/releases/download/v14.1.0/zotero-taskflow-14.1.0.xpi)。
2. 在 Zotero 中打开菜单 **工具 (Tools) → 插件 (Plugins / Add-ons)**。
3. 点击右上角的齿轮图标 ⚙️，选择 **从文件安装插件 (Install Add-on From File...)**。
4. 选择刚才下载的 `.xpi` 文件，点击安装并重启 Zotero。

### 自动更新源
插件内置了自动更新地址：
- **Update Feed**：`https://raw.githubusercontent.com/groele/Zotero-TaskFlow/main/update.json`
- **Add-on ID**：`taskflow@groele.org`

---

<a id="development"></a>

## 🛠️ 开发与测试

对于需要基于本项目二次开发或提交 PR 的开发者：

```powershell
# 安装测试依赖
npm ci

# 运行全套 152 项集成与单元测试
npm test

# 打包构建标准 XPI 并自动核验元数据与哈希
python scripts/build-package.py
```

- [v14.1.0 发布说明](docs/releases/v14.1.0.md)
- [品牌与产品规范](docs/brand/PRODUCT.md)
- [标签与版本策略](docs/release-tag-policy.md)

---

<a id="series"></a>

## 🌐 Zotero Flow 系列生态

Zotero TaskFlow 是 **Zotero Flow 学术工具流家族** 的核心成员：

| 插件名称 | 专注环节 | 核心能力 |
|---|---|---|
| [Zotero RefFlow](https://github.com/groele/Zotero-RefFlow) | **文献发现** | 参考文献、引文网络追溯与前沿相关研究一键检索 |
| [Zotero MetaFlow](https://github.com/groele/Zotero-MetaFlow) | **元数据整理** | 自动校验、规范化清洗与文献权威元数据精准补全 |
| [Zotero ViewFlow](https://github.com/groele/Zotero-ViewFlow) | **阅读预览** | 文献条目智能预览、格式化引文快速复制与侧栏速读 |
| [Zotero MindFlow](https://github.com/groele/Zotero-MindFlow) | **知识组织** | 将文献批注、核心论点与思路网络组织为可视化导图 |
| [Zotero TaskFlow](https://github.com/groele/Zotero-TaskFlow) | **任务推进** | 将文献研读、代码复现与论文写作拆解为可追踪计划 |
| [Zotero CiteFlow](https://github.com/groele/Zotero-CiteFlow) | **写作引用** | 实时追踪 Word 写作引用脉络，无缝联动 Zotero 库 |
| [Zotero PaperFlow](https://github.com/groele/Zotero-PaperFlow) | **投稿审稿** | 投稿周期管理、多轮审稿意见拆解与回复点对点追踪 |

*注：各插件保持高内聚低耦合，均可独立安装运行；系列搭配使用可获得连贯一致的高效学术科研体验。*

---

<a id="license"></a>

## 📄 许可证与开源声明

- **开源协议**：本项目基于 [MIT License](LICENSE) 协议开源。
- **免责声明**：本插件由开源社区独立维护，并非 Zotero 官方团队官方产品。Zotero 是 Corporation for Digital Scholarship 的注册商标。
