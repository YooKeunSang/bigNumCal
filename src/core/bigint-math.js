/**
 * BigIntMath - BigInt 기반 큰숫자 연산 엔진
 *
 * 레이어: Core (순수 로직)
 * 의존성 규칙:
 *   - DOM 접근 금지
 *   - UI 모듈 import 금지
 */

function toBigInt(val) {
  if (typeof val === 'bigint') return val;
  if (typeof val === 'string') return BigInt(val);
  if (typeof val === 'number' && Number.isInteger(val)) return BigInt(val);
  throw new Error(`BigInt로 변환할 수 없습니다: ${val}`);
}

function add(a, b) {
  return toBigInt(a) + toBigInt(b);
}

function subtract(a, b) {
  return toBigInt(a) - toBigInt(b);
}

function multiply(a, b) {
  return toBigInt(a) * toBigInt(b);
}

function divide(a, b) {
  const bVal = toBigInt(b);
  if (bVal === 0n) throw new Error('0으로 나눌 수 없습니다');
  return toBigInt(a) / bVal;
}

function power(base, exp) {
  const b = toBigInt(base);
  const e = toBigInt(exp);
  if (e < 0n) throw new Error('BigInt 거듭제곱에 음수 지수를 사용할 수 없습니다');
  return b ** e;
}

function abs(a) {
  const val = toBigInt(a);
  return val < 0n ? -val : val;
}

function mod(a, b) {
  const bVal = toBigInt(b);
  if (bVal === 0n) throw new Error('0으로 나눌 수 없습니다');
  return toBigInt(a) % bVal;
}

module.exports = { toBigInt, add, subtract, multiply, divide, power, abs, mod };
