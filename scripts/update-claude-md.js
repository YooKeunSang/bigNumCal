#!/usr/bin/env node
/**
 * CLAUDE.md 피드백 이력 자동 업데이트
 *
 * 피드백 루프에서 실패가 감지되면 CLAUDE.md의 피드백 이력 테이블에
 * 자동으로 새 행을 추가한다.
 *
 * 사용법: node scripts/update-claude-md.js <log-file-path>
 */

const fs = require('fs');
const path = require('path');

const CLAUDE_MD = path.resolve(__dirname, '../CLAUDE.md');
const HISTORY_MARKER = '| (기록 예시)';

function run() {
  const logFilePath = process.argv[2];
  if (!logFilePath) {
    console.log('  [update-claude-md] 로그 파일 경로가 없습니다. 건너뜁니다.');
    return;
  }

  if (!fs.existsSync(logFilePath)) {
    console.log(`  [update-claude-md] 로그 파일이 없습니다: ${logFilePath}`);
    return;
  }

  let log;
  try {
    log = JSON.parse(fs.readFileSync(logFilePath, 'utf-8'));
  } catch (e) {
    console.log('  [update-claude-md] 로그 파일 파싱 실패');
    return;
  }

  if (log.status === 'pass' || !log.failures || log.failures.length === 0) {
    console.log('  [update-claude-md] 실패 없음 - 업데이트 불필요');
    return;
  }

  // CLAUDE.md 읽기
  let claudeMd = fs.readFileSync(CLAUDE_MD, 'utf-8');

  // 날짜 포맷
  const date = log.timestamp
    ? log.timestamp.split('_')[0]
    : new Date().toISOString().split('T')[0];

  // 실패별로 새 행 생성
  const newRows = [];
  const seen = new Set();

  for (const failure of log.failures) {
    const key = failure.category;
    if (seen.has(key)) continue;
    seen.add(key);

    const event = failure.detail || failure.category;
    const source = failure.source || '자동 감지';

    // 보강 조치 매핑
    let reinforcement = '코드 수정 필요';
    switch (failure.category) {
      case 'eval/Function 사용':
        reinforcement = 'SafeParser 모듈로 대체. ESLint no-eval-usage 룰이 차단 중';
        break;
      case 'Core에서 DOM 접근':
        reinforcement = 'DOM 코드를 src/ui/로 이동. ESLint no-dom-in-core 룰이 차단 중';
        break;
      case '레이어 의존성 위반':
        reinforcement = 'import 방향 수정 (UI→Core→Utils). ESLint no-ui-import-in-core 룰이 차단 중';
        break;
      case 'BigInt 미사용 (정밀도 손실)':
        reinforcement = 'BigInt()로 변환. ESLint no-number-in-bigint 룰이 차단 중';
        break;
      case '한글 변환 오류':
        reinforcement = 'korean-converter.js 로직 수정. 골든 테스트로 검증 중';
        break;
      default:
        reinforcement = `${source}에서 감지됨. 수정 후 npm run feedback 재실행 필요`;
    }

    newRows.push(`| ${date} | ${event} | ${source} | ${reinforcement} |`);
  }

  if (newRows.length === 0) {
    console.log('  [update-claude-md] 추가할 이력 없음');
    return;
  }

  // 기록 예시 행 바로 아래에 삽입
  if (claudeMd.includes(HISTORY_MARKER)) {
    const markerLine = claudeMd.split('\n').find(l => l.includes(HISTORY_MARKER));
    claudeMd = claudeMd.replace(
      markerLine,
      markerLine + '\n' + newRows.join('\n')
    );
  } else {
    // 마커가 없으면 피드백 루프 이력 섹션 끝에 추가
    claudeMd = claudeMd.trimEnd() + '\n' + newRows.join('\n') + '\n';
  }

  fs.writeFileSync(CLAUDE_MD, claudeMd, 'utf-8');
  console.log(`  [update-claude-md] CLAUDE.md에 ${newRows.length}건 이력 추가 완료`);
  newRows.forEach(row => console.log(`    ${row}`));
}

run();
