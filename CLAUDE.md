# 한글 큰숫자(무극) 계산기 - 프로젝트 컨텍스트

## 프로젝트 개요
한글 숫자 단위(일~무극, 10⁰~10⁷²)를 지원하는 웹 기반 계산기.
Vanilla HTML/CSS/JS, 외부 의존성 없음, 브라우저에서 직접 실행.

## 필수 규칙 (위반 시 CI 실패)

### 보안
- **eval() 사용 절대 금지**. `new Function()` 도 금지. SafeParser 모듈을 통해 수식을 파싱해야 한다.
- 사용자 입력은 반드시 검증한다 (숫자, 연산자, 함수명만 허용).

### 레이어 아키텍처
```
의존성 방향: UI → Core → Utils (단방향만 허용)

src/core/     순수 로직 (DOM 접근 금지, UI import 금지)
src/ui/       DOM 조작 (Core import 가능)
src/utils/    공유 유틸 (Core/UI import 금지 - 순환 방지)
```

- Core 모듈(`safe-parser`, `bigint-math`, `korean-converter`)에서 `document`, `window`, `alert` 등 DOM API 직접 사용 금지.
- Core에서 UI 모듈 import 금지. 역방향 의존성은 구조적으로 차단된다.
- Utils에서 Core/UI import 금지 (순환 의존성 방지).

### 큰숫자 처리
- **BigInt 필수**: 10⁴ 이상의 정수 연산은 반드시 BigInt를 사용한다. `Number`/`parseFloat`로 큰 숫자를 처리하면 정밀도가 손실된다.
- 소수점 연산은 스케일링 방식(소수→정수 변환 후 BigInt 연산, 결과에서 소수점 복원)을 사용한다.
- `Number.MAX_SAFE_INTEGER`(2⁵³-1)를 초과하는 값은 반드시 BigInt로 처리해야 한다.

### 한글 변환
- 모든 단위를 조합하여 정확하게 표시한다. `...`으로 생략 금지.
- 단위 테이블: 무극(10⁷²) → 무량대수(10⁶⁸) → ... → 만(10⁴) 순서로 큰 단위부터 처리.
- 4자리 이하 숫자는 천/백/십/일 단위로 변환. 1천, 1백, 1십은 "천", "백", "십"으로 표기 (일 생략).

### 수식 파서
- Shunting-yard 알고리즘 사용. 연산자 우선순위: 함수 > ^ > ×÷ > +-.
- `^`는 우결합, 나머지는 좌결합.
- 괄호 불일치 시 자동으로 닫는 괄호를 추가한다.

## 명령어
```bash
npm run lint              # ESLint (커스텀 보안/레이어 규칙)
npm run test:architecture # 아키텍처 의존성 테스트
npm run test:unit         # 유닛 테스트
npm run check             # lint + architecture 전체 검증
npm run feedback          # 피드백 루프 실행 (감지→분석→보강→검증)
```

## 파일 구조
```
src/core/safe-parser.js       수식 파서 (eval 대체)
src/core/bigint-math.js       BigInt 기반 연산 엔진
src/core/korean-converter.js  숫자→한글 변환
src/ui/display-manager.js     화면 관리
src/ui/input-handler.js       입력 처리
src/ui/mode-manager.js        모드 전환
src/ui/background-manager.js  배경화면 관리
src/utils/state.js            상태 관리
```

## 피드백 루프 이력
> 아래는 과거 실수에서 학습하여 추가된 규칙들이다.
> 새로운 실패가 발생하면 여기에 기록하고, 위 규칙에 반영한다.

| 날짜 | 사건 | 원인 | 보강 조치 |
|------|------|------|-----------|
| (기록 예시) | eval() 사용 | 컨텍스트에 금지 규칙 부재 | ESLint no-eval-usage 룰 + CLAUDE.md에 명시 |
