# Zotero TaskFlow 仓库规范

先阅读上级工作区的 `AGENTS.md`(`Zotero Flow/AGENTS.md`),本文件只补充本仓库细节。

## 结构
- `bootstrap.js`、`chrome/content/scripts/index.js`:宿主启动层(菜单、工具栏徽标、窗口、Zotero 集成)。
- `chrome/content/js/*.js`:`index.html` / `sidepanel.html` 的界面与数据逻辑,经 `scripts/build-package.py` 打包。
- `chrome/content/icons` 与 `images` 由 `scripts/apply_icon.py`、`update_to_v11_icons.py` 同步写入;改图标需同时核对两处。
- `README_en.md`、`docs/reference/` 为按 `docs/brand/BRAND.md` 保留的历史入口,不要删除。

## 构建与测试
- `npm test`:Node(jsdom)测试 + Python 包策略测试。这不能替代真实 Zotero 验证。
- `npm run build`:要求 `update.json` 含与 `manifest.json` 版本匹配的条目;未发布候选包使用 `python scripts/build-package.py --candidate --output <路径>`。
- 版本字段需一致:`manifest.json`、`package.json`、`package-lock.json`、`prefs.js`、`docs/brand/product.json`、`preferences.xhtml`、两份 README、`CHANGELOG.md`、`docs/releases/vX.Y.Z.md`、`update.json`。
- 内部 add-on ID `todolist@groele.org`、preference key 与 `todolist.ftl` 为兼容标识,不要改名。

## 安全约定
- 向 `innerHTML` 插值的任何用户或 Zotero 元数据(标题、作者、年份、页码、标签、备注)必须经 `Utils.escapeHtml`(或 `highlightText`)转义;仅数字计数和代码内常量可直接插值。

## 发布
- 遵循工作区规范与 `docs/release-tag-policy.md`;标签用 `scripts/release-tags.py` 校验。