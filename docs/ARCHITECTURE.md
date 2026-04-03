# 아키텍처 문서: 한글 큰숫자(무극) 계산기

## 1. 시스템 개요

```
┌─────────────────────────────────────────────────┐
│                   index.html                     │
│  ┌───────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ 한글모드   │  │ 표준모드   │  │ 공학용모드    │ │
│  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘ │
│        └──────────────┼────────────────┘         │
│                       ▼                          │
│              ┌────────────────┐                   │
│              │  Display Area  │                   │
│              │  ┌──────────┐  │                   │
│              │  │ 수식 표시 │  │                   │
│              │  │ 결과 표시 │  │                   │
│              │  │ 한글 표시 │  │                   │
│              │  └──────────┘  │                   │
│              └────────────────┘                   │
└─────────────────────┬───────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    ┌──────────┐ ┌─────────┐ ┌─────────────┐
    │ style.css│ │script.js │ │ localStorage│
    └──────────┘ └────┬────┘ └─────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
   ┌───────────┐ ┌─────────┐ ┌──────────┐
   │ Calculator│ │ BigInt   │ │ Korean   │
   │ Engine    │ │ Math     │ │ Converter│
   └───────────┘ └─────────┘ └──────────┘
```

---

## 2. 파일 구조

```
bigNumCal/
├── docs/
│   ├── PRD.md              # 제품 요구사항 문서
│   └── ARCHITECTURE.md     # 아키텍처 문서 (본 문서)
├── index.html              # 메인 HTML (UI 레이아웃)
├── style.css               # 스타일시트 (반응형 포함)
├── script.js               # 메인 로직 (모듈 통합)
└── README.md               # 프로젝트 설명
```

> 프레임워크 없이 단일 HTML/CSS/JS로 구성.
> 빌드 과정 불필요, 브라우저에서 직접 실행.

---

## 3. 핵심 모듈 설계

### 3.1 모듈 구성 (script.js 내부)

```
script.js
├── [1] State Management     ─ 계산기 상태 관리
├── [2] SafeParser           ─ 안전한 수식 파서 (eval 대체)
├── [3] BigIntMath           ─ BigInt 기반 큰숫자 연산
├── [4] KoreanConverter      ─ 숫자→한글 변환
├── [5] DisplayManager       ─ 화면 업데이트 및 포맷팅
├── [6] InputHandler         ─ 버튼/키보드 입력 처리
├── [7] ModeManager          ─ 모드 전환 관리
└── [8] BackgroundManager    ─ 배경화면 관리
```

---

### 3.2 모듈 상세

#### [1] State Management - 상태 관리
```javascript
const state = {
    currentInput: '0',      // 현재 입력 중인 값
    expression: '',          // 전체 수식
    currentMode: 'korean',   // 현재 모드: korean | standard | scientific
    lastResult: null,        // 마지막 계산 결과
    waitingForOperand: false // 연산자 입력 후 피연산자 대기 상태
};
```

#### [2] SafeParser - 안전한 수식 파서
```
목적: eval() 제거, 코드 인젝션 방지

처리 흐름:
  입력 문자열 → 토큰화(Tokenize) → 파싱(Parse) → 계산(Evaluate)

토큰 타입:
  - NUMBER: 정수, 소수
  - OPERATOR: +, -, ×, ÷, ^
  - FUNCTION: sin, cos, tan, log, ln, sqrt
  - CONSTANT: π, e
  - PAREN: (, )

파싱 알고리즘: Shunting-yard (연산자 우선순위 처리)
  우선순위:
    1. 괄호, 함수
    2. ^ (거듭제곱) - 우결합
    3. ×, ÷
    4. +, -
```

#### [3] BigIntMath - BigInt 기반 연산
```
목적: 10^72(무극)까지 정밀도 손실 없는 정수 연산

전략:
  ┌─────────────────────────────────────────────┐
  │ 입력값이 정수인가?                            │
  │   YES → BigInt로 변환하여 직접 연산            │
  │   NO  → 스케일링 방식으로 소수점 처리           │
  │         (소수를 정수로 변환 후 BigInt 연산,      │
  │          결과에서 소수점 위치 복원)              │
  └─────────────────────────────────────────────┘

BigInt 연산:
  - 덧셈: a + b  (BigInt native)
  - 뺄셈: a - b  (BigInt native)
  - 곱셈: a * b  (BigInt native)
  - 나눗셈: a / b (BigInt 정수 나눗셈 + 나머지로 소수 처리)

소수점 스케일링 예시:
  1.5 × 2.3
  → 15n × 23n = 345n (scale: 10^2)
  → 345 / 100 = 3.45
```

#### [4] KoreanConverter - 한글 변환
```
목적: BigInt 숫자를 한글 단위 문자열로 변환

단위 테이블 (BigInt):
  무극(10^72), 무량대수(10^68), 불가사의(10^64), 나유타(10^60),
  아승기(10^56), 항하사(10^52), 극(10^48), 재(10^44), 정(10^40),
  간(10^36), 구(10^32), 양(10^28), 자(10^24), 해(10^20),
  경(10^16), 조(10^12), 억(10^8), 만(10^4), 일(10^0)

변환 알고리즘:
  1. 음수면 "마이너스 " 접두사 추가, 절댓값으로 변환
  2. 소수점 있으면 정수부/소수부 분리
  3. 가장 큰 단위부터 순회:
     a. num ÷ unit_value = 몫 (해당 단위의 계수)
     b. num % unit_value = 나머지 (다음 단위로 전달)
     c. 몫이 0이 아니면 → convertChunk(몫) + 단위이름 추가
  4. convertChunk: 4자리 이하 숫자를 "천백십일" 단위로 변환

예시: 1,230,000,000,000,000,000 (BigInt)
  → 경: 123 → "백이십삼"
  → 결과: "백이십삼경"
```

#### [5] DisplayManager - 화면 관리
```
역할:
  - 수식 영역 업데이트 (expression)
  - 결과 영역 업데이트 (숫자 + 천 단위 콤마)
  - 한글 변환 영역 업데이트 (korean 모드 시)
  - 복사 버튼 처리

포맷팅:
  - formatWithCommas(numStr): "1234567" → "1,234,567"
  - 소수점 이하는 콤마 없음
  - 음수 부호 유지
```

#### [6] InputHandler - 입력 처리
```
역할:
  - 숫자 버튼 클릭 → appendNumber()
  - 연산자 버튼 클릭 → appendOperator()
  - 함수/상수 버튼 클릭 → appendFunction() / appendConstant()
  - 키보드 이벤트 → handleKeyboard()
  - AC/CE/⌫ → clearAll() / clearEntry() / backspace()

입력 검증:
  - 소수점 중복 방지
  - 연산자 연속 입력 시 마지막 연산자로 교체
  - 선행 0 제거 (01 → 1)
```

#### [7] ModeManager - 모드 전환
```
3가지 모드 관리:
  korean    → 한글 큰숫자 버튼 레이아웃 (4열)
  standard  → 표준 계산기 버튼 레이아웃 (4열)
  scientific → 공학용 계산기 버튼 레이아웃 (5열)

전환 시 동작:
  1. 활성 모드 버튼 CSS 변경
  2. 해당 모드의 버튼 그리드 표시 (나머지 숨김)
  3. 디스플레이 업데이트 (한글 표시 on/off)
  4. 입력 상태 유지 (모드 전환 시 초기화하지 않음)
```

#### [8] BackgroundManager - 배경 관리
```
기능:
  - 이미지 업로드 → FileReader로 base64 변환
  - localStorage에 저장/불러오기
  - 배경 제거 시 기본 그라데이션 복원
```

---

## 4. 데이터 흐름

### 4.1 계산 흐름
```
사용자 입력
    │
    ▼
InputHandler (입력 검증)
    │
    ▼
State 업데이트 (currentInput, expression)
    │
    ▼
DisplayManager (화면 갱신)
    │
    ├── 숫자 입력 시 → KoreanConverter (실시간 한글 변환)
    │
    └── "=" 클릭 시 ─┐
                     ▼
              SafeParser (수식 파싱)
                     │
                     ▼
              BigIntMath (연산 수행)
                     │
                     ▼
              State 업데이트 (lastResult)
                     │
                     ▼
              DisplayManager (결과 표시)
                     │
                     └── KoreanConverter (결과 한글 변환)
```

### 4.2 모드 전환 흐름
```
모드 버튼 클릭
    │
    ▼
ModeManager.switchMode()
    │
    ├── CSS 클래스 토글
    ├── 버튼 레이아웃 전환
    └── DisplayManager.update()
         └── korean 모드면 한글 변환 표시
```

---

## 5. 연산자 우선순위 (SafeParser)

| 우선순위 | 연산자 | 결합방향 |
|---------|--------|---------|
| 1 (최고) | 함수 (sin, cos, tan, log, ln, √) | - |
| 2 | ^ (거듭제곱) | 우결합 (→) |
| 3 | ×, ÷ | 좌결합 (←) |
| 4 (최저) | +, - | 좌결합 (←) |

---

## 6. 한글 단위 데이터 구조

```javascript
// BigInt 기반 단위 테이블
const KOREAN_UNITS = [
    { name: '무극',     exp: 72 },
    { name: '무량대수', exp: 68 },
    { name: '불가사의', exp: 64 },
    { name: '나유타',   exp: 60 },
    { name: '아승기',   exp: 56 },
    { name: '항하사',   exp: 52 },
    { name: '극',       exp: 48 },
    { name: '재',       exp: 44 },
    { name: '정',       exp: 40 },
    { name: '간',       exp: 36 },
    { name: '구',       exp: 32 },
    { name: '양',       exp: 28 },
    { name: '자',       exp: 24 },
    { name: '해',       exp: 20 },
    { name: '경',       exp: 16 },
    { name: '조',       exp: 12 },
    { name: '억',       exp: 8  },
    { name: '만',       exp: 4  },
];

// value는 런타임에 10n ** BigInt(exp) 로 계산
```

---

## 7. 에러 처리 전략

| 상황 | 처리 방법 |
|------|----------|
| 0으로 나눗셈 | "Error" 표시 후 1.5초 뒤 초기화 |
| 무극 범위 초과 (10^76 이상) | "범위 초과" 메시지 표시 |
| 잘못된 수식 | "Error" 표시 후 1.5초 뒤 초기화 |
| 괄호 불일치 | 자동으로 닫는 괄호 추가 후 계산 |
| NaN / Infinity | "Error" 표시 |

---

## 8. 반응형 브레이크포인트

| 화면 | 너비 | 변경 사항 |
|------|------|----------|
| 데스크톱 | > 768px | 기본 레이아웃 |
| 태블릿 | ≤ 768px | 버튼/폰트 축소 |
| 모바일 | ≤ 480px | 모드 버튼 세로 배치, 추가 축소 |

---

## 9. 브라우저 호환성

| 기능 | 최소 지원 |
|------|----------|
| BigInt | Chrome 67+, Firefox 68+, Safari 14+, Edge 79+ |
| localStorage | 모든 현대 브라우저 |
| CSS Grid | Chrome 57+, Firefox 52+, Safari 10.1+ |
| backdrop-filter | Chrome 76+, Firefox 103+, Safari 9+ |
| Clipboard API | Chrome 66+, Firefox 63+, Safari 13.1+ |
