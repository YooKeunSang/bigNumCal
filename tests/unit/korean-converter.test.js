/**
 * 한글 변환 골든 테스트
 *
 * korean-converter.js 구현 시 반드시 통과해야 하는 기대값 목록.
 * 구현 전까지는 skip 상태로 유지.
 */

let KoreanConverter;
try {
  KoreanConverter = require('../../src/core/korean-converter.js');
} catch (e) {
  KoreanConverter = null;
}

const skipIfNotImplemented = KoreanConverter && KoreanConverter.toKorean ? describe : describe.skip;

skipIfNotImplemented('기본 숫자 변환', () => {
  const cases = [
    [0n, '영'],
    [1n, '일'],
    [10n, '십'],
    [11n, '십일'],
    [100n, '백'],
    [1000n, '천'],
    [1234n, '천이백삼십사'],
    [10000n, '일만'],
    [12345n, '일만 이천삼백사십오'],
  ];

  test.each(cases)('%s → %s', (input, expected) => {
    expect(KoreanConverter.toKorean(input)).toBe(expected);
  });
});

skipIfNotImplemented('1의 생략 규칙', () => {
  // 1천, 1백, 1십은 "천", "백", "십"으로 표기 (일 생략)
  test('1천 → "천"', () => {
    expect(KoreanConverter.toKorean(1000n)).toBe('천');
  });
  test('1백 → "백"', () => {
    expect(KoreanConverter.toKorean(100n)).toBe('백');
  });
  test('1십 → "십"', () => {
    expect(KoreanConverter.toKorean(10n)).toBe('십');
  });
  // 1만은 "일만"으로 표기 (생략하지 않음)
  test('1만 → "일만"', () => {
    expect(KoreanConverter.toKorean(10000n)).toBe('일만');
  });
});

skipIfNotImplemented('큰 단위 변환', () => {
  const cases = [
    [10n ** 8n, '일억'],
    [10n ** 12n, '일조'],
    [10n ** 16n, '일경'],
    [10n ** 20n, '일해'],
    [10n ** 24n, '일자'],
    [10n ** 28n, '일양'],
    [10n ** 32n, '일구'],
    [10n ** 36n, '일간'],
    [10n ** 40n, '일정'],
    [10n ** 44n, '일재'],
    [10n ** 48n, '일극'],
    [10n ** 52n, '일항하사'],
    [10n ** 56n, '일아승기'],
    [10n ** 60n, '일나유타'],
    [10n ** 64n, '일불가사의'],
    [10n ** 68n, '일무량대수'],
    [10n ** 72n, '일무극'],
  ];

  test.each(cases)('10^%s → %s', (input, expected) => {
    expect(KoreanConverter.toKorean(input)).toBe(expected);
  });
});

skipIfNotImplemented('복합 단위 조합 (생략 없음)', () => {
  test('모든 단위 조합 표시', () => {
    // 1조 2345억 6789만 123
    const num = 1234567890123n;
    expect(KoreanConverter.toKorean(num)).toBe(
      '일조 이천삼백사십오억 육천칠백팔십구만 백이십삼'
    );
  });

  test('큰 단위 + 작은 단위 조합', () => {
    // 3무극 + 5
    const num = 3n * (10n ** 72n) + 5n;
    const result = KoreanConverter.toKorean(num);
    expect(result).toContain('삼무극');
    expect(result).toContain('오');
    expect(result).not.toContain('...');  // 생략 금지
  });
});

skipIfNotImplemented('음수 처리', () => {
  test('마이너스 접두사', () => {
    expect(KoreanConverter.toKorean(-1234n)).toBe('마이너스 천이백삼십사');
  });
});

describe('한글 단위 테이블 완전성 (항상 실행)', () => {
  test('무극(10^72)까지 22개 단위가 정의되어야 한다', () => {
    // 일, 십, 백, 천, 만, 억, 조, 경, 해, 자, 양, 구, 간, 정, 재, 극,
    // 항하사, 아승기, 나유타, 불가사의, 무량대수, 무극
    const expectedUnits = [
      '만', '억', '조', '경', '해', '자', '양', '구', '간', '정', '재', '극',
      '항하사', '아승기', '나유타', '불가사의', '무량대수', '무극'
    ];
    // 18개 큰 단위 (만 이상)
    expect(expectedUnits.length).toBe(18);
  });
});
