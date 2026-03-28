'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  items: [],
  filter: 'all',       // all | unread | read | category:X
  query: '',
  processingIds: new Set(),
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const grid = document.getElementById('items-grid');
const urlInput = document.getElementById('url-input');
const saveBtn = document.getElementById('save-btn');
const searchInput = document.getElementById('search-input');
const filtersEl = document.getElementById('filters');
const statsEl = document.getElementById('stats');
const toastContainer = document.getElementById('toast-container');
const remindOverlay = document.getElementById('remind-overlay');
const notifyBtn = document.getElementById('notify-btn');

// ── Toast ──────────────────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3000) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ── API ────────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Save URL ───────────────────────────────────────────────────────────────
async function saveUrl(url, title = '') {
  if (!url.trim()) return;
  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중...';

  try {
    const result = await api('POST', '/share', { url: url.trim(), title });
    urlInput.value = '';
    toast('저장했어요! AI가 분석 중이에요 🤖', 'success');
    state.processingIds.add(result.id);
    await loadItems();
    pollProcessing(result.id);
  } catch (err) {
    if (err.message.includes('Already saved')) {
      toast('이미 저장된 링크예요', 'info');
    } else {
      toast('저장 실패: ' + err.message, 'error');
    }
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '저장';
  }
}

// ── Poll processing status ─────────────────────────────────────────────────
function pollProcessing(id) {
  const interval = setInterval(async () => {
    try {
      const item = await api('GET', `/share/status/${id}`);
      if (item.status !== 'processing') {
        clearInterval(interval);
        state.processingIds.delete(id);
        await loadItems();
        toast(`분석 완료: ${item.title || '링크'}`, 'success');
      }
    } catch {
      clearInterval(interval);
    }
  }, 2000);
}

// ── Load Items ─────────────────────────────────────────────────────────────
async function loadItems() {
  const params = new URLSearchParams();
  if (state.query) params.set('q', state.query);

  const filterVal = state.filter;
  if (filterVal === 'unread') params.set('status', 'unread');
  else if (filterVal === 'read') params.set('status', 'read');
  else if (filterVal.startsWith('category:')) params.set('category', filterVal.slice(9));

  state.items = await api('GET', `/items?${params}`);
  renderItems();
  loadStats();
}

async function loadStats() {
  try {
    const stats = await api('GET', '/items/stats');
    statsEl.innerHTML = `
      <span class="stat">전체 <span>${stats.total}</span></span>
      <span class="stat">미확인 <span>${stats.unread}</span></span>
    `;
    renderFilters(stats.byCategory);
  } catch {}
}

// ── Render ─────────────────────────────────────────────────────────────────
const CATEGORY_LABELS = {
  article: '📄 아티클', video: '🎬 영상', tool: '🛠 도구',
  tutorial: '📚 튜토리얼', news: '📰 뉴스', research: '🔬 연구',
  entertainment: '🎭 엔터', shopping: '🛍 쇼핑', other: '📌 기타',
  uncategorized: '📌 기타', processing: '⏳ 분석 중',
};

function renderFilters(byCategory = []) {
  const chips = [
    { id: 'all', label: '전체' },
    { id: 'unread', label: '📬 미확인' },
    { id: 'read', label: '✅ 확인함' },
    ...byCategory
      .filter(c => c.category && c.category !== 'processing')
      .map(c => ({ id: `category:${c.category}`, label: CATEGORY_LABELS[c.category] || c.category })),
  ];

  filtersEl.innerHTML = chips.map(c => `
    <button class="filter-chip ${state.filter === c.id ? 'active' : ''}" data-filter="${c.id}">
      ${c.label}
    </button>
  `).join('');

  filtersEl.querySelectorAll('.filter-chip').forEach(btn => {
    btn.onclick = () => {
      state.filter = btn.dataset.filter;
      loadItems();
    };
  });
}

function renderItems() {
  if (state.items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <h3>아직 저장한 항목이 없어요</h3>
        <p>위에 링크를 붙여넣거나,<br>모바일에서 공유 버튼으로 바로 저장하세요!</p>
      </div>`;
    return;
  }

  const highlight = new URLSearchParams(location.search).get('highlight');

  grid.innerHTML = state.items.map(item => {
    const isProcessing = item.status === 'processing' || state.processingIds.has(item.id);
    const isRead = item.status === 'read';
    const isHighlight = String(item.id) === highlight;
    const catClass = item.category || 'other';
    const catLabel = CATEGORY_LABELS[catClass] || catClass;
    const domain = (() => { try { return new URL(item.url).hostname.replace('www.', ''); } catch { return item.url; } })();
    const tags = Array.isArray(item.tags) ? item.tags.slice(0, 4) : [];
    const remindDate = item.remind_at ? new Date(item.remind_at) : null;

    return `
    <div class="item-card ${isRead ? 'read' : ''} ${isProcessing ? 'processing' : ''} ${isHighlight ? 'highlight' : ''}"
         data-id="${item.id}" onclick="openUrl(event, '${escHtml(item.url)}', ${item.id})">
      <div class="card-header">
        <span class="category-badge ${catClass}">${catLabel}</span>
        <span class="card-title">${escHtml(item.title || item.url)}</span>
      </div>
      <div class="card-url">${escHtml(domain)}</div>
      ${isProcessing ? `
        <div class="processing-indicator"><div class="spinner"></div>AI가 분석 중이에요...</div>
      ` : item.summary ? `
        <div class="card-summary">${escHtml(item.summary)}</div>
      ` : ''}
      <div class="card-footer">
        ${item.reading_time_min ? `<span class="time-badge">⏱ ${item.reading_time_min}분</span>` : ''}
        ${remindDate && !item.reminded ? `<span class="time-badge">🔔 ${formatDate(remindDate)}</span>` : ''}
        <div class="tags">
          ${tags.map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}
        </div>
        <div class="card-actions" onclick="event.stopPropagation()">
          <button class="btn-action success" onclick="toggleRead(${item.id}, '${isRead ? 'unread' : 'read'}')" title="${isRead ? '읽지 않음으로' : '읽음으로'}">
            ${isRead ? '↩ 읽지 않음' : '✓ 읽음'}
          </button>
          <button class="btn-action" onclick="openRemindDialog(${item.id})" title="리마인드 설정">🔔</button>
          <button class="btn-action danger" onclick="deleteItem(${item.id})" title="삭제">✕</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(date) {
  const diff = date - Date.now();
  if (diff < 0) return '리마인드 예정';
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}일 후`;
  if (h > 0) return `${h}시간 후`;
  return '곧';
}

function openUrl(event, url, id) {
  if (event.target.closest('.card-actions')) return;
  window.open(url, '_blank', 'noopener');
  // Mark as read after opening
  api('PATCH', `/items/${id}`, { status: 'read' }).then(loadItems).catch(() => {});
}

// ── Actions ────────────────────────────────────────────────────────────────
async function toggleRead(id, status) {
  await api('PATCH', `/items/${id}`, { status });
  loadItems();
}

async function deleteItem(id) {
  await api('DELETE', `/items/${id}`);
  toast('삭제했어요', 'info');
  loadItems();
}

// ── Remind Dialog ──────────────────────────────────────────────────────────
let remindTargetId = null;
const REMIND_OPTIONS = [
  { label: '1시간 후', hours: 1 },
  { label: '3시간 후', hours: 3 },
  { label: '내일', hours: 24 },
  { label: '3일 후', hours: 72 },
  { label: '1주일 후', hours: 168 },
  { label: '알림 끄기', hours: null },
];

function openRemindDialog(id) {
  remindTargetId = id;
  const opts = document.getElementById('remind-options');
  let selected = 1;

  opts.innerHTML = REMIND_OPTIONS.map((o, i) => `
    <div class="remind-opt ${i === selected ? 'selected' : ''}" data-i="${i}">
      <div class="opt-label">${o.label}</div>
      ${o.hours ? `<div class="opt-time">${formatRemindTime(o.hours)}</div>` : ''}
    </div>
  `).join('');

  opts.querySelectorAll('.remind-opt').forEach(el => {
    el.onclick = () => {
      opts.querySelectorAll('.remind-opt').forEach(e => e.classList.remove('selected'));
      el.classList.add('selected');
    };
  });

  remindOverlay.classList.add('open');
}

function formatRemindTime(hours) {
  const d = new Date(Date.now() + hours * 3600000);
  return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

document.getElementById('remind-cancel').onclick = () => remindOverlay.classList.remove('open');

document.getElementById('remind-confirm').onclick = async () => {
  const selected = document.querySelector('.remind-opt.selected');
  if (!selected || remindTargetId === null) return;
  const opt = REMIND_OPTIONS[parseInt(selected.dataset.i)];
  const remind_at = opt.hours ? new Date(Date.now() + opt.hours * 3600000).toISOString() : null;

  await api('PATCH', `/items/${remindTargetId}`, { remind_at });
  remindOverlay.classList.remove('open');
  toast(opt.hours ? `${opt.label} 리마인드 설정했어요 🔔` : '리마인드를 껐어요', 'success');
  loadItems();
};

remindOverlay.onclick = (e) => { if (e.target === remindOverlay) remindOverlay.classList.remove('open'); };

// ── Push Notifications ─────────────────────────────────────────────────────
let isPushEnabled = false;

async function setupNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    toast('이 브라우저는 알림을 지원하지 않아요', 'error');
    return;
  }

  try {
    const { key } = await api('GET', '/notify/vapid-public-key');
    if (!key) { toast('서버에 VAPID 키가 설정되지 않았어요', 'error'); return; }

    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('알림 권한이 필요해요', 'error'); return; }

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      isPushEnabled = true;
      updateNotifyBtn();
      toast('알림이 이미 설정되어 있어요', 'info');
      return;
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });

    await api('POST', '/notify/subscribe', sub.toJSON());
    isPushEnabled = true;
    updateNotifyBtn();
    toast('알림 설정 완료! 나중에 읽을 시간이 되면 알려드릴게요 🔔', 'success', 4000);
  } catch (err) {
    toast('알림 설정 실패: ' + err.message, 'error');
  }
}

function updateNotifyBtn() {
  notifyBtn.classList.toggle('active', isPushEnabled);
  notifyBtn.title = isPushEnabled ? '알림 설정됨' : '알림 설정';
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

notifyBtn.onclick = setupNotifications;

// ── Service Worker ─────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(async reg => {
    const sub = await reg.pushManager.getSubscription();
    if (sub) { isPushEnabled = true; updateNotifyBtn(); }
  });

  navigator.serviceWorker.onmessage = (e) => {
    if (e.data.type === 'navigate') {
      const url = new URL(e.data.url, location.origin);
      history.pushState({}, '', url.pathname + url.search);
      loadItems();
    }
  };
}

// ── Share Target handling ──────────────────────────────────────────────────
function handleShareTarget() {
  const params = new URLSearchParams(location.search);
  if (!params.get('share')) return;

  const url = params.get('url') || params.get('text') || '';
  const title = params.get('title') || '';

  if (url) {
    // Auto-save the shared URL
    saveUrl(url, title);
    // Clean up URL
    history.replaceState({}, '', '/');
  }
}

// ── Event listeners ────────────────────────────────────────────────────────
saveBtn.onclick = () => saveUrl(urlInput.value);

urlInput.onkeydown = (e) => { if (e.key === 'Enter') saveUrl(urlInput.value); };

urlInput.addEventListener('paste', (e) => {
  setTimeout(() => {
    const val = urlInput.value.trim();
    if (val.startsWith('http')) saveUrl(val);
  }, 50);
});

searchInput.addEventListener('input', () => {
  state.query = searchInput.value;
  clearTimeout(searchInput._timer);
  searchInput._timer = setTimeout(loadItems, 300);
});

// ── Init ───────────────────────────────────────────────────────────────────
handleShareTarget();
loadItems();
