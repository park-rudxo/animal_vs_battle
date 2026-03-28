// recall-ai Chrome Extension
const API_URL = "http://localhost:3000"; // Vercel 배포 후 변경
const SUPABASE_URL = "https://wrakqvjolypldvaiwkal.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyYWtxdmpvbHlwbGR2YWl3a2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2ODMyODUsImV4cCI6MjA5MDI1OTI4NX0.-oIH4QeNMYtpiVzSsYpKsHfgyri_0dYm9R0KdGVL9gQ";

// DOM elements
const loginView = document.getElementById("login-view");
const checkEmailView = document.getElementById("check-email-view");
const saveView = document.getElementById("save-view");
const emailInput = document.getElementById("email-input");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const saveBtn = document.getElementById("save-btn");
const pageTitle = document.getElementById("page-title");
const pageUrl = document.getElementById("page-url");
const statusMsg = document.getElementById("status-msg");
const openApp = document.getElementById("open-app");

// Show a specific view
function showView(view) {
  loginView.style.display = "none";
  checkEmailView.style.display = "none";
  saveView.style.display = "none";
  view.style.display = "block";
}

// Get stored tokens
async function getTokens() {
  const result = await chrome.storage.local.get([
    "access_token",
    "refresh_token",
  ]);
  return result;
}

// Store tokens
async function setTokens(access, refresh) {
  await chrome.storage.local.set({
    access_token: access,
    refresh_token: refresh,
  });
}

// Clear tokens
async function clearTokens() {
  await chrome.storage.local.remove(["access_token", "refresh_token"]);
}

// Refresh session if token is expired
async function refreshSession(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  await setTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

// Check if token is valid, try refresh if not
async function getValidToken() {
  const { access_token, refresh_token } = await getTokens();
  if (!access_token) return null;

  // Try using current token
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });

  if (res.ok) return access_token;

  // Token expired, try refresh
  if (refresh_token) {
    return await refreshSession(refresh_token);
  }

  return null;
}

// Login with magic link
async function login(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/magiclink`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      options: { redirectTo: `${API_URL}/auth/callback` },
    }),
  });

  return res.ok;
}

// Save URL to recall-ai
async function saveUrl(url, token) {
  const res = await fetch(`${API_URL}/api/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

// Get current tab info
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Initialize popup
async function init() {
  openApp.href = API_URL;

  const token = await getValidToken();

  if (!token) {
    showView(loginView);
    return;
  }

  // Logged in — show save view
  showView(saveView);
  const tab = await getCurrentTab();
  pageTitle.textContent = tab.title || "제목 없음";
  pageUrl.textContent = tab.url;
}

// Login button click
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) return;

  loginBtn.disabled = true;
  loginBtn.textContent = "보내는 중...";

  const ok = await login(email);

  if (ok) {
    showView(checkEmailView);
  } else {
    loginBtn.disabled = false;
    loginBtn.textContent = "로그인 링크 보내기";
    alert("오류가 발생했습니다. 다시 시도해주세요.");
  }
});

// Enter key on email input
emailInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

// Logout button
logoutBtn.addEventListener("click", async () => {
  await clearTokens();
  showView(loginView);
});

// Save button click
saveBtn.addEventListener("click", async () => {
  const token = await getValidToken();
  if (!token) {
    showView(loginView);
    return;
  }

  const tab = await getCurrentTab();
  saveBtn.disabled = true;
  saveBtn.textContent = "저장 중...";
  statusMsg.textContent = "";

  try {
    const result = await saveUrl(tab.url, token);

    if (result.deduplicated) {
      saveBtn.textContent = "이미 저장됨";
      saveBtn.className = "save-btn duplicate";
      statusMsg.textContent = "이 링크는 이미 저장되어 있어요";
    } else {
      saveBtn.textContent = "저장됨 ✓";
      saveBtn.className = "save-btn success";
      statusMsg.textContent = "AI가 백그라운드에서 정리 중...";
    }
  } catch (err) {
    saveBtn.textContent = "실패 ✕";
    saveBtn.className = "save-btn error";
    statusMsg.textContent = "저장에 실패했습니다. 다시 시도해주세요.";

    setTimeout(() => {
      saveBtn.disabled = false;
      saveBtn.textContent = "저장하기";
      saveBtn.className = "save-btn";
    }, 2000);
  }
});

// Run
init();
