// recall-ai Chrome Extension
const API_URL = "http://localhost:3000";
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

function showView(view) {
  loginView.style.display = "none";
  checkEmailView.style.display = "none";
  saveView.style.display = "none";
  view.style.display = "block";
}

async function getTokens() {
  return chrome.storage.local.get(["access_token", "refresh_token"]);
}

async function setTokens(access, refresh) {
  await chrome.storage.local.set({ access_token: access, refresh_token: refresh });
}

async function clearTokens() {
  await chrome.storage.local.remove(["access_token", "refresh_token"]);
}

// Refresh expired token
async function refreshSession(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  await setTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

// Get valid token (with auto-refresh)
async function getValidToken() {
  const { access_token, refresh_token } = await getTokens();
  if (!access_token) return null;

  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${access_token}`, apikey: SUPABASE_ANON_KEY },
  });

  if (res.ok) return access_token;
  if (refresh_token) return await refreshSession(refresh_token);
  return null;
}

// Login: send magic link, then poll for session via OTP verification
async function login(email) {
  // Send magic link
  const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email }),
  });
  return res.ok;
}

// After user clicks magic link in email, they land on the web app
// The web app callback page will show a 6-digit code or auto-login
// We need another approach: use password-based signup/login for extension

// SIMPLER APPROACH: Open web app for login, share session via a token endpoint
async function loginViaWebApp() {
  // Open the web app - user logs in there
  // Then come back to extension and enter the token
  chrome.tabs.create({ url: `${API_URL}` });
}

// Save URL
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

// Get current tab
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// ===== INIT =====
async function init() {
  openApp.href = API_URL;
  const token = await getValidToken();

  if (!token) {
    showView(loginView);
    return;
  }

  showView(saveView);
  const tab = await getCurrentTab();
  pageTitle.textContent = tab.title || "제목 없음";
  pageUrl.textContent = tab.url;
}

// Login button: send OTP email
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) return;

  loginBtn.disabled = true;
  loginBtn.textContent = "보내는 중...";

  const ok = await login(email);
  if (ok) {
    showView(checkEmailView);

    // Poll: wait for user to click the magic link
    // After they click, we try to exchange via the token
    // Actually - change approach: show OTP input
    startOtpFlow(email);
  } else {
    loginBtn.disabled = false;
    loginBtn.textContent = "로그인 링크 보내기";
  }
});

emailInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

// OTP flow: after sending magic link, show code input
function startOtpFlow(email) {
  checkEmailView.innerHTML = `
    <p>이메일을 확인해주세요</p>
    <p class="sub" style="font-size:12px;color:#999;margin-top:8px;">이메일의 로그인 링크를 클릭하거나,<br>아래에 6자리 코드를 입력하세요.</p>
    <input type="text" id="otp-input" placeholder="6자리 코드"
      style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:18px;text-align:center;letter-spacing:4px;margin-top:16px;outline:none;"
      maxlength="6" />
    <button id="otp-btn"
      style="width:100%;margin-top:12px;padding:10px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
      확인
    </button>
    <p id="otp-error" style="font-size:12px;color:#ef4444;margin-top:8px;display:none;"></p>
  `;

  const otpInput = document.getElementById("otp-input");
  const otpBtn = document.getElementById("otp-btn");
  const otpError = document.getElementById("otp-error");

  otpInput.focus();

  otpBtn.addEventListener("click", async () => {
    const code = otpInput.value.trim();
    if (code.length !== 6) return;

    otpBtn.disabled = true;
    otpBtn.textContent = "확인 중...";

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=magiclink`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ email, code }),
      });

      if (!res.ok) {
        // Try as OTP type
        const res2 = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=magiclink`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
          body: JSON.stringify({ email, token: code, type: "magiclink" }),
        });

        if (!res2.ok) throw new Error("인증 실패");
        const data = await res2.json();
        await setTokens(data.access_token, data.refresh_token);
      } else {
        const data = await res.json();
        await setTokens(data.access_token, data.refresh_token);
      }

      // Success!
      init();
    } catch (err) {
      otpError.style.display = "block";
      otpError.textContent = "코드가 올바르지 않습니다. 다시 확인해주세요.";
      otpBtn.disabled = false;
      otpBtn.textContent = "확인";
    }
  });

  otpInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") otpBtn.click();
  });
}

// Logout
logoutBtn.addEventListener("click", async () => {
  await clearTokens();
  showView(loginView);
});

// Save
saveBtn.addEventListener("click", async () => {
  const token = await getValidToken();
  if (!token) { showView(loginView); return; }

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

init();
