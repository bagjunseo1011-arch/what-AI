# 어떤AI

상황을 한 줄로 적으면 그 일에 맞는 AI를 추천하고, 각 도구의 강점·약점과 구독 요금제를 보여 주는 정적 사이트.

## 구조

```
build.js            정적 HTML 생성기 (외부 의존성 0)
serve.js            로컬 미리보기 서버
test-recommend.js   추천 엔진 회귀 테스트
content/
  site.js           사이트 메타 (도메인·이메일·요금 기준일)
  tools.js          AI 도구 19개
  guides.js         상황별 가이드 14편
  compares.js       1:1 비교 6쌍
  taxonomy.js       카테고리·정렬 정의
assets/
  tokens.css        디자인 토큰 (색·버튼·폰트·아이콘)
  style.css         컴포넌트 스타일
  recommend.js      추천 엔진 (순수 함수)
  app.js            추천 위젯 + 검색/필터/정렬
  data.js           build.js 가 자동 생성 — 직접 수정 금지
```

HTML은 전부 `build.js`가 만듭니다. **생성된 `.html` 파일을 직접 고치지 마세요.** 다음 빌드에서 덮어써집니다.

## 사용법

```bash
node build.js          # 48페이지 생성 (콘텐츠 39 + 목록/정책/홈/404)
node test-recommend.js # 추천 정확도 검사
node serve.js          # http://localhost:4321 로 확인
```

## 콘텐츠 수정

| 하고 싶은 것 | 고칠 파일 |
|---|---|
| 도구 추가·요금 갱신 | `content/tools.js` |
| 상황별 가이드 추가 | `content/guides.js` |
| 비교 페이지 추가 | `content/compares.js` |
| 도메인·이메일·애드센스 ID | `content/site.js` |
| 색·폰트·버튼 모양 | `assets/tokens.css` |

수정 후 `node build.js` → 전 페이지에 반영됩니다. `build.js`가 slug 오타를 빌드 시점에 잡아내므로 깨진 링크가 배포되지 않습니다.

## 배포

`git push origin main` → Vercel이 `node build.js`를 실행해 자동 배포.

배포 전 `content/site.js`의 `url`을 실제 도메인으로 바꿔야 canonical·sitemap이 올바르게 나갑니다.

## 요금 정보에 관하여

각 도구의 요금은 `content/site.js`의 `priceCheckedAt` 기준 참고용입니다. AI 서비스 요금제는 자주 바뀌므로, 갱신할 때마다 이 날짜도 함께 수정하세요. 모든 요금표 아래에 기준일과 공식 사이트 확인 안내가 자동으로 붙습니다.
