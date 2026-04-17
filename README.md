# 🐭 鼠译器 · Jelly Translator

> 选中网页文字，即刻翻译——支持中英西互译、朗读原文、一键存入 GitHub 知识库。

> Select any text on a webpage for instant translation — supports Chinese/English/Spanish, text-to-speech, and one-click save to your GitHub second brain.

---

## ✨ 功能特性 · Features

| 功能 | Description |
|------|-------------|
| 🌐 智能翻译 | 选中外文自动译为中文；选中中文可选译为英文或西班牙语 |
| 🔊 朗读原文 | 点击气泡中的 🔊 按钮朗读外语原文或译文，中文不朗读 |
| 📚 学习存档 | 点击「学习」按钮，将原文 + 译文 + 来源 URL + 时间追加保存到 GitHub 仓库的每日 Markdown 文件 |
| ⚙️ 设置页面 | 首次安装自动跳转设置页，填入 DeepL API Key 和 GitHub Token 即可使用 |
| 🚀 一键初始化 | 设置页内置「初始化知识库」按钮，自动创建 GitHub 仓库和 `vocab/` 文件夹 |

---

## 📦 安装步骤 · Installation

### 中文

1. **下载代码**
   点击页面右上角 `Code → Download ZIP`，将压缩包下载到本地。

2. **解压文件**
   将 ZIP 解压到任意文件夹，例如 `~/Jelly-translator`。

3. **在 Chrome 中加载**
   - 打开 Chrome，地址栏输入 `chrome://extensions/`
   - 开启右上角**开发者模式**
   - 点击**「加载已解压的扩展程序」**
   - 选择解压后的文件夹

4. **填写设置**
   插件首次加载会自动打开设置页，填入以下信息后点击**「保存设置」**：
   - **DeepL API Key**：前往 [deepl.com/pro-api](https://www.deepl.com/pro-api) 免费申请
   - **GitHub Token**：前往 [github.com/settings/tokens](https://github.com/settings/tokens/new?scopes=repo) 创建，需勾选 `repo` 权限
   - **GitHub 用户名** 和 **仓库名**（或直接点「🚀 初始化知识库」自动创建）

---

### English

1. **Download**
   Click `Code → Download ZIP` in the top-right corner and save it locally.

2. **Unzip**
   Extract the ZIP to any folder, e.g. `~/Jelly-translator`.

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable **Developer mode** (top-right toggle)
   - Click **"Load unpacked"**
   - Select the extracted folder

4. **Configure**
   The settings page opens automatically on first install. Fill in the following and click **"Save"**:
   - **DeepL API Key**: Get a free key at [deepl.com/pro-api](https://www.deepl.com/pro-api)
   - **GitHub Token**: Create one at [github.com/settings/tokens](https://github.com/settings/tokens/new?scopes=repo) with `repo` scope
   - **GitHub username** and **repo name** (or click "🚀 Initialize Repo" to create automatically)

---

## 🗂️ 知识库格式 · Saved Format

每天的词汇记录保存在 `vocab/YYYY-MM-DD.md`，格式如下：

Each day's vocabulary is saved to `vocab/YYYY-MM-DD.md`:

```markdown
# 2026-04-17 词汇

---

## Ephemeral

**翻译：** 短暂的；瞬息的
**来源：** https://example.com/article
**时间：** 2026-04-17 14:32:10

---
```

---

## 🛠️ 技术栈 · Tech Stack

- Chrome Extension Manifest V3
- [DeepL API](https://www.deepl.com/pro-api) — 翻译引擎
- [GitHub Contents API](https://docs.github.com/en/rest/repos/contents) — 知识库存储
- Web Speech API (`speechSynthesis`) — 朗读功能

---

## 📄 License

MIT
