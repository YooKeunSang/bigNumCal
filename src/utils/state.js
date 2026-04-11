/**
 * State Management - 계산기 상태 관리
 *
 * 레이어: Utils (공유)
 * 의존성 규칙:
 *   - DOM 접근 금지
 *   - Core/UI 모듈 import 금지 (순환 방지)
 */

const DEFAULT_STATE = {
  currentInput: '0',
  expression: '',
  currentMode: 'korean',
  lastResult: null,
  waitingForOperand: false,
};

let state = { ...DEFAULT_STATE };
const listeners = [];

function getState() {
  return state;
}

function setState(partial) {
  state = { ...state, ...partial };
  listeners.forEach(fn => fn(state));
}

function resetState() {
  state = { ...DEFAULT_STATE };
  listeners.forEach(fn => fn(state));
}

function subscribe(fn) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

module.exports = { getState, setState, resetState, subscribe };
