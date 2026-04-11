/**
 * script.js ↔ src/ 동기화 검증 테스트
 *
 * script.js는 브라우저 전용(DOM 의존)이므로 Node.js에서 require 불가.
 * 소스 코드 정적 분석으로 핵심 로직의 동기화 상태를 검증한다.
 */

const fs = require('fs');
const path = require('path');

const scriptSource = fs.readFileSync(
  path.resolve(__dirname, '../../script.js'), 'utf-8'
);

const readSrc = (file) => fs.readFileSync(
  path.resolve(__dirname, '../../src', file), 'utf-8'
);

describe('script.js ↔ src/ 핵심 함수 동기화', () => {
  test('script.js에 SafeParser 핵심 함수가 존재한다', () => {
    expect(scriptSource).toMatch(/function tokenize\(/);
    expect(scriptSource).toMatch(/function shuntingYard\(/);
    expect(scriptSource).toMatch(/function evaluateRPN\(/);
    expect(scriptSource).toMatch(/function safeEvaluate\(/);
    expect(scriptSource).toMatch(/function autoCloseParen\(/);
  });

  test('script.js에 KoreanConverter 핵심 함수가 존재한다', () => {
    expect(scriptSource).toMatch(/function convertChunk\(/);
    expect(scriptSource).toMatch(/function numberToKorean\(/);
    expect(scriptSource).toMatch(/function toKoreanSmall\(/);
  });

  test('script.js에 InputHandler 핵심 함수가 존재한다', () => {
    expect(scriptSource).toMatch(/function appendNumber\(/);
    expect(scriptSource).toMatch(/function appendOperator\(/);
    expect(scriptSource).toMatch(/function calculate\(/);
    expect(scriptSource).toMatch(/function clearAll\(/);
  });

  test('script.js에 한글 단위 테이블이 완전하다 (18개 단위)', () => {
    const units = ['무극', '무량대수', '불가사의', '나유타', '아승기', '항하사',
      '극', '재', '정', '간', '구', '양', '자', '해', '경', '조', '억', '만'];
    for (const unit of units) {
      expect(scriptSource).toContain(unit);
    }
  });

  test('src/core/korean-converter.js에 한글 단위 테이블이 완전하다 (18개 단위)', () => {
    const koreanSource = readSrc('core/korean-converter.js');
    const units = ['무극', '무량대수', '불가사의', '나유타', '아승기', '항하사',
      '극', '재', '정', '간', '구', '양', '자', '해', '경', '조', '억', '만'];
    for (const unit of units) {
      expect(koreanSource).toContain(unit);
    }
  });
});

describe('script.js BigInt 처리 동기화', () => {
  test('script.js의 evaluateRPN이 BigInt를 사용한다', () => {
    expect(scriptSource).toMatch(/BigInt\(/);
    expect(scriptSource).toMatch(/bothBigInt/);
  });

  test('src/core/safe-parser.js의 evaluateRPN이 BigInt를 사용한다', () => {
    const parserSource = readSrc('core/safe-parser.js');
    expect(parserSource).toMatch(/BigInt\(/);
    expect(parserSource).toMatch(/bothBigInt/);
  });

  test('양쪽 모두 parseFloat를 정수 파싱에 사용하지 않는다', () => {
    // evaluateRPN 함수 내에서 정수를 parseFloat로 파싱하면 안 됨
    // 소수점 포함 시에만 parseFloat 허용
    const parserSource = readSrc('core/safe-parser.js');

    // evaluateRPN 함수 추출
    const extractEvalFn = (src) => {
      const start = src.indexOf('function evaluateRPN');
      const lines = src.slice(start).split('\n');
      let depth = 0, end = 0;
      for (let i = 0; i < lines.length; i++) {
        for (const ch of lines[i]) {
          if (ch === '{') depth++;
          if (ch === '}') depth--;
        }
        if (depth === 0 && i > 0) { end = i; break; }
      }
      return lines.slice(0, end + 1).join('\n');
    };

    const scriptEval = extractEvalFn(scriptSource);
    const srcEval = extractEvalFn(parserSource);

    // parseFloat는 소수 분기에서만 사용해야 함
    // "parseFloat(t.value)" 또는 "parseFloat(token.value)"가 조건문 밖에서 단독 사용되면 안 됨
    const badPattern = /push\(parseFloat\(.*\.value\)\)/;
    expect(scriptEval).not.toMatch(badPattern);
    expect(srcEval).not.toMatch(badPattern);
  });
});

describe('script.js calculate() BigInt 결과 처리 동기화', () => {
  test('script.js의 calculate가 typeof bigint 분기를 포함한다', () => {
    expect(scriptSource).toContain("typeof result === 'bigint'");
  });

  test('src/ui/input-handler.js의 calculate가 typeof bigint 분기를 포함한다', () => {
    const inputSource = readSrc('ui/input-handler.js');
    expect(inputSource).toContain("typeof result === 'bigint'");
  });
});
