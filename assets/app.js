/* ============================================================
   어떤AI — 클라이언트 동작
   컴포넌트 2개만 담당합니다.
     A. 상황 입력 → 추천 결과 (홈 히어로)
     B. 도구 목록의 검색 / 카테고리 필터 / 정렬 (도구 목록 페이지)
   데이터는 build.js 가 만든 assets/data.js 의 window.AI_DATA.
   ============================================================ */
(function () {
  'use strict';

  var DATA = window.AI_DATA || { tools: [], guides: [], categories: {} };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** 도구 카드 마크업. rank 를 주면 추천 결과용(순위 배지 + 추천 이유) */
  function toolCard(tool, rank, reason) {
    var badge = tool.free
      ? '<span class="badge badge--free">무료 있음</span>'
      : '<span class="badge badge--paid">유료</span>';
    var rankHtml = rank ? '<span class="rank rank--' + rank + '">' + rank + '</span>' : '';
    var why = reason
      ? '<p class="why"><strong>이 상황에서:</strong> ' + esc(reason.why) + '</p>'
      : '';
    return (
      '<article class="card">' +
        '<div class="card__top">' + rankHtml +
          '<div><h3 class="card__title"><a href="/tools/' + tool.slug + '.html">' + esc(tool.name) + '</a></h3>' +
          '<div class="card__vendor">' + esc(tool.vendor) + ' · ' + esc(tool.catLabel) + '</div></div>' +
        '</div>' +
        '<p class="card__desc">' + esc(tool.tagline) + '</p>' +
        why +
        '<div class="card__foot">' +
          '<span class="card__price">' + esc(tool.priceLabel) + '</span>' + badge +
        '</div>' +
      '</article>'
    );
  }

  /* ---------- A. 추천 위젯 ---------- */
  function initFinder() {
    var form = document.getElementById('finder-form');
    if (!form) return;

    var input = document.getElementById('finder-input');
    var box = document.getElementById('results');

    function render(query) {
      var out = window.recommendTools(query, DATA, 4);

      if (!out.results.length) {
        box.innerHTML =
          '<div class="results__head"><h2>딱 맞는 결과를 못 찾았어요</h2></div>' +
          '<div class="results__empty"><p>조금 더 구체적으로 적어 보세요. ' +
          '예: “회사 보고서를 써야 하는데 목차부터 막힌다”</p>' +
          '<a class="btn btn--outline" href="/tools/">전체 도구 둘러보기</a></div>';
        box.hidden = false;
        return;
      }

      var chips = out.matched.slice(0, 6).map(function (k) {
        return '<span class="badge badge--cat">' + esc(k) + '</span>';
      }).join(' ');

      var related = out.guides.map(function (g) {
        return '<a class="btn btn--ghost btn--sm" href="/guides/' + g.slug + '.html">' + esc(g.title) + '</a>';
      }).join(' ');

      box.innerHTML =
        '<div class="results__head">' +
          '<h2>이 상황엔 이 AI를 추천합니다</h2>' +
          '<span class="results__count">인식한 키워드: ' + (chips || '없음') + '</span>' +
        '</div>' +
        '<div class="grid">' +
          out.results.map(function (r, i) { return toolCard(r.tool, i + 1, r.reason); }).join('') +
        '</div>' +
        (related ? '<p style="margin-top:20px">더 자세히: ' + related + '</p>' : '');

      box.hidden = false;
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) { input.focus(); return; }
      // 결과를 공유·북마크할 수 있게 주소창에 남긴다 (페이지 이동 없음)
      history.replaceState(null, '', '?q=' + encodeURIComponent(q));
      render(q);
    });

    // 예시 칩 클릭 → 입력창에 채우고 바로 추천
    document.querySelectorAll('[data-example]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        input.value = btn.getAttribute('data-example');
        if (form.requestSubmit) form.requestSubmit();
        else form.dispatchEvent(new Event('submit'));
      });
    });

    // ?q= 로 들어온 경우 자동 실행 (공유 링크)
    var preset = new URLSearchParams(location.search).get('q');
    if (preset) { input.value = preset; render(preset); }
  }

  /* ---------- B. 도구 목록 검색 / 필터 / 정렬 ---------- */
  function initToolList() {
    var listEl = document.getElementById('tool-list');
    if (!listEl) return;

    var searchEl = document.getElementById('tool-search');
    var sortEl = document.getElementById('sort');
    var freeEl = document.getElementById('free-only');
    var countEl = document.getElementById('tool-count');
    var catBtns = Array.prototype.slice.call(document.querySelectorAll('[data-cat]'));
    var activeCat = 'all';

    function apply() {
      var q = window.normalizeQuery(searchEl.value);
      var onlyFree = freeEl.checked;

      var list = DATA.tools.filter(function (t) {
        if (activeCat !== 'all' && t.category !== activeCat) return false;
        if (onlyFree && !t.free) return false;
        if (!q) return true;
        // 이름·회사·설명·태그를 한 덩어리로 만들어 부분일치 검색
        var haystack = window.normalizeQuery(
          [t.name, t.vendor, t.tagline, t.summary, t.tags.join(' ')].join(' ')
        );
        return haystack.indexOf(q) !== -1;
      });

      var sort = sortEl.value;
      list.sort(function (a, b) {
        if (sort === 'price-asc') return a.startPrice - b.startPrice || b.popularity - a.popularity;
        if (sort === 'name') return a.name.localeCompare(b.name, 'ko');
        return b.popularity - a.popularity;
      });

      countEl.textContent = list.length + '개';
      listEl.innerHTML = list.length
        ? list.map(function (t) { return toolCard(t); }).join('')
        : '<div class="results__empty">조건에 맞는 도구가 없습니다. 검색어나 필터를 바꿔 보세요.</div>';
    }

    searchEl.addEventListener('input', apply);
    sortEl.addEventListener('change', apply);
    freeEl.addEventListener('change', apply);
    catBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        activeCat = btn.getAttribute('data-cat');
        catBtns.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        apply();
      });
    });

    apply();
  }

  initFinder();
  initToolList();
})();
