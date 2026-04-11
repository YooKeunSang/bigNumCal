/**
 * DisplayManager - 화면 업데이트 및 포맷팅
 *
 * 레이어: UI
 */
import { toKorean } from '../core/korean-converter.js';
import { getState } from '../utils/state.js';

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

  if (displayMain) {
    displayMain.textContent = formatWithCommas(state.currentInput);
  }
  if (displayExpression) {
    displayExpression.textContent = state.expression;
  }
  if (displayKorean) {
    if (state.currentMode === 'korean' && state.currentInput !== 'Error') {
      try {
        const input = state.currentInput;
        if (input.includes('.')) {
          displayKorean.textContent = toKorean(input);
        } else {
          displayKorean.textContent = toKorean(BigInt(input));
        }
      } catch (e) {
        displayKorean.textContent = '';
      }
    } else {
      displayKorean.textContent = '';
    }
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
}

export { updateDisplay, formatWithCommas, copyToClipboard };
