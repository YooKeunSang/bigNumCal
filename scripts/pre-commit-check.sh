#!/bin/bash
# ============================================================================
# Pre-commit 검증 스크립트
# 커밋 전 필수 검사 실행 → 실패 시 커밋 차단
# ============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "[pre-commit] 필수 검사 실행 중..."

# 1. ESLint
echo -n "  ESLint... "
if cd "$PROJECT_DIR" && npx eslint src/ --quiet 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo ""
    echo "[pre-commit] ESLint 위반이 있습니다. 커밋이 차단됩니다."
    echo "  → npm run lint 로 상세 내용을 확인하세요."
    echo "  → npm run feedback 로 피드백 루프를 실행하세요."
    exit 1
fi

# 2. 아키텍처 테스트
echo -n "  아키텍처 테스트... "
if cd "$PROJECT_DIR" && npx jest tests/architecture/ --silent 2>/dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL${NC}"
    echo ""
    echo "[pre-commit] 아키텍처 위반이 있습니다. 커밋이 차단됩니다."
    echo "  → npm run test:architecture 로 상세 내용을 확인하세요."
    echo "  → npm run feedback 로 피드백 루프를 실행하세요."
    exit 1
fi

# 3. 유닛 테스트 (있는 경우만)
UNIT_FILES=$(find "$PROJECT_DIR/tests/unit" -name "*.test.js" 2>/dev/null | head -1)
if [ -n "$UNIT_FILES" ]; then
    echo -n "  유닛 테스트... "
    if cd "$PROJECT_DIR" && npx jest tests/unit/ --silent 2>/dev/null; then
        echo -e "${GREEN}OK${NC}"
    else
        echo -e "${RED}FAIL${NC}"
        echo ""
        echo "[pre-commit] 유닛 테스트 실패. 커밋이 차단됩니다."
        echo "  → npm run test:unit 로 상세 내용을 확인하세요."
        exit 1
    fi
fi

echo -e "[pre-commit] ${GREEN}모든 검사 통과. 커밋 허용.${NC}"
