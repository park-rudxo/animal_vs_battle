import { NextRequest, NextResponse } from "next/server";

// Supabase magic link callback
// After login, Supabase redirects here with tokens in the URL hash
// This page extracts tokens and helps the extension store them
export async function GET(req: NextRequest) {
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>recall-ai - 로그인 완료</title>
  <style>
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #fafafa;
      margin: 0;
    }
    .card {
      text-align: center;
      background: #fff;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    h1 { font-size: 24px; color: #111; }
    p { color: #666; margin-top: 8px; }
    .success { color: #22c55e; font-size: 48px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="success">✓</div>
    <h1>로그인 완료!</h1>
    <p>Chrome 익스텐션에서 recall-ai 아이콘을 클릭하세요.</p>
    <p id="status" style="font-size:13px; color:#999; margin-top:16px;"></p>
  </div>
  <script>
    // Extract tokens from URL hash (Supabase puts them in the fragment)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      // Try to communicate with the extension via chrome.storage
      // The extension popup will pick these up on next open
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({
          access_token: accessToken,
          refresh_token: refreshToken
        }, () => {
          document.getElementById('status').textContent = '토큰 저장 완료. 이 탭을 닫아도 됩니다.';
        });
      } else {
        // Fallback: store in localStorage for the web app
        localStorage.setItem('recall-ai-access-token', accessToken);
        localStorage.setItem('recall-ai-refresh-token', refreshToken);
        document.getElementById('status').textContent = '웹 로그인 완료. 이 탭을 닫아도 됩니다.';
      }
    } else {
      document.getElementById('status').textContent = '토큰을 찾을 수 없습니다. 다시 로그인해주세요.';
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
