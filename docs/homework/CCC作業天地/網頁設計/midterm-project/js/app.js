/**
 * app.js — 聊天啊!尬殿 前端主程式（Vanilla JS）
 * 架構：Hash Router + View Functions + Event Delegation
 */

// ══════════════════════════════════════════════════════════
//  全域狀態
// ══════════════════════════════════════════════════════════
const State = {
  user: null,
  stats: null,
  currentPage: 'feed',
  feedPage: 1,
  feedTag: null,
  feedSort: null,
  feedAuthor: null,
  feedAuthorDisplay: null,
  activityPage: 1,
  activityTab: 'upcoming',
};
// 用於 renderPostDetail race condition 防護
let _activePostId = null;

// ══════════════════════════════════════════════════════════
//  SyncQueue — 樂觀更新 + 背景同步系統
//  按讚：debounce 5s，只送最終狀態一次
//  留言：立刻 optimistic insert，背景上傳
//  失敗：Toast 提示，不 rollback
// ══════════════════════════════════════════════════════════
const SyncQueue = (() => {
  const DEBOUNCE_MS = 5000;

  // 每個 postId 維護一個待發送的 like state
  const pendingLikes = {};   // { [postId]: { finalState: bool, timer: int } }

  // 背景待確認的 comments（還沒得到 server 回覆）
  const pendingComments = []; // [{ localId, tempId, type, targetId, content }]

  // 同步中的 like（避免重複送出）
  const syncingLikes = new Set();

  // 同步狀態 indicator element
  let syncIndicator = null;

  // ── 初始化：建立 sync indicator DOM ────────────────────────
  function ensureIndicator() {
    if (syncIndicator) return;
    syncIndicator = document.createElement('div');
    syncIndicator.id = 'sync-indicator';
    syncIndicator.style.cssText = `
      position: fixed; bottom: 16px; right: 80px;
      background: var(--primary); color: #fff;
      font-size: 12px; padding: 4px 10px; border-radius: 12px;
      opacity: 0; transition: opacity 0.3s;
      pointer-events: none; z-index: 9999;
    `;
    syncIndicator.textContent = '同步中…';
    document.body.appendChild(syncIndicator);
  }

  function showIndicator() {
    ensureIndicator();
    syncIndicator.style.opacity = '1';
  }
  function hideIndicator() {
    if (syncIndicator) syncIndicator.style.opacity = '0';
  }

  // ── Toast helper ────────────────────────────────────────
  function toast(msg, type = 'info') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.className = `toast ${type}`;
    el.classList.remove('hidden');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.add('hidden'), 3500);
  }

  // ── 立即更新 UI（optimistic）────────────────────────────
  function applyLikeUi(postId, liked) {
    // 用 State.currentPage 判斷目前在哪個 page，避免多 page SPA DOM 殘留問題
    const inDetail = State.currentPage === 'post-detail';
    const scope = inDetail
      ? document.querySelector('#post-detail-content')
      : document.querySelector('#feed-list');
    const btn = scope?.querySelector(`.like-btn[data-post-id="${postId}"]`);
    if (!btn) return;
    btn.classList.toggle('liked', liked);
    const span = btn.querySelector('span');
    if (span) {
      const n = parseInt(span.textContent) || 0;
      span.textContent = liked ? n + 1 : Math.max(0, n - 1);
    }
    const icon = btn.firstChild;
    if (icon) icon.textContent = liked ? '❤️ ' : '🤍 ';
  }

  function getServerLikeState(postId) {
    // 如果還在 debounce 中，用 pendingLikes 記住的最終狀態，不讀 DOM（避免被 optimistic UI 汙染）
    if (pendingLikes[postId]) return pendingLikes[postId].finalState;
    // 否則讀 DOM（server 確認過的狀態）
    const btn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
    return btn ? btn.dataset.liked === 'true' : false;
  }

  // ── 排程 post 的 like（debounce 5s）────────────────────
  function scheduleLike(postId) {
    // 取消之前的計時
    if (pendingLikes[postId]?.timer) {
      clearTimeout(pendingLikes[postId].timer);
    }
    // 立刻應用 optimistic UI（toggle 當前顯示的狀態）
    const current = getServerLikeState(postId);
    const newState = !current;
    applyLikeUi(postId, newState);
    // 更新 DOM 上的 server state 標記（樂觀狀態覆寫）
    const btn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
    if (btn) btn.dataset.liked = String(newState);

    // 5 秒後才真正送 API
    pendingLikes[postId] = {
      finalState: newState,
      timer: setTimeout(() => flushLike(postId), DEBOUNCE_MS),
    };
    showIndicator();
  }

  // ── 實際送 like API ────────────────────────────────────
  async function flushLike(postId) {
    const entry = pendingLikes[postId];
    if (!entry) return;
    delete pendingLikes[postId];

    if (syncingLikes.has(postId)) return; // 已在處理
    syncingLikes.add(postId);

    try {
      const result = await ChatRankAPI.fetchBg(`/posts/${postId}/like`, { method: 'POST' });
      if (!result.ok) throw new Error(result.error || '按讚失敗');
      // server 回的 liked 狀態已是 finalState，不需要額外處理
    } catch (err) {
      // 失敗：顯示 Toast，但 UI 保持 optimistic 狀態（不 rollback）
      toast('❤️ 按讚同步失敗（' + err.message + '）', 'error');
    } finally {
      syncingLikes.delete(postId);
      if (Object.keys(pendingLikes).length === 0 && pendingComments.length === 0) {
        hideIndicator();
      }
    }
  }

  // ── flush 所有排隊中的 likes ────────────────────────────
  async function flushAllLikes() {
    const ids = Object.keys(pendingLikes);
    for (const id of ids) {
      clearTimeout(pendingLikes[id].timer);
    }
    // 同時送出不等待（fire-and-forget）
    ids.forEach(id => flushLike(id));
  }

  // ── 留言：optimistic insert ─────────────────────────────
  function addPendingComment(localId, html, type) {
    // 立刻插入 comment list 並標記 pending
    const list = type === 'post'
      ? document.querySelector(`#post-detail-comments[data-post-id]`)
      : document.querySelector(`#activity-detail-comments[data-activity-id]`);
    if (!list) return;
    const wrapper = document.createElement('div');
    wrapper.id = `pending-comment-${localId}`;
    wrapper.innerHTML = html + `<div class="comment-pending-tag">傳送中…</div>`;
    list.insertBefore(wrapper, list.firstChild);
    // 自動滾到最上
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function confirmComment(localId) {
    const el = $(`#pending-comment-${localId}`);
    if (el) {
      const tag = el.querySelector('.comment-pending-tag');
      if (tag) tag.remove();
      el.dataset.pending = 'false';
    }
  }

  function failComment(localId, errorMsg) {
    const el = $(`#pending-comment-${localId}`);
    if (el) {
      const tag = el.querySelector('.comment-pending-tag');
      if (tag) {
        tag.textContent = '傳送失敗';
        tag.style.color = 'var(--danger)';
      }
      el.dataset.pending = 'false';
    }
    toast('💬 留言傳送失敗（' + (errorMsg || '網路錯誤') + '）', 'error');
  }

  function removePendingComment(localId) {
    const el = $(`#pending-comment-${localId}`);
    if (el) el.remove();
  }

  // ── 背景送出 comment ───────────────────────────────────
  async function submitComment(type, targetId, content) {
    const localId = Date.now() + Math.random();

    // optimistic UI：立刻插入待確認的留言
    const optimisticHtml = `
      <div class="comment-item" data-pending="true">
        <div class="comment-header">
          <div class="comment-avatar" style="background:var(--primary)">${getInitials(State.user?.displayName || State.user?.username || '?')}</div>
          <span class="comment-author">${escapeHtml(State.user?.displayName || State.user?.username || '?')}</span>
          <span class="comment-time">刚刚</span>
        </div>
        <div class="comment-body">${escapeHtml(content)}</div>
      </div>`;
    addPendingComment(localId, optimisticHtml, type);
    showIndicator();

    const endpoint = type === 'post'
      ? `/posts/${targetId}/comment`
      : `/activities/${targetId}/comment`;

    const result = await ChatRankAPI.fetchBg(endpoint, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });

    if (result.ok) {
      confirmComment(localId);
    } else {
      failComment(localId, result.error);
    }

    if (Object.keys(pendingLikes).length === 0 && !result.ok) {
      hideIndicator();
    } else {
      setTimeout(() => {
        if (Object.keys(pendingLikes).length === 0) hideIndicator();
      }, 500);
    }
  }

  // ── Flush 所有排隊中的 actions ─────────────────────────
  async function flushAll() {
    await flushAllLikes();
    // comments 已在背景 fire-and-forget，不需要額外處理
    hideIndicator();
  }

  // ── 頁面離開時立刻 flush ───────────────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll();
  });
  window.addEventListener('beforeunload', () => flushAll());

  return {
    // 按讚：排程（debounce + optimistic UI）
    scheduleLike,
    // 留言：optimistic submit
    submitComment,
    // 全部送出（頁面離開時自動呼叫）
    flushAll,
  };
})();

// ══════════════════════════════════════════════════════════
//  工具函式
// ══════════════════════════════════════════════════════════
function $ (selector) { return document.querySelector(selector); }
function $$ (selector) { return document.querySelectorAll(selector); }

function showToast(msg, type = 'info') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), 3000);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return d.toLocaleDateString('zh-TW');
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function renderContent(text) {
  // 1. 先 HTML escape（防止 XSS）
  let escaped = escapeHtml(text);
  // 2. 把 #tag 置換成 clickable span（不能用 escapeHtml 否則 # 變成 &num;）
  escaped = escaped.replace(/#([\w\u4e00-\u9fff]+)/g, '<span class="tag" data-tag="$1">#$1</span>');
  return escaped;
}

function getInitials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}

function avatarColor(name) {
  // 簡單的根據名字決定顏色
  const colors = ['#4a90e2','#e74c3c','#27ae60','#9b59b6','#f39c12','#1abc9c','#e91e63'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ══════════════════════════════════════════════════════════
//  視圖切換
// ══════════════════════════════════════════════════════════
function showView(name) {
  $$('.view').forEach(el => el.classList.add('hidden'));
  $(`#view-${name}`).classList.remove('hidden');
}

function showPage(name) {
  $$('.page').forEach(el => el.classList.add('hidden'));
  $(`#page-${name}`).classList.remove('hidden');

  // 更新 nav active
  $$('.nav-link').forEach(el => el.classList.remove('active'));
  const active = $(`.nav-link[data-page="${name}"]`);
  if (active) active.classList.add('active');

  State.currentPage = name;
}

// ══════════════════════════════════════════════════════════
//  路由
// ══════════════════════════════════════════════════════════
function router() {
  const hash = window.location.hash.slice(1) || 'feed';
  const [page, ...rest] = hash.split('/');
  const id = rest.join('/');

  if (!State.user) {
    showView('auth');
    return;
  }

  showView('app');

  switch (page) {
    case 'feed':
      State.feedTag = null;
      State.feedAuthor = null;
      State.feedAuthorDisplay = null;
      State.feedPage = 1;
      showPage('feed');
      updateFeedAuthorBanner();
      renderFeed();
      break;
    case 'post':
      if (id) { showPage('post-detail'); renderPostDetail(id); }
      else { navigate('feed'); }
      break;
    case 'activities':
      showPage('activities');
      renderActivities();
      break;
    case 'activity':
      if (id) { showPage('activity-detail'); renderActivityDetail(id); }
      else { navigate('activities'); }
      break;
    case 'new-post':
      showPage('post-edit');
      resetPostForm();
      break;
    case 'new-activity':
      showPage('activity-edit');
      resetActivityForm();
      break;
    case 'user':
      State.feedAuthor = id || null;
      State.feedAuthorDisplay = id || null;
      State.feedPage = 1;
      showPage('feed');
      updateFeedAuthorBanner();
      renderFeed(1);
      break;
    case 'blocked-words':
      if (!State.user || (State.user.role !== 'admin' && State.user.username !== 'admin')) {
        showToast('無權訪問', 'error');
        navigate('feed');
        return;
      }
      showPage('blocked-words');
      renderBlockedWords();
      renderHotSettings();
      break;
    default:
      navigate('feed');
  }
}

function navigate(hash) {
  window.location.hash = hash;
}

// ══════════════════════════════════════════════════════════
//  認證
// ══════════════════════════════════════════════════════════
async function checkAuth() {
  // 優先用 server-side 注入的 auth data（同步，無閃爍）
  if (window.__AUTH__) {
    State.user = window.__AUTH__;
    return true;
  }
  try {
    const data = await ChatRankAPI.me();
    State.user = data.user;
    State.stats = data.stats;
    return true;
  } catch {
    State.user = null;
    return false;
  }
}

async function logout() {
  try {
    await ChatRankAPI.logout();
  } catch {}
  State.user = null;
  State.stats = null;
  ChatRankAPI.setCsrfToken('');
  showView('auth');
  navigate('feed');
  // Reset auth form
  $('#form-login').reset();
  $('#form-register').reset();
  $('#login-error').textContent = '';
  $('#register-error').textContent = '';
}

// ══════════════════════════════════════════════════════════
//  導航列更新
// ══════════════════════════════════════════════════════════
function updateNav() {
  if (!State.user) return;
  $('#nav-username').textContent = State.user.displayName || State.user.username;
  // Admin 專屬連結顯示
  const isAdmin = State.user && (State.user.role === 'admin' || State.user.username === 'admin');
  document.querySelectorAll('.nav-admin-only').forEach(el => {
    el.classList.toggle('visible', isAdmin);
  });
}

// ══════════════════════════════════════════════════════════
//  黑名單詞彙
// ══════════════════════════════════════════════════════════
async function renderBlockedWords() {
  const container = $('#blocked-words-list');
  container.innerHTML = '<div class="empty-state">載入中...</div>';
  try {
    const data = await ChatRankAPI.getBlockedWords();
    const words = data.words || [];
    if (words.length === 0) {
      container.innerHTML = '<div class="empty-state">目前沒有封鎖任何詞語</div>';
      return;
    }
    container.innerHTML = words.map(w => `
      <div class="blocked-word-tag">
        <span>${escapeHtml(w.word)}</span>
        <button class="remove-btn" data-word-id="${w.id}">✕</button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="empty-state" style="color:var(--danger)">載入失敗：${escapeHtml(err.message)}</div>`;
  }
}

// ══════════════════════════════════════════════════════════
//  發文表單
// ══════════════════════════════════════════════════════════
function resetPostForm() {
  $('#form-post').reset();
  $('#form-post input[name="postId"]').value = '';
  $('#post-edit-title').textContent = '發表文章';
  $('#post-error').textContent = '';
}

function openPostForm(postId = null, postData = null) {
  navigate('new-post');
  if (postId) {
    $('#form-post input[name="postId"]').value = postId;
    $('#post-edit-title').textContent = '編輯文章';
    if (postData) {
      $('#form-post input[name="title"]').value = postData.title || '';
      $('#form-post textarea[name="content"]').value = postData.content || '';
      $('#form-post input[name="tags"]').value = (postData.tags || []).join(',');
    }
  }
}

// ── 作者篩選 Banner ───────────────────────────────────
function updateFeedAuthorBanner() {
  const banner = $('#feed-author-banner');
  const text = $('#feed-author-text');
  if (!banner || !text) return;
  if (State.feedAuthor) {
    text.textContent = `👤 看 ${State.feedAuthorDisplay} 的文章`;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

// ══════════════════════════════════════════════════════════
//  動態牆渲染
// ══════════════════════════════════════════════════════════
function renderFeed(page = 1) {
  State.feedPage = page;
  const container = $('#feed-list');
  const moreBtn = $('#btn-feed-more');
  const moreContainer = $('#feed-more');

  if (page === 1) container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div>載入中...</div>';

  ChatRankAPI.getPosts(page, State.feedTag, State.feedSort, State.feedAuthor).then(data => {
    const posts = data.posts || [];

    if (page === 1 && posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <p>還沒有文章</p>
          <p style="margin-top:6px;font-size:.8rem">點擊右上角「發文」開始</p>
        </div>`;
      moreContainer.classList.add('hidden');
      return;
    }

    const html = posts.map(renderPostCard).join('');

    if (page === 1) container.innerHTML = html;
    else container.insertAdjacentHTML('beforeend', html);

    moreContainer.classList.toggle('hidden', page >= data.totalPages);
    updateFeedAuthorBanner();
  }).catch(err => {
    container.innerHTML = `<div class="empty-state" style="color:var(--danger)">載入失敗：${err.message}</div>`;
    moreContainer.classList.add('hidden');
  });
}

function renderPostCard(post) {
  const tags = (post.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const isMine = State.user && post.userId === State.user.id;
  const isAdmin = State.user && (State.user.role === 'admin' || State.user.username === 'admin');
  const canDelete = isMine || isAdmin;

  return `
    <div class="post-card" data-post-id="${post.id}">
      <div class="post-meta">
        <div class="avatar" data-username="${post.username}" data-displayname="${post.displayName}" style="background:${avatarColor(post.displayName)}">${getInitials(post.displayName)}</div>
        <span class="post-author" data-username="${post.username}">${escapeHtml(post.displayName || post.username)}</span>
        <span class="post-time">${formatDate(post.createdAt)}</span>
      </div>
      ${post.title ? `<div class="post-title">${escapeHtml(post.title)}</div>` : ''}
      <div class="post-content">${renderContent(post.content)}</div>
      <div class="post-actions">
        <button class="post-action like-btn ${post.likedByMe ? 'liked' : ''}" data-post-id="${post.id}" data-liked="${post.likedByMe}">
          ${post.likedByMe ? '❤️' : '🤍'} <span>${post.likeCount}</span>
        </button>
        <button class="post-action comment-btn" data-post-id="${post.id}">
          💬 留言
        </button>
        ${canDelete ? `<button class="post-action delete-btn" data-post-id="${post.id}">🗑️ 刪除</button>` : ''}
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
//  文章詳情
// ══════════════════════════════════════════════════════════
function renderPostDetail(postId) {
  _activePostId = postId; // race condition 防護
  const container = $('#post-detail-content');
  container.innerHTML = '<div class="empty-state">載入中...</div>';

  ChatRankAPI.getPost(postId).then(data => {
    if (_activePostId !== postId) return; // 已被新請求取代

    const post = data.post;
    if (!post) { container.innerHTML = '<div class="empty-state">文章不存在</div>'; return; }

    const isMine = State.user && post.userId === State.user.id;
    const isAdmin = State.user && (State.user.role === 'admin' || State.user.username === 'admin');
    const canDelete = isMine || isAdmin;

    container.innerHTML = `
      <div class="post-detail-card">
        <div class="post-meta" style="margin-bottom:8px">
          <div class="avatar" data-username="${post.username}" style="background:${avatarColor(post.displayName)};width:40px;height:40px;font-size:1rem">${getInitials(post.displayName)}</div>
          <div>
            <div class="post-author" data-username="${post.username}">${escapeHtml(post.displayName || post.username)}</div>
            <div class="post-time">${formatDate(post.createdAt)}</div>
          </div>
        </div>
        ${post.title ? `<div class="post-detail-title">${escapeHtml(post.title)}</div>` : ''}
        <div class="post-detail-content">${renderContent(post.content)}</div>
        <div class="post-detail-actions">
          <button class="post-action like-btn ${post.likedByMe ? 'liked' : ''}" data-post-id="${post.id}" data-liked="${post.likedByMe}">
            ${post.likedByMe ? '❤️' : '🤍'} <span>${post.likeCount}</span>
          </button>
          ${canDelete ? `<button class="post-action delete-btn" data-post-id="${post.id}">🗑️ 刪除</button>` : ''}
        </div>
      </div>

      <div class="comments-section">
        <div class="comments-title">💬 留言</div>
        <div class="comment-form">
          <input type="text" id="comment-input" placeholder="寫留言..." maxlength="2000" />
          <button id="btn-comment" class="btn-primary btn-sm">送出</button>
        </div>
        <div class="comment-list" id="post-detail-comments" data-post-id="${postId}">
          ${(post.comments || []).map(renderComment).join('')}
        </div>
      </div>`;

    // 留言事件
    $('#btn-comment').onclick = () => {
      const input = $('#comment-input');
      const content = input.value.trim();
      if (!content) return;
      input.value = '';
      SyncQueue.submitComment('post', postId, content);
    };

    // 輸入框 Enter
    $('#comment-input').onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#btn-comment').click(); }
    };

  }).catch(err => {
    container.innerHTML = `<div class="empty-state" style="color:var(--danger)">載入失敗：${err.message}</div>`;
  });
}

function renderComment(c) {
  const isMine = State.user && c.userId === State.user.id;
  const isAdmin = State.user && (State.user.role === 'admin' || State.user.username === 'admin');
  const canDelete = isMine || isAdmin;
  return `
    <div class="comment-item">
      <div class="comment-header">
        <div class="comment-avatar" style="background:${avatarColor(c.displayName)}">${getInitials(c.displayName)}</div>
        <span class="comment-author">${escapeHtml(c.displayName || c.username)}</span>
        <span class="comment-time">${formatDate(c.createdAt)}</span>
        ${canDelete ? `<button class="comment-delete" data-comment-id="${c.id}">刪除</button>` : ''}
      </div>
      <div class="comment-body">${escapeHtml(c.content)}</div>
    </div>`;
}

// ══════════════════════════════════════════════════════════
//  活動渲染
// ══════════════════════════════════════════════════════════
function renderActivities(page = 1) {
  State.activityPage = page;
  const container = $('#activity-list');
  const moreContainer = $('#activity-more');

  const tab = State.activityTab || 'upcoming';

  if (page === 1) container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div>載入中...</div>';

  ChatRankAPI.getActivities(page, tab).then(data => {
    const activities = data.activities || [];

    if (page === 1 && activities.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📅</div>
          <p>還沒有活動</p>
          <p style="margin-top:6px;font-size:.8rem">點擊「建立活動」新增</p>
        </div>`;
      moreContainer.classList.add('hidden');
      return;
    }

    const html = activities.map(a => renderActivityCard(a, tab)).join('');
    if (page === 1) container.innerHTML = html;
    else container.insertAdjacentHTML('beforeend', html);

    // Sync tab button active state
    $$('.activity-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    moreContainer.classList.toggle('hidden', page >= data.totalPages);
  }).catch(err => {
    container.innerHTML = `<div class="empty-state" style="color:var(--danger)">載入失敗：${err.message}</div>`;
  });
}

function renderActivityCard(a, tab = 'upcoming') {
  const isMine = State.user && a.userId === State.user.id;
  const isAdmin = State.user && (State.user.role === 'admin' || State.user.username === 'admin');
  const canDelete = isMine || isAdmin;
  const startDate = a.startDate ? new Date(a.startDate) : null;
  const now = new Date();
  const isPast = tab === 'past' || (startDate && startDate < now);
  return `
    <div class="activity-card${isPast ? ' past' : ''}" data-activity-id="${a.id}">
      <div class="activity-header">
        <div class="activity-title">${isPast && tab !== 'past' ? '<span class="badge-expired">已過期</span> ' : ''}${escapeHtml(a.title)}</div>
        ${canDelete ? `<button class="post-action delete-btn" data-activity-id="${a.id}">🗑️</button>` : ''}
      </div>
      <div class="activity-info">
        ${a.location ? `<div class="activity-info-row">📍 ${escapeHtml(a.location)}</div>` : ''}
        ${a.startDate ? `<div class="activity-info-row">🗓️ ${new Date(a.startDate).toLocaleString('zh-TW')}</div>` : ''}
        <div class="activity-info-row">👤 ${escapeHtml(a.displayName || a.username)}</div>
      </div>
      <div class="activity-footer">
        <span>💬 ${a.commentCount || 0} 留言</span>
        <span>${formatDate(a.createdAt)}</span>
      </div>
    </div>`;
}

function renderActivityDetail(activityId) {
  const container = $('#activity-detail-content');
  container.innerHTML = '<div class="empty-state">載入中...</div>';

  // Race guard：快速切換時忽略舊回覆
  const _activeActivityId = activityId;

  ChatRankAPI.getActivity(activityId).then(data => {
    if (_activeActivityId !== activityId) return; // 已被取代，忽略
    const a = data.activity;
    if (!a) { container.innerHTML = '<div class="empty-state">活動不存在</div>'; return; }
    const isMine = State.user && a.userId === State.user.id;
    const isAdmin = State.user && (State.user.role === 'admin' || State.user.username === 'admin');
    const canDelete = isMine || isAdmin;

    container.innerHTML = `
      <div class="activity-detail-card">
        <div class="activity-detail-title">${escapeHtml(a.title)}</div>
        <div class="activity-detail-meta">
          ${a.location ? `<div>📍 ${escapeHtml(a.location)}</div>` : ''}
          ${a.startDate ? `<div>🗓️ ${new Date(a.startDate).toLocaleString('zh-TW')}</div>` : ''}
          <div>👤 ${escapeHtml(a.displayName || a.username)}</div>
        </div>
        ${a.description ? `<div class="activity-detail-desc">${escapeHtml(a.description)}</div>` : ''}
        ${canDelete ? `<button class="post-action delete-btn" data-activity-id="${a.id}">🗑️ 刪除活動</button>` : ''}
      </div>

      <div class="comments-section">
        <div class="comments-title">💬 留言</div>
        <div class="comment-form">
          <input type="text" id="activity-comment-input" placeholder="留言..." maxlength="2000" />
          <button id="btn-activity-comment" class="btn-primary btn-sm">送出</button>
        </div>
        <div class="comment-list" id="activity-detail-comments" data-activity-id="${activityId}">
          ${(a.comments || []).map(c => `
            <div class="comment-item">
              <div class="comment-header">
                <div class="comment-avatar" style="background:${avatarColor(c.displayName)}">${getInitials(c.displayName)}</div>
                <span class="comment-author">${escapeHtml(c.displayName || c.username)}</span>
                <span class="comment-time">${formatDate(c.createdAt)}</span>
                ${(State.user && (c.userId === State.user.id || State.user.role === 'admin' || State.user.username === 'admin')) ? `<button class="comment-delete" data-activity-comment-id="${c.id}">刪除</button>` : ''}
              </div>
              <div class="comment-body">${escapeHtml(c.content)}</div>
            </div>`).join('')}
        </div>
      </div>`;

    $('#btn-activity-comment').onclick = () => {
      const input = $('#activity-comment-input');
      const content = input.value.trim();
      if (!content) return;
      input.value = '';
      SyncQueue.submitComment('activity', activityId, content);
    };

    $('#activity-comment-input').onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#btn-activity-comment').click(); }
    };

  }).catch(err => {
    container.innerHTML = `<div class="empty-state" style="color:var(--danger)">載入失敗：${err.message}</div>`;
  });
}

// ══════════════════════════════════════════════════════════
//  活動表單
// ══════════════════════════════════════════════════════════
function resetActivityForm() {
  $('#form-activity').reset();
  $('#activity-error').textContent = '';
}

// ══════════════════════════════════════════════════════════
//  全域事件代理
// ══════════════════════════════════════════════════════════
document.addEventListener('click', async e => {
  const target = e.target;

  // ── Auth tabs ──────────────────────────────────────────
  if (target.matches('.auth-tab')) {
    $$('.auth-tab').forEach(t => t.classList.remove('active'));
    target.classList.add('active');
    const tab = target.dataset.tab;
    $('#form-login').classList.toggle('hidden', tab !== 'login');
    $('#form-register').classList.toggle('hidden', tab !== 'register');
    return;
  }

  // ── 登出 ────────────────────────────────────────────────
  if (target.closest('#btn-logout')) {
    logout();
    return;
  }

  // ── 發文按鈕 ─────────────────────────────────────────────
  if (target.closest('#btn-new-post')) {
    navigate('new-post');
    resetPostForm();
    return;
  }

  // ── 取消發文 ─────────────────────────────────────────────
  if (target.closest('#btn-cancel-post')) {
    navigate('feed');
    return;
  }

  // ── 活動 Tab 切換 ─────────────────────────────────────
  if (target.matches('.activity-tab')) {
    $$('.activity-tab').forEach(t => t.classList.remove('active'));
    target.classList.add('active');
    State.activityTab = target.dataset.tab;
    renderActivities(1);
    return;
  }

  // ── 頭像點擊 → 只看該用戶文章 ────────────────────────
  if (target.matches('.avatar')) {
    const username = target.dataset.username;
    State.feedAuthor = username;
    State.feedAuthorDisplay = target.dataset.displayname || username;
    State.feedPage = 1;
    renderFeed(1);
    return;
  }

  // ── 清除作者篩選 ────────────────────────────────────
  if (target.matches('#btn-clear-feed-author')) {
    State.feedAuthor = null;
    State.feedAuthorDisplay = null;
    State.feedPage = 1;
    renderFeed(1);
    return;
  }

  // ── 頭像 / 作者名稱點擊（該使用者文章）────────────────────
  const avatar = target.closest('.avatar[data-username]');
  if (avatar) {
    e.stopPropagation();
    navigate(`user/${avatar.dataset.username}`);
    return;
  }

  const authorName = target.closest('.post-author');
  if (authorName) {
    e.stopPropagation();
    navigate(`user/${authorName.dataset.username}`);
    return;
  }

  // ── 文章卡片點擊（跳轉詳情）───────────────────────────────
  const postCard = target.closest('.post-card');
  if (postCard && !target.closest('button')) {
    navigate(`post/${postCard.dataset.postId}`);
    return;
  }

  // ── 讚（debounce 5s + optimistic UI）────────────────────
  const likeBtn = target.closest('.like-btn');
  if (likeBtn) {
    e.stopPropagation();
    const postId = likeBtn.dataset.postId;
    SyncQueue.scheduleLike(postId);
    return;
  }

  // ── 留言 ──────────────────────────────────────────────
  const commentBtn = target.closest('.comment-btn');
  if (commentBtn) {
    e.stopPropagation();
    navigate(`post/${commentBtn.dataset.postId}`);
    return;
  }

  // ── 標籤 ──────────────────────────────────────────────
  const tagEl = target.closest('.tag[data-tag]');
  if (tagEl) {
    e.stopPropagation();
    State.feedTag = tagEl.dataset.tag;
    State.feedPage = 1;
    showPage('feed');
    updateFeedAuthorBanner();
    renderFeed(1);
    return;
  }

  // ── 刪除文章 ─────────────────────────────────────────────
  const deletePostBtn = target.closest('.post-card .delete-btn');
  if (deletePostBtn) {
    e.stopPropagation();
    const postId = deletePostBtn.dataset.postId;
    if (!confirm('確定刪除這篇文章？')) return;
    deletePostBtn.disabled = true;
    try {
      await ChatRankAPI.deletePost(postId);
      showToast('已刪除', 'success');
      router(); // 重新渲染當前頁面（navigate 遇到相同 hash 不會觸發）
    } catch (err) { showToast(err.message, 'error'); }
    finally { deletePostBtn.disabled = false; }
    return;
  }

  // ── 刪除留言 ─────────────────────────────────────────────
  if (target.matches('.comment-delete')) {
    const commentId = target.dataset.commentId;
    if (!confirm('刪除留言？')) return;
    try {
      await ChatRankAPI.deleteComment(commentId);
      target.closest('.comment-item').remove();
    } catch (err) { showToast(err.message, 'error'); }
    return;
  }

  // ── 刪除活動 ─────────────────────────────────────────────
  const deleteActBtn = target.closest('.delete-btn[data-activity-id]');
  if (deleteActBtn) {
    e.stopPropagation();
    const activityId = deleteActBtn.dataset.activityId;
    if (!confirm('確定刪除這個活動？')) return;
    deleteActBtn.disabled = true;
    try {
      await ChatRankAPI.deleteActivity(activityId);
      showToast('已刪除', 'success');
      navigate('activities');
    } catch (err) { showToast(err.message, 'error'); }
    finally { deleteActBtn.disabled = false; }
    return;
  }

  // ── 刪除活動留言 ─────────────────────────────────────────
  if (target.matches('[data-activity-comment-id]')) {
    const commentId = target.dataset.activityCommentId;
    if (!confirm('刪除留言？')) return;
    try {
      await ChatRankAPI.deleteActivityComment(commentId);
      target.closest('.comment-item').remove();
    } catch (err) { showToast(err.message, 'error'); }
    return;
  }

  // ── 活動卡片 ─────────────────────────────────────────────
  const actCard = target.closest('.activity-card');
  if (actCard && !target.closest('button')) {
    navigate(`activity/${actCard.dataset.activityId}`);
    return;
  }

  // ── 返回 ────────────────────────────────────────────────
  if (target.closest('#btn-back-feed')) {
    navigate('feed');
    return;
  }
  if (target.closest('#btn-back-activities')) {
    navigate('activities');
    return;
  }

  // ── 建立活動 ─────────────────────────────────────────────
  if (target.closest('#btn-new-activity')) {
    navigate('new-activity');
    resetActivityForm();
    return;
  }
  if (target.closest('#btn-cancel-activity')) {
    navigate('activities');
    return;
  }

  // ── 載入更多 ─────────────────────────────────────────────
  if (target.closest('#btn-feed-more')) {
    renderFeed(State.feedPage + 1);
    return;
  }
  if (target.closest('#btn-activity-more')) {
    renderActivities(State.activityPage + 1);
    return;
  }

  // ── 動態牆排序 ───────────────────────────────────────────
  if (target.matches('.feed-sort-btn')) {
    const sort = target.dataset.sort;
    State.feedSort = sort;
    document.querySelectorAll('.feed-sort-btn').forEach(b => b.classList.remove('active'));
    target.classList.add('active');
    renderFeed(1);
  }

  // ── 新增黑名單詞彙 ─────────────────────────────────────
  if (target.closest('#btn-add-blocked-word')) {
    const input = $('#blocked-word-input');
    const word = input.value.trim();
    if (!word) { showToast('請輸入詞語', 'error'); return; }
    try {
      await ChatRankAPI.createBlockedWord(word);
      input.value = '';
      showToast('已新增', 'success');
      renderBlockedWords();
    } catch (err) { showToast(err.message, 'error'); }
    return;
  }

  // ── 刪除黑名單詞彙 ────────────────────────────────────
  const removeBtn = target.closest('.remove-btn[data-word-id]');
  if (removeBtn) {
    if (!confirm('移除這個詞語？')) return;
    const id = parseInt(removeBtn.dataset.wordId);
    try {
      await ChatRankAPI.deleteBlockedWord(id);
      removeBtn.closest('.blocked-word-tag').remove();
      showToast('已移除', 'success');
    } catch (err) { showToast(err.message, 'error'); }
    return;
  }
});

// ══════════════════════════════════════════════════════════
//  熱門排序設定
// ══════════════════════════════════════════════════════════
async function renderHotSettings() {
  const container = $('#hot-settings-container');
  if (!container) return;
  try {
    const data = await ChatRankAPI.getSettings();
    const gravity = data.hot_gravity;
    container.innerHTML = `
      <div class="hot-settings">
        <h3>🔥 熱門排序 Gravity</h3>
        <p class="hot-settings-desc">
          公式：<code>score = likes / (小時 + 2)<sup>gravity</sup></code><br>
          gravity ↑ = 新文崛起快；gravity ↓ = 舊文累積時間長
        </p>
        <div class="hot-settings-control">
          <input type="range" id="hot-gravity-slider"
            min="0.5" max="3.0" step="0.1" value="${gravity}" />
          <span id="hot-gravity-value">${gravity}</span>
        </div>
        <div class="hot-settings-range-labels">
          <span>0.5（慢衰減）</span>
          <span>3.0（快衰減）</span>
        </div>
        <div class="hot-settings-hint">拖動後直接套用</div>
      </div>
    `;
    // 同步 input 初始值
    container.querySelector('#hot-gravity-slider').dataset.value = gravity;
  } catch (err) {
    container.innerHTML = '<div class="empty-state">載入設定失敗</div>';
  }
}

// 即時套用 gravity（slider 拖動時直接 PUT，不需按鈕）
$('body').addEventListener('input', async e => {
  if (e.target.id !== 'hot-gravity-slider') return;
  const val = parseFloat(e.target.value);
  $('#hot-gravity-value').textContent = val;
  try {
    await ChatRankAPI.updateSettings({ hot_gravity: val });
  } catch (err) {
    showToast('儲存失敗：' + (err.message || err.error), 'error');
  }
});

// ══════════════════════════════════════════════════════════
//  表單提交
// ══════════════════════════════════════════════════════════
$('#form-login').onsubmit = async e => {
  e.preventDefault();
  const errorEl = $('#login-error');
  errorEl.textContent = '';
  const btn = e.submitter;
  btn.disabled = true;

  try {
    const { username, password } = e.target;
    const data = await ChatRankAPI.login({
      username: username.value.trim(),
      password: password.value,
    });
    State.user = data.user;
    updateNav();
    showView('app');
    navigate('feed');
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
};

$('#form-register').onsubmit = async e => {
  e.preventDefault();
  const errorEl = $('#register-error');
  errorEl.textContent = '';
  const btn = e.submitter;
  btn.disabled = true;

  try {
    const fd = new FormData(e.target);
    const password = fd.get('password');
    const confirm = fd.get('confirmPassword');

    if (password !== confirm) {
      errorEl.textContent = '兩次密碼輸入不一致';
      btn.disabled = false;
      return;
    }

    const data = await ChatRankAPI.register({
      username: fd.get('username').trim(),
      password,
      displayName: fd.get('displayName').trim(),
    });
    State.user = data.user;
    updateNav();
    showView('app');
    navigate('feed');
    showToast(`歡迎加入！${data.user.displayName || data.user.username}`, 'success');
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
};

$('#form-post').onsubmit = async e => {
  e.preventDefault();
  const errorEl = $('#post-error');
  errorEl.textContent = '';
  const btn = e.submitter;
  btn.disabled = true;

  try {
    const fd = new FormData(e.target);
    const postId = fd.get('postId');
    const tags = fd.get('tags').split(',').map(t => t.trim()).filter(Boolean);

    if (postId) {
      // 編輯模式（目前只有新增）
      showToast('編輯功能準備中', 'info');
    } else {
      await ChatRankAPI.createPost({
        title: fd.get('title').trim(),
        content: fd.get('content').trim(),
        tags,
      });
      showToast('已發布！', 'success');
      navigate('feed');
    }
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
};

$('#form-activity').onsubmit = async e => {
  e.preventDefault();
  const errorEl = $('#activity-error');
  errorEl.textContent = '';
  const btn = e.submitter;
  btn.disabled = true;

  try {
    const fd = new FormData(e.target);
    await ChatRankAPI.createActivity({
      title: fd.get('title').trim(),
      location: fd.get('location').trim(),
      startDate: fd.get('startDate') || null,
      description: fd.get('description').trim(),
    });
    showToast('活動已建立！', 'success');
    navigate('activities');
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
};

// ══════════════════════════════════════════════════════════
//  初始化
// ══════════════════════════════════════════════════════════
window.addEventListener('hashchange', router);

async function init() {
  const loggedIn = await checkAuth();

  if (loggedIn) {
    // 確保 CSRF token 已刷新（即使從 server-side inject 的 __AUTH__ 也需要）
    ChatRankAPI.refreshCsrf().catch(() => {});
    updateNav();
    showView('app');
    router(); // 根據 hash 決定頁面
  } else {
    showView('auth');
  }
}

init();
