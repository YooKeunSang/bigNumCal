/**
 * ESLint 커스텀 룰: Core 연산 모듈에서 Number 타입으로 큰 숫자 처리 금지
 *
 * bigint-math.js, korean-converter.js에서 parseFloat(), Number()를 사용하면
 * 큰 숫자의 정밀도가 손실된다. BigInt를 사용해야 한다.
 */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Core 연산 모듈에서 parseFloat/Number로 큰 숫자를 처리하는 것을 금지합니다. BigInt를 사용하세요.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename();
    // bigint-math.js, korean-converter.js에서만 적용
    const isTargetFile =
      filename.includes('bigint-math') ||
      filename.includes('korean-converter');

    if (!isTargetFile) return {};

    return {
      CallExpression(node) {
        // parseFloat() 금지
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'parseFloat'
        ) {
          context.report({
            node,
            message: 'Core 연산 모듈에서 parseFloat() 사용 금지. 정밀도 손실이 발생합니다. BigInt()를 사용하세요.',
          });
        }

        // parseInt()로 큰 숫자 처리 금지
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'parseInt'
        ) {
          context.report({
            node,
            message: 'Core 연산 모듈에서 parseInt() 사용 금지. 큰 숫자는 BigInt()로 변환하세요.',
          });
        }

        // Number() 변환 금지
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Number'
        ) {
          context.report({
            node,
            message: 'Core 연산 모듈에서 Number() 사용 금지. 2^53 이상에서 정밀도가 손실됩니다. BigInt()를 사용하세요.',
          });
        }
      },
    };
  },
};
