/**
 * 한글 큰숫자 계산기 - 메인 진입점
 *
 * 브라우저에서 직접 실행되는 통합 스크립트.
 * src/ 모듈의 로직을 인라인으로 포함한다.
 */

// ============================================================================
// [Utils] State Management
// ============================================================================
const DEFAULT_STATE = {
  currentInput: '0',
  expression: '',
  currentMode: 'korean',
  lastResult: null,
  waitingForOperand: false,
};

let _state = { ...DEFAULT_STATE };
const _listeners = [];

function getState() { return _state; }
function setState(partial) {
  _state = { ..._state, ...partial };
  _listeners.forEach(fn => fn(_state));
}
function resetState() {
  _state = { ...DEFAULT_STATE };
  _listeners.forEach(fn => fn(_state));
}

// ============================================================================
// [Core] SafeParser - Shunting-yard 수식 파서
// ============================================================================
const TOKEN = { NUMBER: 'N', OPERATOR: 'O', FUNCTION: 'F', LPAREN: 'L', RPAREN: 'R', CONSTANT: 'C' };

const OPS = {
  '+': { prec: 1, assoc: 'left' },
  '-': { prec: 1, assoc: 'left' },
  '×': { prec: 2, assoc: 'left' },
  '÷': { prec: 2, assoc: 'left' },
  '^': { prec: 3, assoc: 'right' },
};

const FUNCS = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'sqrt']);
const CONSTS = { 'π': Math.PI, 'e': Math.E };

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ') { i++; continue; }

    if ((ch >= '0' && ch <= '9') || (ch === '.' && i + 1 < expr.length && expr[i + 1] >= '0' && expr[i + 1] <= '9')) {
      let num = '';
      while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) { num += expr[i]; i++; }
      tokens.push({ type: TOKEN.NUMBER, value: num });
      continue;
    }

    if (ch === '-' && (tokens.length === 0 || tokens[tokens.length - 1].type === TOKEN.OPERATOR || tokens[tokens.length - 1].type === TOKEN.LPAREN)) {
      let num = '-'; i++;
      while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) { num += expr[i]; i++; }
      if (num === '-') throw new Error('잘못된 수식');
      tokens.push({ type: TOKEN.NUMBER, value: num });
      continue;
    }

    if (OPS[ch]) { tokens.push({ type: TOKEN.OPERATOR, value: ch }); i++; continue; }
    if (ch === '(') { tokens.push({ type: TOKEN.LPAREN, value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: TOKEN.RPAREN, value: ')' }); i++; continue; }
    if (CONSTS[ch] !== undefined) { tokens.push({ type: TOKEN.CONSTANT, value: ch }); i++; continue; }

    if (ch >= 'a' && ch <= 'z') {
      let name = '';
      while (i < expr.length && expr[i] >= 'a' && expr[i] <= 'z') { name += expr[i]; i++; }
      if (FUNCS.has(name)) { tokens.push({ type: TOKEN.FUNCTION, value: name }); continue; }
      throw new Error(`유효하지 않은 함수: ${name}`);
    }

    throw new Error(`유효하지 않은 문자: ${ch}`);
  }
  return tokens;
}

function autoCloseParen(tokens) {
  let open = 0;
  for (const t of tokens) { if (t.type === TOKEN.LPAREN) open++; if (t.type === TOKEN.RPAREN) open--; }
  while (open > 0) { tokens.push({ type: TOKEN.RPAREN, value: ')' }); open--; }
  return tokens;
}

function shuntingYard(tokens) {
  const output = [], opStack = [];
  for (const t of tokens) {
    if (t.type === TOKEN.NUMBER || t.type === TOKEN.CONSTANT) { output.push(t); continue; }
    if (t.type === TOKEN.FUNCTION) { opStack.push(t); continue; }
    if (t.type === TOKEN.OPERATOR) {
      const o1 = OPS[t.value];
      while (opStack.length > 0) {
        const top = opStack[opStack.length - 1];
        if (top.type === TOKEN.LPAREN) break;
        if (top.type === TOKEN.FUNCTION) { output.push(opStack.pop()); continue; }
        const o2 = OPS[top.value];
        if (o2 && ((o1.assoc === 'left' && o1.prec <= o2.prec) || (o1.assoc === 'right' && o1.prec < o2.prec))) { output.push(opStack.pop()); } else break;
      }
      opStack.push(t); continue;
    }
    if (t.type === TOKEN.LPAREN) { opStack.push(t); continue; }
    if (t.type === TOKEN.RPAREN) {
      while (opStack.length > 0 && opStack[opStack.length - 1].type !== TOKEN.LPAREN) output.push(opStack.pop());
      if (opStack.length > 0 && opStack[opStack.length - 1].type === TOKEN.LPAREN) opStack.pop();
      if (opStack.length > 0 && opStack[opStack.length - 1].type === TOKEN.FUNCTION) output.push(opStack.pop());
    }
  }
  while (opStack.length > 0) { const top = opStack.pop(); if (top.type !== TOKEN.LPAREN) output.push(top); }
  return output;
}

function _toNumber(val) {
  return typeof val === 'bigint' ? Number(val) : val;
}

function evaluateRPN(rpn) {
  const stack = [];
  for (const t of rpn) {
    if (t.type === TOKEN.NUMBER) {
      stack.push(t.value.includes('.') ? parseFloat(t.value) : BigInt(t.value));
      continue;
    }
    if (t.type === TOKEN.CONSTANT) { stack.push(CONSTS[t.value]); continue; }
    if (t.type === TOKEN.OPERATOR) {
      const b = stack.pop(), a = stack.pop();
      const bothBigInt = typeof a === 'bigint' && typeof b === 'bigint';
      switch (t.value) {
        case '+': stack.push(bothBigInt ? a + b : _toNumber(a) + _toNumber(b)); break;
        case '-': stack.push(bothBigInt ? a - b : _toNumber(a) - _toNumber(b)); break;
        case '×': stack.push(bothBigInt ? a * b : _toNumber(a) * _toNumber(b)); break;
        case '÷':
          if (bothBigInt) {
            if (b === 0n) throw new Error('0으로 나눌 수 없습니다');
            stack.push(a % b === 0n ? a / b : _toNumber(a) / _toNumber(b));
          } else {
            const nb = _toNumber(b);
            if (nb === 0) throw new Error('0으로 나눌 수 없습니다');
            stack.push(_toNumber(a) / nb);
          }
          break;
        case '^':
          if (bothBigInt && b >= 0n) { stack.push(a ** b); }
          else { stack.push(Math.pow(_toNumber(a), _toNumber(b))); }
          break;
      }
      continue;
    }
    if (t.type === TOKEN.FUNCTION) {
      const a = _toNumber(stack.pop());
      switch (t.value) {
        case 'sin': stack.push(Math.sin(a)); break;
        case 'cos': stack.push(Math.cos(a)); break;
        case 'tan': stack.push(Math.tan(a)); break;
        case 'log': stack.push(Math.log10(a)); break;
        case 'ln': stack.push(Math.log(a)); break;
        case 'sqrt': stack.push(Math.sqrt(a)); break;
      }
    }
  }
  if (stack.length !== 1) throw new Error('잘못된 수식');
  return stack[0];
}

function safeEvaluate(expr) {
  if (!expr || expr.trim() === '') throw new Error('빈 수식');
  let tokens = tokenize(expr.trim());
  if (tokens.length === 0) throw new Error('빈 수식');
  tokens = autoCloseParen(tokens);
  return evaluateRPN(shuntingYard(tokens));
}

// ============================================================================
// [Core] KoreanConverter - 숫자→한글 변환
// ============================================================================
const DIGIT_NAMES = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];

const KOREAN_UNITS = [
  { name: '무극', value: 10n ** 72n },
  { name: '무량대수', value: 10n ** 68n },
  { name: '불가사의', value: 10n ** 64n },
  { name: '나유타', value: 10n ** 60n },
  { name: '아승기', value: 10n ** 56n },
  { name: '항하사', value: 10n ** 52n },
  { name: '극', value: 10n ** 48n },
  { name: '재', value: 10n ** 44n },
  { name: '정', value: 10n ** 40n },
  { name: '간', value: 10n ** 36n },
  { name: '구', value: 10n ** 32n },
  { name: '양', value: 10n ** 28n },
  { name: '자', value: 10n ** 24n },
  { name: '해', value: 10n ** 20n },
  { name: '경', value: 10n ** 16n },
  { name: '조', value: 10n ** 12n },
  { name: '억', value: 10n ** 8n },
  { name: '만', value: 10n ** 4n },
];

function convertChunk(n) {
  if (n === 0n) return '';
  let result = '';
  const digits = [
    { place: '천', divisor: 1000n },
    { place: '백', divisor: 100n },
    { place: '십', divisor: 10n },
  ];
  let remainder = n;
  for (const { place, divisor } of digits) {
    const digit = remainder / divisor;
    remainder = remainder % divisor;
    if (digit > 0n) {
      result += digit === 1n ? place : DIGIT_NAMES[+`${digit}`] + place;
    }
  }
  if (remainder > 0n) result += DIGIT_NAMES[+`${remainder}`];
  return result;
}

function toKoreanSmall(num) {
  if (num === 0n) return '';
  if (num < 10000n) return convertChunk(num);
  let remainder = num;
  const parts = [];
  const subUnits = [
    { name: '억', value: 100000000n },
    { name: '만', value: 10000n },
  ];
  for (const unit of subUnits) {
    if (remainder >= unit.value) {
      const q = remainder / unit.value;
      remainder = remainder % unit.value;
      parts.push(convertChunk(q) + unit.name);
    }
  }
  if (remainder > 0n) parts.push(convertChunk(remainder));
  return parts.join(' ');
}

function numberToKorean(num) {
  if (typeof num === 'string') {
    if (num.includes('.')) {
      const [intPart, decPart] = num.split('.');
      const intKorean = numberToKorean(BigInt(intPart || '0'));
      const digits = [];
      for (let i = 0; i < decPart.length; i++) {
        digits.push(DIGIT_NAMES[+decPart[i]] || '영');
      }
      return digits.length > 0 ? intKorean + ' 점 ' + digits.join(' ') : intKorean;
    }
    num = BigInt(num);
  }
  if (typeof num === 'number') num = BigInt(num);
  if (num < 0n) return '마이너스 ' + numberToKorean(-num);
  if (num === 0n) return '영';

  let remainder = num;
  const parts = [];
  for (const unit of KOREAN_UNITS) {
    if (remainder >= unit.value) {
      const quotient = remainder / unit.value;
      remainder = remainder % unit.value;
      if (quotient >= 10000n) {
        parts.push(toKoreanSmall(quotient) + unit.name);
      } else {
        parts.push((convertChunk(quotient) || '일') + unit.name);
      }
    }
  }
  if (remainder > 0n) parts.push(convertChunk(remainder));
  return parts.join(' ');
}

// ============================================================================
// [UI] Display Manager
// ============================================================================
function formatWithCommas(numStr) {
  if (!numStr || numStr === 'Error') return numStr;
  const isNegative = numStr.startsWith('-');
  let str = isNegative ? numStr.slice(1) : numStr;
  let [intPart, decPart] = str.split('.');
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let result = decPart !== undefined ? intPart + '.' + decPart : intPart;
  return isNegative ? '-' + result : result;
}

function updateDisplay() {
  const state = getState();
  const displayMain = document.getElementById('display');
  const displayExpression = document.getElementById('expression');
  const displayKorean = document.getElementById('korean-display');

  if (displayMain) displayMain.textContent = formatWithCommas(state.currentInput);
  if (displayExpression) displayExpression.textContent = state.expression;
  if (displayKorean) {
    if (state.currentMode === 'korean' && state.currentInput !== 'Error') {
      try {
        displayKorean.textContent = numberToKorean(state.currentInput);
      } catch (e) {
        displayKorean.textContent = '';
      }
    } else {
      displayKorean.textContent = '';
    }
  }
}

// ============================================================================
// [UI] Input Handler
// ============================================================================
function appendNumber(num) {
  const state = getState();
  let current = state.currentInput;

  if (state.waitingForOperand) {
    setState({ currentInput: num === '.' ? '0.' : num, waitingForOperand: false });
    updateDisplay();
    return;
  }

  if (current === '0' && num !== '.') current = num;
  else if (num === '.' && current.includes('.')) return;
  else current += num;
  setState({ currentInput: current });
  updateDisplay();
}

function appendOperator(op) {
  const state = getState();

  if (state.waitingForOperand && op !== '(' && op !== ')') {
    const expr = state.expression.trimEnd();
    setState({ expression: expr.slice(0, -1) + op + ' ' });
    updateDisplay();
    return;
  }

  if (op === '(' || op === ')') {
    setState({ expression: state.expression + op });
    updateDisplay();
    return;
  }

  const expr = state.expression + state.currentInput + ' ' + op + ' ';
  setState({ expression: expr, currentInput: '0', waitingForOperand: true });
  updateDisplay();
}

function appendFunction(funcName) {
  const state = getState();
  setState({ expression: state.expression + funcName + '(', currentInput: '0', waitingForOperand: true });
  updateDisplay();
}

function appendConstant(value) {
  setState({ currentInput: String(value) });
  updateDisplay();
}

function toggleSign() {
  const state = getState();
  if (state.currentInput !== '0') {
    const toggled = state.currentInput.startsWith('-') ? state.currentInput.substring(1) : '-' + state.currentInput;
    setState({ currentInput: toggled });
    updateDisplay();
  }
}

function backspace() {
  const state = getState();
  setState({ currentInput: state.currentInput.length > 1 ? state.currentInput.slice(0, -1) : '0' });
  updateDisplay();
}

function clearEntry() {
  setState({ currentInput: '0', waitingForOperand: false });
  updateDisplay();
}

function clearAll() {
  setState({ currentInput: '0', expression: '', lastResult: null, waitingForOperand: false });
  updateDisplay();
}

function calculate() {
  const state = getState();
  try {
    const calcExpression = state.expression + state.currentInput;
    const result = safeEvaluate(calcExpression);
    let resultStr;
    if (typeof result === 'bigint') {
      resultStr = result.toString();
    } else if (Number.isInteger(result)) {
      resultStr = String(result);
    } else {
      resultStr = String(Math.round(result * 10000000000) / 10000000000);
    }
    setState({ currentInput: resultStr, expression: '', lastResult: result, waitingForOperand: false });
    updateDisplay();
  } catch (error) {
    setState({ currentInput: 'Error', expression: '' });
    updateDisplay();
    setTimeout(() => { setState({ currentInput: '0' }); updateDisplay(); }, 1500);
  }
}

// ============================================================================
// [UI] Mode Manager
// ============================================================================
function switchMode(mode) {
  setState({ currentMode: mode });
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  document.querySelectorAll('.buttons').forEach(buttons => {
    buttons.classList.toggle('active', buttons.classList.contains(`${mode}-mode`));
  });
  updateDisplay();
}

// ============================================================================
// [UI] Background Manager
// ============================================================================
function initBackground() {
  const bgUpload = document.getElementById('bg-upload');
  const clearBgBtn = document.getElementById('clear-bg');
  const overlay = document.querySelector('.background-overlay');
  if (!bgUpload || !clearBgBtn || !overlay) return;

  const savedBg = localStorage.getItem('calculatorBackground');
  if (savedBg) {
    overlay.style.backgroundImage = `url(${savedBg})`;
    overlay.classList.add('active');
  }

  bgUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      overlay.style.backgroundImage = `url(${event.target.result})`;
      overlay.classList.add('active');
      localStorage.setItem('calculatorBackground', event.target.result);
    };
    reader.readAsDataURL(file);
  });

  clearBgBtn.addEventListener('click', () => {
    overlay.style.backgroundImage = '';
    overlay.classList.remove('active');
    localStorage.removeItem('calculatorBackground');
  });
}

// ============================================================================
// [Init] 이벤트 리스너 설정 및 초기화
// ============================================================================
function init() {
  updateDisplay();

  // 버튼 이벤트 위임
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const value = btn.dataset.value;

      switch (action) {
        case 'number': appendNumber(value); break;
        case 'operator': appendOperator(value); break;
        case 'function': appendFunction(value); break;
        case 'constant': appendConstant(value); break;
        case 'calculate': calculate(); break;
        case 'clearAll': clearAll(); break;
        case 'clearEntry': clearEntry(); break;
        case 'backspace': backspace(); break;
        case 'toggleSign': toggleSign(); break;
      }
    });
  });

  // 키보드 입력
  document.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') appendNumber(e.key);
    else if (e.key === '.') appendNumber('.');
    else if (e.key === '+' || e.key === '-') appendOperator(e.key);
    else if (e.key === '*') appendOperator('×');
    else if (e.key === '/') { appendOperator('÷'); e.preventDefault(); }
    else if (e.key === 'Enter') { calculate(); e.preventDefault(); }
    else if (e.key === 'Escape') clearAll();
    else if (e.key === 'Backspace') backspace();
  });

  // 모드 전환
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });

  // 결과 복사
  document.getElementById('display').addEventListener('click', () => {
    const text = getState().currentInput;
    if (navigator.clipboard && text !== 'Error') navigator.clipboard.writeText(text);
  });

  const koreanDisplay = document.getElementById('korean-display');
  if (koreanDisplay) {
    koreanDisplay.addEventListener('click', () => {
      const text = koreanDisplay.textContent;
      if (navigator.clipboard && text) navigator.clipboard.writeText(text);
    });
  }

  // 배경화면
  initBackground();
}

init();
