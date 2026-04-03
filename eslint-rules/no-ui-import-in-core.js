/**
 * ESLint 커스텀 룰: Core 레이어에서 UI 모듈 import 금지
 *
 * 의존성 방향: UI → Core (단방향)
 * Core 모듈은 UI 모듈에 의존할 수 없다.
 * Utils는 Core/UI 어디서든 import 가능하지만, Utils 자체는 Core/UI를 import할 수 없다.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Core 레이어에서 UI 모듈 import를 금지합니다. 의존성은 UI → Core 단방향이어야 합니다.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename();
    const isCore = filename.includes('/core/');
    const isUtils = filename.includes('/utils/');

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;

        // Core → UI import 금지
        if (isCore && importPath.includes('/ui/')) {
          context.report({
            node,
            message: 'Core 레이어에서 UI 모듈 import 금지. 의존성 방향은 UI → Core 단방향이어야 합니다.',
          });
        }

        // Utils → Core import 금지 (순환 방지)
        if (isUtils && importPath.includes('/core/')) {
          context.report({
            node,
            message: 'Utils에서 Core 모듈 import 금지. 순환 의존성을 방지하세요.',
          });
        }

        // Utils → UI import 금지
        if (isUtils && importPath.includes('/ui/')) {
          context.report({
            node,
            message: 'Utils에서 UI 모듈 import 금지. 순환 의존성을 방지하세요.',
          });
        }
      },

      // require() 호출도 체크
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal'
        ) {
          const importPath = node.arguments[0].value;

          if (isCore && importPath.includes('/ui/')) {
            context.report({
              node,
              message: 'Core 레이어에서 UI 모듈 require 금지. 의존성 방향은 UI → Core 단방향이어야 합니다.',
            });
          }

          if (isUtils && (importPath.includes('/core/') || importPath.includes('/ui/'))) {
            context.report({
              node,
              message: 'Utils에서 Core/UI 모듈 require 금지. 순환 의존성을 방지하세요.',
            });
          }
        }
      },
    };
  },
};
