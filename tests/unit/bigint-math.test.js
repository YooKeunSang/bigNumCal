/**
 * BigInt 연산 엔진 골든 테스트
 *
 * bigint-math.js 구현 시 반드시 통과해야 하는 기대값 목록.
 * 구현 전까지는 skip 상태로 유지.
 */

// BigIntMath가 아직 구현되지 않았으면 skip
let BigIntMath;
try {
  BigIntMath = require('../../src/core/bigint-math.js');
} catch (e) {
  BigIntMath = null;
}

const skipIfNotImplemented = BigIntMath && BigIntMath.add ? describe : describe.skip;

skipIfNotImplemented('BigIntMath 사칙연산', () => {
  test('큰 정수 덧셈', () => {
    // 10^20 + 10^20 = 2 * 10^20
    const a = BigInt('100000000000000000000');
    const b = BigInt('100000000000000000000');
    expect(BigIntMath.add(a, b)).toBe(BigInt('200000000000000000000'));
  });

  test('큰 정수 뺄셈', () => {
    const a = BigInt('999999999999999999999');
    const b = BigInt('1');
    expect(BigIntMath.subtract(a, b)).toBe(BigInt('999999999999999999998'));
  });

  test('큰 정수 곱셈 (무극 범위)', () => {
    // 10^36 * 10^36 = 10^72 (무극)
    const a = 10n ** 36n;
    const b = 10n ** 36n;
    expect(BigIntMath.multiply(a, b)).toBe(10n ** 72n);
  });

  test('큰 정수 나눗셈', () => {
    const a = BigInt('1000000000000000000000000'); // 10^24
    const b = BigInt('1000000000000');              // 10^12
    expect(BigIntMath.divide(a, b)).toBe(BigInt('1000000000000')); // 10^12
  });

  test('0으로 나눗셈 시 에러', () => {
    expect(() => BigIntMath.divide(100n, 0n)).toThrow();
  });
});

skipIfNotImplemented('BigIntMath 정밀도', () => {
  test('Number.MAX_SAFE_INTEGER 초과 값도 정확히 처리', () => {
    // 9007199254740993 (2^53 + 1) - Number로는 정확히 표현 불가
    const a = BigInt('9007199254740993');
    const b = BigInt('1');
    expect(BigIntMath.add(a, b)).toBe(BigInt('9007199254740994'));
  });

  test('72자리 숫자(무극 범위) 연산 정확성', () => {
    const mugeuk = 10n ** 72n;
    const one = 1n;
    expect(BigIntMath.subtract(mugeuk, one).toString()).toBe(
      '999999999999999999999999999999999999999999999999999999999999999999999999'
    );
  });
});

describe('BigInt 정밀도 vs Number 비교 (항상 실행)', () => {
  test('Number는 큰 숫자에서 정밀도를 잃는다 (이 테스트가 존재하는 이유)', () => {
    // 이 테스트는 왜 BigInt가 필수인지 증명한다
    // 9007199254740993 = 2^53 + 1, Number로는 표현 불가
    const numResult = Number('9007199254740993');
    expect(numResult).toBe(9007199254740992);  // Number는 정밀도 손실 (1 차이)

    const bigResult = BigInt('9007199254740993');
    expect(bigResult).toBe(9007199254740993n); // BigInt는 정확
  });
});
