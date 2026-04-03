/**
 * ESLint 커스텀 룰: eval() 및 Function() 생성자 사용 금지
 *
 * 보안 규칙: 코드 인젝션 방지를 위해 동적 코드 실행을 전면 금지한다.
 * SafeParser 모듈을 통해 수식을 파싱해야 한다.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'eval() 및 Function() 생성자 사용을 금지합니다. SafeParser를 사용하세요.',
    },
    schema: [],
  },
  create(context) {
    return {
      // eval() 직접 호출 금지
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
          context.report({
            node,
            message: 'eval() 사용 금지. 코드 인젝션 위험이 있습니다. SafeParser 모듈을 통해 수식을 파싱하세요.',
          });
        }

        // new Function() 금지
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Function'
        ) {
          context.report({
            node,
            message: 'Function() 생성자 사용 금지. 코드 인젝션 위험이 있습니다. SafeParser 모듈을 사용하세요.',
          });
        }
      },

      // new Function() 금지
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'Function') {
          context.report({
            node,
            message: 'new Function() 사용 금지. 코드 인젝션 위험이 있습니다. SafeParser 모듈을 사용하세요.',
          });
        }
      },
    };
  },
};
