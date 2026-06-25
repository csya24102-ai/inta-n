'use strict';

const STORAGE_KEY = 'intern-selection-manager.entries.v1';
const CRYPTO_META_KEY = 'intern-selection-manager.crypto-meta.v1';
const STATUS_OPTIONS = [
  ['応募予定', '応募予定'], ['応募準備中', '応募準備中'], ['応募済み', '応募済み'],
  ['書類選考中', '書類選考中'], ['面接予定', '面接予定'], ['選考中', '選考中'],
  ['合格', '合格'], ['不合格', '不合格'], ['辞退', '辞退'], ['終了', '終了']
];
const PREFERENCE_OPTIONS = [['第一志望', '第一志望'], ['高い', '高い'], ['普通', '普通'], ['低い', '低い'], ['未設定', '未設定']];

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
function renderLookup() {
  const name = $('lookupCompany').value.trim(); const result = $('lookupResult');
  if (!name) { result.textContent = '社名を入力してください。'; return; }
  const matches = findEntriesByCompany(name);
  if (!matches.length) { result.textContent = '一致する登録企業が見つかりません。社名を確認するか、先に企業を登録してください。'; return; }
  result.innerHTML = matches.map((entry) => entry.mypageUrl
    ? `<strong>${escapeHtml(entry.companyName)}（${entry.graduationYear}卒）</strong>： <a href="${escapeHtml(entry.mypageUrl)}" target="_blank" rel="noopener noreferrer">マイページを開く</a>`
    : `<strong>${escapeHtml(entry.companyName)}（${entry.graduationYear}卒）</strong>： マイページURLは未登録です。`).join('<br>');
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
