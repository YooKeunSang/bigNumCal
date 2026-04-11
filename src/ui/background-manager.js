/**
 * BackgroundManager - 배경화면 관리
 *
 * 레이어: UI
 */

function initBackground() {
  const bgUpload = document.getElementById('bg-upload');
  const clearBg = document.getElementById('clear-bg');
  const overlay = document.querySelector('.background-overlay');

  if (!bgUpload || !clearBg || !overlay) return;

  // 저장된 배경 불러오기
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

  clearBg.addEventListener('click', () => {
    overlay.style.backgroundImage = '';
    overlay.classList.remove('active');
    localStorage.removeItem('calculatorBackground');
  });
}

export { initBackground };
