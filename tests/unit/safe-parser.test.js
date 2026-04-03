/**
 * SafeParser 골든 테스트
 *
 * safe-parser.js 구현 시 반드시 통과해야 하는 기대값 목록.
 * 구현 전까지는 skip 상태로 유지.
 */

let SafeParser;
try {
  SafeParser = require('../../src/core/safe-parser.js');
} catch (e) {
  SafeParser = null;
}

const skipIfNotImplemented = SafeParser && SafeParser.evaluate ? describe : describe.skip;

skipIfNotImplemented('기본 사칙연산', () => {
  const cases = [
    ['1 + 2', 3],
    ['10 - 3', 7],
    ['4 × 5', 20],
    ['20 ÷ 4', 5],
    ['2 + 3 × 4', 14],      // 우선순위: 곱셈 먼저
    ['(2 + 3) × 4', 20],    // 괄호
    ['10 ÷ 3', null],       // 소수점 결과 (정확한 값은 구현에 따라 다름)
  ];

  test.each(cases.filter(c => c[1] !== null))('%s = %s', (expr, expected) => {
    expect(Number(SafeParser.evaluate(expr))).toBe(expected);
  });
});

skipIfNotImplemented('연산자 우선순위', () => {
  test('곱셈이 덧셈보다 우선', () => {
    expect(Number(SafeParser.evaluate('2 + 3 × 4'))).toBe(14);
  });

  test('괄호가 최우선', () => {
    expect(Number(SafeParser.evaluate('(2 + 3) × 4'))).toBe(20);
  });

  test('거듭제곱이 곱셈보다 우선', () => {
    expect(Number(SafeParser.evaluate('2 × 3 ^ 2'))).toBe(18);
  });

  test('거듭제곱은 우결합', () => {
    // 2^3^2 = 2^(3^2) = 2^9 = 512 (우결합)
    // 아님: (2^3)^2 = 8^2 = 64 (좌결합)
    expect(Number(SafeParser.evaluate('2 ^ 3 ^ 2'))).toBe(512);
  });
});

skipIfNotImplemented('괄호 자동 닫기', () => {
  test('닫히지 않은 괄호 자동 추가', () => {
    // (2 + 3 → (2 + 3) 으로 자동 보정
    expect(Number(SafeParser.evaluate('(2 + 3'))).toBe(5);
  });

  test('중첩 괄호 자동 닫기', () => {
    expect(Number(SafeParser.evaluate('((2 + 3) × 4'))).toBe(20);
  });
});

skipIfNotImplemented('에러 처리', () => {
  test('빈 수식은 에러', () => {
    expect(() => SafeParser.evaluate('')).toThrow();
  });

  test('유효하지 않은 문자는 에러', () => {
    expect(() => SafeParser.evaluate('rm -rf /')).toThrow();
  });

  test('코드 인젝션 시도 차단', () => {
    expect(() => SafeParser.evaluate('alert("xss")')).toThrow();
  });
});

describe('eval 미사용 확인 (항상 실행)', () => {
  test('SafeParser 모듈 소스에 eval이 없어야 한다', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/core/safe-parser.js'),
      'utf-8'
    );
    // 주석이 아닌 eval 호출 검사
    const lines = source.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
    const hasEval = lines.some(l => /\beval\s*\(/.test(l));
    expect(hasEval).toBe(false);
  });
});
