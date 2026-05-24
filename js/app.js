import { questions } from './questions.js';
import { calculateTSQM } from './calculator.js';

let currentStep = 0; 
let userAnswers = {};
let userName = "";

// Сюда вставьте URL вашего развернутого Web App из Google Apps Script
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzyLz5U2B5UiPsS52trKJ0XJovm0FOsB2dHEH47fYec65zYkWYCKaUjZ0RHPVx_MW0-fA/exec";

const screens = {
    welcome: document.getElementById('welcome-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen')
};

function init() {
    document.getElementById('start-btn').addEventListener('click', startQuiz);
    document.getElementById('prev-btn').addEventListener('click', () => changeStep(currentStep - 1));
    document.getElementById('restart-btn').addEventListener('click', resetQuiz);
    document.getElementById('download-json-btn').addEventListener('click', downloadJSON);
    document.getElementById('send-google-btn').addEventListener('click', sendToGoogleSheets);

    // Фича: Загрузка локального черновика из localStorage
    loadDraft();
}

function startQuiz() {
    const inputName = document.getElementById('username-input').value.trim();
    userName = inputName || "Анонимный пациент";
    localStorage.setItem('tsqm_name', userName);
    changeStep(1);
}

function changeStep(step) {
    currentStep = step;
    localStorage.setItem('tsqm_step', currentStep);
    updateProgressBar();

    if (currentStep === 0) {
        showScreen('welcome');
        document.getElementById('user-display').classList.add('hidden');
    } else if (currentStep > 0 && currentStep <= questions.length) {
        showScreen('quiz');
        document.getElementById('user-display').classList.remove('hidden');
        document.getElementById('current-user-name').innerText = userName;
        renderQuestion(questions[currentStep - 1]);
    } else {
        showScreen('result');
        renderResults();
    }
}

function showScreen(screenKey) {
    Object.keys(screens).forEach(key => {
        if (key === screenKey) screens[key].classList.remove('hidden');
        else screens[key].classList.add('hidden');
    });
}

function updateProgressBar() {
    const bar = document.getElementById('progress-bar');
    const percent = (currentStep / (questions.length + 1)) * 100;
    bar.style.width = `${percent}%`;
}

function renderQuestion(q) {
    document.getElementById('question-meta').innerText = `Блок: ${q.domainName}`;
    document.getElementById('question-text').innerText = q.text;
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    q.options.forEach((option, index) => {
        const scoreValue = index + 1;
        const button = document.createElement('button');
        button.className = 'option-btn';
        if (userAnswers[q.id] === scoreValue) button.classList.add('selected');
        
        button.innerText = `💊 ${option}`;
        button.addEventListener('click', () => {
            userAnswers[q.id] = scoreValue;
            // Фича: Сохранение каждого ответа в черновик
            localStorage.setItem('tsqm_answers', JSON.stringify(userAnswers));
            setTimeout(() => changeStep(currentStep + 1), 200);
        });
        container.appendChild(button);
    });

    document.getElementById('prev-btn').disabled = currentStep === 1;
}

function renderResults() {
    const results = calculateTSQM(userAnswers);
    document.getElementById('score-effectiveness').innerText = results.effectiveness;
    document.getElementById('score-convenience').innerText = results.convenience;
    document.getElementById('score-global').innerText = results.global;

    // Фича: Отрисовка Радар-диаграммы (3 оси)
    drawRadarChart(results.effectiveness, results.convenience, results.global);
    
    // Очищаем черновик, так как тест успешно завершен
    localStorage.removeItem('tsqm_step');
    localStorage.removeItem('tsqm_answers');
}

// Фича: Отрисовка радар-диаграммы на чистом HTML5 Canvas
// Фича: Отрисовка четкой радар-диаграммы на чистом HTML5 Canvas с учетом Retina/High-DPI экранов
function drawRadarChart(eff, conv, glob) {
    const canvas = document.getElementById('radarCanvas');
    const ctx = canvas.getContext('2d');

    // 1. Задаем желаемый логический (отображаемый) размер в CSS-пикселях
    const logicalWidth = 300;
    const logicalHeight = 300;

    // Получаем коэффициент плотности пикселей (если не определен, берем 1)
    const dpr = window.devicePixelRatio || 1;

    // 2. Масштабируем внутреннее разрешение холста под реальные физические пиксели экрана
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;

    // 3. Через CSS фиксируем отображаемый размер, чтобы холст не растянулся на пол-экрана
    canvas.style.width = logicalWidth + 'px';
    canvas.style.height = logicalHeight + 'px';

    // 4. Масштабируем контекст отрисовки, чтобы весь последующий код рисования работал в логических координатах
    ctx.scale(dpr, dpr);

    // Очищаем холст перед каждым рендером
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    // Центр и радиус теперь рассчитываются исходя из логических размеров (300х300)
    const cx = logicalWidth / 2; // 150
    const cy = logicalHeight / 2; // 150
    const r = 100;
    
    const angles = [-Math.PI/2, Math.PI/6, 5*Math.PI/6]; // 3 угла для 3 осей шкал
    const labels = ['Эффект.', 'Удобство', 'Общая'];

    // Рисуем сетку (круги/уровни от 20 до 100 баллов)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for(let i = 1; i <= 5; i++) {
        ctx.beginPath();
        let curR = (r / 5) * i;
        ctx.moveTo(cx + curR * Math.cos(angles[0]), cy + curR * Math.sin(angles[0]));
        ctx.lineTo(cx + curR * Math.cos(angles[1]), cy + curR * Math.sin(angles[1]));
        ctx.lineTo(cx + curR * Math.cos(angles[2]), cy + curR * Math.sin(angles[2]));
        ctx.closePath();
        ctx.stroke();
    }

    // Рисуем оси и подписи
    ctx.fillStyle = '#2c3e50';
    ctx.font = '12px sans-serif';
    angles.forEach((angle, i) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
        ctx.stroke();
        
        let lx = cx + (r + 20) * Math.cos(angle) - 20;
        let ly = cx + (r + 15) * Math.sin(angle);
        ctx.fillText(labels[i], lx, ly);
    });

    // Расчет точек полигона результатов
    const values = [eff, conv, glob];
    const points = angles.map((angle, i) => {
        let valR = (values[i] / 100) * r;
        return {
            x: cx + valR * Math.cos(angle),
            y: cy + valR * Math.sin(angle)
        };
    });

    // Рисуем закрашенный полигон результатов
    ctx.fillStyle = 'rgba(30, 60, 114, 0.4)';
    ctx.strokeStyle = '#1e3c72';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.lineTo(points[2].x, points[2].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

// Фича: Скачивание результатов в формате JSON
function downloadJSON() {
    const results = calculateTSQM(userAnswers);
    const exportData = {
        patient: userName,
        date: new Date().toLocaleString('ru-RU'),
        rawAnswers: userAnswers,
        scores: results
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TSQM9_Result_${userName.replace(/\s+/g, '_')}.json`;
    a.click();
}

// Фича: Интеграция с Google Таблицами
function sendToGoogleSheets() {
    const btn = document.getElementById('send-google-btn');
    const results = calculateTSQM(userAnswers);
    
    btn.disabled = true;
    btn.innerText = "Отправка...";

    const payload = {
        name: userName,
        date: new Date().toLocaleString('ru-RU'),
        effectiveness: results.effectiveness,
        convenience: results.convenience,
        global: results.global
    };

    // Отправляем стандартный fetch POST запрос в Google Apps Script
    fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Важно для обхода CORS ограничений скрипта Google
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(() => {
        btn.innerText = "Успешно отправлено!";
        btn.style.backgroundColor = "#059669";
    })
    .catch(err => {
        console.error(err);
        btn.disabled = false;
        btn.innerText = "Ошибка! Повторить";
    });
}

function loadDraft() {
    const savedStep = localStorage.getItem('tsqm_step');
    const savedAnswers = localStorage.getItem('tsqm_answers');
    const savedName = localStorage.getItem('tsqm_name');

    if (savedStep && savedAnswers) {
        currentStep = parseInt(savedStep);
        userAnswers = JSON.parse(savedAnswers);
        userName = savedName || "Пациент";
        document.getElementById('username-input').value = userName === "Пациент" ? "" : userName;
        changeStep(currentStep);
    }
}

function resetQuiz() {
    userAnswers = {};
    userName = "";
    localStorage.clear();
    document.getElementById('username-input').value = "";
    changeStep(0);
}

document.addEventListener('DOMContentLoaded', init);