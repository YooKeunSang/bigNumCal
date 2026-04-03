/**
 * bigNumCal ESLint 커스텀 룰 플러그인
 *
 * 규칙 목록:
 *   no-eval-usage      - eval()/Function() 사용 금지 (보안)
 *   no-dom-in-core     - Core 레이어에서 DOM 접근 금지 (레이어 분리)
 *   no-ui-import-in-core - Core에서 UI import 금지 (의존성 방향)
 */
module.exports = {
  rules: {
    'no-eval-usage': require('./no-eval-usage'),
    'no-dom-in-core': require('./no-dom-in-core'),
    'no-ui-import-in-core': require('./no-ui-import-in-core'),
  },
};
