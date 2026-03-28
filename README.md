# recall-ai

링크를 저장하면 AI가 알아서 정리하는 개인 지식 관리 시스템.

공유 버튼 하나로 URL을 보내면 AI가 자동으로 요약, 카테고리 분류, 날짜 감지까지 해줍니다.

## 핵심 기능

- **저장 마찰 0** — Chrome 익스텐션 1클릭 저장
- **AI 자동 정리** — 요약, 카테고리 분류 (테크/뉴스/쇼핑/이벤트/기타), 인덱싱
- **스마트 리마인더** — 마감일 감지 시 3일 전 알림 + 7일 미열람 넛지

## 기술 스택

| Layer | 기술 |
|-------|------|
| Web App | Next.js 14 + TypeScript + Tailwind CSS |
| Chrome Extension | Manifest V3 |
| Database + Auth | Supabase (PostgreSQL + RLS + Magic Link) |
| AI | Claude Haiku (Anthropic API) |
| 페이지 추출 | Jina.ai Reader API |
| 비동기 큐 | Upstash QStash |
| 이메일 알림 | Resend |
| 배포 | Vercel + Supabase |

## 프로젝트 구조

```
recall-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── save/route.ts       # URL 저장 + QStash 큐잉
│   │   │   ├── process/route.ts    # AI 처리 (Jina + Claude)
│   │   │   ├── open/route.ts       # 열람 추적 + 리다이렉트
│   │   │   └── cron/remind/route.ts # 일일 리마인더
│   │   ├── auth/callback/route.ts  # 로그인 콜백
│   │   ├── page.tsx                # 메인 UI
│   │   └── layout.tsx
│   ├── components/
│   │   └── item-card.tsx           # 아이템 카드
│   └── lib/
│       ├── supabase.ts             # 클라이언트 Supabase
│       ├── supabase-server.ts      # 서버 Supabase
│       └── types.ts                # 타입 정의
├── extension/
│   ├── manifest.json               # Manifest V3
│   ├── popup/
│   │   ├── popup.html
│   │   └── popup.js                # 팝업 UI + OTP 인증
│   └── icons/
├── supabase/
│   └── migrations/
│       └── 001_create_items.sql    # DB 스키마
├── vercel.json                     # Cron 설정
└── .env.local.example              # 환경변수 템플릿
```

## 로컬 개발

```bash
npm install
npm run dev
```

### 환경변수

`.env.local.example`을 `.env.local`로 복사하고 값을 채우세요:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `ANTHROPIC_API_KEY` — Claude AI API key
- `QSTASH_TOKEN` — Upstash QStash token
- `RESEND_API_KEY` — Resend email API key

### Chrome 익스텐션 로드

1. `chrome://extensions` → 개발자 모드 ON
2. "압축해제된 확장 프로그램을 로드합니다" → `extension/` 폴더 선택

### DB 스키마 적용

Supabase 대시보드 → SQL Editor → `supabase/migrations/001_create_items.sql` 실행

## 현재 진행 상황 (2026-03-28)

### 완료

- [x] 프로젝트 초기 설정 (Next.js + Tailwind + TypeScript)
- [x] Supabase DB 스키마 + RLS 정책
- [x] API: `/api/save` (비동기 URL 저장 + dedup)
- [x] API: `/api/process` (Jina.ai + Claude Haiku AI 처리 + QStash 서명 검증)
- [x] API: `/api/open` (열람 추적 + 소유권 검증)
- [x] API: `/api/cron/remind` (날짜 알림 + 7일 미열람 넛지)
- [x] 웹앱 메인 UI (아이템 목록, 카테고리 필터, 로그인)
- [x] Chrome 익스텐션 (Manifest V3, 팝업 UI, OTP 인증)
- [x] Auth callback 페이지

### 다음 할 일

- [ ] 이메일 rate limit 풀린 후 익스텐션 로그인 테스트
- [ ] Anthropic API 키 설정 → AI 요약/분류 기능 테스트
- [ ] Upstash QStash 설정 → 비동기 처리 활성화
- [ ] Resend 이메일 설정 → 리마인더 테스트
- [ ] Vercel 배포
- [ ] Chrome Web Store 제출

### 알려진 이슈

- Supabase 이메일 rate limit 초과 상태 (30분~1시간 대기 필요)
- QStash 미설정 시 저장은 되지만 AI 처리가 진행되지 않음
- 익스텐션 `popup.js`의 `API_URL`이 `localhost:3000`으로 하드코딩 — 배포 시 변경 필요

## 설계 문서

전체 설계 문서: `~/.gstack/projects/recall-ai/corqj-main-design-20260328.md`
