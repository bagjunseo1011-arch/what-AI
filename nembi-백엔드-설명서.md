# 🛠 백엔드 구성 설명서 — ai찾기웹
이 문서는 레시피 프롬프트와 별개예요. 프론트엔드를 먼저 완성한 뒤, 서버·DB·배포가 필요할 때 위에서부터 순서대로 따라오세요.

## 0. 전체 흐름 한눈에
① 프론트엔드 완성 → ② 백엔드 서비스 선택 → ③ DB·인증 연결 → ④ 환경변수 설정 → ⑤ 배포 → ⑥ 도메인·HTTPS 연결

## 1. 백엔드 무엇으로 할까? (선택)
- 가장 쉬움 — Supabase / Firebase: DB + 인증 + 파일저장이 한 번에. 서버 코드 거의 없이 프론트에서 SDK로 호출. 개인·소규모에 강력 추천.
- 직접 서버 — Node(Express) 또는 Next.js API Routes: 복잡한 로직·외부 결제 연동이 필요할 때.
- 결제·외부 API 키가 있으면 키를 숨기기 위해 최소한의 서버(또는 서버리스 함수)가 반드시 필요해요(프론트에 시크릿 키 노출 금지).

## 2. 서버 연동 기본 (프론트 ↔ 백엔드)
1) 백엔드 주소를 환경변수로 둔다 — 예: VITE_API_URL=https://api.내서비스.com
2) 프론트에서 호출 — fetch(import.meta.env.VITE_API_URL + '/posts')
3) CORS 허용 — 백엔드에서 프론트 도메인을 허용 목록에 추가
4) 인증 토큰은 Authorization: Bearer <token> 헤더로 전달, 민감정보는 절대 URL/프론트 코드에 노출 금지

## 3. 데이터베이스
- 관계형(PostgreSQL/MySQL): 관계·정형 데이터가 많을 때 (Supabase = PostgreSQL)
- 문서형(Firestore/MongoDB): 빠른 시작·유연한 스키마
- 순서: 테이블/컬렉션 설계 → CRUD API 만들기 → 프론트 연결

## 4. 환경변수 / 비밀키 관리
- .env 파일에 키 저장하고 .gitignore에 추가 (절대 깃에 커밋 금지)
- 배포 플랫폼(Vercel/Netlify/Render)의 Environment Variables에 동일하게 등록
- 공개 가능한 값만 접두사 규칙으로 노출 (Vite=VITE_, Next=NEXT_PUBLIC_), 시크릿 키는 서버에서만 사용

## 5. 배포 방법 (가장 쉬운 경로)
프론트엔드
1) GitHub에 코드 push
2) Vercel 또는 Netlify에서 레포 연결 → 자동 빌드·배포 (무료)
3) 빌드 설정 확인 — Vite: 빌드 명령 npm run build, 출력 폴더 dist
백엔드
- Supabase/Firebase를 쓰면 콘솔에서 프로젝트 생성만 하면 끝 (별도 배포 불필요)
- 직접 서버라면 Render / Railway / Fly.io에 배포하거나 Vercel 서버리스 함수 사용

## 6. 도메인 · HTTPS
- 배포하면 기본 도메인이 자동 제공됨 (예: 프로젝트명.vercel.app)
- 커스텀 도메인은 도메인 구매 후 DNS의 CNAME/A 레코드를 배포 플랫폼에 연결
- Vercel/Netlify는 HTTPS(SSL)를 자동 적용

## 내가 추가한 재료별 백엔드
추가한 재료 중 백엔드가 필요한 기능이 없어요. (기능 재료를 담으면 여기에 재료별 백엔드 셋업이 박스로 따로 추가됩니다.)

## 진행 순서 체크리스트
[ ] 프론트엔드 완성 & 배포
[ ] 백엔드 서비스 선택 (Supabase 추천)
[ ] DB 스키마 생성
[ ] 로그인·인증 연결
[ ] 환경변수 등록
[ ] 추가한 재료별 API 연동
[ ] 커스텀 도메인 · HTTPS 연결
