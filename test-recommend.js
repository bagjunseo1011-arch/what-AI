#!/usr/bin/env node
/* 추천 엔진 자체 점검.  실행: node test-recommend.js
   콘텐츠를 고칠 때마다 돌려서 "엉뚱한 AI를 추천하는" 회귀를 잡습니다. */
'use strict';

const assert = require('assert');
const { recommendTools } = require('./assets/recommend.js');
const data = { tools: require('./content/tools.js'), guides: require('./content/guides.js') };

const slugs = (q) => recommendTools(q, data, 4).results.map((r) => r.tool.slug);

const cases = [
  // [상황, 상위 결과에 반드시 들어가야 하는 도구 중 하나]
  ['영어 논문 30페이지를 읽고 요약해야 한다', ['claude', 'notebooklm']],
  ['코드에서 에러가 나는데 원인을 못 찾겠다', ['claude-code', 'cursor', 'github-copilot']],
  ['유튜브 썸네일을 만들어야 하는데 디자인을 못 한다', ['midjourney', 'firefly']],
  ['거래처에 보낼 영어 메일이 번역투라 어색하다', ['deepl']],
  ['보고서에 넣을 시장 규모 통계 출처가 필요하다', ['perplexity']],
  ['엑셀 매출 데이터를 그래프로 정리하고 싶다', ['chatgpt', 'copilot-microsoft']],
  ['내일 발표인데 ppt가 한 장도 없다', ['gamma']],
  ['돈 안 쓰고 무료로 써 보고 싶다', ['gemini', 'deepseek', 'notebooklm', 'perplexity']],
  ['영상에 넣을 내레이션 목소리가 필요하다', ['elevenlabs']],
];

let failed = 0;
for (const [query, expected] of cases) {
  const got = slugs(query);
  const ok = expected.some((slug) => got.includes(slug));
  if (!ok) {
    failed++;
    console.error(`FAIL  "${query}"\n      기대: ${expected.join(' | ')}\n      실제: ${got.join(', ') || '(없음)'}`);
  }
}

// 빈 입력·의미 없는 입력은 결과가 없어야 합니다 (아무거나 추천하면 신뢰가 깨짐)
assert.strictEqual(recommendTools('', data).results.length, 0, '빈 입력은 결과가 없어야 함');
assert.strictEqual(recommendTools('ㅁ', data).results.length, 0, '1글자 입력은 결과가 없어야 함');
assert.strictEqual(recommendTools('qzxwvj plkmnb', data).results.length, 0, '매칭 없는 입력은 결과가 없어야 함');

// 결과는 점수 내림차순이어야 합니다
const ranked = recommendTools('블로그 글을 써야 하는데 초안이 안 나온다', data, 4).results;
assert.ok(ranked.length > 0, '글쓰기 상황은 결과가 나와야 함');
for (let i = 1; i < ranked.length; i++) {
  assert.ok(ranked[i - 1].score >= ranked[i].score, '결과가 점수 내림차순이 아님');
}

if (failed) {
  console.error(`\n${failed}건 실패`);
  process.exit(1);
}
console.log(`통과 — 상황 ${cases.length}건 + 경계 입력 3건 + 정렬 검사`);
