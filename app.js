(() => {
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
