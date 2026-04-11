# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 응답 언어
- **모든 출력(코드 주석, 커밋 메시지, 설명, 대화)은 한글로 작성한다.**

## 프로젝트 개요
한글 숫자 단위(일~무극, 10⁰~10⁷²)를 지원하는 웹 기반 계산기.
Vanilla HTML/CSS/JS, 외부 의존성 없음, 브라우저에서 직접 실행.

## 명령어
```bash
npm run lint              # ESLint (커스텀 보안/레이어 규칙)
npm run test:architecture # 아키텍처 의존성 테스트 (Jest)
npm run test:unit         # 유닛 테스트 (Jest)
npm run check             # lint + architecture 전체 검증
npm run feedback          # 피드백 루프 실행 (감지→분석→보강→검증)

# 단일 테스트 파일 실행
npx jest tests/unit/safe-parser.test.js

# 앱 실행: index.html을 브라우저에서 직접 열면 됨 (빌드 불필요)
```

## 아키텍처

### 이중 구조: script.js vs src/
**중요**: 이 프로젝트에는 두 개의 코드 베이스가 있다.
- `script.js` — 브라우저에서 직접 실행되는 **인라인 통합 파일**. 모든 모듈 로직이 단일 파일에 포함됨.
- `src/` — ESLint·Jest가 검증하는 **모듈화된 소스**. CI에서 이 파일들을 대상으로 lint/test를 실행.

코드 수정 시 **양쪽을 동기화**해야 한다. `src/` 모듈을 수정하면 `script.js`에도 반영하고, 그 반대도 마찬가지.

### 레이어 의존성 (단방향만 허용)
```
UI → Core → Utils
src/ui/       → src/core/     → src/utils/
(DOM 조작)      (순수 로직)       (공유 유틸)
```
- **Core** (`safe-parser`, `bigint-math`, `korean-converter`): DOM API 접근 금지, UI import 금지, 부수효과 금지 (순수 함수만)
- **Utils** (`state`): Core/UI import 금지 (순환 방지)
- ESLint 커스텀 룰(`eslint-rules/`)과 Jest 아키텍처 테스트(`tests/architecture/`)가 이를 자동 검증

### 데이터 흐름
```
사용자 입력 → InputHandler → State 업데이트 → DisplayManager → 화면 갱신
                                                 ↓
"=" 클릭 → SafeParser(수식 파싱) → BigIntMath(연산) → KoreanConverter(한글 변환)
```

## 필수 규칙 (위반 시 CI 실패)

### 보안
- **eval(), new Function(), 문자열 인자 setTimeout 절대 금지**. SafeParser 모듈로 수식 파싱.
- 사용자 입력은 반드시 검증 (숫자, 연산자, 함수명만 허용).
- `innerHTML`에 사용자 입력 삽입 금지 → `textContent` 사용.

### BigInt 처리
- 10⁴ 이상의 정수 연산은 반드시 BigInt 사용. `Number`/`parseFloat`로 큰 숫자 처리 금지 (정밀도 손실).
- 소수점 연산: 스케일링 방식 (소수→정수 변환 후 BigInt 연산, 결과에서 소수점 복원).

### 한글 변환
- 모든 단위를 조합하여 정확 표시. `...` 생략 금지.
- 단위: 무극(10⁷²) → 무량대수(10⁶⁸) → ... → 만(10⁴) 순서로 큰 단위부터 처리.
- 4자리 이하: 천/백/십/일 단위. 1천·1백·1십은 "천"·"백"·"십"으로 표기 (일 생략).

### 수식 파서
- Shunting-yard 알고리즘. 우선순위: 함수 > ^ > ×÷ > +-.
- `^`는 우결합, 나머지는 좌결합.
- 괄호 불일치 시 자동으로 닫는 괄호 추가.

## 코딩 컨벤션

- 변수/함수: camelCase, 상수: UPPER_SNAKE_CASE, 파일: kebab-case, CSS 클래스: kebab-case
- named export만 사용 (default export 금지)
- 매개변수 3개 초과 시 객체로 묶기

## 피드백 루프 이력
> 과거 실수에서 학습하여 추가된 규칙. 새로운 실패 발생 시 여기에 기록하고 위 규칙에 반영.

| 날짜 | 사건 | 원인 | 보강 조치 |
|------|------|------|-----------|
| (기록 예시) | eval() 사용 | 컨텍스트에 금지 규칙 부재 | ESLint no-eval-usage 룰 + CLAUDE.md에 명시 |
