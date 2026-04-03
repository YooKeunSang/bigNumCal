/**
 * ModeManager - 모드 전환 관리
 *
 * 레이어: UI
 */
import { setState } from '../utils/state.js';
import { updateDisplay } from './display-manager.js';

function switchMode(mode) {
  setState({ currentMode: mode });

  const modeBtns = document.querySelectorAll('.mode-btn');
  modeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  const buttonModes = document.querySelectorAll('.buttons');
  buttonModes.forEach(buttons => {
    buttons.classList.toggle('active', buttons.classList.contains(`${mode}-mode`));
  });

  updateDisplay();
}

function initModeListeners() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });
}

export { switchMode, initModeListeners };
