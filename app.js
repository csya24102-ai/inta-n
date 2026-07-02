'use strict';

const STORAGE_KEY = 'intern-selection-manager.entries.v1';
const CRYPTO_META_KEY = 'intern-selection-manager.crypto-meta.v1';
const STATUS_OPTIONS = [
  ['応募予定', '応募予定'], ['応募準備中', '応募準備中'], ['応募済み', '応募済み'],
  ['書類選考中', '書類選考中'use strict';

const S'use strict';'use strict';

const STORAGE_KEY = 'intern-selection-manager.entries.v2';
const LEGACY_STORAGE_KEY = 'inte(() => {
  "use strict";

  const VERSION = "v10";
  const STORAGE_KEY = "intern-selection-manager.entries.v10";
  const LEGACY_STORAGE_KEYS = [
    "intern-selection-manager.entries.v1",
    "intern-selection-manager.entries.v7",
    "intern-selection-manager.entries.v8",
    "intern-selection-manager.entries.v9"
  ];
  const CRYPTO_META_KEY = "intern-selection-manager.crypto-meta.v10";

  const state = {
    entries: [],
    cryptoKey: null,
    deleteId: null,
    toastTimer: null
  };

  const $ = (id) => document.getElementById(id);

  function safeText(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeCompany(value) {
    return String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ja-JP");
  }

  function createId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  }

  function base64FromBytes(bytes) {
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function bytesFromBase64(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function isCryptoAvailable() {
    return Boolean(window.crypto && window.crypto.subtle);
  }

  function showToast(message) {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  function setFormMessage(message = "") {
    const el = $("formMessage");
    if (el) el.textContent = message;
  }

  function setNetworkStatus() {
    const status = $("networkStatus");
    if (!status) return;
    const online = navigator.onLine;
    status.textContent = online ? "オンライン" : "オフライン";
    status.classList.toggle("offline", !online);
    status.classList.toggle("ready", online);
  }

  function getRawEntries() {
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) return JSON.parse(current);
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const oldValue = localStorage.getItem(legacyKey);
        if (oldValue) return JSON.parse(oldValue);
      }
    } catch (error) {
      console.error("データの読込に失敗しました", error);
    }
    return [];
  }

  function migrateEntry(raw) {
    const deadlineList = Array.isArray(raw.deadlines)
      ? raw.deadlines
      : raw.deadline
        ? [{ type: "その他", label: "締切", at: raw.deadline }]
        : [];

    return {
      id: raw.id || createId(),
      companyName: String(raw.companyName || raw.company || "").trim(),
      companyNormalized: normalizeCompany(raw.companyName || raw.company || ""),
      selectionStatus: raw.selectionStatus || "",
      preference: raw.preference || "",
      deadlines: deadlineList
        .map((item) => ({
          type: String(item.type || ""),
          label: String(item.label || item.name || ""),
          at: String(item.at || item.deadlineAt || "")
        }))
        .filter((item) => item.type || item.label || item.at),
      internshipAt: String(raw.internshipAt || ""),
      interviewAt: String(raw.interviewAt || ""),
      mypageUrl: String(raw.mypageUrl || raw.portalUrl || ""),
      memo: String(raw.memo || ""),
      credentialsEnc: raw.credentialsEnc || null,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString()
    };
  }

  function loadEntries() {
    state.entries = getRawEntries().map(migrateEntry).filter((entry) => entry.companyName);
    saveEntries();
  }

  function saveEntries() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
    } catch (error) {
      console.error("データの保存に失敗しました", error);
      setFormMessage("保存に失敗しました。ブラウザの保存領域を確認してください。");
    }
  }

  function addDeadlineRow(data = {}) {
    const template = $("deadlineTemplate");
    const container = $("deadlinesContainer");
    if (!template || !container) return;

    const row = template.content.firstElementChild.cloneNode(true);
    row.querySelector("[data-deadline-type]").value = data.type || "";
    row.querySelector("[data-deadline-label]").value = data.label || "";
    row.querySelector("[data-deadline-at]").value = toInputDateTime(data.at || "");
    container.appendChild(row);
  }

  function clearDeadlineRows() {
    const container = $("deadlinesContainer");
    if (container) container.innerHTML = "";
  }

  function collectDeadlines() {
    const container = $("deadlinesContainer");
    if (!container) return [];
    return Array.from(container.querySelectorAll(".deadline-row"))
      .map((row) => ({
        type: row.querySelector("[data-deadline-type]")?.value || "",
        label: row.querySelector("[data-deadline-label]")?.value.trim() || "",
        at: row.querySelector("[data-deadline-at]")?.value || ""
      }))
      .filter((item) => item.type || item.label || item.at);
  }

  function toInputDateTime(value) {
    if (!value) return "";
    return String(value).slice(0, 16);
  }

  function formatDateTime(value) {
    if (!value) return '<span class="cell-note">未定</span>';
    const normalized = String(value).replace("T", " ");
    return safeText(normalized);
  }

  function preferenceClass(value) {
    return {
      "第一志望": "first",
      "高い": "high",
      "低い": "low"
    }[value] || "";
  }

  function deadlineSummary(deadlines) {
    if (!deadlines || deadlines.length === 0) return '<span class="cell-note">未登録</span>';
    const list = deadlines.slice(0, 3).map((item) => {
      const name = [item.type, item.label].filter(Boolean).join("：") || "締切";
      const date = item.at ? `（${safeText(String(item.at).replace("T", " "))}）` : "（未定）";
      return `<li>${safeText(name)}${date}</li>`;
    }).join("");
    const more = deadlines.length > 3 ? `<div class="cell-note">ほか${deadlines.length - 3}件</div>` : "";
    return `<ul class="deadline-list">${list}</ul>${more}`;
  }

  function formatSchedule(entry) {
    const intern = entry.internshipAt
      ? `インターン：${formatDateTime(entry.internshipAt)}`
      : "インターン：<span class=\"cell-note\">未定</span>";
    const interview = entry.interviewAt
      ? `面接：${formatDateTime(entry.interviewAt)}`
      : "面接：<span class=\"cell-note\">未定</span>";
    return `<div>${intern}</div><div>${interview}</div>`;
  }

  function renderEntries() {
    const body = $("entryTableBody");
    const empty = $("emptyMessage");
    if (!body || !empty) return;

    const filter = normalizeCompany($("filterText")?.value || "");
    const entries = [...state.entries]
      .filter((entry) => !filter || entry.companyNormalized.includes(filter))
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

    empty.hidden = entries.length > 0;
    body.innerHTML = entries.map((entry) => {
      const pageActions = entry.mypageUrl
        ? `<div class="table-actions">
             <a class="table-link" href="${safeText(entry.mypageUrl)}" target="_blank" rel="noopener noreferrer">開く</a>
             <button class="table-button" type="button" data-action="copy-url" data-id="${entry.id}">URLコピー</button>
           </div>`
        : '<span class="cell-note">未登録</span>';

      return `<tr>
        <td><span class="company-name">${safeText(entry.companyName)}</span></td>
        <td>${entry.selectionStatus ? `<span class="pill">${safeText(entry.selectionStatus)}</span>` : '<span class="cell-note">未選択</span>'}</td>
        <td>${entry.preference ? `<span class="pill ${preferenceClass(entry.preference)}">${safeText(entry.preference)}</span>` : '<span class="cell-note">未選択</span>'}</td>
        <td>${deadlineSummary(entry.deadlines)}</td>
        <td>${formatSchedule(entry)}</td>
        <td>${pageActions}</td>
        <td><div class="table-actions">
          <button class="table-button" type="button" data-action="copy-id" data-id="${entry.id}">IDコピー</button>
          <button class="table-button" type="button" data-action="copy-password" data-id="${entry.id}">パスコピー</button>
        </div></td>
        <td><div class="table-actions">
          <button class="table-button" type="button" data-action="edit" data-id="${entry.id}">編集</button>
          <button class="table-button danger" type="button" data-action="delete" data-id="${entry.id}">削除</button>
        </div></td>
      </tr>`;
    }).join("");
  }

  function resetForm() {
    const form = $("entryForm");
    if (form) form.reset();
    $("entryId").value = "";
    $("formTitle").textContent = "企業を登録";
    $("saveButton").textContent = "登録する";
    $("cancelEditButton").hidden = true;
    setFormMessage("");
    clearDeadlineRows();
    addDeadlineRow();
    $("loginId").value = "";
    $("sitePassword").value = "";
    $("sitePassword").type = "password";
    $("togglePasswordButton").textContent = "表示";
    updateCredentialUi();
  }

  function updateCredentialUi() {
    const unlocked = Boolean(state.cryptoKey);
    $("loginId").disabled = !unlocked;
    $("sitePassword").disabled = !unlocked;
    $("togglePasswordButton").disabled = !unlocked;
    $("unlockButton").textContent = unlocked ? "認証情報をロック" : "認証情報をロック解除";
    $("lockMessage").textContent = unlocked
      ? "ロック解除中です。ID・パスワードを入力・コピーできます。"
      : "認証情報はロック中です。入力するには右上の「認証情報をロック解除」を押してください。";
  }

  async function deriveKey(password, saltBase64, iterations) {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: bytesFromBase64(saltBase64), iterations, hash: "SHA-256" },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptText(text, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      new TextEncoder().encode(text)
    );
    return { iv: base64FromBytes(iv), data: base64FromBytes(new Uint8Array(cipher)) };
  }

  async function decryptText(payload, key) {
    const result = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytesFromBase64(payload.iv) },
      key,
      bytesFromBase64(payload.data)
    );
    return new TextDecoder().decode(result);
  }

  function getCryptoMeta() {
    try {
      return JSON.parse(localStorage.getItem(CRYPTO_META_KEY) || "null");
    } catch {
      return null;
    }
  }

  async function createMasterPassword(password) {
    const salt = base64FromBytes(crypto.getRandomValues(new Uint8Array(16)));
    const iterations = 210000;
    const key = await deriveKey(password, salt, iterations);
    const verifier = await encryptText("intern-selection-manager-v10", key);
    localStorage.setItem(CRYPTO_META_KEY, JSON.stringify({ salt, iterations, verifier }));
    state.cryptoKey = key;
  }

  async function unlockMasterPassword(password) {
    const meta = getCryptoMeta();
    if (!meta) throw new Error("アプリ用パスワードが未設定です。");
    const key = await deriveKey(password, meta.salt, meta.iterations);
    const verifier = await decryptText(meta.verifier, key);
    if (verifier !== "intern-selection-manager-v10") throw new Error("パスワードが違います。");
    state.cryptoKey = key;
  }

  function openMasterDialog() {
    if (!isCryptoAvailable()) {
      showToast("このブラウザでは認証情報の暗号化に対応していません。");
      return;
    }
    const dialog = $("masterPasswordDialog");
    const hasMeta = Boolean(getCryptoMeta());
    $("masterPasswordForm").reset();
    $("masterError").textContent = "";
    $("masterTitle").textContent = hasMeta ? "認証情報のロック解除" : "認証情報を保護";
    $("masterDescription").textContent = hasMeta
      ? "アプリ用パスワードを入力すると、保存済みのID・パスワードを利用できます。"
      : "ID・パスワードを端末内で暗号化保存するため、8文字以上のアプリ用パスワードを設定してください。";
    $("masterConfirmArea").hidden = hasMeta;
    $("masterPasswordConfirm").required = !hasMeta;
    $("masterSubmitButton").textContent = hasMeta ? "ロックを解除する" : "設定して続ける";
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    setTimeout(() => $("masterPassword").focus(), 0);
  }

  async function submitMasterPassword(event) {
    event.preventDefault();
    const hasMeta = Boolean(getCryptoMeta());
    const password = $("masterPassword").value;
    const confirmation = $("masterPasswordConfirm").value;
    $("masterError").textContent = "";

    if (password.length < 8) {
      $("masterError").textContent = "アプリ用パスワードは8文字以上にしてください。";
      return;
    }
    if (!hasMeta && password !== confirmation) {
      $("masterError").textContent = "確認用パスワードが一致しません。";
      return;
    }

    try {
      if (hasMeta) await unlockMasterPassword(password);
      else await createMasterPassword(password);
      $("masterPasswordDialog").close();
      updateCredentialUi();
      showToast("認証情報を利用できる状態にしました。");
    } catch (error) {
      console.error(error);
      $("masterError").textContent = "アプリ用パスワードが正しくありません。";
    }
  }

  function lockCredentials() {
    state.cryptoKey = null;
    $("loginId").value = "";
    $("sitePassword").value = "";
    $("sitePassword").type = "password";
    $("togglePasswordButton").textContent = "表示";
    updateCredentialUi();
    showToast("認証情報をロックしました。");
  }

  async function saveEntry(event) {
    event.preventDefault();
    setFormMessage("");

    try {
      const companyName = $("companyName").value.trim();
      const editId = $("entryId").value;
      const mypageUrl = $("mypageUrl").value.trim();

      if (!companyName) {
        setFormMessage("社名は必須です。");
        return;
      }

      if (mypageUrl) {
        try {
          const parsed = new URL(mypageUrl);
          if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("protocol");
        } catch {
          setFormMessage("マイページURLは http:// または https:// で始まる形式で入力してください。");
          return;
        }
      }

      const normalized = normalizeCompany(companyName);
      const duplicate = state.entries.find((entry) => entry.id !== editId && entry.companyNormalized === normalized);
      if (duplicate) {
        setFormMessage("同じ社名の企業はすでに登録されています。");
        return;
      }

      const oldEntry = state.entries.find((entry) => entry.id === editId);
      const now = new Date().toISOString();
      let credentialsEnc = oldEntry?.credentialsEnc || null;

      if (state.cryptoKey) {
        const loginId = $("loginId").value.trim();
        const password = $("sitePassword").value;
        credentialsEnc = (loginId || password)
          ? await encryptText(JSON.stringify({ loginId, password }), state.cryptoKey)
          : null;
      }

      const entry = {
        id: editId || createId(),
        companyName,
        companyNormalized: normalized,
        selectionStatus: $("selectionStatus").value,
        preference: $("preference").value,
        deadlines: collectDeadlines(),
        internshipAt: $("internshipAt").value,
        interviewAt: $("interviewAt").value,
        mypageUrl,
        memo: $("memo").value.trim(),
        credentialsEnc,
        createdAt: oldEntry?.createdAt || now,
        updatedAt: now
      };

      state.entries = oldEntry
        ? state.entries.map((item) => item.id === entry.id ? entry : item)
        : [...state.entries, entry];

      saveEntries();
      renderEntries();
      resetForm();
      showToast(oldEntry ? "企業情報を更新しました。" : "企業情報を登録しました。");
    } catch (error) {
      console.error("保存エラー", error);
      setFormMessage("保存中にエラーが発生しました。入力内容を確認してください。");
    }
  }

  async function startEdit(id) {
    const entry = state.entries.find((item) => item.id === id);
    if (!entry) return;

    resetForm();
    $("entryId").value = entry.id;
    $("companyName").value = entry.companyName;
    $("selectionStatus").value = entry.selectionStatus || "";
    $("preference").value = entry.preference || "";
    $("internshipAt").value = toInputDateTime(entry.internshipAt);
    $("interviewAt").value = toInputDateTime(entry.interviewAt);
    $("mypageUrl").value = entry.mypageUrl || "";
    $("memo").value = entry.memo || "";
    $("formTitle").textContent = "企業を編集";
    $("saveButton").textContent = "更新する";
    $("cancelEditButton").hidden = false;

    clearDeadlineRows();
    if (entry.deadlines.length) entry.deadlines.forEach(addDeadlineRow);
    else addDeadlineRow();

    if (state.cryptoKey && entry.credentialsEnc) {
      try {
        const credentials = JSON.parse(await decryptText(entry.credentialsEnc, state.cryptoKey));
        $("loginId").value = credentials.loginId || "";
        $("sitePassword").value = credentials.password || "";
      } catch (error) {
        console.error(error);
        showToast("認証情報を読み取れませんでした。ロック解除用パスワードを確認してください。");
      }
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyText(value, message) {
    if (!value) {
      showToast("コピーする情報が登録されていません。");
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      showToast(message);
    } catch (error) {
      console.error(error);
      showToast("コピーできませんでした。ブラウザの権限を確認してください。");
    }
  }

  async function handleTableAction(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const entry = state.entries.find((item) => item.id === button.dataset.id);
    if (!entry) return;
    const action = button.dataset.action;

    if (action === "edit") return startEdit(entry.id);
    if (action === "delete") {
      if (window.confirm(`「${entry.companyName}」を削除しますか？`)) {
        state.entries = state.entries.filter((item) => item.id !== entry.id);
        saveEntries();
        renderEntries();
        resetForm();
        showToast("企業情報を削除しました。");
      }
      return;
    }
    if (action === "copy-url") return copyText(entry.mypageUrl, "マイページURLをコピーしました。");

    if (!state.cryptoKey) {
      showToast("認証情報を使うには右上からロックを解除してください。");
      return;
    }

    try {
      const credentials = entry.credentialsEnc
        ? JSON.parse(await decryptText(entry.credentialsEnc, state.cryptoKey))
        : { loginId: "", password: "" };

      if (action === "copy-id") return copyText(credentials.loginId, "IDをコピーしました。");
      if (action === "copy-password") return copyText(credentials.password, "パスワードをコピーしました。");
    } catch (error) {
      console.error(error);
      showToast("認証情報を復号できませんでした。");
    }
  }

  function handleLookup() {
    const companyName = $("lookupCompany").value.trim();
    const result = $("lookupResult");
    if (!companyName) {
      result.textContent = "社名を入力してください。";
      return;
    }

    const normalized = normalizeCompany(companyName);
    const exact = state.entries.find((entry) => entry.companyNormalized === normalized);
    const target = exact?.mypageUrl || `https://www.google.com/search?q=${encodeURIComponent(`${companyName} 公式サイト`)}`;

    if (exact?.mypageUrl) {
      result.textContent = `「${exact.companyName}」の登録済みマイページを開きます。`;
    } else {
      result.textContent = `登録済みのマイページURLがないため、「${companyName} 公式サイト」を検索します。`;
    }
    window.open(target, "_blank", "noopener,noreferrer");
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("./sw.js?v=10", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch((error) => console.warn("Service Workerの登録に失敗しました", error));
  }

  function bindEvents() {
    $("entryForm").addEventListener("submit", saveEntry);
    $("resetFormButton").addEventListener("click", resetForm);
    $("cancelEditButton").addEventListener("click", resetForm);
    $("filterText").addEventListener("input", renderEntries);
    $("lookupButton").addEventListener("click", handleLookup);
    $("lookupCompany").addEventListener("keydown", (event) => {
      if (event.key === "Enter") handleLookup();
    });

    $("addDeadlineButton").addEventListener("click", () => {
      addDeadlineRow();
      showToast("締切入力行を追加しました。");
    });

    $("deadlinesContainer").addEventListener("click", (event) => {
      const removeButton = event.target.closest('[data-action="remove-deadline"]');
      if (!removeButton) return;
      removeButton.closest(".deadline-row")?.remove();
      showToast("締切入力行を削除しました。");
    });

    $("entryTableBody").addEventListener("click", (event) => {
      handleTableAction(event).catch((error) => {
        console.error(error);
        showToast("操作中にエラーが発生しました。");
      });
    });

    $("unlockButton").addEventListener("click", () => {
      if (state.cryptoKey) lockCredentials();
      else openMasterDialog();
    });

    $("togglePasswordButton").addEventListener("click", () => {
      const input = $("sitePassword");
      const hidden = input.type === "password";
      input.type = hidden ? "text" : "password";
      $("togglePasswordButton").textContent = hidden ? "隠す" : "表示";
    });

    $("masterPasswordForm").addEventListener("submit", (event) => {
      submitMasterPassword(event).catch((error) => {
        console.error(error);
        $("masterError").textContent = "処理に失敗しました。もう一度試してください。";
      });
    });
    $("masterCancelButton").addEventListener("click", () => $("masterPasswordDialog").close());

    window.addEventListener("online", setNetworkStatus);
    window.addEventListener("offline", setNetworkStatus);
  }

  function boot() {
    // 最初に表示を更新しておく。以降の処理に失敗しても「確認中」で止まりにくくする。
    setNetworkStatus();
    try {
      loadEntries();
      bindEvents();
      renderEntries();
      resetForm();
      updateCredentialUi();
      registerServiceWorker();
      console.info(`Intern Selection Manager ${VERSION} started`);
    } catch (error) {
      console.error("アプリ起動エラー", error);
      const status = $("networkStatus");
      if (status) {
        status.textContent = "起動エラー";
        status.classList.remove("ready");
        status.classList.add("offline");
      }
      showToast("アプリの起動に失敗しました。更新反映用ページを開いてください。");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
rn-selection-manager.entries.v1';
const CRYPTO_META_KEY = 'intern-selection-manager.crypto-meta.v1';

const STATUS_OPTIONS = [
  ['', '未選択'],
  ['応募予定', '応募予定'],
  ['応募準備中', '応募準備中'],
  ['応募済み', '応募済み'],
  ['書類選考中', '書類選考中'],
  ['面接予定', '面接予定'],
  ['選考中', '選考中'],
  ['合格', '合格'],
  ['不合格', '不合格'],
  ['辞退', '辞退'],
  ['終了', '終了']
];

const PREFERENCE_OPTIONS = [
  ['', '未選択'],
  ['第一志望', '第一志望'],
  ['高い', '高い'],
  ['普通', '普通'],
  ['低い', '低い']
];

const DEADLINE_TYPE_OPTIONS = [
  ['', '締切種類を選択'],
  ['ES締切', 'ES締切'],
  ['Webテスト締切', 'Webテスト締切'],
  ['適性検査締切', '適性検査締切'],
  ['応募締切', '応募締切'],
  ['書類提出締切', '書類提出締切'],
  ['その他', 'その他']
];

const $ = (id) => document.getElementById(id);

const state = {
  entries: [],
  cryptoKey: null,
  deferredPrompt: null,
  deleteId: null,
  toastTimer: null
};

function escapeHtml(text = '') {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function uuid() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function normalize(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ja-JP');
}

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function normalizeDeadlineItem(item = {}) {
  return {
    id: item.id || uuid(),
    type: String(item.type || ''),
    label: String(item.label || ''),
    dueAt: String(item.dueAt || '')
  };
}

function normalizeEntry(entry = {}) {
  const oldDeadlineItems = Array.isArray(entry.deadlineItems)
    ? entry.deadlineItems.map(normalizeDeadlineItem)
    : entry.deadline
      ? [normalizeDeadlineItem({ type: '締切', dueAt: entry.deadline })]
      : [];

  const companyName = String(entry.companyName || '').trim();

  return {
    id: entry.id || uuid(),
    companyName,
    companyNormalized: normalize(companyName || entry.companyNormalized),
    selectionStatus: String(entry.selectionStatus || ''),
    preference: String(entry.preference || ''),
    deadlineItems: oldDeadlineItems,
    internshipAt: String(entry.internshipAt || ''),
    mypageUrl: String(entry.mypageUrl || ''),
    memo: String(entry.memo || ''),
    credentialsEnc: entry.credentialsEnc || null,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
  };
}

function readEntries() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(current)) {
      return current.map(normalizeEntry);
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (Array.isArray(legacy)) {
      const migrated = legacy.map(normalizeEntry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    return [];
  }

  return [];
}

function writeEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function getCryptoMeta() {
  try {
    return JSON.parse(localStorage.getItem(CRYPTO_META_KEY));
  } catch {
    return null;
  }
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function fillSelect(selectId, options) {
  const select = $(selectId);
  if (!select) {
    throw new Error(`選択欄 #${selectId} が見つかりません。index.html と app.js を同じ更新版にしてください。`);
  }

  select.innerHTML = options
    .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    .join('');
}

function setupSelects() {
  fillSelect('selectionStatus', STATUS_OPTIONS);
  fillSelect('preference', PREFERENCE_OPTIONS);
}

function deadlineTypeOptionsHtml(selectedValue = '') {
  return DEADLINE_TYPE_OPTIONS
    .map(([value, label]) => {
      const selected = value === selectedValue ? ' selected' : '';
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function addDeadlineRow(item = {}) {
  const deadline = normalizeDeadlineItem(item);
  const row = document.createElement('div');
  row.className = 'deadline-row';
  row.dataset.deadlineId = deadline.id;
  row.innerHTML = `
    <div class="field">
      <label>種類</label>
      <select class="deadline-type">${deadlineTypeOptionsHtml(deadline.type)}</select>
    </div>
    <div class="field">
      <label>締切名（任意）</label>
      <input class="deadline-label" type="text" maxlength="60" placeholder="例：第1回ES" value="${escapeHtml(deadline.label)}" />
    </div>
    <div class="field">
      <label>締切日時</label>
      <input class="deadline-date-input" type="datetime-local" value="${escapeHtml(toLocalInputValue(deadline.dueAt))}" />
    </div>
    <button class="button secondary compact" type="button" data-action="remove-deadline">削除</button>
  `;
  const container = $('deadlineItems');
  if (!container) {
    throw new Error('締切の入力欄が見つかりません。index.html を更新してください。');
  }
  container.append(row);
}

// HTML側のクリック処理からも呼べるように明示的に公開します。
window.addDeadlineRow = addDeadlineRow;

function getDeadlineItemsFromForm() {
  return [...$('deadlineItems').querySelectorAll('.deadline-row')]
    .map((row) => ({
      id: row.dataset.deadlineId || uuid(),
      type: row.querySelector('.deadline-type').value,
      label: row.querySelector('.deadline-label').value.trim(),
      dueAt: row.querySelector('.deadline-date-input').value
        ? new Date(row.querySelector('.deadline-date-input').value).toISOString()
        : ''
    }))
    .filter((item) => item.type || item.label || item.dueAt);
}

function toLocalInputValue(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

async function deriveKey(masterPassword, salt, iterations) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromBase64(salt),
      iterations,
      hash: 'SHA-256'
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(text, key = state.cryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );

  return {
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted))
  };
}

async function decryptText(payload, key = state.cryptoKey) {
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.data)
  );

  return new TextDecoder().decode(data);
}

async function createMasterPassword(password) {
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const iterations = 250000;
  const key = await deriveKey(password, salt, iterations);
  const verifier = await encryptText('intern-selection-manager-verifier-v1', key);

  localStorage.setItem(CRYPTO_META_KEY, JSON.stringify({ salt, iterations, verifier }));
  state.cryptoKey = key;
}

async function unlockMasterPassword(password) {
  const meta = getCryptoMeta();
  if (!meta) {
    throw new Error('アプリ用パスワードが未設定です。');
  }

  const key = await deriveKey(password, meta.salt, meta.iterations);
  const value = await decryptText(meta.verifier, key);
  if (value !== 'intern-selection-manager-verifier-v1') {
    throw new Error('wrong password');
  }

  state.cryptoKey = key;
}

function isUnlocked() {
  return Boolean(state.cryptoKey);
}

function updateLockUi() {
  const unlocked = isUnlocked();
  $('loginId').disabled = !unlocked;
  $('sitePassword').disabled = !unlocked;
  $('togglePasswordButton').disabled = !unlocked;
  $('unlockButton').textContent = unlocked ? '認証情報をロック' : '認証情報をロック解除';
  $('lockMessage').textContent = unlocked
    ? 'ロック解除中です。ID・パスワードを入力またはコピーできます。'
    : '認証情報はロック中です。入力するにはロックを解除してください。';
}

function lockApp() {
  state.cryptoKey = null;
  $('loginId').value = '';
  $('sitePassword').value = '';
  $('sitePassword').type = 'password';
  $('togglePasswordButton').textContent = '表示';
  updateLockUi();
  showToast('認証情報をロックしました。');
}

function formatDate(value) {
  if (!value) {
    return '<span class="cell-note">未定</span>';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '<span class="cell-note">未定</span>';
  }

  return escapeHtml(
    new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  );
}

function deadlineName(item) {
  return item.label || item.type || '締切';
}

function formatDeadlines(items = []) {
  if (!items.length) {
    return '<span class="cell-note">未設定</span>';
  }

  return `<ul class="deadline-list">${items
    .map(
      (item) => `
        <li>
          <span class="deadline-name">${escapeHtml(deadlineName(item))}</span>
          <span class="deadline-date">${formatDate(item.dueAt)}</span>
        </li>`
    )
    .join('')}</ul>`;
}

function preferenceClass(value) {
  return {
    第一志望: 'first',
    高い: 'high',
    低い: 'low',
    '': 'unset'
  }[value] || '';
}

function displayOrUnset(value) {
  return value || '未設定';
}

function findExactEntryByCompany(name) {
  const key = normalize(name);
  return state.entries.find((entry) => entry.companyNormalized === key) || null;
}

function renderEntries() {
  const filter = normalize($('filterText').value || '');
  const entries = [...state.entries]
    .filter((entry) => !filter || entry.companyNormalized.includes(filter))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  $('emptyMessage').hidden = entries.length > 0;

  $('entryTableBody').innerHTML = entries
    .map((entry) => {
      const mypage = entry.mypageUrl
        ? `
          <a class="table-link" href="${escapeHtml(entry.mypageUrl)}" target="_blank" rel="noopener noreferrer">開く</a>
          <button class="table-button" data-action="copy-url" data-id="${entry.id}">URLコピー</button>`
        : '<span class="cell-note">未登録</span>';

      return `
        <tr>
          <td><span class="company-name">${escapeHtml(entry.companyName)}</span></td>
          <td><span class="pill ${entry.selectionStatus ? '' : 'unset'}">${escapeHtml(displayOrUnset(entry.selectionStatus))}</span></td>
          <td><span class="pill ${preferenceClass(entry.preference)}">${escapeHtml(displayOrUnset(entry.preference))}</span></td>
          <td>${formatDeadlines(entry.deadlineItems)}</td>
          <td>${formatDate(entry.internshipAt)}</td>
          <td><div class="table-actions">${mypage}</div></td>
          <td>
            <div class="table-actions">
              <button class="table-button" data-action="copy-id" data-id="${entry.id}">IDコピー</button>
              <button class="table-button" data-action="copy-password" data-id="${entry.id}">パスコピー</button>
            </div>
          </td>
          <td>
            <div class="table-actions">
              <button class="table-button" data-action="edit" data-id="${entry.id}">編集</button>
              <button class="table-button danger" data-action="delete" data-id="${entry.id}">削除</button>
            </div>
          </td>
        </tr>`;
    })
    .join('');
}

function openCompanySite() {
  const companyName = $('lookupCompany').value.trim();
  const result = $('lookupResult');

  if (!companyName) {
    result.textContent = '社名を入力してください。';
    return;
  }

  const entry = findExactEntryByCompany(companyName);
  if (entry?.mypageUrl) {
    window.open(entry.mypageUrl, '_blank', 'noopener');
    result.textContent = `「${entry.companyName}」の登録済みマイページを新しいタブで開きました。`;
    return;
  }

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${companyName} 公式サイト`)}`;
  window.open(searchUrl, '_blank', 'noopener');
  result.textContent = `「${companyName} 公式サイト」の検索結果を新しいタブで開きました。検索結果から公式サイトを確認してください。`;
}

function resetDeadlineRows(items = []) {
  $('deadlineItems').innerHTML = '';
  if (items.length) {
    items.forEach(addDeadlineRow);
  } else {
    addDeadlineRow();
  }
}

function resetForm() {
  $('entryForm').reset();
  $('entryId').value = '';
  $('formTitle').textContent = '企業を登録';
  $('saveButton').textContent = '登録する';
  $('cancelEditButton').hidden = true;
  $('formMessage').textContent = '';
  $('selectionStatus').value = '';
  $('preference').value = '';
  $('loginId').value = '';
  $('sitePassword').value = '';
  $('sitePassword').type = 'password';
  $('togglePasswordButton').textContent = '表示';
  resetDeadlineRows();
}

async function startEdit(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  $('entryId').value = entry.id;
  $('companyName').value = entry.companyName;
  $('selectionStatus').value = entry.selectionStatus;
  $('preference').value = entry.preference;
  $('internshipAt').value = toLocalInputValue(entry.internshipAt);
  $('mypageUrl').value = entry.mypageUrl || '';
  $('memo').value = entry.memo || '';
  resetDeadlineRows(entry.deadlineItems || []);

  $('formTitle').textContent = '企業を編集';
  $('saveButton').textContent = '更新する';
  $('cancelEditButton').hidden = false;
  $('formMessage').textContent = '';

  if (isUnlocked() && entry.credentialsEnc) {
    try {
      const credentials = JSON.parse(await decryptText(entry.credentialsEnc));
      $('loginId').value = credentials.loginId || '';
      $('sitePassword').value = credentials.password || '';
    } catch {
      showToast('認証情報を読み取れませんでした。');
    }
  } else {
    $('loginId').value = '';
    $('sitePassword').value = '';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveEntry(event) {
  event.preventDefault();
  $('formMessage').textContent = '';

  const companyName = $('companyName').value.trim();
  const mypageUrl = $('mypageUrl').value.trim();
  const editId = $('entryId').value;

  if (!companyName) {
    $('formMessage').textContent = '社名は必須です。';
    return;
  }

  if (mypageUrl) {
    try {
      const url = new URL(mypageUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('unsupported protocol');
      }
    } catch {
      $('formMessage').textContent = 'マイページURLは http:// または https:// で始まる形式で入力してください。';
      return;
    }
  }

  const companyNormalized = normalize(companyName);
  const duplicate = state.entries.find(
    (entry) => entry.id !== editId && entry.companyNormalized === companyNormalized
  );

  if (duplicate) {
    $('formMessage').textContent = '同じ社名の企業はすでに登録されています。編集から更新してください。';
    return;
  }

  const old = state.entries.find((entry) => entry.id === editId);
  const now = new Date().toISOString();

  const entry = {
    id: editId || uuid(),
    companyName,
    companyNormalized,
    selectionStatus: $('selectionStatus').value,
    preference: $('preference').value,
    deadlineItems: getDeadlineItemsFromForm(),
    internshipAt: $('internshipAt').value ? new Date($('internshipAt').value).toISOString() : '',
    mypageUrl,
    memo: $('memo').value.trim(),
    credentialsEnc: old?.credentialsEnc || null,
    createdAt: old?.createdAt || now,
    updatedAt: now
  };

  if (isUnlocked()) {
    const loginId = $('loginId').value.trim();
    const password = $('sitePassword').value;
    entry.credentialsEnc = loginId || password
      ? await encryptText(JSON.stringify({ loginId, password }))
      : null;
  }

  state.entries = old
    ? state.entries.map((item) => (item.id === entry.id ? entry : item))
    : [...state.entries, entry];

  writeEntries();
  resetForm();
  renderEntries();
  showToast(old ? '企業情報を更新しました。' : '企業情報を登録しました。');
}

async function copyText(value, successMessage) {
  if (!value) {
    showToast('コピーする情報が登録されていません。');
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    showToast(successMessage);
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    showToast(successMessage);
  }
}

async function handleTableClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) {
    return;
  }

  const entry = state.entries.find((item) => item.id === button.dataset.id);
  if (!entry) {
    return;
  }

  const action = button.dataset.action;
  if (action === 'edit') {
    return startEdit(entry.id);
  }

  if (action === 'delete') {
    state.deleteId = entry.id;
    $('deleteDialog').showModal();
    return;
  }

  if (action === 'copy-url') {
    return copyText(entry.mypageUrl, 'マイページURLをコピーしました。');
  }

  if (!isUnlocked()) {
    showToast('認証情報を使うにはロックを解除してください。');
    return;
  }

  try {
    const credentials = entry.credentialsEnc
      ? JSON.parse(await decryptText(entry.credentialsEnc))
      : { loginId: '', password: '' };

    if (action === 'copy-id') {
      return copyText(credentials.loginId, 'IDをコピーしました。');
    }

    if (action === 'copy-password') {
      return copyText(credentials.password, 'パスワードをコピーしました。');
    }
  } catch {
    showToast('認証情報を復号できませんでした。アプリ用パスワードを確認してください。');
  }
}

function openMasterDialog() {
  const hasMeta = Boolean(getCryptoMeta());
  $('masterPasswordForm').reset();
  $('masterError').textContent = '';
  $('masterTitle').textContent = hasMeta ? '認証情報のロック解除' : '認証情報を保護';
  $('masterDescription').textContent = hasMeta
    ? 'アプリ用パスワードを入力すると、保存済みのID・パスワードを利用できます。'
    : 'ID・パスワードを端末内で暗号化保存するため、8文字以上のアプリ用パスワードを設定してください。';
  $('masterConfirmArea').hidden = hasMeta;
  $('masterPasswordConfirm').required = !hasMeta;
  $('masterPassword').autocomplete = hasMeta ? 'current-password' : 'new-password';
  $('masterSubmit').textContent = hasMeta ? 'ロックを解除する' : '設定して続ける';
  $('masterPasswordDialog').showModal();
  setTimeout(() => $('masterPassword').focus(), 0);
}

async function submitMasterPassword(event) {
  event.preventDefault();
  const password = $('masterPassword').value;
  const confirm = $('masterPasswordConfirm').value;
  const hasMeta = Boolean(getCryptoMeta());

  if (password.length < 8) {
    $('masterError').textContent = 'アプリ用パスワードは8文字以上にしてください。';
    return;
  }

  if (!hasMeta && password !== confirm) {
    $('masterError').textContent = '確認用パスワードが一致しません。';
    return;
  }

  try {
    if (hasMeta) {
      await unlockMasterPassword(password);
    } else {
      await createMasterPassword(password);
    }
    $('masterPasswordDialog').close();
    updateLockUi();
    showToast('認証情報を利用できる状態にしました。');
  } catch {
    $('masterError').textContent = 'アプリ用パスワードが正しくありません。';
  }
}

function updateNetworkStatus() {
  const status = $('networkStatus');
  if (!status) {
    return;
  }

  status.textContent = navigator.onLine ? 'オンライン' : 'オフライン';
  status.classList.toggle('offline', !navigator.onLine);
}

function setupPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=8').catch(() => {
        showToast('オフライン機能を初期化できませんでした。');
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    $('installButton').hidden = false;
  });

  $('installButton').addEventListener('click', async () => {
    if (!state.deferredPrompt) {
      return;
    }
    state.deferredPrompt.prompt();
    await state.deferredPrompt.userChoice;
    $('installButton').hidden = true;
    state.deferredPrompt = null;
  });

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
}

function bindEvents() {
  $('entryForm').addEventListener('submit', saveEntry);
  $('resetButton').addEventListener('click', resetForm);
  $('cancelEditButton').addEventListener('click', resetForm);
  $('filterText').addEventListener('input', renderEntries);
  $('lookupButton').addEventListener('click', openCompanySite);
  $('lookupCompany').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      openCompanySite();
    }
  });
  $('entryTableBody').addEventListener('click', handleTableClick);
  $('addDeadlineButton').addEventListener('click', (event) => {
    event.preventDefault();
    addDeadlineRow();
  });
  $('deadlineItems').addEventListener('click', (event) => {
    if (event.target.closest('[data-action="remove-deadline"]')) {
      event.target.closest('.deadline-row').remove();
      if (!$('deadlineItems').children.length) {
        addDeadlineRow();
      }
    }
  });

  $('unlockButton').addEventListener('click', () => {
    if (isUnlocked()) {
      lockApp();
    } else {
      openMasterDialog();
    }
  });

  $('togglePasswordButton').addEventListener('click', () => {
    const hidden = $('sitePassword').type === 'password';
    $('sitePassword').type = hidden ? 'text' : 'password';
    $('togglePasswordButton').textContent = hidden ? '隠す' : '表示';
  });

  $('masterPasswordForm').addEventListener('submit', submitMasterPassword);

  $('deleteDialog').addEventListener('close', () => {
    if ($('deleteDialog').returnValue === 'delete' && state.deleteId) {
      state.entries = state.entries.filter((entry) => entry.id !== state.deleteId);
      writeEntries();
      renderEntries();
      resetForm();
      showToast('企業情報を削除しました。');
    }
    state.deleteId = null;
  });
}

function bootstrap() {
  updateNetworkStatus();

  try {
    if (!window.crypto?.subtle) {
      alert('このブラウザは暗号化機能に対応していません。最新のChrome、Edge、Safari、Firefoxを使用してください。');
    }

    setupSelects();
    state.entries = readEntries();
    bindEvents();
    updateLockUi();
    resetForm();
    renderEntries();
    setupPwa();
    document.documentElement.dataset.appReady = 'true';
  } catch (error) {
    console.error(error);
    const message = $('formMessage');
    if (message) {
      message.textContent = '画面の初期化に失敗しました。index.html・app.js・sw.js を同じv8版へ置き換え、ページを再読み込みしてください。';
    }
    const status = $('networkStatus');
    if (status) {
      status.textContent = '初期化エラー';
      status.classList.add('offline');
    }
    document.documentElement.dataset.appReady = 'error';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}


const STORAGE_KEY = 'intern-selection-manager.entries.v2';
const LEGACY_STORAGE_KEY = 'intern-selection-manager.entries.v1';
const CRYPTO_META_KEY = 'intern-selection-manager.crypto-meta.v1';

const STATUS_OPTIONS = [
  ['', '未選択'],
  ['応募予定', '応募予定'],
  ['応募準備中', '応募準備中'],
  ['応募済み', '応募済み'],
  ['書類選考中', '書類選考中'],
  ['面接予定', '面接予定'],
  ['選考中', '選考中'],
  ['合格', '合格'],
  ['不合格', '不合格'],
  ['辞退', '辞退'],
  ['終了', '終了']
];

const PREFERENCE_OPTIONS = [
  ['', '未選択'],
  ['第一志望', '第一志望'],
  ['高い', '高い'],
  ['普通', '普通'],
  ['低い', '低い']
];

const DEADLINE_TYPE_OPTIONS = [
  ['', '締切種類を選択'],
  ['ES締切', 'ES締切'],
  ['Webテスト締切', 'Webテスト締切'],
  ['適性検査締切', '適性検査締切'],
  ['応募締切', '応募締切'],
  ['書類提出締切', '書類提出締切'],
  ['その他', 'その他']
];

const $ = (id) => document.getElementById(id);

const state = {
  entries: [],
  cryptoKey: null,
  deferredPrompt: null,
  deleteId: null,
  toastTimer: null
};

function escapeHtml(text = '') {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function uuid() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function normalize(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ja-JP');
}

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function normalizeDeadlineItem(item = {}) {
  return {
    id: item.id || uuid(),
    type: String(item.type || ''),
    label: String(item.label || ''),
    dueAt: String(item.dueAt || '')
  };
}

function normalizeEntry(entry = {}) {
  const oldDeadlineItems = Array.isArray(entry.deadlineItems)
    ? entry.deadlineItems.map(normalizeDeadlineItem)
    : entry.deadline
      ? [normalizeDeadlineItem({ type: '締切', dueAt: entry.deadline })]
      : [];

  const companyName = String(entry.companyName || '').trim();

  return {
    id: entry.id || uuid(),
    companyName,
    companyNormalized: normalize(companyName || entry.companyNormalized),
    selectionStatus: String(entry.selectionStatus || ''),
    preference: String(entry.preference || ''),
    deadlineItems: oldDeadlineItems,
    internshipAt: String(entry.internshipAt || ''),
    mypageUrl: String(entry.mypageUrl || ''),
    memo: String(entry.memo || ''),
    credentialsEnc: entry.credentialsEnc || null,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
  };
}

function readEntries() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(current)) {
      return current.map(normalizeEntry);
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (Array.isArray(legacy)) {
      const migrated = legacy.map(normalizeEntry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    return [];
  }

  return [];
}

function writeEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function getCryptoMeta() {
  try {
    return JSON.parse(localStorage.getItem(CRYPTO_META_KEY));
  } catch {
    return null;
  }
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function fillSelect(selectId, options) {
  const select = $(selectId);
  if (!select) {
    throw new Error(`選択欄 #${selectId} が見つかりません。index.html と app.js を同じ更新版にしてください。`);
  }

  select.innerHTML = options
    .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    .join('');
}

function setupSelects() {
  fillSelect('selectionStatus', STATUS_OPTIONS);
  fillSelect('preference', PREFERENCE_OPTIONS);
}

function deadlineTypeOptionsHtml(selectedValue = '') {
  return DEADLINE_TYPE_OPTIONS
    .map(([value, label]) => {
      const selected = value === selectedValue ? ' selected' : '';
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function addDeadlineRow(item = {}) {
  const deadline = normalizeDeadlineItem(item);
  const row = document.createElement('div');
  row.className = 'deadline-row';
  row.dataset.deadlineId = deadline.id;
  row.innerHTML = `
    <div class="field">
      <label>種類</label>
      <select class="deadline-type">${deadlineTypeOptionsHtml(deadline.type)}</select>
    </div>
    <div class="field">
      <label>締切名（任意）</label>
      <input class="deadline-label" type="text" maxlength="60" placeholder="例：第1回ES" value="${escapeHtml(deadline.label)}" />
    </div>
    <div class="field">
      <label>締切日時</label>
      <input class="deadline-date-input" type="datetime-local" value="${escapeHtml(toLocalInputValue(deadline.dueAt))}" />
    </div>
    <button class="button secondary compact" type="button" data-action="remove-deadline">削除</button>
  `;
  const container = $('deadlineItems');
  if (!container) {
    throw new Error('締切の入力欄が見つかりません。index.html を更新してください。');
  }
  container.append(row);
}

// HTML側のクリック処理からも呼べるように明示的に公開します。
window.addDeadlineRow = addDeadlineRow;

function getDeadlineItemsFromForm() {
  return [...$('deadlineItems').querySelectorAll('.deadline-row')]
    .map((row) => ({
      id: row.dataset.deadlineId || uuid(),
      type: row.querySelector('.deadline-type').value,
      label: row.querySelector('.deadline-label').value.trim(),
      dueAt: row.querySelector('.deadline-date-input').value
        ? new Date(row.querySelector('.deadline-date-input').value).toISOString()
        : ''
    }))
    .filter((item) => item.type || item.label || item.dueAt);
}

function toLocalInputValue(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

async function deriveKey(masterPassword, salt, iterations) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromBase64(salt),
      iterations,
      hash: 'SHA-256'
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(text, key = state.cryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );

  return {
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted))
  };
}

async function decryptText(payload, key = state.cryptoKey) {
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.data)
  );

  return new TextDecoder().decode(data);
}

async function createMasterPassword(password) {
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const iterations = 250000;
  const key = await deriveKey(password, salt, iterations);
  const verifier = await encryptText('intern-selection-manager-verifier-v1', key);

  localStorage.setItem(CRYPTO_META_KEY, JSON.stringify({ salt, iterations, verifier }));
  state.cryptoKey = key;
}

async function unlockMasterPassword(password) {
  const meta = getCryptoMeta();
  if (!meta) {
    throw new Error('アプリ用パスワードが未設定です。');
  }

  const key = await deriveKey(password, meta.salt, meta.iterations);
  const value = await decryptText(meta.verifier, key);
  if (value !== 'intern-selection-manager-verifier-v1') {
    throw new Error('wrong password');
  }

  state.cryptoKey = key;
}

function isUnlocked() {
  return Boolean(state.cryptoKey);
}

function updateLockUi() {
  const unlocked = isUnlocked();
  $('loginId').disabled = !unlocked;
  $('sitePassword').disabled = !unlocked;
  $('togglePasswordButton').disabled = !unlocked;
  $('unlockButton').textContent = unlocked ? '認証情報をロック' : '認証情報をロック解除';
  $('lockMessage').textContent = unlocked
    ? 'ロック解除中です。ID・パスワードを入力またはコピーできます。'
    : '認証情報はロック中です。入力するにはロックを解除してください。';
}

function lockApp() {
  state.cryptoKey = null;
  $('loginId').value = '';
  $('sitePassword').value = '';
  $('sitePassword').type = 'password';
  $('togglePasswordButton').textContent = '表示';
  updateLockUi();
  showToast('認証情報をロックしました。');
}

function formatDate(value) {
  if (!value) {
    return '<span class="cell-note">未定</span>';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '<span class="cell-note">未定</span>';
  }

  return escapeHtml(
    new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  );
}

function deadlineName(item) {
  return item.label || item.type || '締切';
}

function formatDeadlines(items = []) {
  if (!items.length) {
    return '<span class="cell-note">未設定</span>';
  }

  return `<ul class="deadline-list">${items
    .map(
      (item) => `
        <li>
          <span class="deadline-name">${escapeHtml(deadlineName(item))}</span>
          <span class="deadline-date">${formatDate(item.dueAt)}</span>
        </li>`
    )
    .join('')}</ul>`;
}

function preferenceClass(value) {
  return {
    第一志望: 'first',
    高い: 'high',
    低い: 'low',
    '': 'unset'
  }[value] || '';
}

function displayOrUnset(value) {
  return value || '未設定';
}

function findExactEntryByCompany(name) {
  const key = normalize(name);
  return state.entries.find((entry) => entry.companyNormalized === key) || null;
}

function renderEntries() {
  const filter = normalize($('filterText').value || '');
  const entries = [...state.entries]
    .filter((entry) => !filter || entry.companyNormalized.includes(filter))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  $('emptyMessage').hidden = entries.length > 0;

  $('entryTableBody').innerHTML = entries
    .map((entry) => {
      const mypage = entry.mypageUrl
        ? `
          <a class="table-link" href="${escapeHtml(entry.mypageUrl)}" target="_blank" rel="noopener noreferrer">開く</a>
          <button class="table-button" data-action="copy-url" data-id="${entry.id}">URLコピー</button>`
        : '<span class="cell-note">未登録</span>';

      return `
        <tr>
          <td><span class="company-name">${escapeHtml(entry.companyName)}</span></td>
          <td><span class="pill ${entry.selectionStatus ? '' : 'unset'}">${escapeHtml(displayOrUnset(entry.selectionStatus))}</span></td>
          <td><span class="pill ${preferenceClass(entry.preference)}">${escapeHtml(displayOrUnset(entry.preference))}</span></td>
          <td>${formatDeadlines(entry.deadlineItems)}</td>
          <td>${formatDate(entry.internshipAt)}</td>
          <td><div class="table-actions">${mypage}</div></td>
          <td>
            <div class="table-actions">
              <button class="table-button" data-action="copy-id" data-id="${entry.id}">IDコピー</button>
              <button class="table-button" data-action="copy-password" data-id="${entry.id}">パスコピー</button>
            </div>
          </td>
          <td>
            <div class="table-actions">
              <button class="table-button" data-action="edit" data-id="${entry.id}">編集</button>
              <button class="table-button danger" data-action="delete" data-id="${entry.id}">削除</button>
            </div>
          </td>
        </tr>`;
    })
    .join('');
}

function openCompanySite() {
  const companyName = $('lookupCompany').value.trim();
  const result = $('lookupResult');

  if (!companyName) {
    result.textContent = '社名を入力してください。';
    return;
  }

  const entry = findExactEntryByCompany(companyName);
  if (entry?.mypageUrl) {
    window.open(entry.mypageUrl, '_blank', 'noopener');
    result.textContent = `「${entry.companyName}」の登録済みマイページを新しいタブで開きました。`;
    return;
  }

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${companyName} 公式サイト`)}`;
  window.open(searchUrl, '_blank', 'noopener');
  result.textContent = `「${companyName} 公式サイト」の検索結果を新しいタブで開きました。検索結果から公式サイトを確認してください。`;
}

function resetDeadlineRows(items = []) {
  $('deadlineItems').innerHTML = '';
  if (items.length) {
    items.forEach(addDeadlineRow);
  } else {
    addDeadlineRow();
  }
}

function resetForm() {
  $('entryForm').reset();
  $('entryId').value = '';
  $('formTitle').textContent = '企業を登録';
  $('saveButton').textContent = '登録する';
  $('cancelEditButton').hidden = true;
  $('formMessage').textContent = '';
  $('selectionStatus').value = '';
  $('preference').value = '';
  $('loginId').value = '';
  $('sitePassword').value = '';
  $('sitePassword').type = 'password';
  $('togglePasswordButton').textContent = '表示';
  resetDeadlineRows();
}

async function startEdit(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  $('entryId').value = entry.id;
  $('companyName').value = entry.companyName;
  $('selectionStatus').value = entry.selectionStatus;
  $('preference').value = entry.preference;
  $('internshipAt').value = toLocalInputValue(entry.internshipAt);
  $('mypageUrl').value = entry.mypageUrl || '';
  $('memo').value = entry.memo || '';
  resetDeadlineRows(entry.deadlineItems || []);

  $('formTitle').textContent = '企業を編集';
  $('saveButton').textContent = '更新する';
  $('cancelEditButton').hidden = false;
  $('formMessage').textContent = '';

  if (isUnlocked() && entry.credentialsEnc) {
    try {
      const credentials = JSON.parse(await decryptText(entry.credentialsEnc));
      $('loginId').value = credentials.loginId || '';
      $('sitePassword').value = credentials.password || '';
    } catch {
      showToast('認証情報を読み取れませんでした。');
    }
  } else {
    $('loginId').value = '';
    $('sitePassword').value = '';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveEntry(event) {
  event.preventDefault();
  $('formMessage').textContent = '';

  const companyName = $('companyName').value.trim();
  const mypageUrl = $('mypageUrl').value.trim();
  const editId = $('entryId').value;

  if (!companyName) {
    $('formMessage').textContent = '社名は必須です。';
    return;
  }

  if (mypageUrl) {
    try {
      const url = new URL(mypageUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('unsupported protocol');
      }
    } catch {
      $('formMessage').textContent = 'マイページURLは http:// または https:// で始まる形式で入力してください。';
      return;
    }
  }

  const companyNormalized = normalize(companyName);
  const duplicate = state.entries.find(
    (entry) => entry.id !== editId && entry.companyNormalized === companyNormalized
  );

  if (duplicate) {
    $('formMessage').textContent = '同じ社名の企業はすでに登録されています。編集から更新してください。';
    return;
  }

  const old = state.entries.find((entry) => entry.id === editId);
  const now = new Date().toISOString();

  const entry = {
    id: editId || uuid(),
    companyName,
    companyNormalized,
    selectionStatus: $('selectionStatus').value,
    preference: $('preference').value,
    deadlineItems: getDeadlineItemsFromForm(),
    internshipAt: $('internshipAt').value ? new Date($('internshipAt').value).toISOString() : '',
    mypageUrl,
    memo: $('memo').value.trim(),
    credentialsEnc: old?.credentialsEnc || null,
    createdAt: old?.createdAt || now,
    updatedAt: now
  };

  if (isUnlocked()) {
    const loginId = $('loginId').value.trim();
    const password = $('sitePassword').value;
    entry.credentialsEnc = loginId || password
      ? await encryptText(JSON.stringify({ loginId, password }))
      : null;
  }

  state.entries = old
    ? state.entries.map((item) => (item.id === entry.id ? entry : item))
    : [...state.entries, entry];

  writeEntries();
  resetForm();
  renderEntries();
  showToast(old ? '企業情報を更新しました。' : '企業情報を登録しました。');
}

async function copyText(value, successMessage) {
  if (!value) {
    showToast('コピーする情報が登録されていません。');
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    showToast(successMessage);
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    showToast(successMessage);
  }
}

async function handleTableClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) {
    return;
  }

  const entry = state.entries.find((item) => item.id === button.dataset.id);
  if (!entry) {
    return;
  }

  const action = button.dataset.action;
  if (action === 'edit') {
    return startEdit(entry.id);
  }

  if (action === 'delete') {
    state.deleteId = entry.id;
    $('deleteDialog').showModal();
    return;
  }

  if (action === 'copy-url') {
    return copyText(entry.mypageUrl, 'マイページURLをコピーしました。');
  }

  if (!isUnlocked()) {
    showToast('認証情報を使うにはロックを解除してください。');
    return;
  }

  try {
    const credentials = entry.credentialsEnc
      ? JSON.parse(await decryptText(entry.credentialsEnc))
      : { loginId: '', password: '' };

    if (action === 'copy-id') {
      return copyText(credentials.loginId, 'IDをコピーしました。');
    }

    if (action === 'copy-password') {
      return copyText(credentials.password, 'パスワードをコピーしました。');
    }
  } catch {
    showToast('認証情報を復号できませんでした。アプリ用パスワードを確認してください。');
  }
}

function openMasterDialog() {
  const hasMeta = Boolean(getCryptoMeta());
  $('masterPasswordForm').reset();
  $('masterError').textContent = '';
  $('masterTitle').textContent = hasMeta ? '認証情報のロック解除' : '認証情報を保護';
  $('masterDescription').textContent = hasMeta
    ? 'アプリ用パスワードを入力すると、保存済みのID・パスワードを利用できます。'
    : 'ID・パスワードを端末内で暗号化保存するため、8文字以上のアプリ用パスワードを設定してください。';
  $('masterConfirmArea').hidden = hasMeta;
  $('masterPasswordConfirm').required = !hasMeta;
  $('masterPassword').autocomplete = hasMeta ? 'current-password' : 'new-password';
  $('masterSubmit').textContent = hasMeta ? 'ロックを解除する' : '設定して続ける';
  $('masterPasswordDialog').showModal();
  setTimeout(() => $('masterPassword').focus(), 0);
}

async function submitMasterPassword(event) {
  event.preventDefault();
  const password = $('masterPassword').value;
  const confirm = $('masterPasswordConfirm').value;
  const hasMeta = Boolean(getCryptoMeta());

  if (password.length < 8) {
    $('masterError').textContent = 'アプリ用パスワードは8文字以上にしてください。';
    return;
  }

  if (!hasMeta && password !== confirm) {
    $('masterError').textContent = '確認用パスワードが一致しません。';
    return;
  }

  try {
    if (hasMeta) {
      await unlockMasterPassword(password);
    } else {
      await createMasterPassword(password);
    }
    $('masterPasswordDialog').close();
    updateLockUi();
    showToast('認証情報を利用できる状態にしました。');
  } catch {
    $('masterError').textContent = 'アプリ用パスワードが正しくありません。';
  }
}

function setupPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        showToast('オフライン機能を初期化できませんでした。');
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    $('installButton').hidden = false;
  });

  $('installButton').addEventListener('click', async () => {
    if (!state.deferredPrompt) {
      return;
    }
    state.deferredPrompt.prompt();
    await state.deferredPrompt.userChoice;
    $('installButton').hidden = true;
    state.deferredPrompt = null;
  });

  const updateNetworkStatus = () => {
    $('networkStatus').textContent = navigator.onLine ? 'オンライン' : 'オフライン';
    $('networkStatus').classList.toggle('offline', !navigator.onLine);
  };

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();
}

function bindEvents() {
  $('entryForm').addEventListener('submit', saveEntry);
  $('resetButton').addEventListener('click', resetForm);
  $('cancelEditButton').addEventListener('click', resetForm);
  $('filterText').addEventListener('input', renderEntries);
  $('lookupButton').addEventListener('click', openCompanySite);
  $('lookupCompany').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      openCompanySite();
    }
  });
  $('entryTableBody').addEventListener('click', handleTableClick);
  $('deadlineItems').addEventListener('click', (event) => {
    if (event.target.closest('[data-action="remove-deadline"]')) {
      event.target.closest('.deadline-row').remove();
      if (!$('deadlineItems').children.length) {
        addDeadlineRow();
      }
    }
  });

  $('unlockButton').addEventListener('click', () => {
    if (isUnlocked()) {
      lockApp();
    } else {
      openMasterDialog();
    }
  });

  $('togglePasswordButton').addEventListener('click', () => {
    const hidden = $('sitePassword').type === 'password';
    $('sitePassword').type = hidden ? 'text' : 'password';
    $('togglePasswordButton').textContent = hidden ? '隠す' : '表示';
  });

  $('masterPasswordForm').addEventListener('submit', submitMasterPassword);

  $('deleteDialog').addEventListener('close', () => {
    if ($('deleteDialog').returnValue === 'delete' && state.deleteId) {
      state.entries = state.entries.filter((entry) => entry.id !== state.deleteId);
      writeEntries();
      renderEntries();
      resetForm();
      showToast('企業情報を削除しました。');
    }
    state.deleteId = null;
  });
}

function bootstrap() {
  try {
    if (!window.crypto?.subtle) {
      alert('このブラウザは暗号化機能に対応していません。最新のChrome、Edge、Safari、Firefoxを使用してください。');
    }

    setupSelects();
    state.entries = readEntries();
    bindEvents();
    updateLockUi();
    resetForm();
    renderEntries();
    setupPwa();
    document.documentElement.dataset.appReady = 'true';
  } catch (error) {
    console.error(error);
    const message = $('formMessage');
    if (message) {
      message.textContent = '画面の初期化に失敗しました。index.html・app.js・sw.js を同じ更新版へ置き換え、ページを再読み込みしてください。';
    }
    document.documentElement.dataset.appReady = 'error';
  }
}

bootstrap();
TORAGE_KEY = 'intern-selection-manager.entries.v2';
const LEGACY_STORAGE_KEY = 'intern-selection-manager.entries.v1';
const CRYPTO_META_KEY = 'intern-selection-manager.crypto-meta.v1';

const STATUS_OPTIONS = [
  ['', '未選択'],
  ['応募予定', '応募予定'],
  ['応募準備中', '応募準備中'],
  ['応募済み', '応募済み'],
  ['書類選考中', '書類選考中'],
  ['面接予定', '面接予定'],
  ['選考中', '選考中'],
  ['合格', '合格'],
  ['不合格', '不合格'],
  ['辞退', '辞退'],
  ['終了', '終了']
];

const PREFERENCE_OPTIONS = [
  ['', '未選択'],
  ['第一志望', '第一志望'],
  ['高い', '高い'],
  ['普通', '普通'],
  ['低い', '低い']
];

const DEADLINE_TYPE_OPTIONS = [
  ['', '締切種類を選択'],
  ['ES締切', 'ES締切'],
  ['Webテスト締切', 'Webテスト締切'],
  ['適性検査締切', '適性検査締切'],
  ['応募締切', '応募締切'],
  ['書類提出締切', '書類提出締切'],
  ['その他', 'その他']
];

const $ = (id) => document.getElementById(id);

const state = {
  entries: [],
  cryptoKey: null,
  deferredPrompt: null,
  deleteId: null,
  toastTimer: null
};

function escapeHtml(text = '') {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function uuid() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function normalize(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ja-JP');
}

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function normalizeDeadlineItem(item = {}) {
  return {
    id: item.id || uuid(),
    type: String(item.type || ''),
    label: String(item.label || ''),
    dueAt: String(item.dueAt || '')
  };
}

function normalizeEntry(entry = {}) {
  const oldDeadlineItems = Array.isArray(entry.deadlineItems)
    ? entry.deadlineItems.map(normalizeDeadlineItem)
    : entry.deadline
      ? [normalizeDeadlineItem({ type: '締切', dueAt: entry.deadline })]
      : [];

  const companyName = String(entry.companyName || '').trim();

  return {
    id: entry.id || uuid(),
    companyName,
    companyNormalized: normalize(companyName || entry.companyNormalized),
    selectionStatus: String(entry.selectionStatus || ''),
    preference: String(entry.preference || ''),
    deadlineItems: oldDeadlineItems,
    internshipAt: String(entry.internshipAt || ''),
    mypageUrl: String(entry.mypageUrl || ''),
    memo: String(entry.memo || ''),
    credentialsEnc: entry.credentialsEnc || null,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
  };
}

function readEntries() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(current)) {
      return current.map(normalizeEntry);
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (Array.isArray(legacy)) {
      const migrated = legacy.map(normalizeEntry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    return [];
  }

  return [];
}

function writeEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function getCryptoMeta() {
  try {
    return JSON.parse(localStorage.getItem(CRYPTO_META_KEY));
  } catch {
    return null;
  }
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function fillSelect(selectId, options) {
  const select = $(selectId);
  if (!select) {
    throw new Error(`選択欄 #${selectId} が見つかりません。index.html と app.js を同じ更新版にしてください。`);
  }

  select.innerHTML = options
    .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    .join('');
}

function setupSelects() {
  fillSelect('selectionStatus', STATUS_OPTIONS);
  fillSelect('preference', PREFERENCE_OPTIONS);
}

function deadlineTypeOptionsHtml(selectedValue = '') {
  return DEADLINE_TYPE_OPTIONS
    .map(([value, label]) => {
      const selected = value === selectedValue ? ' selected' : '';
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function addDeadlineRow(item = {}) {
  const deadline = normalizeDeadlineItem(item);
  const row = document.createElement('div');
  row.className = 'deadline-row';
  row.dataset.deadlineId = deadline.id;
  row.innerHTML = `
    <div class="field">
      <label>種類</label>
      <select class="deadline-type">${deadlineTypeOptionsHtml(deadline.type)}</select>
    </div>
    <div class="field">
      <label>締切名（任意）</label>
      <input class="deadline-label" type="text" maxlength="60" placeholder="例：第1回ES" value="${escapeHtml(deadline.label)}" />
    </div>
    <div class="field">
      <label>締切日時</label>
      <input class="deadline-date-input" type="datetime-local" value="${escapeHtml(toLocalInputValue(deadline.dueAt))}" />
    </div>
    <button class="button secondary compact" type="button" data-action="remove-deadline">削除</button>
  `;
  $('deadlineItems').append(row);
}

function getDeadlineItemsFromForm() {
  return [...$('deadlineItems').querySelectorAll('.deadline-row')]
    .map((row) => ({
      id: row.dataset.deadlineId || uuid(),
      type: row.querySelector('.deadline-type').value,
      label: row.querySelector('.deadline-label').value.trim(),
      dueAt: row.querySelector('.deadline-date-input').value
        ? new Date(row.querySelector('.deadline-date-input').value).toISOString()
        : ''
    }))
    .filter((item) => item.type || item.label || item.dueAt);
}

function toLocalInputValue(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

async function deriveKey(masterPassword, salt, iterations) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromBase64(salt),
      iterations,
      hash: 'SHA-256'
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(text, key = state.cryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );

  return {
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted))
  };
}

async function decryptText(payload, key = state.cryptoKey) {
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.data)
  );

  return new TextDecoder().decode(data);
}

async function createMasterPassword(password) {
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const iterations = 250000;
  const key = await deriveKey(password, salt, iterations);
  const verifier = await encryptText('intern-selection-manager-verifier-v1', key);

  localStorage.setItem(CRYPTO_META_KEY, JSON.stringify({ salt, iterations, verifier }));
  state.cryptoKey = key;
}

async function unlockMasterPassword(password) {
  const meta = getCryptoMeta();
  if (!meta) {
    throw new Error('アプリ用パスワードが未設定です。');
  }

  const key = await deriveKey(password, meta.salt, meta.iterations);
  const value = await decryptText(meta.verifier, key);
  if (value !== 'intern-selection-manager-verifier-v1') {
    throw new Error('wrong password');
  }

  state.cryptoKey = key;
}

function isUnlocked() {
  return Boolean(state.cryptoKey);
}

function updateLockUi() {
  const unlocked = isUnlocked();
  $('loginId').disabled = !unlocked;
  $('sitePassword').disabled = !unlocked;
  $('togglePasswordButton').disabled = !unlocked;
  $('unlockButton').textContent = unlocked ? '認証情報をロック' : '認証情報をロック解除';
  $('lockMessage').textContent = unlocked
    ? 'ロック解除中です。ID・パスワードを入力またはコピーできます。'
    : '認証情報はロック中です。入力するにはロックを解除してください。';
}

function lockApp() {
  state.cryptoKey = null;
  $('loginId').value = '';
  $('sitePassword').value = '';
  $('sitePassword').type = 'password';
  $('togglePasswordButton').textContent = '表示';
  updateLockUi();
  showToast('認証情報をロックしました。');
}

function formatDate(value) {
  if (!value) {
    return '<span class="cell-note">未定</span>';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '<span class="cell-note">未定</span>';
  }

  return escapeHtml(
    new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  );
}

function deadlineName(item) {
  return item.label || item.type || '締切';
}

function formatDeadlines(items = []) {
  if (!items.length) {
    return '<span class="cell-note">未設定</span>';
  }

  return `<ul class="deadline-list">${items
    .map(
      (item) => `
        <li>
          <span class="deadline-name">${escapeHtml(deadlineName(item))}</span>
          <span class="deadline-date">${formatDate(item.dueAt)}</span>
        </li>`
    )
    .join('')}</ul>`;
}

function preferenceClass(value) {
  return {
    第一志望: 'first',
    高い: 'high',
    低い: 'low',
    '': 'unset'
  }[value] || '';
}

function displayOrUnset(value) {
  return value || '未設定';
}

function findExactEntryByCompany(name) {
  const key = normalize(name);
  return state.entries.find((entry) => entry.companyNormalized === key) || null;
}

function renderEntries() {
  const filter = normalize($('filterText').value || '');
  const entries = [...state.entries]
    .filter((entry) => !filter || entry.companyNormalized.includes(filter))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  $('emptyMessage').hidden = entries.length > 0;

  $('entryTableBody').innerHTML = entries
    .map((entry) => {
      const mypage = entry.mypageUrl
        ? `
          <a class="table-link" href="${escapeHtml(entry.mypageUrl)}" target="_blank" rel="noopener noreferrer">開く</a>
          <button class="table-button" data-action="copy-url" data-id="${entry.id}">URLコピー</button>`
        : '<span class="cell-note">未登録</span>';

      return `
        <tr>
          <td><span class="company-name">${escapeHtml(entry.companyName)}</span></td>
          <td><span class="pill ${entry.selectionStatus ? '' : 'unset'}">${escapeHtml(displayOrUnset(entry.selectionStatus))}</span></td>
          <td><span class="pill ${preferenceClass(entry.preference)}">${escapeHtml(displayOrUnset(entry.preference))}</span></td>
          <td>${formatDeadlines(entry.deadlineItems)}</td>
          <td>${formatDate(entry.internshipAt)}</td>
          <td><div class="table-actions">${mypage}</div></td>
          <td>
            <div class="table-actions">
              <button class="table-button" data-action="copy-id" data-id="${entry.id}">IDコピー</button>
              <button class="table-button" data-action="copy-password" data-id="${entry.id}">パスコピー</button>
            </div>
          </td>
          <td>
            <div class="table-actions">
              <button class="table-button" data-action="edit" data-id="${entry.id}">編集</button>
              <button class="table-button danger" data-action="delete" data-id="${entry.id}">削除</button>
            </div>
          </td>
        </tr>`;
    })
    .join('');
}

function openCompanySite() {
  const companyName = $('lookupCompany').value.trim();
  const result = $('lookupResult');

  if (!companyName) {
    result.textContent = '社名を入力してください。';
    return;
  }

  const entry = findExactEntryByCompany(companyName);
  if (entry?.mypageUrl) {
    window.open(entry.mypageUrl, '_blank', 'noopener');
    result.textContent = `「${entry.companyName}」の登録済みマイページを新しいタブで開きました。`;
    return;
  }

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${companyName} 公式サイト`)}`;
  window.open(searchUrl, '_blank', 'noopener');
  result.textContent = `「${companyName} 公式サイト」の検索結果を新しいタブで開きました。検索結果から公式サイトを確認してください。`;
}

function resetDeadlineRows(items = []) {
  $('deadlineItems').innerHTML = '';
  if (items.length) {
    items.forEach(addDeadlineRow);
  } else {
    addDeadlineRow();
  }
}

function resetForm() {
  $('entryForm').reset();
  $('entryId').value = '';
  $('formTitle').textContent = '企業を登録';
  $('saveButton').textContent = '登録する';
  $('cancelEditButton').hidden = true;
  $('formMessage').textContent = '';
  $('selectionStatus').value = '';
  $('preference').value = '';
  $('loginId').value = '';
  $('sitePassword').value = '';
  $('sitePassword').type = 'password';
  $('togglePasswordButton').textContent = '表示';
  resetDeadlineRows();
}

async function startEdit(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  $('entryId').value = entry.id;
  $('companyName').value = entry.companyName;
  $('selectionStatus').value = entry.selectionStatus;
  $('preference').value = entry.preference;
  $('internshipAt').value = toLocalInputValue(entry.internshipAt);
  $('mypageUrl').value = entry.mypageUrl || '';
  $('memo').value = entry.memo || '';
  resetDeadlineRows(entry.deadlineItems || []);

  $('formTitle').textContent = '企業を編集';
  $('saveButton').textContent = '更新する';
  $('cancelEditButton').hidden = false;
  $('formMessage').textContent = '';

  if (isUnlocked() && entry.credentialsEnc) {
    try {
      const credentials = JSON.parse(await decryptText(entry.credentialsEnc));
      $('loginId').value = credentials.loginId || '';
      $('sitePassword').value = credentials.password || '';
    } catch {
      showToast('認証情報を読み取れませんでした。');
    }
  } else {
    $('loginId').value = '';
    $('sitePassword').value = '';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveEntry(event) {
  event.preventDefault();
  $('formMessage').textContent = '';

  const companyName = $('companyName').value.trim();
  const mypageUrl = $('mypageUrl').value.trim();
  const editId = $('entryId').value;

  if (!companyName) {
    $('formMessage').textContent = '社名は必須です。';
    return;
  }

  if (mypageUrl) {
    try {
      const url = new URL(mypageUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('unsupported protocol');
      }
    } catch {
      $('formMessage').textContent = 'マイページURLは http:// または https:// で始まる形式で入力してください。';
      return;
    }
  }

  const companyNormalized = normalize(companyName);
  const duplicate = state.entries.find(
    (entry) => entry.id !== editId && entry.companyNormalized === companyNormalized
  );

  if (duplicate) {
    $('formMessage').textContent = '同じ社名の企業はすでに登録されています。編集から更新してください。';
    return;
  }

  const old = state.entries.find((entry) => entry.id === editId);
  const now = new Date().toISOString();

  const entry = {
    id: editId || uuid(),
    companyName,
    companyNormalized,
    selectionStatus: $('selectionStatus').value,
    preference: $('preference').value,
    deadlineItems: getDeadlineItemsFromForm(),
    internshipAt: $('internshipAt').value ? new Date($('internshipAt').value).toISOString() : '',
    mypageUrl,
    memo: $('memo').value.trim(),
    credentialsEnc: old?.credentialsEnc || null,
    createdAt: old?.createdAt || now,
    updatedAt: now
  };

  if (isUnlocked()) {
    const loginId = $('loginId').value.trim();
    const password = $('sitePassword').value;
    entry.credentialsEnc = loginId || password
      ? await encryptText(JSON.stringify({ loginId, password }))
      : null;
  }

  state.entries = old
    ? state.entries.map((item) => (item.id === entry.id ? entry : item))
    : [...state.entries, entry];

  writeEntries();
  resetForm();
  renderEntries();
  showToast(old ? '企業情報を更新しました。' : '企業情報を登録しました。');
}

async function copyText(value, successMessage) {
  if (!value) {
    showToast('コピーする情報が登録されていません。');
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    showToast(successMessage);
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    showToast(successMessage);
  }
}

async function handleTableClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) {
    return;
  }

  const entry = state.entries.find((item) => item.id === button.dataset.id);
  if (!entry) {
    return;
  }

  const action = button.dataset.action;
  if (action === 'edit') {
    return startEdit(entry.id);
  }

  if (action === 'delete') {
    state.deleteId = entry.id;
    $('deleteDialog').showModal();
    return;
  }

  if (action === 'copy-url') {
    return copyText(entry.mypageUrl, 'マイページURLをコピーしました。');
  }

  if (!isUnlocked()) {
    showToast('認証情報を使うにはロックを解除してください。');
    return;
  }

  try {
    const credentials = entry.credentialsEnc
      ? JSON.parse(await decryptText(entry.credentialsEnc))
      : { loginId: '', password: '' };

    if (action === 'copy-id') {
      return copyText(credentials.loginId, 'IDをコピーしました。');
    }

    if (action === 'copy-password') {
      return copyText(credentials.password, 'パスワードをコピーしました。');
    }
  } catch {
    showToast('認証情報を復号できませんでした。アプリ用パスワードを確認してください。');
  }
}

function openMasterDialog() {
  const hasMeta = Boolean(getCryptoMeta());
  $('masterPasswordForm').reset();
  $('masterError').textContent = '';
  $('masterTitle').textContent = hasMeta ? '認証情報のロック解除' : '認証情報を保護';
  $('masterDescription').textContent = hasMeta
    ? 'アプリ用パスワードを入力すると、保存済みのID・パスワードを利用できます。'
    : 'ID・パスワードを端末内で暗号化保存するため、8文字以上のアプリ用パスワードを設定してください。';
  $('masterConfirmArea').hidden = hasMeta;
  $('masterPasswordConfirm').required = !hasMeta;
  $('masterPassword').autocomplete = hasMeta ? 'current-password' : 'new-password';
  $('masterSubmit').textContent = hasMeta ? 'ロックを解除する' : '設定して続ける';
  $('masterPasswordDialog').showModal();
  setTimeout(() => $('masterPassword').focus(), 0);
}

async function submitMasterPassword(event) {
  event.preventDefault();
  const password = $('masterPassword').value;
  const confirm = $('masterPasswordConfirm').value;
  const hasMeta = Boolean(getCryptoMeta());

  if (password.length < 8) {
    $('masterError').textContent = 'アプリ用パスワードは8文字以上にしてください。';
    return;
  }

  if (!hasMeta && password !== confirm) {
    $('masterError').textContent = '確認用パスワードが一致しません。';
    return;
  }

  try {
    if (hasMeta) {
      await unlockMasterPassword(password);
    } else {
      await createMasterPassword(password);
    }
    $('masterPasswordDialog').close();
    updateLockUi();
    showToast('認証情報を利用できる状態にしました。');
  } catch {
    $('masterError').textContent = 'アプリ用パスワードが正しくありません。';
  }
}

function setupPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        showToast('オフライン機能を初期化できませんでした。');
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    $('installButton').hidden = false;
  });

  $('installButton').addEventListener('click', async () => {
    if (!state.deferredPrompt) {
      return;
    }
    state.deferredPrompt.prompt();
    await state.deferredPrompt.userChoice;
    $('installButton').hidden = true;
    state.deferredPrompt = null;
  });

  const updateNetworkStatus = () => {
    $('networkStatus').textContent = navigator.onLine ? 'オンライン' : 'オフライン';
    $('networkStatus').classList.toggle('offline', !navigator.onLine);
  };

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();
}

function bindEvents() {
  $('entryForm').addEventListener('submit', saveEntry);
  $('resetButton').addEventListener('click', resetForm);
  $('cancelEditButton').addEventListener('click', resetForm);
  $('filterText').addEventListener('input', renderEntries);
  $('lookupButton').addEventListener('click', openCompanySite);
  $('lookupCompany').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      openCompanySite();
    }
  });
  $('entryTableBody').addEventListener('click', handleTableClick);
  $('deadlineItems').addEventListener('click', (event) => {
    if (event.target.closest('[data-action="remove-deadline"]')) {
      event.target.closest('.deadline-row').remove();
      if (!$('deadlineItems').children.length) {
        addDeadlineRow();
      }
    }
  });

  $('unlockButton').addEventListener('click', () => {
    if (isUnlocked()) {
      lockApp();
    } else {
      openMasterDialog();
    }
  });

  $('togglePasswordButton').addEventListener('click', () => {
    const hidden = $('sitePassword').type === 'password';
    $('sitePassword').type = hidden ? 'text' : 'password';
    $('togglePasswordButton').textContent = hidden ? '隠す' : '表示';
  });

  $('masterPasswordForm').addEventListener('submit', submitMasterPassword);

  $('deleteDialog').addEventListener('close', () => {
    if ($('deleteDialog').returnValue === 'delete' && state.deleteId) {
      state.entries = state.entries.filter((entry) => entry.id !== state.deleteId);
      writeEntries();
      renderEntries();
      resetForm();
      showToast('企業情報を削除しました。');
    }
    state.deleteId = null;
  });
}

function bootstrap() {
  try {
    if (!window.crypto?.subtle) {
      alert('このブラウザは暗号化機能に対応していません。最新のChrome、Edge、Safari、Firefoxを使用してください。');
    }

    setupSelects();
    state.entries = readEntries();
    bindEvents();
    updateLockUi();
    resetForm();
    renderEntries();
    setupPwa();
    document.documentElement.dataset.appReady = 'true';
  } catch (error) {
    console.error(error);
    const message = $('formMessage');
    if (message) {
      message.textContent = '画面の初期化に失敗しました。index.html・app.js・sw.js を同じ更新版へ置き換え、ページを再読み込みしてください。';
    }
    document.documentElement.dataset.appReady = 'error';
  }
}

bootstrap();
'], ['面接予定', '面接予定'], ['選考中', '選考中'],
  ['合格', '合格'], ['不合格', '不合格'], ['辞退', '辞退'], ['終了', '終了']
];
const PREFERENCE_OPTIONS = [['第一志望', '第一志'use strict';
'use strict';

const STORAGE_KEY = 'intern-selection-manager.entries.v2';
const LEGACY_STORAGE_KEY = 'intern-selection-manager.entries.v1';
const CRYPTO_META_KEY = 'intern-selection-manager.crypto-meta.v1';

const STATUS_OPTIONS = [
  ['', '未選択'],
  ['応募予定', '応募予定'],
  ['応募準備中', '応募準備中'],
  ['応募済み', '応募済み'],
  ['書類選考中', '書類選考中'],
  ['面接予定', '面接予定'],
  ['選考中', '選考中'],
  ['合格', '合格'],
  ['不合格', '不合格'],
  ['辞退', '辞退'],
  ['終了', '終了']
];

const PREFERENCE_OPTIONS = [
  ['', '未選択'],
  ['第一志望', '第一志望'],
  ['高い', '高い'],
  ['普通', '普通'],
  ['低い', '低い']
];

const DEADLINE_TYPE_OPTIONS = [
  ['', '締切種類を選択'],
  ['ES締切', 'ES締切'],
  ['Webテスト締切', 'Webテスト締切'],
  ['適性検査締切', '適性検査締切'],
  ['応募締切', '応募締切'],
  ['書類提出締切', '書類提出締切'],
  ['その他', 'その他']
];

const $ = (id) => document.getElementById(id);

const state = {
  entries: [],
  cryptoKey: null,
  deferredPrompt: null,
  deleteId: null,
  toastTimer: null
};

function escapeHtml(text = '') {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function uuid() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

function normalize(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ja-JP');
}

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function normalizeDeadlineItem(item = {}) {
  return {
    id: item.id || uuid(),
    type: String(item.type || ''),
    label: String(item.label || ''),
    dueAt: String(item.dueAt || '')
  };
}

function normalizeEntry(entry = {}) {
  const oldDeadlineItems = Array.isArray(entry.deadlineItems)
    ? entry.deadlineItems.map(normalizeDeadlineItem)
    : entry.deadline
      ? [normalizeDeadlineItem({ type: '締切', dueAt: entry.deadline })]
      : [];

  const companyName = String(entry.companyName || '').trim();

  return {
    id: entry.id || uuid(),
    companyName,
    companyNormalized: normalize(companyName || entry.companyNormalized),
    selectionStatus: String(entry.selectionStatus || ''),
    preference: String(entry.preference || ''),
    deadlineItems: oldDeadlineItems,
    internshipAt: String(entry.internshipAt || ''),
    mypageUrl: String(entry.mypageUrl || ''),
    memo: String(entry.memo || ''),
    credentialsEnc: entry.credentialsEnc || null,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
  };
}

function readEntries() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(current)) {
      return current.map(normalizeEntry);
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (Array.isArray(legacy)) {
      const migrated = legacy.map(normalizeEntry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    return [];
  }

  return [];
}

function writeEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function getCryptoMeta() {
  try {
    return JSON.parse(localStorage.getItem(CRYPTO_META_KEY));
  } catch {
    return null;
  }
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function fillSelect(selectId, options) {
  const select = $(selectId);
  if (!select) {
    throw new Error(`選択欄 #${selectId} が見つかりません。index.html と app.js を同じ更新版にしてください。`);
  }

  select.innerHTML = options
    .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    .join('');
}

function setupSelects() {
  fillSelect('selectionStatus', STATUS_OPTIONS);
  fillSelect('preference', PREFERENCE_OPTIONS);
}

function deadlineTypeOptionsHtml(selectedValue = '') {
  return DEADLINE_TYPE_OPTIONS
    .map(([value, label]) => {
      const selected = value === selectedValue ? ' selected' : '';
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function addDeadlineRow(item = {}) {
  const deadline = normalizeDeadlineItem(item);
  const row = document.createElement('div');
  row.className = 'deadline-row';
  row.dataset.deadlineId = deadline.id;
  row.innerHTML = `
    <div class="field">
      <label>種類</label>
      <select class="deadline-type">${deadlineTypeOptionsHtml(deadline.type)}</select>
    </div>
    <div class="field">
      <label>締切名（任意）</label>
      <input class="deadline-label" type="text" maxlength="60" placeholder="例：第1回ES" value="${escapeHtml(deadline.label)}" />
    </div>
    <div class="field">
      <label>締切日時</label>
      <input class="deadline-date-input" type="datetime-local" value="${escapeHtml(toLocalInputValue(deadline.dueAt))}" />
    </div>
    <button class="button secondary compact" type="button" data-action="remove-deadline">削除</button>
  `;
  $('deadlineItems').append(row);
}

function getDeadlineItemsFromForm() {
  return [...$('deadlineItems').querySelectorAll('.deadline-row')]
    .map((row) => ({
      id: row.dataset.deadlineId || uuid(),
      type: row.querySelector('.deadline-type').value,
      label: row.querySelector('.deadline-label').value.trim(),
      dueAt: row.querySelector('.deadline-date-input').value
        ? new Date(row.querySelector('.deadline-date-input').value).toISOString()
        : ''
    }))
    .filter((item) => item.type || item.label || item.dueAt);
}

function toLocalInputValue(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

async function deriveKey(masterPassword, salt, iterations) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromBase64(salt),
      iterations,
      hash: 'SHA-256'
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(text, key = state.cryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );

  return {
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted))
  };
}

async function decryptText(payload, key = state.cryptoKey) {
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.data)
  );

  return new TextDecoder().decode(data);
}

async function createMasterPassword(password) {
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const iterations = 250000;
  const key = await deriveKey(password, salt, iterations);
  const verifier = await encryptText('intern-selection-manager-verifier-v1', key);

  localStorage.setItem(CRYPTO_META_KEY, JSON.stringify({ salt, iterations, verifier }));
  state.cryptoKey = key;
}

async function unlockMasterPassword(password) {
  const meta = getCryptoMeta();
  if (!meta) {
    throw new Error('アプリ用パスワードが未設定です。');
  }

  const key = await deriveKey(password, meta.salt, meta.iterations);
  const value = await decryptText(meta.verifier, key);
  if (value !== 'intern-selection-manager-verifier-v1') {
    throw new Error('wrong password');
  }

  state.cryptoKey = key;
}

function isUnlocked() {
  return Boolean(state.cryptoKey);
}

function updateLockUi() {
  const unlocked = isUnlocked();
  $('loginId').disabled = !unlocked;
  $('sitePassword').disabled = !unlocked;
  $('togglePasswordButton').disabled = !unlocked;
  $('unlockButton').textContent = unlocked ? '認証情報をロック' : '認証情報をロック解除';
  $('lockMessage').textContent = unlocked
    ? 'ロック解除中です。ID・パスワードを入力またはコピーできます。'
    : '認証情報はロック中です。入力するにはロックを解除してください。';
}

function lockApp() {
  state.cryptoKey = null;
  $('loginId').value = '';
  $('sitePassword').value = '';
  $('sitePassword').type = 'password';
  $('togglePasswordButton').textContent = '表示';
  updateLockUi();
  showToast('認証情報をロックしました。');
}

function formatDate(value) {
  if (!value) {
    return '<span class="cell-note">未定</span>';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '<span class="cell-note">未定</span>';
  }

  return escapeHtml(
    new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  );
}

function deadlineName(item) {
  return item.label || item.type || '締切';
}

function formatDeadlines(items = []) {
  if (!items.length) {
    return '<span class="cell-note">未設定</span>';
  }

  return `<ul class="deadline-list">${items
    .map(
      (item) => `
        <li>
          <span class="deadline-name">${escapeHtml(deadlineName(item))}</span>
          <span class="deadline-date">${formatDate(item.dueAt)}</span>
        </li>`
    )
    .join('')}</ul>`;
}

function preferenceClass(value) {
  return {
    第一志望: 'first',
    高い: 'high',
    低い: 'low',
    '': 'unset'
  }[value] || '';
}

function displayOrUnset(value) {
  return value || '未設定';
}

function findExactEntryByCompany(name) {
  const key = normalize(name);
  return state.entries.find((entry) => entry.companyNormalized === key) || null;
}

function renderEntries() {
  const filter = normalize($('filterText').value || '');
  const entries = [...state.entries]
    .filter((entry) => !filter || entry.companyNormalized.includes(filter))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  $('emptyMessage').hidden = entries.length > 0;

  $('entryTableBody').innerHTML = entries
    .map((entry) => {
      const mypage = entry.mypageUrl
        ? `
          <a class="table-link" href="${escapeHtml(entry.mypageUrl)}" target="_blank" rel="noopener noreferrer">開く</a>
          <button class="table-button" data-action="copy-url" data-id="${entry.id}">URLコピー</button>`
        : '<span class="cell-note">未登録</span>';

      return `
        <tr>
          <td><span class="company-name">${escapeHtml(entry.companyName)}</span></td>
          <td><span class="pill ${entry.selectionStatus ? '' : 'unset'}">${escapeHtml(displayOrUnset(entry.selectionStatus))}</span></td>
          <td><span class="pill ${preferenceClass(entry.preference)}">${escapeHtml(displayOrUnset(entry.preference))}</span></td>
          <td>${formatDeadlines(entry.deadlineItems)}</td>
          <td>${formatDate(entry.internshipAt)}</td>
          <td><div class="table-actions">${mypage}</div></td>
          <td>
            <div class="table-actions">
              <button class="table-button" data-action="copy-id" data-id="${entry.id}">IDコピー</button>
              <button class="table-button" data-action="copy-password" data-id="${entry.id}">パスコピー</button>
            </div>
          </td>
          <td>
            <div class="table-actions">
              <button class="table-button" data-action="edit" data-id="${entry.id}">編集</button>
              <button class="table-button danger" data-action="delete" data-id="${entry.id}">削除</button>
            </div>
          </td>
        </tr>`;
    })
    .join('');
}

function openCompanySite() {
  const companyName = $('lookupCompany').value.trim();
  const result = $('lookupResult');

  if (!companyName) {
    result.textContent = '社名を入力してください。';
    return;
  }

  const entry = findExactEntryByCompany(companyName);
  if (entry?.mypageUrl) {
    window.open(entry.mypageUrl, '_blank', 'noopener');
    result.textContent = `「${entry.companyName}」の登録済みマイページを新しいタブで開きました。`;
    return;
  }

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${companyName} 公式サイト`)}`;
  window.open(searchUrl, '_blank', 'noopener');
  result.textContent = `「${companyName} 公式サイト」の検索結果を新しいタブで開きました。検索結果から公式サイトを確認してください。`;
}

function resetDeadlineRows(items = []) {
  $('deadlineItems').innerHTML = '';
  if (items.length) {
    items.forEach(addDeadlineRow);
  } else {
    addDeadlineRow();
  }
}

function resetForm() {
  $('entryForm').reset();
  $('entryId').value = '';
  $('formTitle').textContent = '企業を登録';
  $('saveButton').textContent = '登録する';
  $('cancelEditButton').hidden = true;
  $('formMessage').textContent = '';
  $('selectionStatus').value = '';
  $('preference').value = '';
  $('loginId').value = '';
  $('sitePassword').value = '';
  $('sitePassword').type = 'password';
  $('togglePasswordButton').textContent = '表示';
  resetDeadlineRows();
}

async function startEdit(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  $('entryId').value = entry.id;
  $('companyName').value = entry.companyName;
  $('selectionStatus').value = entry.selectionStatus;
  $('preference').value = entry.preference;
  $('internshipAt').value = toLocalInputValue(entry.internshipAt);
  $('mypageUrl').value = entry.mypageUrl || '';
  $('memo').value = entry.memo || '';
  resetDeadlineRows(entry.deadlineItems || []);

  $('formTitle').textContent = '企業を編集';
  $('saveButton').textContent = '更新する';
  $('cancelEditButton').hidden = false;
  $('formMessage').textContent = '';

  if (isUnlocked() && entry.credentialsEnc) {
    try {
      const credentials = JSON.parse(await decryptText(entry.credentialsEnc));
      $('loginId').value = credentials.loginId || '';
      $('sitePassword').value = credentials.password || '';
    } catch {
      showToast('認証情報を読み取れませんでした。');
    }
  } else {
    $('loginId').value = '';
    $('sitePassword').value = '';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveEntry(event) {
  event.preventDefault();
  $('formMessage').textContent = '';

  const companyName = $('companyName').value.trim();
  const mypageUrl = $('mypageUrl').value.trim();
  const editId = $('entryId').value;

  if (!companyName) {
    $('formMessage').textContent = '社名は必須です。';
    return;
  }

  if (mypageUrl) {
    try {
      const url = new URL(mypageUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('unsupported protocol');
      }
    } catch {
      $('formMessage').textContent = 'マイページURLは http:// または https:// で始まる形式で入力してください。';
      return;
    }
  }

  const companyNormalized = normalize(companyName);
  const duplicate = state.entries.find(
    (entry) => entry.id !== editId && entry.companyNormalized === companyNormalized
  );

  if (duplicate) {
    $('formMessage').textContent = '同じ社名の企業はすでに登録されています。編集から更新してください。';
    return;
  }

  const old = state.entries.find((entry) => entry.id === editId);
  const now = new Date().toISOString();

  const entry = {
    id: editId || uuid(),
    companyName,
    companyNormalized,
    selectionStatus: $('selectionStatus').value,
    preference: $('preference').value,
    deadlineItems: getDeadlineItemsFromForm(),
    internshipAt: $('internshipAt').value ? new Date($('internshipAt').value).toISOString() : '',
    mypageUrl,
    memo: $('memo').value.trim(),
    credentialsEnc: old?.credentialsEnc || null,
    createdAt: old?.createdAt || now,
    updatedAt: now
  };

  if (isUnlocked()) {
    const loginId = $('loginId').value.trim();
    const password = $('sitePassword').value;
    entry.credentialsEnc = loginId || password
      ? await encryptText(JSON.stringify({ loginId, password }))
      : null;
  }

  state.entries = old
    ? state.entries.map((item) => (item.id === entry.id ? entry : item))
    : [...state.entries, entry];

  writeEntries();
  resetForm();
  renderEntries();
  showToast(old ? '企業情報を更新しました。' : '企業情報を登録しました。');
}

async function copyText(value, successMessage) {
  if (!value) {
    showToast('コピーする情報が登録されていません。');
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    showToast(successMessage);
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    showToast(successMessage);
  }
}

async function handleTableClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) {
    return;
  }

  const entry = state.entries.find((item) => item.id === button.dataset.id);
  if (!entry) {
    return;
  }

  const action = button.dataset.action;
  if (action === 'edit') {
    return startEdit(entry.id);
  }

  if (action === 'delete') {
    state.deleteId = entry.id;
    $('deleteDialog').showModal();
    return;
  }

  if (action === 'copy-url') {
    return copyText(entry.mypageUrl, 'マイページURLをコピーしました。');
  }

  if (!isUnlocked()) {
    showToast('認証情報を使うにはロックを解除してください。');
    return;
  }

  try {
    const credentials = entry.credentialsEnc
      ? JSON.parse(await decryptText(entry.credentialsEnc))
      : { loginId: '', password: '' };

    if (action === 'copy-id') {
      return copyText(credentials.loginId, 'IDをコピーしました。');
    }

    if (action === 'copy-password') {
      return copyText(credentials.password, 'パスワードをコピーしました。');
    }
  } catch {
    showToast('認証情報を復号できませんでした。アプリ用パスワードを確認してください。');
  }
}

function openMasterDialog() {
  const hasMeta = Boolean(getCryptoMeta());
  $('masterPasswordForm').reset();
  $('masterError').textContent = '';
  $('masterTitle').textContent = hasMeta ? '認証情報のロック解除' : '認証情報を保護';
  $('masterDescription').textContent = hasMeta
    ? 'アプリ用パスワードを入力すると、保存済みのID・パスワードを利用できます。'
    : 'ID・パスワードを端末内で暗号化保存するため、8文字以上のアプリ用パスワードを設定してください。';
  $('masterConfirmArea').hidden = hasMeta;
  $('masterPasswordConfirm').required = !hasMeta;
  $('masterPassword').autocomplete = hasMeta ? 'current-password' : 'new-password';
  $('masterSubmit').textContent = hasMeta ? 'ロックを解除する' : '設定して続ける';
  $('masterPasswordDialog').showModal();
  setTimeout(() => $('masterPassword').focus(), 0);
}

async function submitMasterPassword(event) {
  event.preventDefault();
  const password = $('masterPassword').value;
  const confirm = $('masterPasswordConfirm').value;
  const hasMeta = Boolean(getCryptoMeta());

  if (password.length < 8) {
    $('masterError').textContent = 'アプリ用パスワードは8文字以上にしてください。';
    return;
  }

  if (!hasMeta && password !== confirm) {
    $('masterError').textContent = '確認用パスワードが一致しません。';
    return;
  }

  try {
    if (hasMeta) {
      await unlockMasterPassword(password);
    } else {
      await createMasterPassword(password);
    }
    $('masterPasswordDialog').close();
    updateLockUi();
    showToast('認証情報を利用できる状態にしました。');
  } catch {
    $('masterError').textContent = 'アプリ用パスワードが正しくありません。';
  }
}

function setupPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        showToast('オフライン機能を初期化できませんでした。');
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    $('installButton').hidden = false;
  });

  $('installButton').addEventListener('click', async () => {
    if (!state.deferredPrompt) {
      return;
    }
    state.deferredPrompt.prompt();
    await state.deferredPrompt.userChoice;
    $('installButton').hidden = true;
    state.deferredPrompt = null;
  });

  const updateNetworkStatus = () => {
    $('networkStatus').textContent = navigator.onLine ? 'オンライン' : 'オフライン';
    $('networkStatus').classList.toggle('offline', !navigator.onLine);
  };

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();
}

function bindEvents() {
  $('entryForm').addEventListener('submit', saveEntry);
  $('resetButton').addEventListener('click', resetForm);
  $('cancelEditButton').addEventListener('click', resetForm);
  $('filterText').addEventListener('input', renderEntries);
  $('lookupButton').addEventListener('click', openCompanySite);
  $('lookupCompany').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      openCompanySite();
    }
  });
  $('entryTableBody').addEventListener('click', handleTableClick);
  $('addDeadlineButton').addEventListener('click', () => addDeadlineRow());
  $('deadlineItems').addEventListener('click', (event) => {
    if (event.target.closest('[data-action="remove-deadline"]')) {
      event.target.closest('.deadline-row').remove();
      if (!$('deadlineItems').children.length) {
        addDeadlineRow();
      }
    }
  });

  $('unlockButton').addEventListener('click', () => {
    if (isUnlocked()) {
      lockApp();
    } else {
      openMasterDialog();
    }
  });

  $('togglePasswordButton').addEventListener('click', () => {
    const hidden = $('sitePassword').type === 'password';
    $('sitePassword').type = hidden ? 'text' : 'password';
    $('togglePasswordButton').textContent = hidden ? '隠す' : '表示';
  });

  $('masterPasswordForm').addEventListener('submit', submitMasterPassword);

  $('deleteDialog').addEventListener('close', () => {
    if ($('deleteDialog').returnValue === 'delete' && state.deleteId) {
      state.entries = state.entries.filter((entry) => entry.id !== state.deleteId);
      writeEntries();
      renderEntries();
      resetForm();
      showToast('企業情報を削除しました。');
    }
    state.deleteId = null;
  });
}

function bootstrap() {
  try {
    if (!window.crypto?.subtle) {
      alert('このブラウザは暗号化機能に対応していません。最新のChrome、Edge、Safari、Firefoxを使用してください。');
    }

    setupSelects();
    state.entries = readEntries();
    bindEvents();
    updateLockUi();
    resetForm();
    renderEntries();
    setupPwa();
  } catch (error) {
    console.error(error);
    const message = $('formMessage');
    if (message) {
      message.textContent = '画面の初期化に失敗しました。index.html・app.js・sw.js を同じ更新版へ置き換え、ページを再読み込みしてください。';
    }
  }
}

bootstrap();

const STORAGE_KEY = 'intern-selection-manager.entries.v2';
const LEGACY_STORAGE_KEY = 'intern-selection-manager.entries.v1';
const CRYPTO_META_KEY = 'intern-selection-manager.crypto-meta.v1';

const STATUS_OPTIONS = [
  ['', '未選択'],
  ['応募予定', '応募予定'],
  ['応募準備中', '応募準備中'],
  ['応募済み', '応募済み'],
  ['書類選考中', '書類選考中'],
  ['面接予定', '面接予定'],
  ['選考中', '選考中'],
  ['合格', '合格'],
  ['不合格', '不合格'],
  ['辞退', '辞退'],
  ['終了', '終了']
];

const PREFERENCE_OPTIONS = [
  ['', '未選択'],
  ['第一志望', '第一志望'],
  ['高い', '高い'],
  ['普通', '普通'],
  ['低い', '低い']
];

const DEADLINE_TYPE_OPTIONS = [
  ['', '締切種類を選択'],
  ['ES締切', 'ES締切'],
  ['Webテスト締切', 'Webテスト締切'],
  ['適性検査締切', '適性検査締切'],
  ['応募締切', '応募締切'],
  ['書類提出締切', '書類提出締切'],
  ['その他', 'その他']
];

const $ = (id) => document.getElementById(id);

const state = {
  entries: [],
  cryptoKey: null,
  deferredPrompt: null,
  deleteId: null,
  toastTimer: null
};

function escapeHtml(text = '') {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function normalize(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('ja-JP');
}

function toBase64(bytes) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function normalizeDeadlineItem(item = {}) {
  return {
    id: item.id || uuid(),
    type: String(item.type || ''),
    label: String(item.label || ''),
    dueAt: String(item.dueAt || '')
  };
}

function normalizeEntry(entry = {}) {
  const oldDeadlineItems = Array.isArray(entry.deadlineItems)
    ? entry.deadlineItems.map(normalizeDeadlineItem)
    : entry.deadline
      ? [normalizeDeadlineItem({ type: '締切', dueAt: entry.deadline })]
      : [];

  const companyName = String(entry.companyName || '').trim();

  return {
    id: entry.id || uuid(),
    companyName,
    companyNormalized: normalize(companyName || entry.companyNormalized),
    selectionStatus: String(entry.selectionStatus || ''),
    preference: String(entry.preference || ''),
    deadlineItems: oldDeadlineItems,
    internshipAt: String(entry.internshipAt || ''),
    mypageUrl: String(entry.mypageUrl || ''),
    memo: String(entry.memo || ''),
    credentialsEnc: entry.credentialsEnc || null,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
  };
}

function readEntries() {
  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(current)) {
      return current.map(normalizeEntry);
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (Array.isArray(legacy)) {
      const migrated = legacy.map(normalizeEntry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    return [];
  }

  return [];
}

function writeEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries));
}

function getCryptoMeta() {
  try {
    return JSON.parse(localStorage.getItem(CRYPTO_META_KEY));
  } catch {
    return null;
  }
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function fillSelect(selectId, options) {
  $(selectId).innerHTML = options
    .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    .join('');
}

function setupSelects() {
  fillSelect('selectionStatus', STATUS_OPTIONS);
  fillSelect('preference', PREFERENCE_OPTIONS);
}

function deadlineTypeOptionsHtml(selectedValue = '') {
  return DEADLINE_TYPE_OPTIONS
    .map(([value, label]) => {
      const selected = value === selectedValue ? ' selected' : '';
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join('');
}

function addDeadlineRow(item = {}) {
  const deadline = normalizeDeadlineItem(item);
  const row = document.createElement('div');
  row.className = 'deadline-row';
  row.dataset.deadlineId = deadline.id;
  row.innerHTML = `
    <div class="field">
      <label>種類</label>
      <select class="deadline-type">${deadlineTypeOptionsHtml(deadline.type)}</select>
    </div>
    <div class="field">
      <label>締切名（任意）</label>
      <input class="deadline-label" type="text" maxlength="60" placeholder="例：第1回ES" value="${escapeHtml(deadline.label)}" />
    </div>
    <div class="field">
      <label>締切日時</label>
      <input class="deadline-date-input" type="datetime-local" value="${escapeHtml(toLocalInputValue(deadline.dueAt))}" />
    </div>
    <button class="button secondary compact" type="button" data-action="remove-deadline">削除</button>
  `;
  $('deadlineItems').append(row);
}

function getDeadlineItemsFromForm() {
  return [...$('deadlineItems').querySelectorAll('.deadline-row')]
    .map((row) => ({
      id: row.dataset.deadlineId || uuid(),
      type: row.querySelector('.deadline-type').value,
      label: row.querySelector('.deadline-label').value.trim(),
      dueAt: row.querySelector('.deadline-date-input').value
        ? new Date(row.querySelector('.deadline-date-input').value).toISOString()
        : ''
    }))
    .filter((item) => item.type || item.label || item.dueAt);
}

function toLocalInputValue(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

async function deriveKey(masterPassword, salt, iterations) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: fromBase64(salt),
      iterations,
      hash: 'SHA-256'
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptText(text, key = state.cryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(text)
  );

  return {
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(encrypted))
  };
}

async function decryptText(payload, key = state.cryptoKey) {
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.data)
  );

  return new TextDecoder().decode(data);
}

async function createMasterPassword(password) {
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const iterations = 250000;
  const key = await deriveKey(password, salt, iterations);
  const verifier = await encryptText('intern-selection-manager-verifier-v1', key);

  localStorage.setItem(CRYPTO_META_KEY, JSON.stringify({ salt, iterations, verifier }));
  state.cryptoKey = key;
}

async function unlockMasterPassword(password) {
  const meta = getCryptoMeta();
  if (!meta) {
    throw new Error('アプリ用パスワードが未設定です。');
  }

  const key = await deriveKey(password, meta.salt, meta.iterations);
  const value = await decryptText(meta.verifier, key);
  if (value !== 'intern-selection-manager-verifier-v1') {
    throw new Error('wrong password');
  }

  state.cryptoKey = key;
}

function isUnlocked() {
  return Boolean(state.cryptoKey);
}

function updateLockUi() {
  const unlocked = isUnlocked();
  $('loginId').disabled = !unlocked;
  $('sitePassword').disabled = !unlocked;
  $('togglePasswordButton').disabled = !unlocked;
  $('unlockButton').textContent = unlocked ? '認証情報をロック' : '認証情報をロック解除';
  $('lockMessage').textContent = unlocked
    ? 'ロック解除中です。ID・パスワードを入力またはコピーできます。'
    : '認証情報はロック中です。入力するにはロックを解除してください。';
}

function lockApp() {
  state.cryptoKey = null;
  $('loginId').value = '';
  $('sitePassword').value = '';
  $('sitePassword').type = 'password';
  $('togglePasswordButton').textContent = '表示';
  updateLockUi();
  showToast('認証情報をロックしました。');
}

function formatDate(value) {
  if (!value) {
    return '<span class="cell-note">未定</span>';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '<span class="cell-note">未定</span>';
  }

  return escapeHtml(
    new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  );
}

function deadlineName(item) {
  return item.label || item.type || '締切';
}

function formatDeadlines(items = []) {
  if (!items.length) {
    return '<span class="cell-note">未設定</span>';
  }

  return `<ul class="deadline-list">${items
    .map(
      (item) => `
        <li>
          <span class="deadline-name">${escapeHtml(deadlineName(item))}</span>
          <span class="deadline-date">${formatDate(item.dueAt)}</span>
        </li>`
    )
    .join('')}</ul>`;
}

function preferenceClass(value) {
  return {
    第一志望: 'first',
    高い: 'high',
    低い: 'low',
    '': 'unset'
  }[value] || '';
}

function displayOrUnset(value) {
  return value || '未設定';
}

function findExactEntryByCompany(name) {
  const key = normalize(name);
  return state.entries.find((entry) => entry.companyNormalized === key) || null;
}

function renderEntries() {
  const filter = normalize($('filterText').value || '');
  const entries = [...state.entries]
    .filter((entry) => !filter || entry.companyNormalized.includes(filter))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  $('emptyMessage').hidden = entries.length > 0;

  $('entryTableBody').innerHTML = entries
    .map((entry) => {
      const mypage = entry.mypageUrl
        ? `
          <a class="table-link" href="${escapeHtml(entry.mypageUrl)}" target="_blank" rel="noopener noreferrer">開く</a>
          <button class="table-button" data-action="copy-url" data-id="${entry.id}">URLコピー</button>`
        : '<span class="cell-note">未登録</span>';

      return `
        <tr>
          <td><span class="company-name">${escapeHtml(entry.companyName)}</span></td>
          <td><span class="pill ${entry.selectionStatus ? '' : 'unset'}">${escapeHtml(displayOrUnset(entry.selectionStatus))}</span></td>
          <td><span class="pill ${preferenceClass(entry.preference)}">${escapeHtml(displayOrUnset(entry.preference))}</span></td>
          <td>${formatDeadlines(entry.deadlineItems)}</td>
          <td>${formatDate(entry.internshipAt)}</td>
          <td><div class="table-actions">${mypage}</div></td>
          <td>
            <div class="table-actions">
              <button class="table-button" data-action="copy-id" data-id="${entry.id}">IDコピー</button>
              <button class="table-button" data-action="copy-password" data-id="${entry.id}">パスコピー</button>
            </div>
          </td>
          <td>
            <div class="table-actions">
              <button class="table-button" data-action="edit" data-id="${entry.id}">編集</button>
              <button class="table-button danger" data-action="delete" data-id="${entry.id}">削除</button>
            </div>
          </td>
        </tr>`;
    })
    .join('');
}

function openCompanySite() {
  const companyName = $('lookupCompany').value.trim();
  const result = $('lookupResult');

  if (!companyName) {
    result.textContent = '社名を入力してください。';
    return;
  }

  const entry = findExactEntryByCompany(companyName);
  if (entry?.mypageUrl) {
    window.open(entry.mypageUrl, '_blank', 'noopener');
    result.textContent = `「${entry.companyName}」の登録済みマイページを新しいタブで開きました。`;
    return;
  }

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${companyName} 公式サイト`)}`;
  window.open(searchUrl, '_blank', 'noopener');
  result.textContent = `「${companyName} 公式サイト」の検索結果を新しいタブで開きました。検索結果から公式サイトを確認してください。`;
}

function resetDeadlineRows(items = []) {
  $('deadlineItems').innerHTML = '';
  if (items.length) {
    items.forEach(addDeadlineRow);
  } else {
    addDeadlineRow();
  }
}

function resetForm() {
  $('entryForm').reset();
  $('entryId').value = '';
  $('formTitle').textContent = '企業を登録';
  $('saveButton').textContent = '登録する';
  $('cancelEditButton').hidden = true;
  $('formMessage').textContent = '';
  $('selectionStatus').value = '';
  $('preference').value = '';
  $('loginId').value = '';
  $('sitePassword').value = '';
  $('sitePassword').type = 'password';
  $('togglePasswordButton').textContent = '表示';
  resetDeadlineRows();
}

async function startEdit(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) {
    return;
  }

  $('entryId').value = entry.id;
  $('companyName').value = entry.companyName;
  $('selectionStatus').value = entry.selectionStatus;
  $('preference').value = entry.preference;
  $('internshipAt').value = toLocalInputValue(entry.internshipAt);
  $('mypageUrl').value = entry.mypageUrl || '';
  $('memo').value = entry.memo || '';
  resetDeadlineRows(entry.deadlineItems || []);

  $('formTitle').textContent = '企業を編集';
  $('saveButton').textContent = '更新する';
  $('cancelEditButton').hidden = false;
  $('formMessage').textContent = '';

  if (isUnlocked() && entry.credentialsEnc) {
    try {
      const credentials = JSON.parse(await decryptText(entry.credentialsEnc));
      $('loginId').value = credentials.loginId || '';
      $('sitePassword').value = credentials.password || '';
    } catch {
      showToast('認証情報を読み取れませんでした。');
    }
  } else {
    $('loginId').value = '';
    $('sitePassword').value = '';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveEntry(event) {
  event.preventDefault();
  $('formMessage').textContent = '';

  const companyName = $('companyName').value.trim();
  const mypageUrl = $('mypageUrl').value.trim();
  const editId = $('entryId').value;

  if (!companyName) {
    $('formMessage').textContent = '社名は必須です。';
    return;
  }

  if (mypageUrl) {
    try {
      const url = new URL(mypageUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('unsupported protocol');
      }
    } catch {
      $('formMessage').textContent = 'マイページURLは http:// または https:// で始まる形式で入力してください。';
      return;
    }
  }

  const companyNormalized = normalize(companyName);
  const duplicate = state.entries.find(
    (entry) => entry.id !== editId && entry.companyNormalized === companyNormalized
  );

  if (duplicate) {
    $('formMessage').textContent = '同じ社名の企業はすでに登録されています。編集から更新してください。';
    return;
  }

  const old = state.entries.find((entry) => entry.id === editId);
  const now = new Date().toISOString();

  const entry = {
    id: editId || uuid(),
    companyName,
    companyNormalized,
    selectionStatus: $('selectionStatus').value,
    preference: $('preference').value,
    deadlineItems: getDeadlineItemsFromForm(),
    internshipAt: $('internshipAt').value ? new Date($('internshipAt').value).toISOString() : '',
    mypageUrl,
    memo: $('memo').value.trim(),
    credentialsEnc: old?.credentialsEnc || null,
    createdAt: old?.createdAt || now,
    updatedAt: now
  };

  if (isUnlocked()) {
    const loginId = $('loginId').value.trim();
    const password = $('sitePassword').value;
    entry.credentialsEnc = loginId || password
      ? await encryptText(JSON.stringify({ loginId, password }))
      : null;
  }

  state.entries = old
    ? state.entries.map((item) => (item.id === entry.id ? entry : item))
    : [...state.entries, entry];

  writeEntries();
  resetForm();
  renderEntries();
  showToast(old ? '企業情報を更新しました。' : '企業情報を登録しました。');
}

async function copyText(value, successMessage) {
  if (!value) {
    showToast('コピーする情報が登録されていません。');
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    showToast(successMessage);
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    showToast(successMessage);
  }
}

async function handleTableClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) {
    return;
  }

  const entry = state.entries.find((item) => item.id === button.dataset.id);
  if (!entry) {
    return;
  }

  const action = button.dataset.action;
  if (action === 'edit') {
    return startEdit(entry.id);
  }

  if (action === 'delete') {
    state.deleteId = entry.id;
    $('deleteDialog').showModal();
    return;
  }

  if (action === 'copy-url') {
    return copyText(entry.mypageUrl, 'マイページURLをコピーしました。');
  }

  if (!isUnlocked()) {
    showToast('認証情報を使うにはロックを解除してください。');
    return;
  }

  try {
    const credentials = entry.credentialsEnc
      ? JSON.parse(await decryptText(entry.credentialsEnc))
      : { loginId: '', password: '' };

    if (action === 'copy-id') {
      return copyText(credentials.loginId, 'IDをコピーしました。');
    }

    if (action === 'copy-password') {
      return copyText(credentials.password, 'パスワードをコピーしました。');
    }
  } catch {
    showToast('認証情報を復号できませんでした。アプリ用パスワードを確認してください。');
  }
}

function openMasterDialog() {
  const hasMeta = Boolean(getCryptoMeta());
  $('masterPasswordForm').reset();
  $('masterError').textContent = '';
  $('masterTitle').textContent = hasMeta ? '認証情報のロック解除' : '認証情報を保護';
  $('masterDescription').textContent = hasMeta
    ? 'アプリ用パスワードを入力すると、保存済みのID・パスワードを利用できます。'
    : 'ID・パスワードを端末内で暗号化保存するため、8文字以上のアプリ用パスワードを設定してください。';
  $('masterConfirmArea').hidden = hasMeta;
  $('masterPasswordConfirm').required = !hasMeta;
  $('masterPassword').autocomplete = hasMeta ? 'current-password' : 'new-password';
  $('masterSubmit').textContent = hasMeta ? 'ロックを解除する' : '設定して続ける';
  $('masterPasswordDialog').showModal();
  setTimeout(() => $('masterPassword').focus(), 0);
}

async function submitMasterPassword(event) {
  event.preventDefault();
  const password = $('masterPassword').value;
  const confirm = $('masterPasswordConfirm').value;
  const hasMeta = Boolean(getCryptoMeta());

  if (password.length < 8) {
    $('masterError').textContent = 'アプリ用パスワードは8文字以上にしてください。';
    return;
  }

  if (!hasMeta && password !== confirm) {
    $('masterError').textContent = '確認用パスワードが一致しません。';
    return;
  }

  try {
    if (hasMeta) {
      await unlockMasterPassword(password);
    } else {
      await createMasterPassword(password);
    }
    $('masterPasswordDialog').close();
    updateLockUi();
    showToast('認証情報を利用できる状態にしました。');
  } catch {
    $('masterError').textContent = 'アプリ用パスワードが正しくありません。';
  }
}

function setupPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        showToast('オフライン機能を初期化できませんでした。');
      });
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    $('installButton').hidden = false;
  });

  $('installButton').addEventListener('click', async () => {
    if (!state.deferredPrompt) {
      return;
    }
    state.deferredPrompt.prompt();
    await state.deferredPrompt.userChoice;
    $('installButton').hidden = true;
    state.deferredPrompt = null;
  });

  const updateNetworkStatus = () => {
    $('networkStatus').textContent = navigator.onLine ? 'オンライン' : 'オフライン';
    $('networkStatus').classList.toggle('offline', !navigator.onLine);
  };

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();
}

function bindEvents() {
  $('entryForm').addEventListener('submit', saveEntry);
  $('resetButton').addEventListener('click', resetForm);
  $('cancelEditButton').addEventListener('click', resetForm);
  $('filterText').addEventListener('input', renderEntries);
  $('lookupButton').addEventListener('click', openCompanySite);
  $('lookupCompany').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      openCompanySite();
    }
  });
  $('entryTableBody').addEventListener('click', handleTableClick);
  $('addDeadlineButton').addEventListener('click', () => addDeadlineRow());
  $('deadlineItems').addEventListener('click', (event) => {
    if (event.target.closest('[data-action="remove-deadline"]')) {
      event.target.closest('.deadline-row').remove();
      if (!$('deadlineItems').children.length) {
        addDeadlineRow();
      }
    }
  });

  $('unlockButton').addEventListener('click', () => {
    if (isUnlocked()) {
      lockApp();
    } else {
      openMasterDialog();
    }
  });

  $('togglePasswordButton').addEventListener('click', () => {
    const hidden = $('sitePassword').type === 'password';
    $('sitePassword').type = hidden ? 'text' : 'password';
    $('togglePasswordButton').textContent = hidden ? '隠す' : '表示';
  });

  $('masterPasswordForm').addEventListener('submit', submitMasterPassword);

  $('deleteDialog').addEventListener('close', () => {
    if ($('deleteDialog').returnValue === 'delete' && state.deleteId) {
      state.entries = state.entries.filter((entry) => entry.id !== state.deleteId);
      writeEntries();
      renderEntries();
      resetForm();
      showToast('企業情報を削除しました。');
    }
    state.deleteId = null;
  });
}

function bootstrap() {
  if (!window.crypto?.subtle) {
    alert('このブラウザは暗号化機能に対応していません。最新のChrome、Edge、Safari、Firefoxを使用してください。');
  }

  setupSelects();
  state.entries = readEntries();
  bindEvents();
  updateLockUi();
  resetForm();
  renderEntries();
  setupPwa();
}

bootstrap();
望'], ['高い', '高い'], ['普通', '普通'], ['低い', '低い'], ['未設定', '未設定']];

const $ = (id) => document.getElementById(id);
const state = { entries: [], cryptoKey: null, deferredPrompt: null, deleteId: null, toastTimer: null };

function escapeHtml(text = '') {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function uuid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
function normalize(name) { return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ja-JP'); }
function toBase64(bytes) { return btoa(String.fromCharCode(...bytes)); }
function fromBase64(value) { return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)); }
function readEntries() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function writeEntries() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.entries)); }
function getCryptoMeta() { try { return JSON.parse(localStorage.getItem(CRYPTO_META_KEY)); } catch { return null; } }
function showToast(message) {
  const toast = $('toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
function fillSelect(selectId, options, placeholder = false) {
  $(selectId).innerHTML = `${placeholder ? '<option value="">選択してください</option>' : ''}${options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('')}`;
}
function setupSelects() {
  const year = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => [String(year - 1 + i), `${year - 1 + i}卒`]);
  fillSelect('graduationYear', years, true);
  fillSelect('selectionStatus', STATUS_OPTIONS); fillSelect('preference', PREFERENCE_OPTIONS);
  $('selectionStatus').value = '応募予定'; $('preference').value = '未設定';
}

async function deriveKey(masterPassword, salt, iterations) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(masterPassword), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name:'PBKDF2', salt:fromBase64(salt), iterations, hash:'SHA-256' }, material, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
}
async function encryptText(text, key = state.cryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, new TextEncoder().encode(text));
  return { iv:toBase64(iv), data:toBase64(new Uint8Array(encrypted)) };
}
async function decryptText(payload, key = state.cryptoKey) {
  const data = await crypto.subtle.decrypt({ name:'AES-GCM', iv:fromBase64(payload.iv) }, key, fromBase64(payload.data));
  return new TextDecoder().decode(data);
}
async function createMasterPassword(password) {
  const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
  const iterations = 250000;
  const key = await deriveKey(password, salt, iterations);
  const verifier = await encryptText('intern-selection-manager-verifier-v1', key);
  localStorage.setItem(CRYPTO_META_KEY, JSON.stringify({ salt, iterations, verifier }));
  state.cryptoKey = key;
}
async function unlockMasterPassword(password) {
  const meta = getCryptoMeta();
  if (!meta) throw new Error('アプリ用パスワードが未設定です。');
  const key = await deriveKey(password, meta.salt, meta.iterations);
  const value = await decryptText(meta.verifier, key);
  if (value !== 'intern-selection-manager-verifier-v1') throw new Error('wrong password');
  state.cryptoKey = key;
}
function isUnlocked() { return Boolean(state.cryptoKey); }
function updateLockUi() {
  const unlocked = isUnlocked();
  $('loginId').disabled = !unlocked; $('sitePassword').disabled = !unlocked; $('togglePasswordButton').disabled = !unlocked;
  $('unlockButton').textContent = unlocked ? '認証情報をロック' : '認証情報をロック解除';
  $('lockMessage').textContent = unlocked ? 'ロック解除中です。ID・パスワードを入力またはコピーできます。' : '認証情報はロック中です。入力するにはロックを解除してください。';
}
function lockApp() { state.cryptoKey = null; $('loginId').value = ''; $('sitePassword').value = ''; $('sitePassword').type = 'password'; $('togglePasswordButton').textContent = '表示'; updateLockUi(); showToast('認証情報をロックしました。'); }

function formatDate(value) {
  if (!value) return '<span class="cell-note">未設定</span>';
  const date = new Date(value); if (Number.isNaN(date.getTime())) return '<span class="cell-note">未設定</span>';
  return escapeHtml(new Intl.DateTimeFormat('ja-JP', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).format(date));
}
function toLocalInputValue(value) { if (!value) return ''; const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); }
function preferenceClass(value) { return ({ '第一志望':'first', '高い':'high', '低い':'low', '未設定':'low' })[value] || ''; }
function findEntriesByCompany(name) { const key = normalize(name); return state.entries.filter((entry) => entry.companyNormalized.includes(key)); }

function renderEntries() {
  const filter = normalize($('filterText').value || '');
  const entries = [...state.entries]
    .filter((entry) => !filter || entry.companyNormalized.includes(filter))
    .sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  $('emptyMessage').hidden = entries.length > 0;
  $('entryTableBody').innerHTML = entries.map((entry) => {
    const mypage = entry.mypageUrl
      ? `<a class="table-link" href="${escapeHtml(entry.mypageUrl)}" target="_blank" rel="noopener noreferrer">開く</a><button class="table-button" data-action="copy-url" data-id="${entry.id}">URLコピー</button>`
      : '<span class="cell-note">未登録</span>';
    return `<tr>
      <td><span class="company-name">${escapeHtml(entry.companyName)}</span><span class="company-year">${entry.graduationYear}卒</span></td>
      <td><span class="pill">${escapeHtml(entry.selectionStatus)}</span></td>
      <td><span class="pill ${preferenceClass(entry.preference)}">${escapeHtml(entry.preference)}</span></td>
      <td>${formatDate(entry.deadline)}</td><td>${formatDate(entry.interviewAt)}</td>
      <td><div class="table-actions">${mypage}</div></td>
      <td><div class="table-actions"><button class="table-button" data-action="copy-id" data-id="${entry.id}">IDコピー</button><button class="table-button" data-action="copy-password" data-id="${entry.id}">パスコピー</button></div></td>
      <td><div class="table-actions"><button class="table-button" data-action="edit" data-id="${entry.id}">編集</button><button class="table-button danger" data-action="delete" data-id="${entry.id}">削除</button></div></td>
    </tr>`;
  }).join('');
}
function officialSiteSearchUrl(companyName) {
  const query = `${companyName} 公式サイト`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function openExternalUrl(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function renderLookup() {
  const name = $('lookupCompany').value.trim();
  const result = $('lookupResult');

  if (!name) {
    result.textContent = '社名を入力してください。';
    return;
  }

  const matches = findEntriesByCompany(name);
  const entryWithPortalUrl = matches.find((entry) => entry.mypageUrl);

  if (entryWithPortalUrl) {
    openExternalUrl(entryWithPortalUrl.mypageUrl);
    result.innerHTML = `<strong>${escapeHtml(entryWithPortalUrl.companyName)}（${entryWithPortalUrl.graduationYear}卒）</strong>の登録済みマイページを新しいタブで開きました。<br><a href="${escapeHtml(entryWithPortalUrl.mypageUrl)}" target="_blank" rel="noopener noreferrer">もう一度マイページを開く</a>`;
    return;
  }

  const searchUrl = officialSiteSearchUrl(name);
  openExternalUrl(searchUrl);

  if (matches.length) {
    result.innerHTML = `<strong>${escapeHtml(name)}</strong>は登録済みですが、マイページURLが未登録です。<br>公式サイトを探すため、<strong>「${escapeHtml(name)} 公式サイト」</strong>の検索結果を新しいタブで開きました。検索結果から公式サイトを確認し、必要なら企業編集画面にURLを登録してください。`;
  } else {
    result.innerHTML = `<strong>${escapeHtml(name)}</strong>は未登録です。<br>公式サイトを探すため、<strong>「${escapeHtml(name)} 公式サイト」</strong>の検索結果を新しいタブで開きました。公式サイトを確認後、マイページURLが分かれば企業登録画面に保存してください。`;
  }
}

function resetForm() {
  $('entryForm').reset(); $('entryId').value = ''; $('formTitle').textContent = '企業を登録'; $('saveButton').textContent = '登録する'; $('cancelEditButton').hidden = true; $('formMessage').textContent = '';
  $('selectionStatus').value = '応募予定'; $('preference').value = '未設定'; $('loginId').value = ''; $('sitePassword').value = ''; $('sitePassword').type = 'password'; $('togglePasswordButton').textContent = '表示';
}
async function startEdit(id) {
  const entry = state.entries.find((item) => item.id === id); if (!entry) return;
  $('entryId').value = entry.id; $('companyName').value = entry.companyName; $('graduationYear').value = entry.graduationYear;
  $('selectionStatus').value = entry.selectionStatus; $('preference').value = entry.preference; $('deadline').value = toLocalInputValue(entry.deadline); $('interviewAt').value = toLocalInputValue(entry.interviewAt); $('mypageUrl').value = entry.mypageUrl || ''; $('memo').value = entry.memo || '';
  $('formTitle').textContent = '企業を編集'; $('saveButton').textContent = '更新する'; $('cancelEditButton').hidden = false; $('formMessage').textContent = '';
  if (isUnlocked() && entry.credentialsEnc) {
    try { const c = JSON.parse(await decryptText(entry.credentialsEnc)); $('loginId').value = c.loginId || ''; $('sitePassword').value = c.password || ''; } catch { showToast('認証情報を読み取れませんでした。'); }
  } else { $('loginId').value = ''; $('sitePassword').value = ''; }
  window.scrollTo({ top:0, behavior:'smooth' });
}
async function saveEntry(event) {
  event.preventDefault(); $('formMessage').textContent = '';
  const companyName = $('companyName').value.trim(); const graduationYear = $('graduationYear').value;
  const mypageUrl = $('mypageUrl').value.trim(); const editId = $('entryId').value;
  if (!companyName || !graduationYear) { $('formMessage').textContent = '社名と卒業年度は必須です。'; return; }
  if (mypageUrl) { try { const url = new URL(mypageUrl); if (!['http:','https:'].includes(url.protocol)) throw new Error(); } catch { $('formMessage').textContent = 'マイページURLは http:// または https:// で始まる形式で入力してください。'; return; } }
  const companyNormalized = normalize(companyName);
  const duplicate = state.entries.find((entry) => entry.id !== editId && entry.companyNormalized === companyNormalized && entry.graduationYear === graduationYear);
  if (duplicate) { $('formMessage').textContent = '同じ社名・卒業年度の企業はすでに登録されています。'; return; }
  const old = state.entries.find((entry) => entry.id === editId);
  const now = new Date().toISOString();
  const entry = { id: editId || uuid(), companyName, companyNormalized, graduationYear, selectionStatus:$('selectionStatus').value, preference:$('preference').value, deadline:$('deadline').value ? new Date($('deadline').value).toISOString() : '', interviewAt:$('interviewAt').value ? new Date($('interviewAt').value).toISOString() : '', mypageUrl, memo:$('memo').value.trim(), credentialsEnc:old?.credentialsEnc || null, createdAt:old?.createdAt || now, updatedAt:now };
  const loginId = $('loginId').value.trim(); const password = $('sitePassword').value;
  if (isUnlocked() && (loginId || password)) entry.credentialsEnc = await encryptText(JSON.stringify({ loginId, password }));
  state.entries = old ? state.entries.map((item) => item.id === entry.id ? entry : item) : [...state.entries, entry];
  writeEntries(); resetForm(); renderEntries(); showToast(old ? '企業情報を更新しました。' : '企業情報を登録しました。');
}

async function copyText(value, successMessage) {
  if (!value) { showToast('コピーする情報が登録されていません。'); return; }
  try { await navigator.clipboard.writeText(value); showToast(successMessage); }
  catch { const area = document.createElement('textarea'); area.value = value; document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); showToast(successMessage); }
}
async function handleTableClick(event) {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const entry = state.entries.find((item) => item.id === button.dataset.id); if (!entry) return;
  const action = button.dataset.action;
  if (action === 'edit') return startEdit(entry.id);
  if (action === 'delete') { state.deleteId = entry.id; $('deleteDialog').showModal(); return; }
  if (action === 'copy-url') return copyText(entry.mypageUrl, 'マイページURLをコピーしました。');
  if (!isUnlocked()) { showToast('認証情報を使うにはロックを解除してください。'); return; }
  try {
    const credentials = entry.credentialsEnc ? JSON.parse(await decryptText(entry.credentialsEnc)) : { loginId:'', password:'' };
    if (action === 'copy-id') return copyText(credentials.loginId, 'IDをコピーしました。');
    if (action === 'copy-password') return copyText(credentials.password, 'パスワードをコピーしました。');
  } catch { showToast('認証情報を復号できませんでした。アプリ用パスワードを確認してください。'); }
}

function openMasterDialog() {
  const hasMeta = Boolean(getCryptoMeta()); $('masterPasswordForm').reset(); $('masterError').textContent = '';
  $('masterTitle').textContent = hasMeta ? '認証情報のロック解除' : '認証情報を保護';
  $('masterDescription').textContent = hasMeta ? 'アプリ用パスワードを入力すると、保存済みのID・パスワードを利用できます。' : 'ID・パスワードを端末内で暗号化保存するため、8文字以上のアプリ用パスワードを設定してください。';
  $('masterConfirmArea').hidden = hasMeta; $('masterPasswordConfirm').required = !hasMeta; $('masterPassword').autocomplete = hasMeta ? 'current-password' : 'new-password'; $('masterSubmit').textContent = hasMeta ? 'ロックを解除する' : '設定して続ける';
  $('masterPasswordDialog').showModal(); setTimeout(() => $('masterPassword').focus(), 0);
}
async function submitMasterPassword(event) {
  event.preventDefault(); const password = $('masterPassword').value; const confirm = $('masterPasswordConfirm').value; const hasMeta = Boolean(getCryptoMeta());
  if (password.length < 8) { $('masterError').textContent = 'アプリ用パスワードは8文字以上にしてください。'; return; }
  if (!hasMeta && password !== confirm) { $('masterError').textContent = '確認用パスワードが一致しません。'; return; }
  try { if (hasMeta) await unlockMasterPassword(password); else await createMasterPassword(password); $('masterPasswordDialog').close(); updateLockUi(); showToast('認証情報を利用できる状態にしました。'); }
  catch { $('masterError').textContent = 'アプリ用パスワードが正しくありません。'; }
}
function setupPwa() {
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => showToast('オフライン機能を初期化できませんでした。')));
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); state.deferredPrompt = event; $('installButton').hidden = false; });
  $('installButton').addEventListener('click', async () => { if (!state.deferredPrompt) return; state.deferredPrompt.prompt(); await state.deferredPrompt.userChoice; $('installButton').hidden = true; state.deferredPrompt = null; });
  const network = () => { $('networkStatus').textContent = navigator.onLine ? 'オンライン' : 'オフライン'; $('networkStatus').classList.toggle('offline', !navigator.onLine); }; window.addEventListener('online', network); window.addEventListener('offline', network); network();
}
function bindEvents() {
  $('entryForm').addEventListener('submit', saveEntry); $('resetButton').addEventListener('click', resetForm); $('cancelEditButton').addEventListener('click', resetForm);
  $('filterText').addEventListener('input', renderEntries); $('lookupButton').addEventListener('click', renderLookup); $('lookupCompany').addEventListener('keydown', (e) => { if (e.key === 'Enter') renderLookup(); });
  $('entryTableBody').addEventListener('click', handleTableClick); $('unlockButton').addEventListener('click', () => isUnlocked() ? lockApp() : openMasterDialog());
  $('togglePasswordButton').addEventListener('click', () => { const hidden = $('sitePassword').type === 'password'; $('sitePassword').type = hidden ? 'text' : 'password'; $('togglePasswordButton').textContent = hidden ? '隠す' : '表示'; });
  $('masterPasswordForm').addEventListener('submit', submitMasterPassword);
  $('deleteForm').addEventListener('submit', () => { if ($('deleteDialog').returnValue === 'delete') return; });
  $('deleteForm').addEventListener('close', () => {});
  $('deleteDialog').addEventListener('close', () => { if ($('deleteDialog').returnValue === 'delete' && state.deleteId) { state.entries = state.entries.filter((entry) => entry.id !== state.deleteId); writeEntries(); renderEntries(); resetForm(); showToast('企業情報を削除しました。'); } state.deleteId = null; });
}
function bootstrap() {
  if (!window.crypto?.subtle) { alert('このブラウザは暗号化機能に対応していません。最新のChrome、Edge、Safari、Firefoxを使用してください。'); }
  setupSelects(); state.entries = readEntries(); bindEvents(); updateLockUi(); renderEntries(); setupPwa();
}
bootstrap();
