# LaterAI

링크를 공유하면 AI가 자동으로 정리하고, 나중에 읽을 시간이 되면 알려주는 시스템.

## 기능

- **공유 버튼 연동**: 모바일/PC 브라우저에서 바로 공유 → 자동 저장 (Web Share Target API)
- **AI 자동 분석**: Claude가 페이지를 읽고 요약, 카테고리, 태그, 읽기 예상 시간 생성
- **스마트 리마인드**: AI가 콘텐츠 유형에 맞는 리마인드 시간을 자동으로 추천
- **푸시 알림**: 브라우저 Web Push로 "나중에 읽으려 했던 거 기억나요?" 알림
- **대시보드**: 카테고리 필터, 검색, 읽음 처리

## 설치

```bash
npm install
cp .env.example .env
# .env 파일에 ANTHROPIC_API_KEY 입력

# VAPID 키 생성 (푸시 알림용)
npx web-push generate-vapid-keys
# 출력된 키를 .env에 입력

npm run db:init   # DB 초기화 (서버 실행 시 자동으로도 됨)
npm start
```

## 환경 변수

| 변수 | 설명 |
|------|------|
| `ANTHROPIC_API_KEY` | Claude API 키 |
| `PORT` | 서버 포트 (기본 3000) |
| `VAPID_PUBLIC_KEY` | 웹 푸시 공개키 |
| `VAPID_PRIVATE_KEY` | 웹 푸시 비밀키 |
| `VAPID_EMAIL` | 웹 푸시 이메일 |

## 사용법

1. `http://localhost:3000` 접속
2. PWA로 설치 (브라우저 → "홈 화면에 추가")
3. 어느 앱에서든 공유 버튼 → LaterAI 선택
4. AI가 자동 분석 후 대시보드에 추가됨
5. 알림 설정하면 정해진 시간에 "이거 읽으셨나요?" 알림

## 구조

```
server.js              # Express 서버 진입점
src/
  db/init.js           # SQLite 초기화
  routes/
    items.js           # 저장된 항목 CRUD
    share.js           # URL 저장 + AI 분석 트리거
    notify.js          # 푸시 구독 관리
  services/
    ai.js              # Claude API 연동 (URL 분석)
    scheduler.js       # 리마인드 스케줄러 (5분마다 체크)
public/
  index.html           # 대시보드
  app.js               # 프론트엔드 로직
  style.css            # 스타일
  sw.js                # Service Worker (캐싱 + 푸시)
  manifest.json        # PWA manifest (Share Target 포함)
```
