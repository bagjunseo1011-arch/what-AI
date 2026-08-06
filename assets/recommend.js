/* ============================================================
   추천 엔진 — 순수 함수. DOM을 건드리지 않습니다.
   브라우저에서는 전역 recommendTools 로, Node(테스트)에서는
   module.exports 로 같은 함수를 씁니다.

   점수 계산
     1) 사용자가 적은 문장에서 가이드 keywords 가 몇 개 걸리는지 센다
     2) 걸린 가이드가 추천(picks)하는 도구에 가중치 3점씩
     3) 도구 자체 tags 가 문장에 직접 걸리면 2점씩
     4) 동점 방지용으로 popularity 를 0.01 배 더한다
   ============================================================ */
(function (root) {
  'use strict';

  var W_GUIDE = 3;   // 가이드 경유 매칭
  var W_TAG = 2;     // 도구 태그 직접 매칭
  var W_POP = 0.01;  // 동점 시 인지도로 순서 결정
  var MIN_KW = 2;    // 1글자 키워드는 아무 문자열에나 걸리므로 매칭에서 제외

  // 가장 잘 맞는 가이드에 집중시키는 감쇠 계수.
  // 이게 없으면 "보고", "정리" 같은 짧은 키워드가 여러 가이드에 걸리면서
  // 여러 가이드에 중복 등장하는 범용 도구가 특화 도구를 이겨 버립니다.
  var DECAY = [1, 0.5, 0.3];
  var DECAY_REST = 0.15;

  /** 비교용 정규화: 소문자 + 공백/문장부호 제거 (한글은 그대로 둠) */
  function normalize(text) {
    return String(text || '').toLowerCase().replace(/[\s.,!?~()[\]{}'"·…\-_/]/g, '');
  }

  /** q 안에 들어 있는 키워드만 추려 냅니다 (1글자 키워드는 버림) */
  function hitsIn(q, keywords) {
    return keywords.filter(function (kw) {
      var n = normalize(kw);
      return n.length >= MIN_KW && q.indexOf(n) !== -1;
    });
  }

  /**
   * @param {string} input 사용자가 적은 상황 문장
   * @param {{tools:Array, guides:Array}} data
   * @param {number} [limit=4]
   * @returns {{results:Array, guides:Array, matched:Array}}
   */
  function recommendTools(input, data, limit) {
    limit = limit || 4;
    var q = normalize(input);
    var tools = (data && data.tools) || [];
    var guides = (data && data.guides) || [];

    if (q.length < 2) return { results: [], guides: [], matched: [] };

    var matched = [];        // 실제로 걸린 키워드 (사용자에게 근거로 보여 줌)
    var scores = {};         // slug -> 점수
    var reasons = {};        // slug -> 가이드가 제시한 추천 이유
    var guideHits = [];      // 걸린 가이드 목록

    // 1) 걸린 가이드를 먼저 전부 모은다 (점수는 아직 주지 않음)
    guides.forEach(function (guide) {
      var hits = hitsIn(q, guide.keywords);
      if (!hits.length) return;
      guideHits.push({ guide: guide, hits: hits.length });
      hits.forEach(function (kw) { if (matched.indexOf(kw) === -1) matched.push(kw); });
    });

    // 2) 잘 맞는 가이드 순으로 정렬한 뒤, 순위별 감쇠를 적용해 점수를 준다
    guideHits.sort(function (a, b) { return b.hits - a.hits; });
    guideHits.forEach(function (entry, gi) {
      var decay = gi < DECAY.length ? DECAY[gi] : DECAY_REST;
      entry.guide.picks.forEach(function (pick, index) {
        // 가이드 안에서 앞순위로 추천된 도구에 조금 더 준다
        var rankBonus = Math.max(0, 3 - index) / 3;
        scores[pick.tool] = (scores[pick.tool] || 0) + (W_GUIDE * entry.hits + rankBonus) * decay;
        if (!reasons[pick.tool]) reasons[pick.tool] = { why: pick.why, guide: entry.guide };
      });
    });

    // 3) 도구 태그 직접 매칭
    tools.forEach(function (tool) {
      var hits = hitsIn(q, tool.tags);
      if (!hits.length) return;
      scores[tool.slug] = (scores[tool.slug] || 0) + W_TAG * hits.length;
      hits.forEach(function (kw) { if (matched.indexOf(kw) === -1) matched.push(kw); });
    });

    // 4) 정렬 + 상위 N개
    var results = tools
      .filter(function (tool) { return scores[tool.slug] > 0; })
      .map(function (tool) {
        return {
          tool: tool,
          score: scores[tool.slug] + tool.popularity * W_POP,
          reason: reasons[tool.slug] || null,
        };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, limit);

    return {
      results: results,
      guides: guideHits.slice(0, 3).map(function (g) { return g.guide; }),
      matched: matched,
    };
  }

  root.recommendTools = recommendTools;
  root.normalizeQuery = normalize;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { recommendTools: recommendTools, normalize: normalize };
  }
})(typeof window !== 'undefined' ? window : globalThis);
