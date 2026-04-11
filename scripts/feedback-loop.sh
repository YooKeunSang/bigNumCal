#!/bin/bash
# ============================================================================
# 피드백 루프 실행기
# 4단계 사이클: 감지(Detect) → 분석(Analyze) → 보강(Reinforce) → 검증(Verify)
#
# 사용법: npm run feedback
# ============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$PROJECT_DIR/feedback-log"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
LOG_FILE="$LOG_DIR/$TIMESTAMP.json"
CLAUDE_MD="$PROJECT_DIR/CLAUDE.md"

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        피드백 루프 시스템 v1.0               ║${NC}"
echo -e "${CYAN}║  감지 → 분석 → 보강 → 검증                  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# 결과 수집용 변수
LINT_PASSED=true
ARCH_PASSED=true
UNIT_PASSED=true
LINT_OUTPUT=""
ARCH_OUTPUT=""
UNIT_OUTPUT=""
FAILURES=()

# ============================================================================
# [1단계] 감지 (Detect)
# ============================================================================
echo -e "${BLUE}[1단계] 감지 - 무엇이 잘못됐는가?${NC}"
echo "────────────────────────────────────────────"

# 1-1. ESLint 실행
echo -n "  ESLint 검사 중... "
LINT_OUTPUT=$(cd "$PROJECT_DIR" && npx eslint src/ 2>&1) || {
    LINT_PASSED=false
    echo -e "${RED}실패${NC}"
    FAILURES+=("eslint")
}
if [ "$LINT_PASSED" = true ]; then
    echo -e "${GREEN}통과${NC}"
fi

# 1-2. 아키텍처 테스트 실행
echo -n "  아키텍처 테스트 중... "
ARCH_OUTPUT=$(cd "$PROJECT_DIR" && npx jest tests/architecture/ --json 2>&1) || {
    ARCH_PASSED=false
    echo -e "${RED}실패${NC}"
    FAILURES+=("architecture")
}
if [ "$ARCH_PASSED" = true ]; then
    echo -e "${GREEN}통과${NC}"
fi

# 1-3. 유닛 테스트 실행 (존재하는 경우)
UNIT_TEST_FILES=$(find "$PROJECT_DIR/tests/unit" -name "*.test.js" 2>/dev/null | head -1)
if [ -n "$UNIT_TEST_FILES" ]; then
    echo -n "  유닛 테스트 중... "
    UNIT_OUTPUT=$(cd "$PROJECT_DIR" && npx jest tests/unit/ --json 2>&1) || {
        UNIT_PASSED=false
        echo -e "${RED}실패${NC}"
        FAILURES+=("unit")
    }
    if [ "$UNIT_PASSED" = true ]; then
        echo -e "${GREEN}통과${NC}"
    fi
else
    echo -e "  유닛 테스트: ${YELLOW}테스트 파일 없음 (건너뜀)${NC}"
fi

echo ""

# ============================================================================
# [2단계] 분석 (Analyze)
# ============================================================================
echo -e "${BLUE}[2단계] 분석 - 왜 잘못됐는가?${NC}"
echo "────────────────────────────────────────────"

if [ ${#FAILURES[@]} -eq 0 ]; then
    echo -e "  ${GREEN}모든 검사 통과! 분석할 실패가 없습니다.${NC}"
else
    # Node.js 분석 스크립트 호출
    node "$PROJECT_DIR/scripts/analyze-failure.js" \
        --lint-passed="$LINT_PASSED" \
        --lint-output="$LINT_OUTPUT" \
        --arch-passed="$ARCH_PASSED" \
        --arch-output="$ARCH_OUTPUT" \
        --unit-passed="$UNIT_PASSED" \
        --unit-output="$UNIT_OUTPUT" \
        --log-file="$LOG_FILE" \
        --timestamp="$TIMESTAMP"
fi

echo ""

# ============================================================================
# [3단계] 보강 (Reinforce)
# ============================================================================
echo -e "${BLUE}[3단계] 보강 - 어떻게 막을 것인가?${NC}"
echo "────────────────────────────────────────────"

if [ ${#FAILURES[@]} -eq 0 ]; then
    echo -e "  ${GREEN}보강 불필요 - 모든 제약이 정상 작동 중${NC}"
else
    # 실패 유형별 보강 안내
    for failure in "${FAILURES[@]}"; do
        case "$failure" in
            eslint)
                echo -e "  ${YELLOW}[보강 필요] ESLint 위반 감지됨${NC}"
                echo "    → CLAUDE.md 규칙을 확인하고 위반 코드를 수정하세요"
                echo "    → 새로운 패턴의 위반이면 ESLint 커스텀 룰 추가를 검토하세요"
                echo ""
                echo -e "  ${YELLOW}위반 상세:${NC}"
                echo "$LINT_OUTPUT" | head -20 | sed 's/^/    /'
                ;;
            architecture)
                echo -e "  ${YELLOW}[보강 필요] 아키텍처 위반 감지됨${NC}"
                echo "    → 레이어 의존성 방향(UI → Core → Utils)을 확인하세요"
                echo "    → Core에서 DOM 접근이나 UI import가 없는지 확인하세요"
                echo ""
                echo -e "  ${YELLOW}위반 상세:${NC}"
                echo "$ARCH_OUTPUT" | grep -E "(FAIL|Error|●)" | head -10 | sed 's/^/    /'
                ;;
            unit)
                echo -e "  ${YELLOW}[보강 필요] 유닛 테스트 실패${NC}"
                echo "    → 실패한 테스트의 기대값과 실제값을 비교하세요"
                echo "    → BigInt 정밀도 / 한글 변환 정확성을 확인하세요"
                echo ""
                echo -e "  ${YELLOW}실패 상세:${NC}"
                echo "$UNIT_OUTPUT" | grep -E "(FAIL|Error|●|Expected|Received)" | head -10 | sed 's/^/    /'
                ;;
        esac
        echo ""
    done

    # CLAUDE.md 피드백 이력 자동 업데이트
    echo -e "  ${CYAN}[자동 기록] 피드백 로그 저장: $LOG_FILE${NC}"
    node "$PROJECT_DIR/scripts/update-claude-md.js" "$LOG_FILE"
fi

echo ""

# ============================================================================
# [4단계] 검증 (Verify)
# ============================================================================
echo -e "${BLUE}[4단계] 검증 - 실제로 막혔는가?${NC}"
echo "────────────────────────────────────────────"

if [ ${#FAILURES[@]} -eq 0 ]; then
    echo -e "  ${GREEN}✅ 모든 제약 활성 상태 - 피드백 루프 정상${NC}"
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  피드백 루프 결과: 모든 검사 통과             ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"

    # 성공 로그 기록
    cat > "$LOG_FILE" <<EOJSON
{
  "timestamp": "$TIMESTAMP",
  "status": "pass",
  "checks": {
    "eslint": "pass",
    "architecture": "pass",
    "unit": "$([ "$UNIT_PASSED" = true ] && echo 'pass' || echo 'skip')"
  },
  "failures": [],
  "reinforcements": []
}
EOJSON

else
    echo -e "  ${RED}❌ ${#FAILURES[@]}개 검사 실패 - 보강 후 재실행 필요${NC}"
    echo ""
    echo -e "  재검증 방법:"
    echo "    1. 위 보강 안내에 따라 코드 수정"
    echo "    2. npm run feedback 재실행"
    echo "    3. 모든 검사 통과 확인"
    echo "    4. CLAUDE.md 피드백 이력에 기록"
    echo ""
    echo -e "${RED}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  피드백 루프 결과: ${#FAILURES[@]}개 실패 - 보강 필요       ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"
    exit 1
fi
