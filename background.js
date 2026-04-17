// 首次安装自动打开设置页
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") chrome.runtime.openOptionsPage();
});

// Unicode 安全 base64（btoa 不支持中文）
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  const binary = Array.from(bytes, b => String.fromCharCode(b)).join("");
  return btoa(binary);
}

function fromBase64(b64) {
  const binary = atob(b64.replace(/\n/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

async function cfg() {
  return chrome.storage.sync.get(["deeplKey", "githubToken", "githubOwner", "githubRepo"]);
}

async function ghFetch(token, path, method = "GET", body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  // ── 翻译 ──────────────────────────────────────────────
  if (message.type === "translate") {
    (async () => {
      try {
        const { deeplKey } = await cfg();
        if (!deeplKey) throw new Error("请先在设置页配置 DeepL API Key");

        const res = await fetch("https://api-free.deepl.com/v2/translate", {
          method: "POST",
          headers: {
            "Authorization": `DeepL-Auth-Key ${deeplKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: [message.text],
            target_lang: message.targetLang || "ZH"
          })
        });

        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try { const b = await res.json(); if (b.message) detail += `: ${b.message}`; } catch (_) {}
          throw new Error(detail);
        }

        const d = await res.json();
        sendResponse({
          ok: true,
          translation:  d.translations?.[0]?.text ?? "（无结果）",
          detectedLang: d.translations?.[0]?.detected_source_language ?? "EN"
        });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  // ── 保存词汇（按日期追加）─────────────────────────────
  if (message.type === "save_vocab") {
    (async () => {
      try {
        const { githubToken, githubOwner, githubRepo } = await cfg();
        if (!githubToken || !githubOwner || !githubRepo)
          throw new Error("请先在设置页配置 GitHub 信息");

        const { original, translation, sourceUrl, date, time } = message;
        const filePath = `/repos/${githubOwner}/${githubRepo}/contents/vocab/${date}.md`;

        const entry = [
          `## ${original}`, "",
          `**翻译：** ${translation}`,
          `**来源：** ${sourceUrl}`,
          `**时间：** ${date} ${time}`,
          "", "---", ""
        ].join("\n");

        // 读取已有文件
        let sha, existing = "";
        const check = await ghFetch(githubToken, filePath);
        if (check.ok) {
          sha      = check.data.sha;
          existing = fromBase64(check.data.content);
        }

        const newContent = existing
          ? existing + entry
          : `# ${date} 词汇\n\n---\n\n` + entry;

        const body = { message: `Add vocab: ${original.slice(0, 40)}`, content: toBase64(newContent) };
        if (sha) body.sha = sha;

        const put = await ghFetch(githubToken, filePath, "PUT", body);
        if (!put.ok) throw new Error(`GitHub ${put.status}: ${put.data.message}`);

        sendResponse({ ok: true, filename: `vocab/${date}.md` });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  // ── 初始化知识库 ──────────────────────────────────────
  if (message.type === "init_repo") {
    (async () => {
      try {
        const { githubToken, githubRepo } = await cfg();
        if (!githubToken || !githubRepo)
          throw new Error("请先填写 GitHub Token 和仓库名");

        // 1. 获取当前用户名
        const userRes = await ghFetch(githubToken, "/user");
        if (!userRes.ok) throw new Error(`Token 无效: ${userRes.data.message}`);
        const owner = userRes.data.login;

        // 2. 创建仓库（已存在则忽略 422）
        const createRes = await ghFetch(githubToken, "/user/repos", "POST", {
          name:        githubRepo,
          description: "My second brain · vocabulary and notes",
          private:     false,
          auto_init:   true
        });
        if (!createRes.ok && createRes.status !== 422)
          throw new Error(`创建仓库失败: ${createRes.data.message}`);

        // 3. 创建 vocab/README.md（初始化文件夹）
        const readmePath = `/repos/${owner}/${githubRepo}/contents/vocab/README.md`;
        const readmeCheck = await ghFetch(githubToken, readmePath);
        if (!readmeCheck.ok) {
          const put = await ghFetch(githubToken, readmePath, "PUT", {
            message: "Initialize vocab folder",
            content: toBase64("# 词汇库\n\n每天的学习记录按日期存储在此目录中。\n")
          });
          if (!put.ok) throw new Error(`初始化 vocab 失败: ${put.data.message}`);
        }

        // 4. 回写 owner 到 storage
        await chrome.storage.sync.set({ githubOwner: owner });
        sendResponse({ ok: true, owner });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  return false;
});
