/**
 * 사이트 전역 메타데이터.
 * 배포 도메인이 정해지면 url 한 줄만 바꾸면 canonical / OG / sitemap이 전부 따라갑니다.
 */
module.exports = {
  name: '어떤AI',
  tagline: '상황을 적으면, 그 상황에 맞는 AI를 찾아드립니다',
  // 배포 도메인 (끝에 / 없이). 커스텀 도메인을 붙이면 여기만 바꾸고 다시 빌드하세요.
  url: 'https://www.what-ai.kr',
  description:
    '“이 상황엔 어떤 AI가 좋지?” 상황을 한 줄로 적으면 ChatGPT·Claude·Gemini 등 18개 AI 중 맞는 도구를 추천하고, 각 AI의 강점과 구독 요금제를 비교해 드립니다.',
  locale: 'ko_KR',
  // 애드센스 심사에는 실제 연락 수단이 필요합니다. 본인 이메일로 교체하세요.
  email: 'bagjunseo1011@gmail.com',
  // 요금제 정보 기준일. 데이터 갱신할 때마다 함께 수정하세요.
  priceCheckedAt: '2026-08-06',
  // 애드센스 승인 후 발급받은 값으로 교체하면 전 페이지에 자동 삽입됩니다. 빈 문자열이면 미삽입.
  adsensePublisherId: '',
  // 검색 콘솔 HTML 태그 인증. content 값(= 뒤쪽 토큰)만 넣습니다. 빈 문자열이면 미삽입.
  // ※ 도메인 속성(DNS)으로 등록했다면 가비아 DNS 에 TXT 레코드도 따로 넣어야 합니다.
  //    호스트 @ / 값 google-site-verification=<아래 토큰>
  googleSiteVerification: '8mLB0OMoNGUAf3OAXILM_eG8qnlCvk2xznEvFGUyaTg',

  // 네이버는 메타 태그 방식과 HTML 파일 방식 중 하나를 씁니다. 쓰는 쪽만 채우세요.
  naverSiteVerification: '',                                            // 메타 태그 방식
  naverVerificationFile: 'naver3b77233c2154ccd4a572c4095a69e473.html',  // HTML 파일 방식
};
