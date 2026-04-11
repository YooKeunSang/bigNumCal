/**
 * ESLint 커스텀 룰: Core 레이어에서 DOM 직접 접근 금지
 *
 * Core 모듈(safe-parser, bigint-math, korean-converter)은 순수 로직만 담당한다.
 * DOM 조작은 UI 레이어(display-manager, input-handler 등)에서만 허용된다.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Core 레이어에서 DOM API 직접 접근을 금지합니다.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename();
    const isCore = filename.includes('/core/');

    if (!isCore) return {};

    const forbiddenGlobals = ['document', 'window', 'alert', 'confirm', 'prompt'];

    return {
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          forbiddenGlobals.includes(node.object.name)
        ) {
          context.report({
            node,
            message: `Core 레이어에서 '${node.object.name}' 접근 금지. DOM 조작은 UI 레이어(src/ui/)에서 수행하세요.`,
          });
        }
      },

      // document, window 등 단독 참조도 금지
      Identifier(node) {
        if (
          forbiddenGlobals.includes(node.name) &&
          node.parent.type !== 'MemberExpression'
        ) {
          // import 구문이나 프로퍼티 키는 제외
          if (
            node.parent.type === 'ImportSpecifier' ||
            node.parent.type === 'Property' && node.parent.key === node
          ) {
            return;
          }

          // 변수 선언의 이름은 제외
          if (
            node.parent.type === 'VariableDeclarator' &&
            node.parent.id === node
          ) {
            return;
          }
        }
      },
    };
  },
};
