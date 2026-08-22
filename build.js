#!/usr/bin/env node
/* ============================================================
   어떤AI — 정적 사이트 빌더
   실행:  node build.js
   외부 의존성 0. content/*.js 를 읽어 순수 HTML을 생성합니다.

   구성
     1. 유틸 (esc, write, 가격 표기)
     2. 아이콘 (라인, 24x24, stroke 1.5)
     3. 컴포넌트 (layout / header / footer / breadcrumb / card / 요금표 / FAQ …)
     4. 페이지 (홈 / 도구 / 가이드 / 비교 / 정책)
     5. 산출물 (assets/data.js, sitemap.xml, robots.txt)
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const site = require('./content/site');
const tools = require('./content/tools');
const guides = require('./content/guides');
const compares = require('./content/compares');
const { CATEGORIES, SORTS } = require('./content/taxonomy');
const { ensureOgImage } = require('./og-image');

const OUT = __dirname;
const BUILT = []; // sitemap 생성을 위해 만든 페이지 경로를 모아 둡니다

/**
 * 공유 썸네일 정보. main() 첫머리에서 실제 파일을 보고 채웁니다.
 * layout() 이 og:image:width/height 에 이 값을 그대로 쓰기 때문에
 * 상수가 아니라 파일에서 읽은 실측값이어야 합니다.
 */
let OG = { created: false, width: 0, height: 0 };

/* ============================================================
   1. 유틸
   ============================================================ */
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** HTML 파일 기록 + sitemap 목록에 등록 */
function write(relPath, html, opts = {}) {
  const full = path.join(OUT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html, 'utf8');
  if (!opts.noIndex) BUILT.push({ url: relPath.replace(/index\.html$/, ''), priority: opts.priority || 0.6 });
}

const byslug = (slug) => tools.find((t) => t.slug === slug);
const guideBySlug = (slug) => guides.find((g) => g.slug === slug);

/** 카드·표에 쓰는 짧은 가격 표기 */
function priceLabel(tool) {
  if (tool.free && tool.startPrice === 0) return '무료';
  if (tool.free) return '무료 / 유료 월 $' + tool.startPrice + '~';
  return '월 $' + tool.startPrice + '~';
}

/* ============================================================
   2. 아이콘 — 라인, 24x24, stroke 1.5 (토큰 규격)
   ============================================================ */
const ICON_PATHS = {
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  message: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-4-.9L3 21l1.9-4.5A8.4 8.4 0 0 1 12 3.5a8.4 8.4 0 0 1 9 8z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  code: '<path d="m16 18 4-6-4-6M8 6l-4 6 4 6"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m4 17 5-4 4 3 3-2 4 3"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m21 8-5 4 5 4z"/>',
  audio: '<path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="m5 13 4 4 10-10"/>',
  alert: '<path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
};
const icon = (name, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.compass}</svg>`;

/* ============================================================
   3. 컴포넌트
   ============================================================ */

/** 상단 고정 헤더 — 데스크톱 nav + 모바일 details 메뉴 */
function header(current) {
  const links = [
    ['/tools/', 'AI 도구'],
    ['/guides/', '상황별 가이드'],
    ['/compare/', '비교'],
    ['/about.html', '소개'],
  ];
  const item = ([href, label]) =>
    `<a href="${href}"${current === href ? ' aria-current="page"' : ''}>${label}</a>`;

  return `<header class="header">
  <div class="container header__inner">
    <a class="logo" href="/">${icon('compass')}<span>${esc(site.name)}</span></a>
    <nav class="nav" aria-label="주요 메뉴">${links.map(item).join('')}</nav>
    <details class="menu">
      <summary aria-label="메뉴 열기">${icon('menu')}</summary>
      <div class="menu__panel">${links.map(item).join('')}</div>
    </details>
  </div>
</header>`;
}

/** 푸터 — 사이트 설명 + 인기 도구/가이드/정책 링크 */
function footer() {
  const top = [...tools].sort((a, b) => b.popularity - a.popularity).slice(0, 6);
  const topGuides = guides.slice(0, 6);
  return `<footer class="footer">
  <div class="container">
    <div class="footer__grid">
      <div>
        <h2>${esc(site.name)}</h2>
        <p class="footer__desc">${esc(site.tagline)}. 상황에 맞는 AI를 찾고, 요금제까지 비교해 보세요.</p>
      </div>
      <div>
        <h2>인기 AI</h2>
        <ul>${top.map((t) => `<li><a href="/tools/${t.slug}.html">${esc(t.name)}</a></li>`).join('')}</ul>
      </div>
      <div>
        <h2>상황별 가이드</h2>
        <ul>${topGuides.map((g) => `<li><a href="/guides/${g.slug}.html">${esc(g.title)}</a></li>`).join('')}</ul>
      </div>
      <div>
        <h2>사이트</h2>
        <ul>
          <li><a href="/about.html">사이트 소개</a></li>
          <li><a href="/contact.html">문의하기</a></li>
          <li><a href="/privacy.html">개인정보처리방침</a></li>
          <li><a href="/terms.html">이용약관</a></li>
          <li><a href="/sitemap.xml">사이트맵</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__bottom">
      <span>© ${new Date().getFullYear()} ${esc(site.name)}. 요금제 정보 기준일 ${esc(site.priceCheckedAt)}.</span>
      <span>본 사이트는 각 AI 서비스와 제휴 관계가 없습니다.</span>
    </div>
  </div>
</footer>`;
}

/** 빵부스러기 — 화면 표시 + JSON-LD 를 같은 데이터로 생성 */
function breadcrumb(trail) {
  const items = trail
    .map((t) => (t.href ? `<li><a href="${t.href}">${esc(t.label)}</a></li>` : `<li>${esc(t.label)}</li>`))
    .join('');
  return `<nav class="breadcrumb container" aria-label="현재 위치"><ol>${items}</ol></nav>`;
}
function breadcrumbLd(trail) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.label,
      item: site.url + (t.href || ''),
    })),
  };
}

/** 페이지 뼈대. SEO 태그는 전부 여기서 한 번에 붙습니다. */
function layout({ title, description, canonical, body, current, jsonld = [], bodyClass = '' }) {
  const fullTitle = canonical === '/' ? `${title}` : `${title} | ${site.name}`;
  const url = site.url + canonical;
  const ld = jsonld.length
    ? `<script type="application/ld+json">${JSON.stringify(
        jsonld.length === 1
          ? { '@context': 'https://schema.org', ...jsonld[0] }
          : { '@context': 'https://schema.org', '@graph': jsonld }
      )}</script>`
    : '';
  const adsense = site.adsensePublisherId
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(site.adsensePublisherId)}" crossorigin="anonymous"></script>`
    : '';
  const verify = [
    site.googleSiteVerification && `<meta name="google-site-verification" content="${esc(site.googleSiteVerification)}">`,
    site.naverSiteVerification && `<meta name="naver-site-verification" content="${esc(site.naverSiteVerification)}">`,
  ].filter(Boolean).join('\n  ');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(url)}">
  ${verify}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(site.name)}">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:locale" content="${esc(site.locale)}">
  <meta property="og:image" content="${esc(site.url)}/assets/og.png">${OG.width && OG.height ? `
  <meta property="og:image:width" content="${OG.width}">
  <meta property="og:image:height" content="${OG.height}">` : ''}
  <meta property="og:image:alt" content="${esc(site.name)} — ${esc(site.tagline)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(fullTitle)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(site.url)}/assets/og.png">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><text y='19' font-size='20'>N</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <!-- 폰트는 렌더를 막지 않게 비동기로 불러옵니다.
       동기 로드 시 이 요청 하나가 486ms 동안 첫 페인트를 붙잡고 있었습니다.
       본문이 한글이라 Inter 는 라틴 글자에만 적용돼 늦게 와도 체감 변화가 적습니다. -->
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap"></noscript>
  <link rel="stylesheet" href="/assets/tokens.css">
  <link rel="stylesheet" href="/assets/style.css">
  ${ld}
  ${adsense}
</head>
<body class="${bodyClass}">
  <a class="skip-link" href="#main">본문 바로가기</a>
  ${header(current)}
  <main id="main">
${body}
  </main>
  ${footer()}
  <script src="/assets/data.js"></script>
  <script src="/assets/recommend.js"></script>
  <script src="/assets/app.js" defer></script>
</body>
</html>`;
}

/** 서버에서 미리 그려 두는 도구 카드 (JS 꺼져 있어도 보이도록) */
function toolCard(tool) {
  const badge = tool.free
    ? '<span class="badge badge--free">무료 있음</span>'
    : '<span class="badge badge--paid">유료</span>';
  return `<article class="card">
  <div class="card__top">
    <div>
      <h3 class="card__title"><a href="/tools/${tool.slug}.html">${esc(tool.name)}</a></h3>
      <div class="card__vendor">${esc(tool.vendor)} · ${esc(CATEGORIES[tool.category].label)}</div>
    </div>
  </div>
  <p class="card__desc">${esc(tool.tagline)}</p>
  <div class="card__foot"><span class="card__price">${esc(priceLabel(tool))}</span>${badge}</div>
</article>`;
}

function guideCard(guide) {
  return `<article class="card">
  <h3 class="card__title"><a href="/guides/${guide.slug}.html">${esc(guide.title)}</a></h3>
  <p class="card__desc" style="margin-top:8px">${esc(guide.description)}</p>
  <div class="card__foot"><span class="card__price"><span>추천 ${guide.picks.length}개</span></span>${icon('arrow', 'icon--sm')}</div>
</article>`;
}

/** 요금제 표 — 좁은 화면에서 가로 스크롤되도록 감쌉니다 */
function planTable(tool) {
  return `<div class="table-wrap">
  <table>
    <caption class="sr-only">${esc(tool.name)} 요금제</caption>
    <thead><tr><th scope="col">플랜</th><th scope="col">가격</th><th scope="col">설명</th></tr></thead>
    <tbody>${tool.plans
      .map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.price)}</td><td>${esc(p.note)}</td></tr>`)
      .join('')}</tbody>
  </table>
</div>
<p class="callout callout--warn">${icon('alert', 'icon--sm')} 요금제는 수시로 바뀝니다. 위 정보는 <strong>${esc(site.priceCheckedAt)}</strong> 기준 참고용이며, 결제 전 <a href="${esc(tool.official)}" target="_blank" rel="noopener nofollow">공식 사이트</a>에서 최종 확인하세요.</p>`;
}

function faqBlock(faq) {
  if (!faq || !faq.length) return '';
  return `<h2>자주 묻는 질문</h2>
<div class="faq">${faq
    .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
    .join('')}</div>`;
}
const faqLd = (faq) => ({
  '@type': 'FAQPage',
  mainEntity: faq.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
});

/** 홈 히어로에 들어가는 추천 위젯 */
function recommendWidget() {
  const examples = [
    '회사 보고서를 써야 하는데 목차부터 안 잡힌다',
    '영어 논문 30페이지를 읽고 요약해야 한다',
    '코드에서 에러가 나는데 원인을 못 찾겠다',
    '유튜브 썸네일을 만들어야 하는데 디자인을 못 한다',
    '엑셀 매출 데이터를 그래프로 정리하고 싶다',
    '돈 안 쓰고 무료로 AI를 써 보고 싶다',
  ];
  return `<div class="finder">
  <form id="finder-form" class="finder__box">
    <label class="finder__label" for="finder-input">어떤 상황에서 막히고 있나요?</label>
    <textarea id="finder-input" name="q" placeholder="예) 거래처에 보낼 영어 메일을 써야 하는데 번역투가 어색하다" required></textarea>
    <p class="finder__hint">Enter 로 바로 찾기 · 줄바꿈은 Shift + Enter</p>
    <div class="finder__actions">
      <button class="btn" type="submit">${icon('search', 'icon--sm')} 맞는 AI 찾기</button>
      <a class="btn btn--ghost" href="/tools/">전체 ${tools.length}개 도구 보기</a>
    </div>
  </form>
  <div class="examples">
    <span class="examples__label">이런 상황도 눌러 보세요</span>
    ${examples.map((e) => `<button type="button" class="chip" data-example="${esc(e)}">${esc(e)}</button>`).join('')}
  </div>
</div>
<div class="container"><section id="results" class="results" hidden aria-live="polite"></section></div>`;
}

/* ============================================================
   4. 페이지
   ============================================================ */

/* ---------- 홈 ---------- */
function buildHome() {
  const top = [...tools].sort((a, b) => b.popularity - a.popularity).slice(0, 6);

  const body = `<section class="hero">
  <div class="container">
    <h1>이 상황엔 어떤 AI를 써야 할까?</h1>
    <p class="hero__sub">AI가 ${tools.length}개인데 매번 쓰던 것만 씁니다. 상황을 한 줄로 적으면 그 일에 맞는 도구와 이유, 구독 요금제까지 정리해 드립니다.</p>
    ${recommendWidget()}
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section__head">
      <h2>상황별로 골라 보기</h2>
      <p>무엇을 하려는지 이미 알고 있다면, 여기서 바로 들어가세요.</p>
    </div>
    <div class="grid">${guides.slice(0, 8).map(guideCard).join('')}</div>
    <p style="margin-top:24px"><a class="btn btn--outline" href="/guides/">가이드 ${guides.length}편 전체 보기 ${icon('arrow', 'icon--sm')}</a></p>
  </div>
</section>

<section class="section section--surface">
  <div class="container">
    <div class="section__head">
      <h2>많이 찾는 AI</h2>
      <p>각 도구의 강점·약점과 요금제를 한 페이지에 정리했습니다.</p>
    </div>
    <div class="grid">${top.map(toolCard).join('')}</div>
    <p style="margin-top:24px"><a class="btn btn--outline" href="/tools/">전체 도구 비교하기 ${icon('arrow', 'icon--sm')}</a></p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section__head">
      <h2>왜 AI를 하나만 쓰면 손해일까</h2>
    </div>
    <div class="prose" style="max-width:820px">
      <p>대부분의 사람은 처음 써 본 AI 하나에 정착합니다. 나쁜 선택은 아닙니다. 요즘 도구들은 어떤 일이든 평균 이상은 해내니까요. 문제는 그 "평균 이상"이 어떤 작업에서는 명백히 손해라는 점입니다.</p>
      <p>예를 들어 100페이지짜리 계약서를 요약시킬 때, 긴 문서에 강한 도구와 그렇지 않은 도구의 차이는 요약 품질이 아니라 <strong>중간을 통째로 빠뜨리느냐 아니냐</strong>로 나타납니다. 출처가 필요한 조사에서 검색 특화 도구를 쓰지 않으면, 아낀 30분을 사실 확인에 1시간 쓰게 됩니다.</p>
      <p>그렇다고 도구를 다 구독할 필요는 없습니다. 대부분은 <strong>무료 플랜 2~3개 조합 + 유료 1개</strong>면 충분합니다. 이 사이트는 그 조합을 상황에 맞게 골라 주기 위해 만들었습니다.</p>
      <p><a href="/guides/free-ai.html">→ 돈 안 쓰고 어디까지 되는지 먼저 확인하기</a></p>
    </div>
  </div>
</section>`;

  write('index.html', layout({
    title: `${site.name} — 상황에 맞는 AI 추천`,
    description: site.description,
    canonical: '/',
    current: '/',
    body,
    jsonld: [
      {
        '@type': 'WebSite',
        name: site.name,
        url: site.url,
        description: site.description,
        inLanguage: 'ko',
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${site.url}/?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }), { priority: 1.0 });
}

/* ---------- 도구 목록 (검색 · 필터 · 정렬) ---------- */
function buildToolsIndex() {
  const chips = [['all', '전체']].concat(Object.entries(CATEGORIES).map(([k, v]) => [k, v.label]));

  const body = `${breadcrumb([{ label: '홈', href: '/' }, { label: 'AI 도구' }])}
<div class="container">
  <div class="page-head" style="border:0;padding-bottom:8px">
    <h1>AI 도구 ${tools.length}개 비교</h1>
    <p class="lede">대화형·검색·코딩·이미지·영상·음성·문서·번역까지. 각 도구의 강점과 요금제를 정리했습니다. 검색하거나 카테고리로 좁혀 보세요.</p>
  </div>

  <section class="section" style="padding-top:24px">
    <div class="filters">
      <div class="filters__row">
        <div class="search">
          ${icon('search')}
          <label class="sr-only" for="tool-search">도구 검색</label>
          <input id="tool-search" type="search" placeholder="도구 이름이나 하고 싶은 일로 검색 (예: 번역, 썸네일)" autocomplete="off">
        </div>
        <label class="sr-only" for="sort">정렬</label>
        <select class="select" id="sort">
          ${Object.entries(SORTS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
        </select>
        <label class="toggle"><input type="checkbox" id="free-only"> 무료 플랜 있는 것만</label>
      </div>
      <div class="chips">
        ${chips.map(([k, label], i) =>
          `<button type="button" class="chip" data-cat="${k}" aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(label)}</button>`
        ).join('')}
      </div>
    </div>

    <div class="results__head">
      <h2 class="sr-only">검색 결과</h2>
      <span class="results__count"><strong id="tool-count">${tools.length}개</strong></span>
    </div>

    <!-- JS가 꺼져 있어도 전체 목록이 보이도록 서버에서 미리 렌더 -->
    <div class="grid" id="tool-list">${[...tools].sort((a, b) => b.popularity - a.popularity).map(toolCard).join('')}</div>
  </section>
</div>`;

  write('tools/index.html', layout({
    title: `AI 도구 ${tools.length}개 비교 — 강점과 요금제 한눈에`,
    description: `ChatGPT·Claude·Gemini·Perplexity 등 AI 도구 ${tools.length}개의 강점, 약점, 구독 요금제를 카테고리별로 비교합니다. 무료 플랜 여부로도 걸러 볼 수 있습니다.`,
    canonical: '/tools/',
    current: '/tools/',
    body,
    jsonld: [
      breadcrumbLd([{ label: '홈', href: '/' }, { label: 'AI 도구', href: '/tools/' }]),
      {
        '@type': 'ItemList',
        name: 'AI 도구 목록',
        numberOfItems: tools.length,
        itemListElement: tools.map((t, i) => ({
          '@type': 'ListItem', position: i + 1, name: t.name, url: `${site.url}/tools/${t.slug}.html`,
        })),
      },
    ],
  }), { priority: 0.9 });
}

/* ---------- 도구 상세 ---------- */
function buildToolPage(tool) {
  const trail = [{ label: '홈', href: '/' }, { label: 'AI 도구', href: '/tools/' }, { label: tool.name }];
  const related = tools.filter((t) => t.category === tool.category && t.slug !== tool.slug).slice(0, 4);
  const relatedGuides = tool.guides.map(guideBySlug).filter(Boolean);
  const versus = compares.filter((c) => c.a === tool.slug || c.b === tool.slug);

  const body = `${breadcrumb(trail)}
<div class="container">
  <div class="page-head">
    <div class="page-head__meta">
      <span class="badge badge--cat">${esc(CATEGORIES[tool.category].label)}</span>
      ${tool.free ? '<span class="badge badge--free">무료 플랜 있음</span>' : '<span class="badge badge--paid">유료 전용</span>'}
      <span class="card__vendor">${esc(tool.vendor)}</span>
    </div>
    <h1>${esc(tool.name)} — ${esc(tool.tagline)}</h1>
    <p class="lede">${esc(tool.summary)}</p>
  </div>

  <div class="layout">
    <article class="prose">
      <h2>어떤 도구인가</h2>
      ${tool.body.map((p) => `<p>${esc(p)}</p>`).join('')}

      <h2>장점과 아쉬운 점</h2>
      <div class="pros-cons">
        <div class="pros">
          <h3>${icon('check', 'icon--sm')} 잘하는 것</h3>
          <ul>${tool.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </div>
        <div class="cons">
          <h3>${icon('alert', 'icon--sm')} 아쉬운 것</h3>
          <ul>${tool.weaknesses.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </div>
      </div>

      <h2>이럴 때 쓰세요</h2>
      <ul>${tool.bestFor.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>

      <h2>${esc(tool.name)} 구독 요금제</h2>
      ${planTable(tool)}

      ${faqBlock(tool.faq)}

      ${relatedGuides.length ? `<h2>관련 상황별 가이드</h2><ul>${relatedGuides
        .map((g) => `<li><a href="/guides/${g.slug}.html">${esc(g.title)}</a> — ${esc(g.description)}</li>`)
        .join('')}</ul>` : ''}

      <div class="cta">
        <h2>${esc(tool.name)}가 정말 내 상황에 맞을까?</h2>
        <p>지금 막힌 상황을 한 줄로 적으면 다른 후보와 비교해 드립니다.</p>
        <a class="btn" href="/">상황 적고 추천받기 ${icon('arrow', 'icon--sm')}</a>
      </div>
    </article>

    <aside class="side">
      <div class="side__box">
        <h2>요약</h2>
        <ul class="side__list">
          <li><strong>제공</strong> ${esc(tool.vendor)}</li>
          <li><strong>분류</strong> ${esc(CATEGORIES[tool.category].label)}</li>
          <li><strong>가격</strong> ${esc(priceLabel(tool))}</li>
          <li><strong>무료 플랜</strong> ${tool.free ? '있음' : '없음'}</li>
        </ul>
        <p style="margin:14px 0 0"><a class="btn btn--outline btn--sm btn--block" href="${esc(tool.official)}" target="_blank" rel="noopener nofollow">공식 사이트 ${icon('arrow', 'icon--sm')}</a></p>
      </div>
      ${versus.length ? `<div class="side__box"><h2>1:1 비교</h2><ul class="side__list">${versus
        .map((c) => `<li><a href="/compare/${c.a}-vs-${c.b}.html">${esc(byslug(c.a).name)} vs ${esc(byslug(c.b).name)}</a></li>`)
        .join('')}</ul></div>` : ''}
      ${related.length ? `<div class="side__box"><h2>같은 분류의 다른 도구</h2><ul class="side__list">${related
        .map((t) => `<li><a href="/tools/${t.slug}.html">${esc(t.name)}</a> — ${esc(t.tagline)}</li>`)
        .join('')}</ul></div>` : ''}
    </aside>
  </div>
</div>`;

  write(`tools/${tool.slug}.html`, layout({
    title: `${tool.name} 요금제와 장단점 — 이럴 때 쓰세요`,
    description: tool.summary,
    canonical: `/tools/${tool.slug}.html`,
    current: '/tools/',
    body,
    jsonld: [
      breadcrumbLd(trail.map((t, i) => (i === 2 ? { ...t, href: `/tools/${tool.slug}.html` } : t))),
      {
        '@type': 'SoftwareApplication',
        name: tool.name,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: tool.summary,
        url: tool.official,
        author: { '@type': 'Organization', name: tool.vendor },
        offers: tool.plans.map((p) => ({ '@type': 'Offer', name: p.name, description: `${p.price} — ${p.note}` })),
      },
      faqLd(tool.faq),
    ],
  }), { priority: 0.8 });
}

/* ---------- 가이드 목록 ---------- */
function buildGuidesIndex() {
  const body = `${breadcrumb([{ label: '홈', href: '/' }, { label: '상황별 가이드' }])}
<div class="container">
  <div class="page-head" style="border:0">
    <h1>상황별 AI 가이드 ${guides.length}편</h1>
    <p class="lede">글쓰기·코딩·리서치·번역처럼 실제로 막히는 상황별로, 어떤 AI를 어떻게 쓰면 되는지 절차까지 정리했습니다.</p>
  </div>
  <section class="section" style="padding-top:16px">
    <div class="grid">${guides.map(guideCard).join('')}</div>
  </section>
</div>`;

  write('guides/index.html', layout({
    title: `상황별 AI 가이드 ${guides.length}편 — 이럴 땐 이 AI`,
    description: '글쓰기, 코딩, 자료 조사, 번역, 이미지, 영상, 발표자료 등 상황별로 어떤 AI를 써야 하는지와 실전 사용 순서를 정리한 가이드 모음입니다.',
    canonical: '/guides/',
    current: '/guides/',
    body,
    jsonld: [breadcrumbLd([{ label: '홈', href: '/' }, { label: '상황별 가이드', href: '/guides/' }])],
  }), { priority: 0.9 });
}

/* ---------- 가이드 상세 ---------- */
function buildGuidePage(guide) {
  const trail = [{ label: '홈', href: '/' }, { label: '상황별 가이드', href: '/guides/' }, { label: guide.title }];
  const picks = guide.picks.map((p) => ({ ...p, tool: byslug(p.tool) })).filter((p) => p.tool);

  const body = `${breadcrumb(trail)}
<div class="container">
  <div class="page-head">
    <h1>${esc(guide.h1)}</h1>
    <p class="lede">${esc(guide.description)}</p>
  </div>

  <div class="layout">
    <article class="prose">
      ${guide.intro.map((p) => `<p>${esc(p)}</p>`).join('')}

      <h2>이런 상황이라면</h2>
      <ul>${guide.situations.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>

      <h2>추천 AI ${picks.length}개와 고르는 이유</h2>
      ${picks.map((p, i) => `<h3>${i + 1}. <a href="/tools/${p.tool.slug}.html">${esc(p.tool.name)}</a> <span style="color:var(--sub);font-weight:400;font-size:.9rem">· ${esc(priceLabel(p.tool))}</span></h3>
      <p>${esc(p.why)}</p>`).join('')}

      <h2>실제로 쓰는 순서</h2>
      <ol class="steps">${guide.steps.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></li>`).join('')}</ol>

      <h2>주의할 점</h2>
      <ul>${guide.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>

      ${faqBlock(guide.faq)}

      <div class="cta">
        <h2>내 상황은 조금 다른데?</h2>
        <p>구체적인 상황을 적으면 이 가이드 밖의 도구까지 포함해 다시 추천해 드립니다.</p>
        <a class="btn" href="/">상황 적고 추천받기 ${icon('arrow', 'icon--sm')}</a>
      </div>
    </article>

    <aside class="side">
      <div class="side__box">
        <h2>이 가이드의 추천 도구</h2>
        <ul class="side__list">${picks.map((p) => `<li><a href="/tools/${p.tool.slug}.html">${esc(p.tool.name)}</a> — ${esc(priceLabel(p.tool))}</li>`).join('')}</ul>
      </div>
      <div class="side__box">
        <h2>다른 상황 보기</h2>
        <ul class="side__list">${guides.filter((g) => g.slug !== guide.slug).slice(0, 7)
          .map((g) => `<li><a href="/guides/${g.slug}.html">${esc(g.title)}</a></li>`).join('')}</ul>
      </div>
    </aside>
  </div>
</div>`;

  write(`guides/${guide.slug}.html`, layout({
    title: guide.title,
    description: guide.description,
    canonical: `/guides/${guide.slug}.html`,
    current: '/guides/',
    body,
    jsonld: [
      breadcrumbLd(trail.map((t, i) => (i === 2 ? { ...t, href: `/guides/${guide.slug}.html` } : t))),
      {
        '@type': 'Article',
        headline: guide.h1,
        description: guide.description,
        inLanguage: 'ko',
        author: { '@type': 'Organization', name: site.name },
        publisher: { '@type': 'Organization', name: site.name },
        mainEntityOfPage: `${site.url}/guides/${guide.slug}.html`,
      },
      faqLd(guide.faq),
    ],
  }), { priority: 0.8 });
}

/* ---------- 비교 (A vs B) ---------- */
function buildCompareIndex() {
  const body = `${breadcrumb([{ label: '홈', href: '/' }, { label: '비교' }])}
<div class="container">
  <div class="page-head" style="border:0">
    <h1>AI 1:1 비교</h1>
    <p class="lede">가장 많이 헷갈리는 조합을 항목별로 나란히 놓고 비교했습니다. 어느 쪽을 골라야 하는지 결론까지 정리했습니다.</p>
  </div>
  <section class="section" style="padding-top:16px">
    <div class="grid">${compares.map((c) => {
      const a = byslug(c.a), b = byslug(c.b);
      return `<article class="card">
        <h3 class="card__title"><a href="/compare/${c.a}-vs-${c.b}.html">${esc(a.name)} vs ${esc(b.name)}</a></h3>
        <p class="card__desc" style="margin-top:8px">${esc(c.summary)}</p>
        <div class="card__foot"><span class="card__price"><span>비교 보기</span></span>${icon('arrow', 'icon--sm')}</div>
      </article>`;
    }).join('')}</div>
  </section>
</div>`;

  write('compare/index.html', layout({
    title: 'AI 1:1 비교 — ChatGPT vs Claude vs Gemini',
    description: 'ChatGPT와 Claude, Gemini, Perplexity, Cursor와 GitHub Copilot 등 가장 많이 고민하는 조합을 항목별로 비교하고 결론을 정리했습니다.',
    canonical: '/compare/',
    current: '/compare/',
    body,
    jsonld: [breadcrumbLd([{ label: '홈', href: '/' }, { label: '비교', href: '/compare/' }])],
  }), { priority: 0.8 });
}

function buildComparePage(c) {
  const a = byslug(c.a), b = byslug(c.b);
  const slug = `${c.a}-vs-${c.b}`;
  const trail = [{ label: '홈', href: '/' }, { label: '비교', href: '/compare/' }, { label: `${a.name} vs ${b.name}` }];
  const row = (label, va, vb) => `<tr><td>${esc(label)}</td><td>${esc(va)}</td><td>${esc(vb)}</td></tr>`;
  const sharedGuides = a.guides.filter((g) => b.guides.includes(g)).map(guideBySlug).filter(Boolean);

  const body = `${breadcrumb(trail)}
<div class="container">
  <div class="page-head">
    <h1>${esc(a.name)} vs ${esc(b.name)} — 뭘 골라야 할까</h1>
    <p class="lede">${esc(c.summary)}</p>
  </div>

  <div class="layout">
    <article class="prose">
      <h2>한눈에 비교</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th scope="col">항목</th><th scope="col">${esc(a.name)}</th><th scope="col">${esc(b.name)}</th></tr></thead>
          <tbody>
            ${row('제공', a.vendor, b.vendor)}
            ${row('분류', CATEGORIES[a.category].label, CATEGORIES[b.category].label)}
            ${row('한 줄 성격', a.tagline, b.tagline)}
            ${row('무료 플랜', a.free ? '있음' : '없음', b.free ? '있음' : '없음')}
            ${row('유료 시작가', priceLabel(a), priceLabel(b))}
          </tbody>
        </table>
      </div>

      <h2>결론부터</h2>
      ${c.verdict.map((p) => `<p>${esc(p)}</p>`).join('')}

      <h2>${esc(a.name)}를 골라야 하는 경우</h2>
      <ul>${a.bestFor.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <p><strong>강점</strong> — ${esc(a.strengths.slice(0, 3).join(' / '))}</p>
      <p><strong>약점</strong> — ${esc(a.weaknesses.slice(0, 2).join(' / '))}</p>

      <h2>${esc(b.name)}를 골라야 하는 경우</h2>
      <ul>${b.bestFor.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <p><strong>강점</strong> — ${esc(b.strengths.slice(0, 3).join(' / '))}</p>
      <p><strong>약점</strong> — ${esc(b.weaknesses.slice(0, 2).join(' / '))}</p>

      <h2>요금제 비교</h2>
      <h3>${esc(a.name)}</h3>
      ${planTable(a)}
      <h3>${esc(b.name)}</h3>
      ${planTable(b)}

      ${faqBlock(c.faq)}

      <div class="cta">
        <h2>둘 다 아닐 수도 있습니다</h2>
        <p>상황을 적으면 이 둘을 포함해 18개 중에서 다시 골라 드립니다.</p>
        <a class="btn" href="/">상황 적고 추천받기 ${icon('arrow', 'icon--sm')}</a>
      </div>
    </article>

    <aside class="side">
      <div class="side__box">
        <h2>개별 상세</h2>
        <ul class="side__list">
          <li><a href="/tools/${a.slug}.html">${esc(a.name)} 자세히 보기</a></li>
          <li><a href="/tools/${b.slug}.html">${esc(b.name)} 자세히 보기</a></li>
        </ul>
      </div>
      ${sharedGuides.length ? `<div class="side__box"><h2>둘 다 쓰이는 상황</h2><ul class="side__list">${sharedGuides
        .map((g) => `<li><a href="/guides/${g.slug}.html">${esc(g.title)}</a></li>`).join('')}</ul></div>` : ''}
    </aside>
  </div>
</div>`;

  write(`compare/${slug}.html`, layout({
    title: `${a.name} vs ${b.name} 비교 — 요금제와 선택 기준`,
    description: c.summary,
    canonical: `/compare/${slug}.html`,
    current: '/compare/',
    body,
    jsonld: [
      breadcrumbLd(trail.map((t, i) => (i === 2 ? { ...t, href: `/compare/${slug}.html` } : t))),
      {
        '@type': 'Article',
        headline: `${a.name} vs ${b.name}`,
        description: c.summary,
        inLanguage: 'ko',
        author: { '@type': 'Organization', name: site.name },
        publisher: { '@type': 'Organization', name: site.name },
        mainEntityOfPage: `${site.url}/compare/${slug}.html`,
      },
      faqLd(c.faq),
    ],
  }), { priority: 0.7 });
}

/* ---------- 정책·소개 페이지 (애드센스 심사 필수) ---------- */
function buildStaticPage({ file, title, description, h1, sections, priority = 0.4 }) {
  const trail = [{ label: '홈', href: '/' }, { label: h1 }];
  const body = `${breadcrumb(trail)}
<div class="container">
  <div class="page-head"><h1>${esc(h1)}</h1><p class="lede">${esc(description)}</p></div>
  <div class="layout" style="grid-template-columns:minmax(0,1fr)">
    <article class="prose">${sections}</article>
  </div>
</div>`;
  write(file, layout({
    title, description, canonical: `/${file}`, current: `/${file}`, body,
    jsonld: [breadcrumbLd([{ label: '홈', href: '/' }, { label: h1, href: `/${file}` }])],
  }), { priority });
}

function buildStaticPages() {
  buildStaticPage({
    file: 'about.html',
    title: '사이트 소개',
    description: `${site.name}가 어떤 문제를 풀려고 만들어졌는지, 추천이 어떤 기준으로 이뤄지는지 설명합니다.`,
    h1: '사이트 소개',
    priority: 0.5,
    sections: `
      <h2>왜 만들었나</h2>
      <p>AI 도구는 계속 늘어나는데, 정작 “지금 이 일에는 뭐가 나은가”를 판단할 방법이 없습니다. 그래서 대부분 처음 써 본 하나에 정착하고, 그 도구가 약한 작업에서도 그대로 씁니다. 시간이 더 들거나 결과가 나쁜데도 비교 대상이 없으니 문제라는 걸 모릅니다.</p>
      <p>${esc(site.name)}는 그 판단을 대신해 주려고 만들었습니다. 막힌 상황을 한 줄로 적으면, 그 일에 강한 도구를 이유와 함께 알려 주고 구독 요금제까지 보여 줍니다.</p>

      <h2>추천은 어떤 기준인가</h2>
      <p>입력한 문장에서 작업의 성격을 나타내는 키워드를 찾아, 미리 정리해 둔 ${guides.length}개 상황 카테고리와 ${tools.length}개 도구의 특성에 대조합니다. 여기서 나온 점수 순으로 상위 도구를 보여 주고, 그 상황에서 그 도구를 고르는 이유를 함께 붙입니다.</p>
      <p>모든 판단은 각 도구를 실제로 써 본 경험과 공개된 기능·요금 정보를 바탕으로 사람이 직접 정리한 것입니다. 자동으로 수집한 순위나 광고비에 따른 노출 조정은 없습니다.</p>

      <h2>돈을 받고 순위를 바꾸지 않습니다</h2>
      <p>이 사이트는 소개하는 어떤 AI 서비스와도 제휴 관계가 없습니다. 추천 순서는 상황 적합도로만 결정되며, 특정 도구를 위로 올리는 대가를 받지 않습니다. 운영 비용은 광고로 충당합니다.</p>

      <h2>정보의 한계</h2>
      <p>요금제와 기능은 자주 바뀝니다. 각 페이지의 요금 정보는 <strong>${esc(site.priceCheckedAt)}</strong> 기준 참고용이며, 결제 전에는 반드시 해당 서비스 공식 사이트에서 최신 조건을 확인하시기 바랍니다. 잘못된 정보를 발견하시면 <a href="/contact.html">문의</a>로 알려 주세요.</p>

      <h2>연락</h2>
      <p>제안, 오류 신고, 다뤄 줬으면 하는 도구가 있다면 <a href="/contact.html">문의 페이지</a>를 이용해 주세요.</p>`,
  });

  buildStaticPage({
    file: 'contact.html',
    title: '문의하기',
    description: `${site.name}에 오류 신고, 도구 추가 요청, 제휴 문의를 보내는 방법을 안내합니다.`,
    h1: '문의하기',
    sections: `
      <h2>이메일</h2>
      <p>아래 주소로 보내 주시면 확인 후 회신드립니다.</p>
      <p><a class="btn" href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>

      <h2>이런 문의를 환영합니다</h2>
      <ul>
        <li><strong>정보 오류 신고</strong> — 요금제나 기능 설명이 실제와 다른 경우. 어느 페이지인지 알려 주시면 빠르게 고칩니다.</li>
        <li><strong>도구 추가 요청</strong> — 다뤘으면 하는 AI 서비스가 있다면 이름과 함께 어떤 상황에 쓰는지 적어 주세요.</li>
        <li><strong>가이드 주제 제안</strong> — “이런 상황도 다뤄 달라”는 요청이 가장 도움이 됩니다.</li>
        <li><strong>제휴·광고 문의</strong> — 다만 추천 순위를 바꾸는 형태의 제안은 받지 않습니다.</li>
      </ul>

      <h2>회신까지 걸리는 시간</h2>
      <p>1인이 운영하는 사이트라 보통 영업일 기준 2~5일 정도 걸립니다. 명백한 정보 오류 신고는 우선 처리합니다.</p>

      <h2>회신이 어려운 문의</h2>
      <p>특정 AI 서비스의 결제·환불·계정 문제는 저희가 처리할 수 없습니다. 해당 서비스 고객센터로 직접 문의하셔야 합니다.</p>`,
  });

  buildStaticPage({
    file: 'privacy.html',
    title: '개인정보처리방침',
    description: `${site.name}가 수집하는 정보, 쿠키 및 광고 사용, 이용자의 선택권을 안내합니다.`,
    h1: '개인정보처리방침',
    sections: `
      <p>${esc(site.name)}(이하 “사이트”)는 이용자의 개인정보를 중요하게 생각하며, 아래와 같이 처리합니다. 최종 개정일: ${esc(site.priceCheckedAt)}</p>

      <h2>1. 수집하는 정보</h2>
      <p>사이트는 회원가입 기능이 없으며 이름·연락처 등 개인을 식별할 수 있는 정보를 직접 수집하지 않습니다. 추천 기능에 입력한 상황 문장은 이용자의 브라우저 안에서만 처리되며 서버로 전송되거나 저장되지 않습니다.</p>
      <p>다만 사이트 이용 과정에서 아래 정보가 자동으로 생성·수집될 수 있습니다.</p>
      <ul>
        <li>접속 IP 주소, 브라우저 종류 및 버전, 운영체제</li>
        <li>방문한 페이지, 방문 일시, 유입 경로</li>
      </ul>

      <h2>2. 쿠키 사용</h2>
      <p>사이트는 이용 통계 분석과 광고 게재를 위해 쿠키를 사용할 수 있습니다. 쿠키는 이용자의 브라우저에 저장되는 작은 텍스트 파일로, 이용자는 브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있습니다. 다만 쿠키를 차단해도 사이트의 핵심 기능은 정상 작동합니다.</p>

      <h2>3. 광고 및 제3자 제공</h2>
      <p>사이트는 Google AdSense를 포함한 제3자 광고 서비스를 이용할 수 있습니다. Google을 비롯한 제3자 공급업체는 쿠키를 사용하여 이용자의 이전 방문 기록을 바탕으로 광고를 게재합니다.</p>
      <ul>
        <li>Google의 광고 쿠키 사용은 <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener">Google 광고 정책</a>을 따릅니다.</li>
        <li>이용자는 <a href="https://adssettings.google.com" target="_blank" rel="noopener">Google 광고 설정</a>에서 맞춤 광고를 해제할 수 있습니다.</li>
        <li>제3자 공급업체의 맞춤 광고는 <a href="https://www.aboutads.info" target="_blank" rel="noopener">aboutads.info</a>에서 일괄 해제할 수 있습니다.</li>
      </ul>
      <p>사이트는 수집된 정보를 광고·분석 목적 외의 용도로 제3자에게 판매하거나 제공하지 않습니다.</p>

      <h2>4. 외부 링크</h2>
      <p>사이트에는 각 AI 서비스의 공식 사이트로 연결되는 외부 링크가 포함되어 있습니다. 연결된 사이트에서의 개인정보 처리에 대해서는 해당 사이트의 방침이 적용되며, ${esc(site.name)}는 책임을 지지 않습니다.</p>

      <h2>5. 보유 기간</h2>
      <p>자동 수집되는 접속 기록은 통계·분석 서비스 제공자의 정책에 따라 보관되며, 사이트가 별도로 저장하는 개인정보는 없습니다.</p>

      <h2>6. 이용자의 권리</h2>
      <p>이용자는 언제든지 브라우저 설정을 통해 쿠키를 거부할 수 있고, 위에 안내한 링크에서 맞춤 광고를 해제할 수 있습니다.</p>

      <h2>7. 아동의 개인정보</h2>
      <p>사이트는 만 14세 미만 아동을 대상으로 하지 않으며, 아동의 개인정보를 의도적으로 수집하지 않습니다.</p>

      <h2>8. 방침 변경</h2>
      <p>본 방침이 변경될 경우 이 페이지를 통해 공지합니다. 문의는 <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>로 주시기 바랍니다.</p>`,
  });

  buildStaticPage({
    file: 'terms.html',
    title: '이용약관',
    description: `${site.name} 콘텐츠의 이용 조건과 정보의 정확성에 관한 면책 사항을 안내합니다.`,
    h1: '이용약관',
    sections: `
      <p>본 약관은 ${esc(site.name)}(이하 “사이트”)가 제공하는 정보 서비스의 이용 조건을 정합니다. 최종 개정일: ${esc(site.priceCheckedAt)}</p>

      <h2>1. 서비스의 성격</h2>
      <p>사이트는 여러 AI 서비스의 특징과 공개된 요금 정보를 정리해 제공하는 정보 제공 사이트입니다. 사이트는 소개하는 AI 서비스를 직접 제공하거나 판매하지 않으며, 각 서비스의 운영 주체와 아무런 계약 관계가 없습니다.</p>

      <h2>2. 정보의 정확성과 면책</h2>
      <p>사이트는 정확한 정보를 제공하기 위해 노력하지만, AI 서비스의 기능과 요금제는 예고 없이 변경됩니다. 사이트에 게시된 정보는 <strong>${esc(site.priceCheckedAt)}</strong> 기준 참고 자료이며, 최신성·정확성·완전성을 보증하지 않습니다.</p>
      <p>이용자는 결제나 도입을 결정하기 전에 반드시 해당 서비스 공식 사이트에서 조건을 직접 확인해야 하며, 사이트의 정보를 근거로 한 결정으로 발생한 손해에 대해 사이트는 책임을 지지 않습니다.</p>

      <h2>3. 추천 결과의 성격</h2>
      <p>추천 기능이 제시하는 결과는 입력한 문장의 키워드를 기준으로 한 참고 의견입니다. 이용자의 구체적인 업무 환경, 보안 정책, 법적 요구사항을 반영하지 않으므로 전문적 조언으로 해석해서는 안 됩니다.</p>

      <h2>4. 저작권</h2>
      <p>사이트에 게시된 글과 정리 자료의 저작권은 ${esc(site.name)}에 있습니다. 개인적·비상업적 용도의 인용은 출처를 밝히는 조건으로 허용하며, 전체 또는 상당 부분의 무단 복제·재배포는 금지합니다.</p>
      <p>각 AI 서비스의 명칭과 상표는 해당 권리자에게 귀속됩니다. 사이트는 식별 목적으로만 이를 사용합니다.</p>

      <h2>5. 광고</h2>
      <p>사이트는 운영 비용 충당을 위해 광고를 게재합니다. 광고 내용은 광고주의 책임이며, 사이트가 광고된 상품·서비스를 보증하지 않습니다. 광고 게재 여부는 콘텐츠의 추천 순서에 영향을 주지 않습니다.</p>

      <h2>6. 금지 행위</h2>
      <ul>
        <li>사이트 콘텐츠를 자동화 수단으로 대량 수집하는 행위</li>
        <li>사이트의 정상적인 운영을 방해하는 행위</li>
        <li>사이트 콘텐츠를 무단으로 복제해 유사 서비스를 만드는 행위</li>
      </ul>

      <h2>7. 약관의 변경</h2>
      <p>본 약관은 필요에 따라 변경될 수 있으며, 변경 시 이 페이지에 게시합니다. 문의는 <a href="mailto:${esc(site.email)}">${esc(site.email)}</a>로 주시기 바랍니다.</p>`,
  });

  // 404 — 검색엔진에 색인되면 안 되므로 sitemap 에서 제외
  write('404.html', layout({
    title: '페이지를 찾을 수 없습니다',
    description: '요청하신 페이지가 없습니다. 상황을 적고 맞는 AI를 추천받아 보세요.',
    canonical: '/404.html',
    current: '',
    body: `<div class="container"><div class="page-head" style="border:0;text-align:center;padding:80px 0">
      <h1>404 — 페이지를 찾을 수 없습니다</h1>
      <p class="lede" style="margin:0 auto 24px">주소가 바뀌었거나 삭제된 페이지입니다.</p>
      <p><a class="btn" href="/">홈으로 가기</a> <a class="btn btn--ghost" href="/tools/">도구 목록 보기</a></p>
    </div></div>`,
  }), { noIndex: true });
}

/* ============================================================
   5. 산출물 — 클라이언트 데이터 / sitemap / robots
   ============================================================ */
function buildData() {
  const payload = {
    tools: tools.map((t) => ({
      slug: t.slug, name: t.name, vendor: t.vendor, category: t.category,
      catLabel: CATEGORIES[t.category].label, tagline: t.tagline, summary: t.summary,
      tags: t.tags, guides: t.guides, free: t.free, startPrice: t.startPrice,
      popularity: t.popularity, priceLabel: priceLabel(t),
    })),
    guides: guides.map((g) => ({ slug: g.slug, title: g.title, keywords: g.keywords, picks: g.picks })),
    categories: Object.fromEntries(Object.entries(CATEGORIES).map(([k, v]) => [k, v.label])),
  };
  fs.writeFileSync(
    path.join(OUT, 'assets/data.js'),
    '/* build.js 가 자동 생성합니다. 직접 수정하지 마세요. */\nwindow.AI_DATA=' + JSON.stringify(payload) + ';\n',
    'utf8'
  );
}

function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = BUILT.map((p) =>
    `  <url><loc>${site.url}/${p.url}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>`
  ).join('\n');
  fs.writeFileSync(
    path.join(OUT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    'utf8'
  );

  fs.writeFileSync(
    path.join(OUT, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`,
    'utf8'
  );
}

/* ============================================================
   실행
   ============================================================ */
function main() {
  // 데이터 정합성 먼저 확인 — 오타로 깨진 링크가 생기는 걸 막습니다
  guides.forEach((g) => g.picks.forEach((p) => {
    if (!byslug(p.tool)) throw new Error(`guides/${g.slug}: 없는 도구 slug "${p.tool}"`);
  }));
  tools.forEach((t) => {
    if (!CATEGORIES[t.category]) throw new Error(`tools/${t.slug}: 없는 카테고리 "${t.category}"`);
    t.guides.forEach((gs) => { if (!guideBySlug(gs)) throw new Error(`tools/${t.slug}: 없는 가이드 slug "${gs}"`); });
  });
  compares.forEach((c) => {
    if (!byslug(c.a) || !byslug(c.b)) throw new Error(`compare ${c.a}-vs-${c.b}: 없는 도구 slug`);
  });

  // 페이지를 그리기 전에 실행해야 합니다 — layout() 이 OG.width/height 를 읽어 씁니다.
  // 이미 파일이 있으면 만들지 않고 그 파일의 실제 크기를 읽어 옵니다.
  OG = ensureOgImage(path.join(OUT, 'assets/og.png'));

  buildHome();
  buildToolsIndex();
  tools.forEach(buildToolPage);
  buildGuidesIndex();
  guides.forEach(buildGuidePage);
  buildCompareIndex();
  compares.forEach(buildComparePage);
  buildStaticPages();
  buildData();
  buildSitemap();

  const contentPages = tools.length + guides.length + compares.length;
  console.log('빌드 완료');
  console.log(`  전체 페이지 ${BUILT.length + 1}개 (sitemap 등록 ${BUILT.length}개 + 404)`);
  console.log(`  └ 콘텐츠 페이지 ${contentPages}개 (도구 ${tools.length} / 가이드 ${guides.length} / 비교 ${compares.length})`);
  console.log(`  사이트 주소: ${site.url}   ← content/site.js 에서 변경`);
  console.log(`  OG 이미지: assets/og.png ${OG.created ? '새로 생성' : '기존 파일 유지'} ` +
    (OG.width ? `(${OG.width}x${OG.height})` : '(PNG 아님 → 크기 메타 생략)'));
}

main();
