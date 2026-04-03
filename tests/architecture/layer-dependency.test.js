/**
 * 아키텍처 레이어 의존성 테스트
 *
 * 레이어 구조:
 *   Utils (state) ← 공유 레이어 (Core/UI 모두 import 가능)
 *   Core (safe-parser, bigint-math, korean-converter) ← 순수 로직
 *   UI (display-manager, input-handler, mode-manager, background-manager) ← DOM 접근
 *
 * 의존성 방향: UI → Core → Utils (단방향만 허용)
 */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SRC_DIR = path.resolve(__dirname, '../../src');

/**
 * 파일에서 import/require 경로를 추출한다.
 */
function findImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = [];

  // ES module import
  const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  // CommonJS require
  const requireRegex = /require\s*\(\s*['"](.+?)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

/**
 * 파일 내용에서 금지된 전역 객체 사용을 검사한다.
 */
function findDOMUsage(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const forbidden = ['document\\.', 'window\\.', 'alert\\(', 'confirm\\(', 'prompt\\('];
  const found = [];

  forbidden.forEach(pattern => {
    const regex = new RegExp(pattern, 'g');
    if (regex.test(content)) {
      found.push(pattern.replace('\\', ''));
    }
  });

  return found;
}

/**
 * 파일 내용에서 eval/Function 사용을 검사한다.
 */
function findEvalUsage(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const found = [];

  // 주석이 아닌 eval() 사용 검사
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    // 주석 라인 스킵
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      return;
    }
    if (/\beval\s*\(/.test(line)) {
      found.push({ type: 'eval', line: index + 1 });
    }
    if (/\bnew\s+Function\s*\(/.test(line)) {
      found.push({ type: 'new Function', line: index + 1 });
    }
  });

  return found;
}

describe('레이어 의존성 규칙', () => {
  test('Core 모듈은 UI 모듈을 import할 수 없다', () => {
    const coreFiles = glob.sync(`${SRC_DIR}/core/**/*.js`);
    expect(coreFiles.length).toBeGreaterThan(0);

    coreFiles.forEach(file => {
      const imports = findImports(file);
      const uiImports = imports.filter(i => i.includes('/ui/') || i.includes('../ui/'));
      const relFile = path.relative(SRC_DIR, file);
      expect(uiImports).toEqual(
        expect.objectContaining([]),
      );
      if (uiImports.length > 0) {
        throw new Error(
          `[${relFile}] Core → UI import 금지 위반: ${uiImports.join(', ')}`
        );
      }
    });
  });

  test('Utils는 Core/UI 모듈을 import할 수 없다 (순환 방지)', () => {
    const utilFiles = glob.sync(`${SRC_DIR}/utils/**/*.js`);
    expect(utilFiles.length).toBeGreaterThan(0);

    utilFiles.forEach(file => {
      const imports = findImports(file);
      const coreImports = imports.filter(i => i.includes('/core/') || i.includes('../core/'));
      const uiImports = imports.filter(i => i.includes('/ui/') || i.includes('../ui/'));
      const relFile = path.relative(SRC_DIR, file);

      if (coreImports.length > 0) {
        throw new Error(
          `[${relFile}] Utils → Core import 금지 위반: ${coreImports.join(', ')}`
        );
      }
      if (uiImports.length > 0) {
        throw new Error(
          `[${relFile}] Utils → UI import 금지 위반: ${uiImports.join(', ')}`
        );
      }
    });
  });

  test('Core 모듈은 DOM API를 직접 사용할 수 없다', () => {
    const coreFiles = glob.sync(`${SRC_DIR}/core/**/*.js`);

    coreFiles.forEach(file => {
      const domUsage = findDOMUsage(file);
      const relFile = path.relative(SRC_DIR, file);

      if (domUsage.length > 0) {
        throw new Error(
          `[${relFile}] Core에서 DOM 접근 금지 위반: ${domUsage.join(', ')}`
        );
      }
    });
  });
});

describe('보안 규칙', () => {
  test('전체 소스에서 eval() / new Function() 사용 금지', () => {
    const allFiles = glob.sync(`${SRC_DIR}/**/*.js`);

    allFiles.forEach(file => {
      const evalUsage = findEvalUsage(file);
      const relFile = path.relative(SRC_DIR, file);

      if (evalUsage.length > 0) {
        const details = evalUsage.map(e => `${e.type} (line ${e.line})`).join(', ');
        throw new Error(
          `[${relFile}] eval/Function 사용 금지 위반: ${details}`
        );
      }
    });
  });
});

describe('모듈 구조 검증', () => {
  test('필수 Core 모듈이 존재해야 한다', () => {
    const requiredCoreModules = [
      'core/safe-parser.js',
      'core/bigint-math.js',
      'core/korean-converter.js',
    ];

    requiredCoreModules.forEach(mod => {
      const filePath = path.join(SRC_DIR, mod);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('필수 UI 모듈이 존재해야 한다', () => {
    const requiredUIModules = [
      'ui/display-manager.js',
      'ui/input-handler.js',
      'ui/mode-manager.js',
      'ui/background-manager.js',
    ];

    requiredUIModules.forEach(mod => {
      const filePath = path.join(SRC_DIR, mod);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('Utils 모듈이 존재해야 한다', () => {
    const filePath = path.join(SRC_DIR, 'utils/state.js');
    expect(fs.existsSync(filePath)).toBe(true);
  });
});
