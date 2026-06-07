let currentSection = 'notes';
let transIndex = 0;
let transScore = 0;
let transAnswered = 0;
let transTotal = 0;
let quizIndex = 0;
let quizScore = 0;
let quizTotal = 0;
let cardIndex = 0;

function init() {
    loadNotes();
    setupNavigation();
    loadTranslation();
    loadQuiz();
    loadFlashcard();
}

function setupNavigation() {
    document.querySelectorAll('nav button').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            showSection(section);
        });
    });
}

function showSection(section) {
    currentSection = section;
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.querySelector(`nav button[data-section="${section}"]`).classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
}

function loadNotes() {
    const container = document.getElementById('notes-content');
    if (AppData.notes.length === 0) {
        container.innerHTML = '<p style="color: #666;">尚無重點資料。</p>';
        return;
    }
    container.innerHTML = AppData.notes.map((note, i) => `
        <div class="content-item">
            <h4>${i + 1}. ${note.title}</h4>
            <p>${note.content}</p>
        </div>
    `).join('');
}

function loadTranslation() {
    transTotal = AppData.translations.length;
    document.getElementById('trans-total').textContent = transTotal;
    if (transTotal === 0) return;
    showTranslation(transIndex);
}

function showTranslation(index) {
    const item = AppData.translations[index];
    document.getElementById('trans-current').textContent = index + 1;
    document.getElementById('trans-question').textContent = item.question;
    document.getElementById('trans-input').value = '';
    document.getElementById('trans-input').className = '';
    document.getElementById('trans-feedback').innerHTML = '';
    document.getElementById('trans-progress').style.width = `${((index) / transTotal) * 100}%`;
    updateTransAccuracy();
}

function checkTranslation() {
    const input = document.getElementById('trans-input').value.trim();
    const item = AppData.translations[transIndex];
    const feedback = document.getElementById('trans-feedback');

    if (!input) {
        feedback.innerHTML = '<span style="color: #f44336;">請輸入答案</span>';
        return;
    }

    document.getElementById('trans-input').disabled = true;
    transAnswered++;

    if (input === item.answer) {
        transScore++;
        document.getElementById('trans-input').className = 'correct';
        feedback.innerHTML = '<span style="color: #4caf50;">✓ 正確！</span>';
    } else {
        document.getElementById('trans-input').className = 'wrong';
        feedback.innerHTML = `<span style="color: #f44336;">✗ 正確答案：${item.answer}</span>`;
    }

    updateTransAccuracy();
    setTimeout(() => nextTranslation(), 1500);
}

function skipTranslation() {
    nextTranslation();
}

function showTransAnswer() {
    const item = AppData.translations[transIndex];
    document.getElementById('trans-input').value = item.answer;
}

function nextTranslation() {
    transIndex = (transIndex + 1) % AppData.translations.length;
    document.getElementById('trans-input').disabled = false;
    showTranslation(transIndex);
}

function updateTransAccuracy() {
    const accuracy = transAnswered > 0 ? Math.round((transScore / transAnswered) * 100) : 0;
    document.getElementById('trans-accuracy').textContent = accuracy;
}

function loadQuiz() {
    quizTotal = AppData.quiz.length;
    document.getElementById('quiz-total').textContent = quizTotal;
    if (quizTotal === 0) return;
    showQuiz(quizIndex);
}

function showQuiz(index) {
    const item = AppData.quiz[index];
    document.getElementById('quiz-current').textContent = index + 1;
    document.getElementById('quiz-question').textContent = item.question;
    document.getElementById('quiz-progress').style.width = `${((index) / quizTotal) * 100}%`;
    document.getElementById('quiz-score').textContent = quizScore;
    document.getElementById('quiz-feedback').innerHTML = '';

    const optionsHtml = item.options.map((opt, i) => `
        <button class="btn-secondary" onclick="selectAnswer(${i})" style="display: block; width: 100%; margin: 8px 0; text-align: left;">
            ${String.fromCharCode(65 + i)}. ${opt}
        </button>
    `).join('');
    document.getElementById('quiz-options').innerHTML = optionsHtml;
}

function selectAnswer(index) {
    const item = AppData.quiz[quizIndex];
    const feedback = document.getElementById('quiz-feedback');

    if (index === item.correct) {
        quizScore++;
        feedback.innerHTML = '<span style="color: #4caf50;">✓ 正確！</span>';
    } else {
        feedback.innerHTML = `<span style="color: #f44336;">✗ 正確答案：${String.fromCharCode(65 + item.correct)}. ${item.options[item.correct]}</span>`;
    }

    document.getElementById('quiz-score').textContent = quizScore;
    document.getElementById('quiz-progress').style.width = `${((quizIndex + 1) / quizTotal) * 100}%`;

    setTimeout(() => {
        quizIndex = (quizIndex + 1) % AppData.quiz.length;
        if (quizIndex === 0) {
            showResult();
        } else {
            showQuiz(quizIndex);
        }
    }, 1500);
}

function showResult() {
    const percentage = Math.round((quizScore / quizTotal) * 100);
    document.getElementById('final-score').textContent = percentage + '%';
    document.getElementById('result-message').textContent =
        percentage >= 80 ? '太棒了！做得很好！' :
        percentage >= 60 ? '還不錯，繼續加油！' :
        '多練習幾次會更好！';
    document.getElementById('result-modal').classList.add('show');
}

function restartPractice() {
    document.getElementById('result-modal').classList.remove('show');
    quizIndex = 0;
    quizScore = 0;
    showQuiz(0);
}

function loadFlashcard() {
    if (AppData.flashcards.length === 0) return;
    showCard(cardIndex);
}

function showCard(index) {
    const card = AppData.flashcards[index];
    document.getElementById('card-front').textContent = card.front;
    document.getElementById('card-back').textContent = card.back;
    document.getElementById('card-counter').textContent = `${index + 1} / ${AppData.flashcards.length}`;
    document.querySelector('.flashcard').classList.remove('flipped');
}

function flipCard() {
    document.querySelector('.flashcard').classList.toggle('flipped');
}

function prevCard() {
    cardIndex = (cardIndex - 1 + AppData.flashcards.length) % AppData.flashcards.length;
    showCard(cardIndex);
}

function nextCard() {
    cardIndex = (cardIndex + 1) % AppData.flashcards.length;
    showCard(cardIndex);
}

document.addEventListener('DOMContentLoaded', init);