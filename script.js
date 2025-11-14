// 계산기 상태
let currentInput = '0';
let expression = '';
let currentMode = 'korean';
let lastResult = null;

// DOM 요소
const displayMain = document.getElementById('display');
const displayExpression = document.getElementById('expression');
const displayKorean = document.getElementById('korean-display');
const modeBtns = document.querySelectorAll('.mode-btn');
const buttonModes = document.querySelectorAll('.buttons');
const bgUpload = document.getElementById('bg-upload');
const clearBg = document.getElementById('clear-bg');
const backgroundOverlay = document.querySelector('.background-overlay');

// 한글 숫자 단위 (무극까지)
const koreanUnits = [
    { name: '', value: 1 },
    { name: '만', value: 10000 },
    { name: '억', value: 100000000 },
    { name: '조', value: 1000000000000 },
    { name: '경', value: 10000000000000000 },
    { name: '해', value: 100000000000000000000n },
    { name: '자', value: 1000000000000000000000000n },
    { name: '양', value: 10000000000000000000000000000n },
    { name: '구', value: 100000000000000000000000000000000n },
    { name: '간', value: 1000000000000000000000000000000000000n },
    { name: '정', value: 10000000000000000000000000000000000000000n },
    { name: '재', value: 100000000000000000000000000000000000000000000n },
    { name: '극', value: 1000000000000000000000000000000000000000000000000n },
    { name: '항하사', value: 10000000000000000000000000000000000000000000000000000n },
    { name: '아승기', value: 100000000000000000000000000000000000000000000000000000000n },
    { name: '나유타', value: 1000000000000000000000000000000000000000000000000000000000000n },
    { name: '불가사의', value: 10000000000000000000000000000000000000000000000000000000000000000n },
    { name: '무량대수', value: 100000000000000000000000000000000000000000000000000000000000000000000n },
    { name: '무극', value: 1000000000000000000000000000000000000000000000000000000000000000000000000n }
];

const digitNames = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const placeNames = ['', '십', '백', '천'];

// 초기화
function init() {
    updateDisplay();
    setupEventListeners();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 모드 전환
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchMode(mode);
        });
    });

    // 배경화면 업로드
    bgUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                backgroundOverlay.style.backgroundImage = `url(${event.target.result})`;
                backgroundOverlay.classList.add('active');
                localStorage.setItem('calculatorBackground', event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    // 배경화면 제거
    clearBg.addEventListener('click', () => {
        backgroundOverlay.style.backgroundImage = '';
        backgroundOverlay.classList.remove('active');
        localStorage.removeItem('calculatorBackground');
    });

    // 저장된 배경화면 불러오기
    const savedBg = localStorage.getItem('calculatorBackground');
    if (savedBg) {
        backgroundOverlay.style.backgroundImage = `url(${savedBg})`;
        backgroundOverlay.classList.add('active');
    }

    // 키보드 입력
    document.addEventListener('keydown', handleKeyboard);
}

// 키보드 처리
function handleKeyboard(e) {
    if (e.key >= '0' && e.key <= '9') {
        appendNumber(e.key);
    } else if (e.key === '.') {
        appendNumber('.');
    } else if (e.key === '+' || e.key === '-') {
        appendOperator(e.key);
    } else if (e.key === '*') {
        appendOperator('×');
    } else if (e.key === '/') {
        appendOperator('÷');
        e.preventDefault();
    } else if (e.key === 'Enter') {
        calculate();
        e.preventDefault();
    } else if (e.key === 'Escape') {
        clearAll();
    } else if (e.key === 'Backspace') {
        backspace();
    }
}

// 모드 전환
function switchMode(mode) {
    currentMode = mode;

    // 버튼 활성화 상태 변경
    modeBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        }
    });

    // 계산기 레이아웃 변경
    buttonModes.forEach(buttons => {
        buttons.classList.remove('active');
        if (buttons.classList.contains(`${mode}-mode`)) {
            buttons.classList.add('active');
        }
    });

    updateDisplay();
}

// 숫자 입력
function appendNumber(num) {
    if (currentInput === '0' && num !== '.') {
        currentInput = num;
    } else if (num === '.' && currentInput.includes('.')) {
        return;
    } else {
        currentInput += num;
    }
    updateDisplay();
}

// 연산자 입력
function appendOperator(op) {
    if (expression && currentInput) {
        calculate();
    }
    expression = (expression || currentInput) + ' ' + op + ' ';
    currentInput = '0';
    updateDisplay();
}

// 함수 입력 (공학용)
function appendFunction(func) {
    expression += func;
    currentInput = '0';
    updateDisplay();
}

// 상수 입력 (공학용)
function appendConstant(constant) {
    if (currentInput === '0') {
        currentInput = constant;
    } else {
        currentInput += constant;
    }
    updateDisplay();
}

// 부호 변경
function toggleSign() {
    if (currentInput !== '0') {
        if (currentInput.startsWith('-')) {
            currentInput = currentInput.substring(1);
        } else {
            currentInput = '-' + currentInput;
        }
        updateDisplay();
    }
}

// 백스페이스
function backspace() {
    if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
    } else {
        currentInput = '0';
    }
    updateDisplay();
}

// 현재 입력 지우기
function clearEntry() {
    currentInput = '0';
    updateDisplay();
}

// 전체 지우기
function clearAll() {
    currentInput = '0';
    expression = '';
    lastResult = null;
    updateDisplay();
}

// 계산 수행
function calculate() {
    try {
        let calcExpression = expression + currentInput;

        // 연산자 변환
        calcExpression = calcExpression.replace(/×/g, '*');
        calcExpression = calcExpression.replace(/÷/g, '/');
        calcExpression = calcExpression.replace(/\^/g, '**');

        // Math.ln을 Math.log로 변환
        calcExpression = calcExpression.replace(/Math\.ln\(/g, 'Math.log(');

        // 계산
        let result = eval(calcExpression);

        // 결과 반올림 (소수점 10자리)
        if (!Number.isInteger(result)) {
            result = Math.round(result * 10000000000) / 10000000000;
        }

        lastResult = result;
        currentInput = result.toString();
        expression = '';
        updateDisplay();
    } catch (error) {
        currentInput = 'Error';
        expression = '';
        updateDisplay();
        setTimeout(() => {
            currentInput = '0';
            updateDisplay();
        }, 1500);
    }
}

// 디스플레이 업데이트
function updateDisplay() {
    displayMain.textContent = currentInput;
    displayExpression.textContent = expression;

    // 한글 숫자 표시 (한글 모드일 때)
    if (currentMode === 'korean' && currentInput !== 'Error') {
        const korean = numberToKorean(currentInput);
        displayKorean.textContent = korean;
    } else {
        displayKorean.textContent = '';
    }
}

// 숫자를 한글로 변환
function numberToKorean(numStr) {
    // 소수점 처리
    if (numStr.includes('.')) {
        const [integer, decimal] = numStr.split('.');
        const integerKorean = convertIntegerToKorean(integer);
        const decimalKorean = convertDecimalToKorean(decimal);
        return integerKorean + (decimalKorean ? ' 점 ' + decimalKorean : '');
    }

    return convertIntegerToKorean(numStr);
}

// 정수를 한글로 변환
function convertIntegerToKorean(numStr) {
    // 음수 처리
    if (numStr.startsWith('-')) {
        return '마이너스 ' + convertIntegerToKorean(numStr.substring(1));
    }

    const num = parseFloat(numStr);
    if (num === 0) return '영';
    if (isNaN(num)) return '';

    // 과학적 표기법 처리
    if (numStr.includes('e')) {
        return numStr + ' (과학적 표기법)';
    }

    // 매우 큰 수 처리
    if (num >= 1e15) {
        return convertLargeNumber(numStr);
    }

    return convertStandardNumber(parseInt(numStr));
}

// 표준 숫자 변환 (천조 이하)
function convertStandardNumber(num) {
    if (num === 0) return '영';

    const jo = Math.floor(num / 1000000000000);
    const eok = Math.floor((num % 1000000000000) / 100000000);
    const man = Math.floor((num % 100000000) / 10000);
    const rest = num % 10000;

    let result = '';

    if (jo > 0) {
        result += convertChunk(jo) + '조';
    }
    if (eok > 0) {
        if (result) result += ' ';
        result += convertChunk(eok) + '억';
    }
    if (man > 0) {
        if (result) result += ' ';
        result += convertChunk(man) + '만';
    }
    if (rest > 0) {
        if (result) result += ' ';
        result += convertChunk(rest);
    }

    return result || '영';
}

// 4자리 숫자 변환
function convertChunk(num) {
    if (num === 0) return '';

    const cheon = Math.floor(num / 1000);
    const baek = Math.floor((num % 1000) / 100);
    const sip = Math.floor((num % 100) / 10);
    const il = num % 10;

    let result = '';

    if (cheon > 0) {
        result += (cheon === 1 ? '' : digitNames[cheon]) + '천';
    }
    if (baek > 0) {
        result += (baek === 1 ? '' : digitNames[baek]) + '백';
    }
    if (sip > 0) {
        result += (sip === 1 ? '' : digitNames[sip]) + '십';
    }
    if (il > 0) {
        result += digitNames[il];
    }

    return result;
}

// 큰 숫자 변환 (경 이상)
function convertLargeNumber(numStr) {
    const num = parseFloat(numStr);

    // 무극 (10^72)
    if (num >= 1e72) {
        const mugeuk = Math.floor(num / 1e72);
        return convertStandardNumber(mugeuk) + '무극' + (num % 1e72 > 0 ? ' ...' : '');
    }
    // 무량대수 (10^68)
    if (num >= 1e68) {
        const muryangdaesu = Math.floor(num / 1e68);
        return convertStandardNumber(muryangdaesu) + '무량대수' + (num % 1e68 > 0 ? ' ...' : '');
    }
    // 불가사의 (10^64)
    if (num >= 1e64) {
        const bulgasaui = Math.floor(num / 1e64);
        return convertStandardNumber(bulgasaui) + '불가사의' + (num % 1e64 > 0 ? ' ...' : '');
    }
    // 나유타 (10^60)
    if (num >= 1e60) {
        const nayuta = Math.floor(num / 1e60);
        return convertStandardNumber(nayuta) + '나유타' + (num % 1e60 > 0 ? ' ...' : '');
    }
    // 아승기 (10^56)
    if (num >= 1e56) {
        const aseunggi = Math.floor(num / 1e56);
        return convertStandardNumber(aseunggi) + '아승기' + (num % 1e56 > 0 ? ' ...' : '');
    }
    // 항하사 (10^52)
    if (num >= 1e52) {
        const hanghasa = Math.floor(num / 1e52);
        return convertStandardNumber(hanghasa) + '항하사' + (num % 1e52 > 0 ? ' ...' : '');
    }
    // 극 (10^48)
    if (num >= 1e48) {
        const geuk = Math.floor(num / 1e48);
        return convertStandardNumber(geuk) + '극' + (num % 1e48 > 0 ? ' ...' : '');
    }
    // 재 (10^44)
    if (num >= 1e44) {
        const jae = Math.floor(num / 1e44);
        return convertStandardNumber(jae) + '재' + (num % 1e44 > 0 ? ' ...' : '');
    }
    // 정 (10^40)
    if (num >= 1e40) {
        const jeong = Math.floor(num / 1e40);
        return convertStandardNumber(jeong) + '정' + (num % 1e40 > 0 ? ' ...' : '');
    }
    // 간 (10^36)
    if (num >= 1e36) {
        const gan = Math.floor(num / 1e36);
        return convertStandardNumber(gan) + '간' + (num % 1e36 > 0 ? ' ...' : '');
    }
    // 구 (10^32)
    if (num >= 1e32) {
        const gu = Math.floor(num / 1e32);
        return convertStandardNumber(gu) + '구' + (num % 1e32 > 0 ? ' ...' : '');
    }
    // 양 (10^28)
    if (num >= 1e28) {
        const yang = Math.floor(num / 1e28);
        return convertStandardNumber(yang) + '양' + (num % 1e28 > 0 ? ' ...' : '');
    }
    // 자 (10^24)
    if (num >= 1e24) {
        const ja = Math.floor(num / 1e24);
        return convertStandardNumber(ja) + '자' + (num % 1e24 > 0 ? ' ...' : '');
    }
    // 해 (10^20)
    if (num >= 1e20) {
        const hae = Math.floor(num / 1e20);
        return convertStandardNumber(hae) + '해' + (num % 1e20 > 0 ? ' ...' : '');
    }
    // 경 (10^16)
    if (num >= 1e16) {
        const gyeong = Math.floor(num / 1e16);
        return convertStandardNumber(gyeong) + '경' + (num % 1e16 > 0 ? ' ...' : '');
    }

    return convertStandardNumber(Math.floor(num));
}

// 소수 부분을 한글로 변환
function convertDecimalToKorean(decimal) {
    let result = '';
    for (let i = 0; i < decimal.length && i < 10; i++) {
        const digit = parseInt(decimal[i]);
        result += digitNames[digit] || '영';
        if (i < decimal.length - 1) result += ' ';
    }
    return result;
}

// 초기화 실행
init();
