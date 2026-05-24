import { questions } from './questions.js';
import { calculateTSQM } from './calculator.js';

let currentStep = 0; // 0: Старт, 1..9: Вопросы, 10: Результаты
let userAnswers = {};

const screens = {
    welcome: document.getElementById('welcome-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen')
};

function init() {
    document.getElementById('start-btn').addEventListener('click', () => changeStep(1));
    document.getElementById('prev-btn').addEventListener('click', () => changeStep(currentStep - 1));
    document.getElementById('restart-btn').addEventListener('click', resetQuiz);
}

function changeStep(step) {
    currentStep = step;
    updateProgressBar();

    if (currentStep === 0) {
        showScreen('welcome');
    } else if (currentStep > 0 && currentStep <= questions.length) {
        showScreen('quiz');
        renderQuestion(questions[currentStep - 1]);
    } else {
        showScreen('result');
        renderResults();
    }
}

function showScreen(screenKey) {
    Object.keys(screens).forEach(key => {
        if (key === screenKey) {
            screens[key].classList.remove('hidden');
        } else {
            screens[key].classList.add('hidden');
        }
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
        
        button.innerText = option;
        button.addEventListener('click', () => {
            userAnswers[q.id] = scoreValue;
            // Плавный переход к следующему вопросу после выбора
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
}

function resetQuiz() {
    userAnswers = {};
    changeStep(0);
}

document.addEventListener('DOMContentLoaded', init);