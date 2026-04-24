/**
 * api.js — 聊天啊!尬殿 API 客戶端
 *
 * 所有請求携带 credentials（Cookie）和 CSRF Token
 * 錯誤處理統一：非 2xx → 拋出 Error（訊息即顯示內容）
 */

// ══════════════════════════════════════════════════════════
//  API Base URL
//  重要：部署時要改成你家 Mac 的 Tailscale IP 或其他對外方式
//  例如：const API = 'http://100.x.x.x:3000/api'
// ══════════════════════════════════════════════════════════
const API_BASE = '/api';

// ══════════════════════════════════════════════════════════
//  CSRF Token 管理
// ══════════════════════════════════════════════════════════
let _csrfToken = '';

function setCsrfToken(token) { _csrfToken = token; }
function getCsrfToken() { return _csrfToken; }

// ══════════════════════════════════════════════════════════
//  低層 fetch 封裝
// ══════════════════════════════════════════════════════════
async function apiFetch(path, options = {}) {
  const url = API_BASE + path;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // CSRF Token：從 header 或 body 傳遞
  if (_csrfToken) {
    headers['X-CSRF-Token'] = _csrfToken;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // 攜帶 HTTP-only Cookie
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 提取有意義的錯誤訊息
    const msg = data?.error || `請求失敗（${res.status}）`;
    throw new Error(msg);
  }

  return data;
}

// ══════════════════════════════════════════════════════════
//  認證 API
// ══════════════════════════════════════════════════════════

async function apiRegister({ username, password, displayName }) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, displayName }),
  });
  setCsrfToken(data.csrfToken);
  return data;
}

async function apiLogin({ username, password }) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setCsrfToken(data.csrfToken);
  return data;
}

async function apiLogout() {
  return apiFetch('/auth/logout', { method: 'POST' });
}

async function apiMe() {
  return apiFetch('/auth/me');
}

async function apiRefreshCsrf() {
  const data = await apiFetch('/auth/csrf');
  setCsrfToken(data.csrfToken);
  return data;
}

// ══════════════════════════════════════════════════════════
//  文章 API
// ══════════════════════════════════════════════════════════

async function apiGetPosts(page = 1) {
  return apiFetch(`/posts?page=${page}`);
}

async function apiGetPost(id) {
  return apiFetch(`/posts/${id}`);
}

async function apiCreatePost({ title, content, tags }) {
  return apiFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({ title, content, tags }),
  });
}

async function apiDeletePost(id) {
  return apiFetch(`/posts/${id}`, { method: 'DELETE' });
}

async function apiToggleLike(postId) {
  return apiFetch(`/posts/${postId}/like`, { method: 'POST' });
}

async function apiComment(postId, content) {
  return apiFetch(`/posts/${postId}/comment`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

async function apiDeleteComment(commentId) {
  return apiFetch(`/comments/${commentId}`, { method: 'DELETE' });
}

// ══════════════════════════════════════════════════════════
//  活動 API
// ══════════════════════════════════════════════════════════

async function apiGetActivities(page = 1) {
  return apiFetch(`/activities?page=${page}`);
}

async function apiGetActivity(id) {
  return apiFetch(`/activities/${id}`);
}

async function apiCreateActivity({ title, description, startDate, location }) {
  return apiFetch('/activities', {
    method: 'POST',
    body: JSON.stringify({ title, description, startDate, location }),
  });
}

async function apiDeleteActivity(id) {
  return apiFetch(`/activities/${id}`, { method: 'DELETE' });
}

async function apiActivityComment(activityId, content) {
  return apiFetch(`/activities/${activityId}/comment`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

async function apiDeleteActivityComment(commentId) {
  return apiFetch(`/activity-comments/${commentId}`, { method: 'DELETE' });
}

// ══════════════════════════════════════════════════════════
//  匯出
// ══════════════════════════════════════════════════════════
window.ChatRankAPI = {
  // Auth
  register: apiRegister,
  login: apiLogin,
  logout: apiLogout,
  me: apiMe,
  refreshCsrf: apiRefreshCsrf,
  setCsrfToken,
  getCsrfToken,
  // Posts
  getPosts: apiGetPosts,
  getPost: apiGetPost,
  createPost: apiCreatePost,
  deletePost: apiDeletePost,
  toggleLike: apiToggleLike,
  comment: apiComment,
  deleteComment: apiDeleteComment,
  // Activities
  getActivities: apiGetActivities,
  getActivity: apiGetActivity,
  createActivity: apiCreateActivity,
  deleteActivity: apiDeleteActivity,
  activityComment: apiActivityComment,
  deleteActivityComment: apiDeleteActivityComment,
};
