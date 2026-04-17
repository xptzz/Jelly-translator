let bubble         = null;
let debounceTimer  = null;
let currentOrig    = "";
let currentTrans   = "";
let currentSrcLang    = "EN"; // 由 DeepL 检测返回
let currentTargetLang = "ZH"; // 本次翻译的目标语言

const SPEECH_LANG = {
  ZH: "zh-CN", EN: "en-US", ES: "es-ES", JA: "ja-JP",
  FR: "fr-FR", DE: "de-DE", KO: "ko-KR", PT: "pt-BR",
  IT: "it-IT", RU: "ru-RU", AR: "ar-SA", NL: "nl-NL"
};

// 中文判断：CJK 字符占比 > 25%
function isChinese(text) {
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  return cjk > 0 && cjk / text.replace(/\s/g, "").length > 0.25;
}

function getBubble() {
  if (!bubble) {
    bubble = document.createElement("div");
    bubble.id = "selection-bubble";
    document.body.appendChild(bubble);
  }
  return bubble;
}

function positionBubble(x, y) {
  const b = getBubble();
  b.style.left = x + "px";
  b.style.top  = y + window.scrollY - 68 + "px";
  b.style.display = "block";
}

// ── 渲染函数 ─────────────────────────────────────────────

function renderLoading(x, y) {
  const b = getBubble();
  b.className = "loading";
  b.innerHTML = '<div class="bubble-text">翻译中…</div>';
  positionBubble(x, y);
}

function renderPicker(x, y) {
  const b = getBubble();
  b.className = "picker";
  b.innerHTML = '<div class="bubble-text">翻译成：</div>';

  const row = document.createElement("div");
  row.className = "bubble-row";

  [["EN-US", "🇺🇸 英文"], ["ES", "🇪🇸 西班牙语"]].forEach(([lang, label]) => {
    const btn = document.createElement("button");
    btn.className = "bubble-lang-btn";
    btn.textContent = label;
    btn.addEventListener("mousedown", e => e.stopPropagation());
    btn.addEventListener("click", () => doTranslate(x, y, lang));
    row.appendChild(btn);
  });

  // 中文原文选语言时不显示 🔊（避免朗读中文）
  b.appendChild(row);
  positionBubble(x, y);
}

// DeepL target lang → BCP-47
const TARGET_SPEECH = { "EN-US": "en-US", "ES": "es-ES" };

function renderResult(x, y, text) {
  const b = getBubble();
  b.className = "result";
  b.innerHTML = "";

  const t = document.createElement("div");
  t.className = "bubble-text";
  t.textContent = text;
  b.appendChild(t);

  const row = document.createElement("div");
  row.className = "bubble-row";

  // 决定朗读什么：
  // 原文非中文 → 朗读原文（外语）
  // 原文是中文 → 朗读译文（EN / ES），目标语是 ZH 时不加 🔊
  let speakText, speakLang;
  if (!isChinese(currentOrig)) {
    speakText = currentOrig;
    speakLang = SPEECH_LANG[currentSrcLang] || "en-US";
  } else if (TARGET_SPEECH[currentTargetLang]) {
    speakText = currentTrans;
    speakLang = TARGET_SPEECH[currentTargetLang];
  }

  if (speakText) row.appendChild(makeSpeakBtn(speakText, speakLang));
  row.appendChild(makeLearnBtn());
  b.appendChild(row);
  positionBubble(x, y);
}

function renderError(x, y, msg) {
  const b = getBubble();
  b.className = "error";
  b.innerHTML = `<div class="bubble-text">${msg}</div>`;
  positionBubble(x, y);
}

// ── 按钮工厂 ─────────────────────────────────────────────

function makeSpeakBtn(text, lang) {
  const btn = document.createElement("button");
  btn.className = "bubble-icon-btn";
  btn.title = "朗读";
  btn.textContent = "🔊";
  btn.addEventListener("mousedown", e => e.stopPropagation());
  btn.addEventListener("click", () => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  });
  return btn;
}

function makeLearnBtn() {
  const btn = document.createElement("button");
  btn.className = "bubble-learn-btn";
  btn.textContent = "学习";
  btn.addEventListener("mousedown", e => e.stopPropagation());
  btn.addEventListener("click", () => saveVocab(btn));
  return btn;
}

// ── 通信 ─────────────────────────────────────────────────

function sendMsg(message) {
  return new Promise((resolve, reject) => {
    if (!chrome?.runtime?.sendMessage)
      return reject(new Error("扩展已断开，请刷新页面后重试"));
    try {
      chrome.runtime.sendMessage(message, response => {
        const err = chrome.runtime.lastError;
        if (err) return reject(new Error(err.message));
        if (response === undefined) return reject(new Error("扩展未响应，请刷新页面"));
        resolve(response);
      });
    } catch (e) {
      reject(new Error("扩展已断开，请刷新页面后重试"));
    }
  });
}

// ── 翻译逻辑 ─────────────────────────────────────────────

async function doTranslate(x, y, targetLang) {
  renderLoading(x, y);
  try {
    const res = await sendMsg({ type: "translate", text: currentOrig, targetLang });
    if (!res.ok) throw new Error(res.error);
    if (!window.getSelection()?.toString().trim()) return;
    currentTrans      = res.translation;
    currentSrcLang    = res.detectedLang || "EN";
    currentTargetLang = targetLang;
    renderResult(x, y, res.translation);
  } catch (err) {
    renderError(x, y, `❌ ${err.message}`);
  }
}

// ── 保存到 GitHub ─────────────────────────────────────────

async function saveVocab(btn) {
  btn.textContent = "保存中…";
  btn.disabled    = true;
  const now  = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8);
  try {
    const res = await sendMsg({
      type:        "save_vocab",
      original:    currentOrig,
      translation: currentTrans,
      sourceUrl:   location.href,
      date,
      time
    });
    if (!res.ok) throw new Error(res.error);
    btn.textContent = "✓ 已保存";
    btn.classList.add("saved");
  } catch (err) {
    btn.textContent = `❌ ${err.message}`;
    btn.disabled    = false;
  }
}

// ── 事件监听 ─────────────────────────────────────────────

document.addEventListener("mouseup", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const selection    = window.getSelection();
    const selectedText = selection?.toString().trim() ?? "";
    if (!selectedText) { hideBubble(); return; }

    const range = selection.getRangeAt(0);
    const rect  = range.getBoundingClientRect();
    const x     = rect.left + rect.width / 2;
    const y     = rect.top;

    currentOrig    = selectedText;
    currentSrcLang = isChinese(selectedText) ? "ZH" : "EN";

    if (isChinese(selectedText)) {
      renderPicker(x, y);
    } else {
      doTranslate(x, y, "ZH");
    }
  }, 300);
});

document.addEventListener("mousedown", hideBubble);

function hideBubble() {
  if (bubble) bubble.style.display = "none";
}
