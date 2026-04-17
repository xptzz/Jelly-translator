const FIELDS = ["deeplKey", "githubToken", "githubOwner", "githubRepo"];

// 加载已保存的设置
chrome.storage.sync.get(FIELDS, (data) => {
  FIELDS.forEach(f => {
    if (data[f]) document.getElementById(f).value = data[f];
  });
});

// 保存设置
document.getElementById("save").addEventListener("click", () => {
  const values = {};
  FIELDS.forEach(f => {
    values[f] = document.getElementById(f).value.trim();
  });
  chrome.storage.sync.set(values, () => {
    showStatus("saveStatus", "✓ 已保存", "success");
  });
});

// 初始化知识库
document.getElementById("initRepo").addEventListener("click", async () => {
  const btn    = document.getElementById("initRepo");
  const token  = document.getElementById("githubToken").value.trim();
  const repo   = document.getElementById("githubRepo").value.trim();

  if (!token || !repo) {
    showStatus("initStatus", "请先填写 Token 和仓库名", "error");
    return;
  }

  // 先把当前表单值存入 storage，让 background 能读到
  await chrome.storage.sync.set({
    githubToken: token,
    githubRepo:  repo,
    githubOwner: document.getElementById("githubOwner").value.trim()
  });

  btn.disabled    = true;
  btn.textContent = "初始化中…";

  chrome.runtime.sendMessage({ type: "init_repo" }, (res) => {
    const runtimeErr = chrome.runtime.lastError;
    btn.disabled    = false;
    btn.textContent = "🚀 初始化知识库";

    if (runtimeErr || !res?.ok) {
      showStatus("initStatus", `❌ ${runtimeErr?.message || res?.error}`, "error");
      return;
    }

    // 回填自动获取的用户名
    if (res.owner) {
      document.getElementById("githubOwner").value = res.owner;
      chrome.storage.sync.set({ githubOwner: res.owner });
    }
    showStatus("initStatus", "✓ 仓库已创建，vocab 文件夹已初始化", "success", 6000);
  });
});

function showStatus(id, msg, type, duration = 4000) {
  const el    = document.getElementById(id);
  el.textContent = msg;
  el.className   = "status " + type;
  setTimeout(() => { el.textContent = ""; el.className = "status"; }, duration);
}
