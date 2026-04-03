/**
 * KoreanConverter - 숫자→한글 변환
 *
 * 레이어: Core (순수 로직)
 * 의존성 규칙:
 *   - DOM 접근 금지
 *   - UI 모듈 import 금지
 */

const DIGIT_NAMES = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const PLACE_NAMES = ['', '십', '백', '천'];

const KOREAN_UNITS = [
  { name: '무극',     exp: 72 },
  { name: '무량대수', exp: 68 },
  { name: '불가사의', exp: 64 },
  { name: '나유타',   exp: 60 },
  { name: '아승기',   exp: 56 },
  { name: '항하사',   exp: 52 },
  { name: '극',       exp: 48 },
  { name: '재',       exp: 44 },
  { name: '정',       exp: 40 },
  { name: '간',       exp: 36 },
  { name: '구',       exp: 32 },
  { name: '양',       exp: 28 },
  { name: '자',       exp: 24 },
  { name: '해',       exp: 20 },
  { name: '경',       exp: 16 },
  { name: '조',       exp: 12 },
  { name: '억',       exp: 8  },
  { name: '만',       exp: 4  },
];

// 런타임에 BigInt 값을 계산하여 캐시
const UNIT_VALUES = KOREAN_UNITS.map(u => ({
  ...u,
  value: 10n ** BigInt(u.exp),
}));

/**
 * 4자리 이하 숫자를 천/백/십/일 단위로 변환
 * 1천→"천", 1백→"백", 1십→"십" (일 생략)
 */
function convertChunk(n) {
  if (n === 0n) return '';

  let result = '';
  const digits = [
    { place: '천', divisor: 1000n },
    { place: '백', divisor: 100n },
    { place: '십', divisor: 10n },
  ];

  let remainder = n;

  for (const { place, divisor } of digits) {
    const digit = remainder / divisor;
    remainder = remainder % divisor;

    if (digit > 0n) {
      if (digit === 1n) {
        result += place;
      } else {
        result += DIGIT_NAMES[digit < 10n ? +`${digit}` : 0] + place;
      }
    }
  }

  if (remainder > 0n) {
    result += DIGIT_NAMES[remainder < 10n ? +`${remainder}` : 0];
  }

  return result;
}

/**
 * BigInt 숫자를 한글 문자열로 변환
 * 모든 단위를 조합하여 정확하게 표시 (생략 없음)
 */
function toKorean(num) {
  if (typeof num === 'string') {
    if (num.includes('.')) {
      return convertDecimal(num);
    }
    num = BigInt(num);
  }

  if (typeof num === 'number') {
    num = BigInt(num);
  }

  // 음수 처리
  if (num < 0n) {
    return '마이너스 ' + toKorean(-num);
  }

  if (num === 0n) return '영';

  let remainder = num;
  const parts = [];

  // 큰 단위부터 순회
  for (const unit of UNIT_VALUES) {
    if (remainder >= unit.value) {
      const quotient = remainder / unit.value;
      remainder = remainder % unit.value;

      const chunkStr = convertChunk(quotient % 10000n);
      const upperQuotient = quotient / 10000n;

      if (upperQuotient > 0n) {
        // 만 이상의 계수는 재귀적으로 변환
        parts.push(toKoreanSmall(quotient) + unit.name);
      } else {
        parts.push((chunkStr || '일') + unit.name);
      }
    }
  }

  // 만 미만 나머지
  if (remainder > 0n) {
    parts.push(convertChunk(remainder));
  }

  return parts.join(' ');
}

/**
 * 만 미만의 숫자까지의 한글 변환 (큰 단위의 계수용)
 * 예: 1234 → "천이백삼십사"
 */
function toKoreanSmall(num) {
  if (num === 0n) return '';
  if (num < 10000n) return convertChunk(num);

  // 만 이상이면 재귀적으로 처리
  let remainder = num;
  const parts = [];

  // 큰 단위는 없음 (이 함수는 단위 계수용)
  // 억, 만 단위만 처리
  const subUnits = [
    { name: '억', value: 100000000n },
    { name: '만', value: 10000n },
  ];

  for (const unit of subUnits) {
    if (remainder >= unit.value) {
      const q = remainder / unit.value;
      remainder = remainder % unit.value;
      parts.push(convertChunk(q) + unit.name);
    }
  }

  if (remainder > 0n) {
    parts.push(convertChunk(remainder));
  }

  return parts.join(' ');
}

/**
 * 소수점 포함 문자열을 한글로 변환
 */
function convertDecimal(numStr) {
  const [intPart, decPart] = numStr.split('.');
  const intKorean = toKorean(BigInt(intPart || '0'));
  let decKorean = '';

  if (decPart) {
    const digits = [];
    for (let i = 0; i < decPart.length; i++) {
      const d = +decPart[i];
      digits.push(DIGIT_NAMES[d] || '영');
    }
    decKorean = digits.join(' ');
  }

  return decKorean ? intKorean + ' 점 ' + decKorean : intKorean;
}

module.exports = { toKorean, convertChunk, convertDecimal };
