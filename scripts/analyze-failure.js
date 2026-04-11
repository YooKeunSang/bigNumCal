#!/usr/bin/env node
/**
 * 피드백 루프 - 2단계 실패 분석기
 *
 * ESLint / 아키텍처 테스트 / 유닛 테스트 결과를 분석하여
 * 실패 원인을 분류하고 보강 방법을 제안한다.
 */

const fs = require('fs');
const path = require('path');

// CLI 인자 파싱
const args = {};
process.argv.slice(2).forEach(arg => {
  const [key, ...valueParts] = arg.split('=');
  args[key.replace('--', '')] = valueParts.join('=');
});

const lintPassed = args['lint-passed'] === 'true';
const archPassed = args['arch-passed'] === 'true';
const unitPassed = args['unit-passed'] === 'true';
const lintOutput = args['lint-output'] || '';
const archOutput = args['arch-output'] || '';
const unitOutput = args['unit-output'] || '';
const logFile = args['log-file'];
const timestamp = args['timestamp'];

// 실패 분류 카테고리
const CATEGORIES = {
  SECURITY: '보안 위반',
  LAYER_DEPENDENCY: '레이어 의존성 위반',
  DOM_IN_CORE: 'Core에서 DOM 접근',
  BIGINT_MISSING: 'BigInt 미사용 (정밀도 손실)',
  KOREAN_CONVERSION: '한글 변환 오류',
  EVAL_USAGE: 'eval/Function 사용',
  UNKNOWN: '미분류',
};

const failures = [];
const reinforcements = [];

// ── ESLint 실패 분석 ──
if (!lintPassed) {
  console.log('  [ESLint 분석]');

  if (lintOutput.includes('no-eval-usage') || lintOutput.includes('eval')) {
    failures.push({
      category: CATEGORIES.EVAL_USAGE,
      detail: 'eval() 또는 new Function() 사용이 감지됨',
      source: 'eslint',
    });
    reinforcements.push({
      type: 'context',
      action: 'CLAUDE.md "보안" 섹션에 eval 금지 규칙이 이미 존재하는지 확인',
    });
    reinforcements.push({
      type: 'constraint',
      action: 'SafeParser 모듈을 통한 수식 파싱으로 대체 필요',
    });
    console.log('    원인: eval()/Function() 사용 → 코드 인젝션 위험');
    console.log('    분류: ' + CATEGORIES.EVAL_USAGE);
  }

  if (lintOutput.includes('no-dom-in-core')) {
    failures.push({
      category: CATEGORIES.DOM_IN_CORE,
      detail: 'Core 레이어에서 DOM API 직접 접근 감지',
      source: 'eslint',
    });
    reinforcements.push({
      type: 'context',
      action: 'CLAUDE.md에 "Core는 순수 로직만" 규칙 강화',
    });
    reinforcements.push({
      type: 'constraint',
      action: 'DOM 조작 로직을 src/ui/로 이동',
    });
    console.log('    원인: Core 레이어에서 document/window 사용');
    console.log('    분류: ' + CATEGORIES.DOM_IN_CORE);
  }

  if (lintOutput.includes('no-ui-import-in-core')) {
    failures.push({
      category: CATEGORIES.LAYER_DEPENDENCY,
      detail: 'Core에서 UI 모듈 import 또는 Utils에서 Core/UI import',
      source: 'eslint',
    });
    reinforcements.push({
      type: 'context',
      action: 'CLAUDE.md "레이어 아키텍처" 섹션의 의존성 방향 재확인',
    });
    console.log('    원인: 레이어 의존성 역방향 import');
    console.log('    분류: ' + CATEGORIES.LAYER_DEPENDENCY);
  }

  // 기타 ESLint 에러
  if (failures.length === 0 && !lintPassed) {
    failures.push({
      category: CATEGORIES.UNKNOWN,
      detail: 'ESLint 실패 (커스텀 룰 외 일반 에러)',
      source: 'eslint',
    });
    console.log('    원인: 일반 ESLint 규칙 위반');
    console.log('    분류: ' + CATEGORIES.UNKNOWN);
  }
}

// ── 아키텍처 테스트 실패 분석 ──
if (!archPassed) {
  console.log('  [아키텍처 테스트 분석]');

  if (archOutput.includes('UI 모듈을 import')) {
    failures.push({
      category: CATEGORIES.LAYER_DEPENDENCY,
      detail: 'Core → UI import 감지',
      source: 'architecture-test',
    });
    console.log('    원인: Core 모듈이 UI 모듈을 import');
    console.log('    분류: ' + CATEGORIES.LAYER_DEPENDENCY);
  }

  if (archOutput.includes('DOM')) {
    failures.push({
      category: CATEGORIES.DOM_IN_CORE,
      detail: 'Core에서 DOM API 사용 감지',
      source: 'architecture-test',
    });
    console.log('    원인: Core에서 document/window 등 DOM 접근');
    console.log('    분류: ' + CATEGORIES.DOM_IN_CORE);
  }

  if (archOutput.includes('eval') || archOutput.includes('Function')) {
    failures.push({
      category: CATEGORIES.EVAL_USAGE,
      detail: '소스에서 eval/Function 사용 감지',
      source: 'architecture-test',
    });
    console.log('    원인: eval() 또는 new Function() 사용');
    console.log('    분류: ' + CATEGORIES.EVAL_USAGE);
  }

  if (archOutput.includes('순환') || archOutput.includes('Utils')) {
    failures.push({
      category: CATEGORIES.LAYER_DEPENDENCY,
      detail: 'Utils → Core/UI 순환 의존성 감지',
      source: 'architecture-test',
    });
    console.log('    원인: Utils에서 Core/UI import (순환 의존성)');
    console.log('    분류: ' + CATEGORIES.LAYER_DEPENDENCY);
  }
}

// ── 유닛 테스트 실패 분석 ──
if (!unitPassed && unitOutput) {
  console.log('  [유닛 테스트 분석]');

  if (unitOutput.includes('BigInt') || unitOutput.includes('precision') || unitOutput.includes('정밀도')) {
    failures.push({
      category: CATEGORIES.BIGINT_MISSING,
      detail: 'BigInt 미사용으로 인한 정밀도 손실',
      source: 'unit-test',
    });
    reinforcements.push({
      type: 'context',
      action: 'CLAUDE.md "큰숫자 처리" 섹션에 해당 케이스 추가',
    });
    reinforcements.push({
      type: 'constraint',
      action: 'BigInt 사용 강제 테스트 추가',
    });
    console.log('    원인: Number 타입으로 큰 숫자 처리 → 정밀도 손실');
    console.log('    분류: ' + CATEGORIES.BIGINT_MISSING);
  }

  if (unitOutput.includes('한글') || unitOutput.includes('korean') || unitOutput.includes('변환')) {
    failures.push({
      category: CATEGORIES.KOREAN_CONVERSION,
      detail: '한글 변환 결과가 기대값과 불일치',
      source: 'unit-test',
    });
    reinforcements.push({
      type: 'context',
      action: 'CLAUDE.md "한글 변환" 섹션에 실패 케이스 규칙 추가',
    });
    console.log('    원인: 한글 변환 로직 오류');
    console.log('    분류: ' + CATEGORIES.KOREAN_CONVERSION);
  }

  // 기타
  if (failures.filter(f => f.source === 'unit-test').length === 0) {
    failures.push({
      category: CATEGORIES.UNKNOWN,
      detail: '유닛 테스트 실패 (미분류)',
      source: 'unit-test',
    });
    console.log('    원인: 미분류 유닛 테스트 실패');
  }
}

// ── 피드백 로그 저장 ──
if (logFile) {
  const log = {
    timestamp,
    status: 'fail',
    checks: {
      eslint: lintPassed ? 'pass' : 'fail',
      architecture: archPassed ? 'pass' : 'fail',
      unit: unitPassed ? 'pass' : 'fail',
    },
    failures,
    reinforcements,
  };

  fs.writeFileSync(logFile, JSON.stringify(log, null, 2), 'utf-8');
  console.log('');
  console.log(`  피드백 로그 저장됨: ${path.basename(logFile)}`);
}
