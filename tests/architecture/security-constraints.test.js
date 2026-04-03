/**
 * 보안 제약 테스트
 *
 * 피드백 루프에서 학습된 보안 규칙들을 구조적으로 검증한다.
 * 새로운 보안 위반 패턴이 발견될 때마다 여기에 테스트를 추가한다.
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SRC_DIR = path.resolve(__dirname, '../../src');

/**
 * 주석이 아닌 코드 라인만 추출한다.
 */
function getCodeLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let inBlockComment = false;

  return lines.filter((line, index) => {
    const trimmed = line.trim();

    // 블록 주석 시작
    if (trimmed.includes('/*') && !trimmed.includes('*/')) {
      inBlockComment = true;
      return false;
    }
    // 블록 주석 끝
    if (inBlockComment && trimmed.includes('*/')) {
      inBlockComment = false;
      return false;
    }
    if (inBlockComment) return false;

    // 한 줄 블록 주석
    if (trimmed.startsWith('/*') && trimmed.includes('*/')) return false;

    // 한 줄 주석
    if (trimmed.startsWith('//')) return false;

    return trimmed.length > 0;
  });
}

describe('보안 제약', () => {
  const allFiles = glob.sync(`${SRC_DIR}/**/*.js`);

  test('eval() 사용 금지 - 코드 인젝션 방지', () => {
    allFiles.forEach(file => {
      const codeLines = getCodeLines(file);
      const evalLines = codeLines.filter(line => /\beval\s*\(/.test(line));
      const relFile = path.relative(SRC_DIR, file);

      if (evalLines.length > 0) {
        throw new Error(
          `[${relFile}] eval() 사용 금지 위반.\n` +
          `  위반 코드: ${evalLines[0].trim()}\n` +
          `  해결: SafeParser 모듈(src/core/safe-parser.js)을 사용하세요.`
        );
      }
    });
  });

  test('new Function() 사용 금지 - 코드 인젝션 방지', () => {
    allFiles.forEach(file => {
      const codeLines = getCodeLines(file);
      const funcLines = codeLines.filter(line => /\bnew\s+Function\s*\(/.test(line));
      const relFile = path.relative(SRC_DIR, file);

      if (funcLines.length > 0) {
        throw new Error(
          `[${relFile}] new Function() 사용 금지 위반.\n` +
          `  위반 코드: ${funcLines[0].trim()}\n` +
          `  해결: SafeParser 모듈을 사용하세요.`
        );
      }
    });
  });

  test('setTimeout/setInterval에 문자열 인자 금지', () => {
    allFiles.forEach(file => {
      const codeLines = getCodeLines(file);
      const violations = codeLines.filter(line =>
        /\bset(Timeout|Interval)\s*\(\s*['"`]/.test(line)
      );
      const relFile = path.relative(SRC_DIR, file);

      if (violations.length > 0) {
        throw new Error(
          `[${relFile}] setTimeout/setInterval에 문자열 인자 금지 (암묵적 eval).\n` +
          `  위반 코드: ${violations[0].trim()}\n` +
          `  해결: 함수 참조를 전달하세요. 예: setTimeout(() => { ... }, 1000)`
        );
      }
    });
  });

  test('innerHTML 사용 금지 - XSS 방지', () => {
    allFiles.forEach(file => {
      const codeLines = getCodeLines(file);
      const violations = codeLines.filter(line => /\.innerHTML\s*=/.test(line));
      const relFile = path.relative(SRC_DIR, file);

      if (violations.length > 0) {
        throw new Error(
          `[${relFile}] innerHTML 직접 할당 금지 (XSS 위험).\n` +
          `  위반 코드: ${violations[0].trim()}\n` +
          `  해결: textContent 또는 DOM API(createElement 등)를 사용하세요.`
        );
      }
    });
  });
});

describe('BigInt 사용 규칙', () => {
  test('Core 연산 모듈에서 parseFloat로 큰 숫자를 처리하지 않는다', () => {
    const mathFile = path.join(SRC_DIR, 'core/bigint-math.js');
    if (!fs.existsSync(mathFile)) return;

    const codeLines = getCodeLines(mathFile);
    const violations = codeLines.filter(line =>
      /\bparseFloat\s*\(/.test(line) || /\bNumber\s*\(/.test(line)
    );

    if (violations.length > 0) {
      throw new Error(
        `[core/bigint-math.js] BigInt 연산 모듈에서 parseFloat/Number 사용 금지.\n` +
        `  위반 코드: ${violations[0].trim()}\n` +
        `  해결: BigInt()로 변환하세요. 정밀도 손실이 발생합니다.`
      );
    }
  });
});
