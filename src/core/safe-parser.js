/**
 * SafeParser - 안전한 수식 파서 (eval 대체)
 *
 * 레이어: Core (순수 로직)
 * 알고리즘: Shunting-yard
 */

const TOKEN_TYPES = {
  NUMBER: 'NUMBER',
  OPERATOR: 'OPERATOR',
  FUNCTION: 'FUNCTION',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  CONSTANT: 'CONSTANT',
};

const OPERATORS = {
  '+': { prec: 1, assoc: 'left' },
  '-': { prec: 1, assoc: 'left' },
  '×': { prec: 2, assoc: 'left' },
  '÷': { prec: 2, assoc: 'left' },
  '^': { prec: 3, assoc: 'right' },
};

const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'sqrt']);

const CONSTANTS = {
  'π': Math.PI,
  'e': Math.E,
};

function tokenize(expr) {
  const tokens = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (ch === ' ') { i++; continue; }

    // 숫자 (정수, 소수)
    if ((ch >= '0' && ch <= '9') || (ch === '.' && i + 1 < expr.length && expr[i + 1] >= '0' && expr[i + 1] <= '9')) {
      let num = '';
      while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: TOKEN_TYPES.NUMBER, value: num });
      continue;
    }

    // 음수 처리: 수식 시작 또는 연산자/여는 괄호 뒤의 -
    if (ch === '-' && (tokens.length === 0 || tokens[tokens.length - 1].type === TOKEN_TYPES.OPERATOR || tokens[tokens.length - 1].type === TOKEN_TYPES.LPAREN)) {
      let num = '-';
      i++;
      while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) {
        num += expr[i];
        i++;
      }
      if (num === '-') {
        throw new Error('잘못된 수식: 유효하지 않은 음수');
      }
      tokens.push({ type: TOKEN_TYPES.NUMBER, value: num });
      continue;
    }

    // 연산자
    if (OPERATORS[ch]) {
      tokens.push({ type: TOKEN_TYPES.OPERATOR, value: ch });
      i++;
      continue;
    }

    // 괄호
    if (ch === '(') {
      tokens.push({ type: TOKEN_TYPES.LPAREN, value: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: TOKEN_TYPES.RPAREN, value: ')' });
      i++;
      continue;
    }

    // 상수
    if (CONSTANTS[ch] !== undefined) {
      tokens.push({ type: TOKEN_TYPES.CONSTANT, value: ch });
      i++;
      continue;
    }

    // 함수명 (알파벳)
    if (ch >= 'a' && ch <= 'z') {
      let name = '';
      while (i < expr.length && expr[i] >= 'a' && expr[i] <= 'z') {
        name += expr[i];
        i++;
      }
      if (FUNCTIONS.has(name)) {
        tokens.push({ type: TOKEN_TYPES.FUNCTION, value: name });
      } else {
        throw new Error(`유효하지 않은 함수: ${name}`);
      }
      continue;
    }

    throw new Error(`유효하지 않은 문자: ${ch}`);
  }

  return tokens;
}

function autoCloseParen(tokens) {
  let open = 0;
  for (const t of tokens) {
    if (t.type === TOKEN_TYPES.LPAREN) open++;
    if (t.type === TOKEN_TYPES.RPAREN) open--;
  }
  while (open > 0) {
    tokens.push({ type: TOKEN_TYPES.RPAREN, value: ')' });
    open--;
  }
  return tokens;
}

function shuntingYard(tokens) {
  const output = [];
  const opStack = [];

  for (const token of tokens) {
    switch (token.type) {
      case TOKEN_TYPES.NUMBER:
      case TOKEN_TYPES.CONSTANT:
        output.push(token);
        break;

      case TOKEN_TYPES.FUNCTION:
        opStack.push(token);
        break;

      case TOKEN_TYPES.OPERATOR: {
        const o1 = OPERATORS[token.value];
        while (opStack.length > 0) {
          const top = opStack[opStack.length - 1];
          if (top.type === TOKEN_TYPES.LPAREN) break;
          if (top.type === TOKEN_TYPES.FUNCTION) {
            output.push(opStack.pop());
            continue;
          }
          const o2 = OPERATORS[top.value];
          if (o2 && ((o1.assoc === 'left' && o1.prec <= o2.prec) || (o1.assoc === 'right' && o1.prec < o2.prec))) {
            output.push(opStack.pop());
          } else {
            break;
          }
        }
        opStack.push(token);
        break;
      }

      case TOKEN_TYPES.LPAREN:
        opStack.push(token);
        break;

      case TOKEN_TYPES.RPAREN:
        while (opStack.length > 0 && opStack[opStack.length - 1].type !== TOKEN_TYPES.LPAREN) {
          output.push(opStack.pop());
        }
        if (opStack.length > 0 && opStack[opStack.length - 1].type === TOKEN_TYPES.LPAREN) {
          opStack.pop();
        }
        if (opStack.length > 0 && opStack[opStack.length - 1].type === TOKEN_TYPES.FUNCTION) {
          output.push(opStack.pop());
        }
        break;
    }
  }

  while (opStack.length > 0) {
    const top = opStack.pop();
    if (top.type === TOKEN_TYPES.LPAREN) continue;
    output.push(top);
  }

  return output;
}

function evaluateRPN(rpn) {
  const stack = [];

  for (const token of rpn) {
    if (token.type === TOKEN_TYPES.NUMBER) {
      stack.push(parseFloat(token.value));
    } else if (token.type === TOKEN_TYPES.CONSTANT) {
      stack.push(CONSTANTS[token.value]);
    } else if (token.type === TOKEN_TYPES.OPERATOR) {
      if (stack.length < 2) throw new Error('잘못된 수식');
      const b = stack.pop();
      const a = stack.pop();
      switch (token.value) {
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '×': stack.push(a * b); break;
        case '÷':
          if (b === 0) throw new Error('0으로 나눌 수 없습니다');
          stack.push(a / b);
          break;
        case '^': stack.push(Math.pow(a, b)); break;
      }
    } else if (token.type === TOKEN_TYPES.FUNCTION) {
      if (stack.length < 1) throw new Error('잘못된 수식');
      const a = stack.pop();
      switch (token.value) {
        case 'sin': stack.push(Math.sin(a)); break;
        case 'cos': stack.push(Math.cos(a)); break;
        case 'tan': stack.push(Math.tan(a)); break;
        case 'log': stack.push(Math.log10(a)); break;
        case 'ln': stack.push(Math.log(a)); break;
        case 'sqrt': stack.push(Math.sqrt(a)); break;
        default: throw new Error(`미지원 함수: ${token.value}`);
      }
    }
  }

  if (stack.length !== 1) throw new Error('잘못된 수식');
  return stack[0];
}

function evaluate(expr) {
  if (!expr || typeof expr !== 'string' || expr.trim() === '') {
    throw new Error('빈 수식');
  }

  let tokens = tokenize(expr.trim());
  if (tokens.length === 0) throw new Error('빈 수식');
  tokens = autoCloseParen(tokens);
  const rpn = shuntingYard(tokens);
  return evaluateRPN(rpn);
}

module.exports = { evaluate, tokenize, shuntingYard };
