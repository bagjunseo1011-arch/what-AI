/**
 * OG 이미지 생성기 — 외부 의존성 0.
 * Node 내장 zlib 만으로 1200x630 PNG 바이트를 직접 만듭니다.
 *
 * 왜 직접 만드나: 공유 썸네일용 이미지 한 장 때문에 sharp/canvas 같은
 * 네이티브 의존성을 붙이고 싶지 않아서. PNG 자체는 IHDR/IDAT/IEND 세 청크뿐이라
 * 도형만 그릴 거면 인코더가 60줄이면 끝납니다.
 *
 * 디자인은 도형만 씁니다(글자 없음). Node 에는 폰트 래스터라이저가 없어서
 * 한글 "어떤AI"를 그릴 수 없기 때문입니다.
 * → 직접 디자인한 이미지를 assets/og.png 에 넣어 두면 이 스크립트는 건너뜁니다.
 */
'use strict';

const fs = require('fs');
const zlib = require('zlib');

const W = 1200;
const H = 630;

/* ---------- PNG 인코딩 ---------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** PNG 청크 = 길이(4) + 타입(4) + 데이터 + CRC(4) */
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

/** pixel(x, y) -> [r, g, b] 로 RGB PNG 버퍼를 만듭니다 */
function encodePng(width, height, pixel) {
  // 각 행 앞에 필터 바이트 0(None)을 붙인 raw 스캔라인
  const raw = Buffer.alloc(height * (1 + width * 3));
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    for (let x = 0; x < width; x++) {
      const c = pixel(x, y);
      raw[o++] = c[0];
      raw[o++] = c[1];
      raw[o++] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type 2 = truecolor RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- 디자인 ---------- */

// tokens.css 의 --primary / --primary-dark 와 같은 값
const TOP = [59, 130, 246];   // #3B82F6
const BOT = [37, 99, 235];    // #2563EB
const INK = [255, 255, 255];

const CX = W / 2;
const CY = H / 2 - 18;
const RING_R = 132;
const RING_HALF = 9;     // 링 두께의 절반
const NEEDLE_ANGLE = -0.6; // rad
const BAR_Y = CY + 214;

/** 이 좌표가 흰색 잉크에 덮이는 비율(0~1). 경계는 서브샘플링으로 부드럽게 */
function inkCoverage(x, y) {
  const dx = x - CX;
  const dy = y - CY;

  // 1) 링
  const d = Math.sqrt(dx * dx + dy * dy);
  if (Math.abs(d - RING_R) <= RING_HALF) return 1;

  // 2) 나침반 바늘 — 회전한 마름모
  const cos = Math.cos(NEEDLE_ANGLE);
  const sin = Math.sin(NEEDLE_ANGLE);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  if (Math.abs(rx) / 30 + Math.abs(ry) / 88 <= 1) return 1;

  // 3) 아래쪽 강조 바 (양끝 둥글게)
  const barHalfW = 150;
  const barHalfH = 9;
  const bdx = Math.abs(x - CX) - (barHalfW - barHalfH);
  const bdy = y - BAR_Y;
  if (bdx <= 0) {
    if (Math.abs(bdy) <= barHalfH) return 1;
  } else if (Math.sqrt(bdx * bdx + bdy * bdy) <= barHalfH) {
    return 1;
  }

  return 0;
}

function background(y) {
  const t = y / (H - 1);
  return [
    Math.round(TOP[0] + (BOT[0] - TOP[0]) * t),
    Math.round(TOP[1] + (BOT[1] - TOP[1]) * t),
    Math.round(TOP[2] + (BOT[2] - TOP[2]) * t),
  ];
}

/** 3x3 서브샘플링으로 도형 가장자리 계단 현상을 줄입니다 */
function pixel(x, y) {
  let cover = 0;
  for (let sy = 0; sy < 3; sy++) {
    for (let sx = 0; sx < 3; sx++) {
      cover += inkCoverage(x + (sx + 0.5) / 3, y + (sy + 0.5) / 3);
    }
  }
  cover /= 9;
  const bg = background(y);
  if (cover === 0) return bg;
  return [
    Math.round(bg[0] + (INK[0] - bg[0]) * cover),
    Math.round(bg[1] + (INK[1] - bg[1]) * cover),
    Math.round(bg[2] + (INK[2] - bg[2]) * cover),
  ];
}

/* ---------- 공개 API ---------- */

/**
 * PNG 파일의 IHDR 에서 실제 픽셀 크기를 읽습니다.
 * 레이아웃: 시그니처 8B + 길이 4B + "IHDR" 4B + width 4B(offset 16) + height 4B(offset 20)
 * @returns {{width:number,height:number}|null} PNG 가 아니면 null
 */
function readPngSize(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const head = Buffer.alloc(24);
    if (fs.readSync(fd, head, 0, 24, 0) < 24) return null;
    if (head.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
    if (head.slice(12, 16).toString('ascii') !== 'IHDR') return null;
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  } catch (e) {
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

/**
 * outPath 에 OG 이미지가 없으면 만듭니다.
 * 이미 있으면 손대지 않습니다 — 직접 디자인한 이미지를 덮어쓰지 않기 위해서.
 *
 * 크기를 함께 돌려주는 이유: og:image:width/height 메타에 이 값이 그대로 들어갑니다.
 * 사용자가 다른 비율의 이미지를 넣어 뒀는데 생성기 기본값(1200x630)을 적어 보내면
 * 공유 카드가 잘리거나 검증에서 걸립니다.
 *
 * @returns {{created:boolean, width:number, height:number}}
 */
function ensureOgImage(outPath) {
  if (fs.existsSync(outPath)) {
    const size = readPngSize(outPath);
    // PNG 로 읽히지 않으면(다른 포맷을 넣은 경우) 크기를 단정하지 않고 0 을 돌려줍니다.
    // 호출부는 0 이면 width/height 메타를 생략합니다 — 틀린 값을 적는 것보다 낫습니다.
    return { created: false, width: size ? size.width : 0, height: size ? size.height : 0 };
  }
  fs.writeFileSync(outPath, encodePng(W, H, pixel));
  return { created: true, width: W, height: H };
}

module.exports = { ensureOgImage, OG_WIDTH: W, OG_HEIGHT: H };
