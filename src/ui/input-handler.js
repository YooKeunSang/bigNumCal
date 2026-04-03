/**
 * InputHandler - 버튼/키보드 입력 처리
 *
 * 레이어: UI
 */
import { evaluate } from '../core/safe-parser.js';
import { getState, setState } from '../utils/state.js';
import { updateDisplay } from './display-manager.js';

function appendNumber(num) {
  const state = getState();
  let current = state.currentInput;

  if (state.waitingForOperand) {
    setState({ currentInput: num === '.' ? '0.' : num, waitingForOperand: false });
    updateDisplay();
    return;
  }

  if (current === '0' && num !== '.') {
    current = num;
  } else if (num === '.' && current.includes('.')) {
    return;
  } else {
    current += num;
  }
  setState({ currentInput: current });
  updateDisplay();
}

function appendOperator(op) {
  const state = getState();

  if (state.waitingForOperand && op !== '(' && op !== ')') {
    // 연산자 교체
    const expr = state.expression.trimEnd();
    const replaced = expr.slice(0, -1) + op + ' ';
    setState({ expression: replaced });
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

function appendConstant(value, display) {
  const state = getState();
  setState({ currentInput: String(value) });
  updateDisplay();
}

function toggleSign() {
  const state = getState();
  if (state.currentInput !== '0') {
    const toggled = state.currentInput.startsWith('-')
      ? state.currentInput.substring(1)
      : '-' + state.currentInput;
    setState({ currentInput: toggled });
    updateDisplay();
  }
}

function backspace() {
  const state = getState();
  const current = state.currentInput;
  setState({ currentInput: current.length > 1 ? current.slice(0, -1) : '0' });
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
    const result = evaluate(calcExpression);

    let resultStr;
    if (Number.isInteger(result)) {
      resultStr = BigInt(result).toString();
    } else {
      resultStr = String(Math.round(result * 10000000000) / 10000000000);
    }

    setState({ currentInput: resultStr, expression: '', lastResult: result, waitingForOperand: false });
    updateDisplay();
  } catch (error) {
    setState({ currentInput: 'Error', expression: '' });
    updateDisplay();
    setTimeout(() => {
      setState({ currentInput: '0' });
      updateDisplay();
    }, 1500);
  }
}

function handleKeyboard(e) {
  if (e.key >= '0' && e.key <= '9') appendNumber(e.key);
  else if (e.key === '.') appendNumber('.');
  else if (e.key === '+' || e.key === '-') appendOperator(e.key);
  else if (e.key === '*') appendOperator('×');
  else if (e.key === '/') { appendOperator('÷'); e.preventDefault(); }
  else if (e.key === 'Enter') { calculate(); e.preventDefault(); }
  else if (e.key === 'Escape') clearAll();
  else if (e.key === 'Backspace') backspace();
}

export {
  appendNumber, appendOperator, appendFunction, appendConstant,
  toggleSign, backspace, clearEntry, clearAll, calculate, handleKeyboard,
};
