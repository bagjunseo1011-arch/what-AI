/**
 * 카테고리 정의. tools.js 의 category 값과 1:1로 대응합니다.
 * key 순서가 곧 필터 칩의 노출 순서입니다.
 */
const CATEGORIES = {
  chat: { label: '대화형 AI', icon: 'message' },
  search: { label: '검색·리서치', icon: 'search' },
  code: { label: '코딩·개발', icon: 'code' },
  doc: { label: '문서·업무', icon: 'file' },
  image: { label: '이미지', icon: 'image' },
  video: { label: '영상', icon: 'video' },
  audio: { label: '음성·음악', icon: 'audio' },
  translate: { label: '번역', icon: 'globe' },
};

/** 도구 목록 페이지의 정렬 옵션 */
const SORTS = {
  popular: '인기순',
  'price-asc': '저렴한 순',
  name: '이름순',
};

module.exports = { CATEGORIES, SORTS };
