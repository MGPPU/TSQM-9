import { questions } from './questions.js';
import { calculateTSQM } from './calculator.js';

// ==========================================
// КОНФИГУРАЦИЯ ИНТЕГРАЦИИ (МЕНЯЙТЕ ССЫЛКИ ТУТ)
// ==========================================
const CONFIG = {
    // URL вашего развернутого Web App из Google Apps Script для отправки по API
    // GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzyLz5U2B5UiPsS52trKJ0XJovm0FOsB2dHEH47fYec65zYkWYCKaUjZ0RHPVx_MW0-fA/exec",
	GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbycxHaqLvjc3zhHH-Q_LpVtFcnB_fToiDuYkyoZwUk_pWVT4NVt_Eiaer0u88_jEQbgNA/exec",
    
    // Ссылка на саму Google Таблицу, которая откроется по кнопке
    GOOGLE_SHEET_URL: "https://docs.google.com/spreadsheets/d/1MVpcY8gsCorWL-yyh5uBYr6sRlhDs-GPRb7fho4Nu9w/edit?usp=sharing"
};

let currentStep = 0; 
let userAnswers = {};
let userName = "";
let isSending = false; // Флаг-предохранитель от двойных отправок

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

	window.addEventListener('online', processOfflineQueue);
    // document.addEventListener('DOMContentLoaded', processOfflineQueue);

	// Замена старого вызова на "отложенный" запуск
window.addEventListener('load', () => {
    // alert("Скрипт готов и запущен"); // Проверка
    
    // Принудительный вызов
    if (typeof processOfflineQueue === 'function') {
        processOfflineQueue();
    } else {
        // alert("Функция processOfflineQueue не найдена!");
    }
});
	
    // Настраиваем ссылку для кнопки "Открыть таблицу" из конфига
    const sheetLink = document.getElementById('open-sheet-link');
    if (sheetLink) {
        sheetLink.href = CONFIG.GOOGLE_SHEET_URL;
    }

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
            localStorage.setItem('tsqm_answers', JSON.stringify(userAnswers));
            setTimeout(() => changeStep(currentStep + 1), 200);
        });
        container.appendChild(button);
    });

    document.getElementById('prev-btn').disabled = currentStep === 1;
}

function renderResults() {
    // Если отправка уже идет, мгновенно блокируем повторный вызов функции
    if (isSending) return; 
    isSending = true; 

    const results = calculateTSQM(userAnswers);
    
    // Генерируем ID ОДИН РАЗ строго на базе времени, без рандома, 
    // чтобы при случайном двойном клике ID получились абсолютно одинаковыми!
    const submissionId = "tsqm_" + Math.floor(Date.now() / 1000);

    document.getElementById('score-effectiveness').innerText = Math.round(results.effectiveness);
    document.getElementById('score-convenience').innerText = Math.round(results.convenience);
    document.getElementById('score-global').innerText = Math.round(results.global);

    drawRadarChart(results.effectiveness, results.convenience, results.global);
    
    // Передаем данные на отправку
    autoSendToGoogleSheets(results, submissionId);

    localStorage.removeItem('tsqm_step');
    localStorage.removeItem('tsqm_answers');
}

function drawRadarChart(eff, conv, glob) {
    const canvas = document.getElementById('radarCanvas');
    const ctx = canvas.getContext('2d');
    const logicalWidth = 300;
    const logicalHeight = 300;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    canvas.style.width = logicalWidth + 'px';
    canvas.style.height = logicalHeight + 'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    const cx = logicalWidth / 2;
    const cy = logicalHeight / 2;
    const r = 100;
    const angles = [-Math.PI/2, Math.PI/6, 5*Math.PI/6];
    const labels = ['Эффект.', 'Удобство', 'Общая'];

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

    const values = [eff, conv, glob];
    const points = angles.map((angle, i) => {
        let valR = (values[i] / 100) * r;
        return { x: cx + valR * Math.cos(angle), y: cy + valR * Math.sin(angle) };
    });

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

// Переименованная функция скачивания JSON в "Сохранить результат"
function downloadJSON() {
    const results = calculateTSQM(userAnswers);
    const exportData = {
        patient: userName,
        date: new Date().toLocaleString('ru-RU'),
        rawAnswers: userAnswers,
        scores: {
            effectiveness: Math.round(results.effectiveness),
            convenience: Math.round(results.convenience),
            global: Math.round(results.global)
        }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TSQM9_Result_${userName.replace(/\s+/g, '_')}.json`;
    a.click();
}

// Сохранение в очередь с проверкой на дубли
function saveToOfflineQueue(payload) {
    let queue = JSON.parse(localStorage.getItem('offline_submissions') || '[]');
    // Проверяем, нет ли уже такого ID в очереди, чтобы не дублировать
    if (!queue.find(item => item.submission_id === payload.submission_id)) {
        queue.push(payload);
        localStorage.setItem('offline_submissions', JSON.stringify(queue));
    }
}

// Попытка отправить всё, что накопилось в очереди
async function processOfflineQueue() {
	// alert(1)
    // Если сети нет, даже не пытаемся
    if (!navigator.onLine) return;

    let queue = JSON.parse(localStorage.getItem('offline_submissions') || '[]');
    if (queue.length === 0) return;

    // ВАЖНО: Мы не очищаем очередь сразу. 
    // Мы пробуем отправить, и только ПОСЛЕ успешного fetch удаляем запись.
    for (let i = 0; i < queue.length; i++) {
        const payload = queue[i];
        try {
            await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            // Если дошли сюда — считаем отправленным
            queue.splice(i, 1);
            i--; // Корректируем индекс после удаления
            localStorage.setItem('offline_submissions', JSON.stringify(queue));
        } catch (err) {
            console.error("Ошибка сети, прерываем цикл:", err);
            break; // Останавливаемся, если сеть пропала в процессе
        }
    }
}
// Автоматическая фоновая отправка результатов по API
function autoSendToGoogleSheets(results, submissionId) {
    // 1. Проверяем, не отправляли ли мы этот конкретный ID ранее
    if (localStorage.getItem('sent_' + submissionId)) {
        console.log("Данный результат уже был успешно отправлен.");
        return;
    }

    const formattedAnswers = {};
    Object.keys(userAnswers).forEach((key, index) => {
        formattedAnswers[`q${index + 1}`] = userAnswers[key];
    });

    const payload = {
        submission_id: submissionId,
        name: userName,
        date: new Date().toLocaleString('ru-RU'),
        effectiveness: Math.round(results.effectiveness),
        convenience: Math.round(results.convenience),
        global: Math.round(results.global),
        raw_answers: formattedAnswers
    };

    // 2. Если сети нет, сразу в очередь (не трогая статус 'sent_')
    if (!navigator.onLine) {
        saveToOfflineQueue(payload);
        return;
    }

    // 3. Если сеть есть - пробуем отправить
    fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(() => {
        console.log("Данные успешно отправлены.");
        // Помечаем ID как отправленный, чтобы при перезагрузке не слать дубль
        localStorage.setItem('sent_' + submissionId, 'true');
        isSending = true; 
    })
    .catch(err => {
        console.error("Ошибка отправки, сохраняю в очередь:", err);
        saveToOfflineQueue(payload);
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
    isSending = false; // Сброс флага для нового прохождения
    localStorage.clear();
    document.getElementById('username-input').value = "";
    changeStep(0);
}

document.addEventListener('DOMContentLoaded', init);