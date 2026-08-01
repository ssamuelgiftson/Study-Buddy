// ===== SECTION NAVIGATION =====
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    window.scrollTo(0, 0);
}

// ===== DARK THEME TOGGLE =====
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const btn = document.querySelector('.theme-toggle');
    btn.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
}

// ===== DAILY MOTIVATION QUOTES =====
const quotes = [
    "\"The only way to do great work is to love what you do.\" - Steve Jobs",
    "\"Education is the most powerful weapon to change the world.\" - Nelson Mandela",
    "\"Practice makes a man perfect!\" - Keep Going, Samuel! 💪",
    "\"The expert in anything was once a beginner.\" - Helen Hayes",
    "\"Success is the sum of small efforts repeated day in and day out.\"",
    "\"Don't watch the clock; do what it does. Keep going.\" - Sam Levenson",
    "\"The beautiful thing about learning is that nobody can take it away from you.\"",
    "\"Believe you can and you're halfway there.\" - Theodore Roosevelt",
    "\"Math is not about numbers, it's about understanding patterns!\" 📐",
    "\"हिंदी हमारी मातृभाषा है, इसे गर्व से सीखें!\" 🇮🇳"
];

function showDailyQuote() {
    const today = new Date().getDate();
    document.getElementById('dailyQuote').textContent = quotes[today % quotes.length];
}

// ===== MATH QUIZ =====
let mathScore = 0;
let mathTotal = 0;

const mathQuestions = [
    { q: "What is (a + b)² equal to?", options: ["a² + b²", "a² + 2ab + b²", "a² - 2ab + b²", "2a² + 2b²"], answer: 1 },
    { q: "Area of Trapezium = ?", options: ["l × b", "½ × (a+b) × h", "π × r²", "½ × b × h"], answer: 1 },
    { q: "What is 15% of 200?", options: ["15", "20", "25", "30"], answer: 3 },
    { q: "If x + 5 = 12, what is x?", options: ["5", "6", "7", "8"], answer: 2 },
    { q: "Volume of Cube with side 3cm = ?", options: ["9 cm³", "18 cm³", "27 cm³", "36 cm³"], answer: 2 },
    { q: "What is √144?", options: ["10", "11", "12", "13"], answer: 2 },
    { q: "Sum of angles in a quadrilateral = ?", options: ["180°", "270°", "360°", "540°"], answer: 2 },
    { q: "What is 2³ × 3²?", options: ["36", "48", "72", "108"], answer: 2 },
    { q: "SI for P=1000, R=10%, T=2 years?", options: ["100", "150", "200", "250"], answer: 2 },
    { q: "What is (a-b)(a+b)?", options: ["a² + b²", "a² - b²", "2ab", "a² + 2ab + b²"], answer: 1 }
];

function loadMathQuiz() {
    const idx = Math.floor(Math.random() * mathQuestions.length);
    const q = mathQuestions[idx];
    document.getElementById('mathQuestion').textContent = q.q;
    document.getElementById('mathResult').textContent = '';

    const optDiv = document.getElementById('mathOptions');
    optDiv.innerHTML = '';
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = () => checkMathAnswer(i, q.answer);
        optDiv.appendChild(btn);
    });
}

function checkMathAnswer(selected, correct) {
    mathTotal++;
    const resultDiv = document.getElementById('mathResult');
    if (selected === correct) {
        mathScore++;
        resultDiv.textContent = '✅ Correct! Well done!';
        resultDiv.style.color = '#2ecc71';
    } else {
        resultDiv.textContent = '❌ Wrong! The correct answer was: ' + mathQuestions.find(q => q.answer === correct)?.options[correct];
        resultDiv.style.color = '#e74c3c';
    }
    document.getElementById('mathScore').textContent = mathScore;
    document.getElementById('mathTotal').textContent = mathTotal;
}

// ===== HINDI FLASHCARDS =====
const hindiWords = [
    { word: "अभिलाषा", meaning: "Desire (इच्छा)" },
    { word: "अद्भुत", meaning: "Amazing (अनोखा)" },
    { word: "विद्यालय", meaning: "School" },
    { word: "परिश्रम", meaning: "Hard Work (मेहनत)" },
    { word: "साहस", meaning: "Courage (बहादुरी)" },
    { word: "विज्ञान", meaning: "Science" },
    { word: "गणित", meaning: "Mathematics" },
    { word: "पर्यावरण", meaning: "Environment" },
    { word: "स्वतंत्रता", meaning: "Freedom / Independence" },
    { word: "अनुशासन", meaning: "Discipline" },
    { word: "सहानुभूति", meaning: "Sympathy" },
    { word: "प्रयत्न", meaning: "Effort / Attempt" },
    { word: "उत्साह", meaning: "Enthusiasm" },
    { word: "कर्तव्य", meaning: "Duty" },
    { word: "सफलता", meaning: "Success" }
];

let currentFlashcard = 0;

function showFlashcard() {
    const card = hindiWords[currentFlashcard];
    document.getElementById('hindiWord').textContent = card.word;
    document.getElementById('hindiMeaning').textContent = card.meaning;
    document.getElementById('flashcardCount').textContent = `${currentFlashcard + 1} / ${hindiWords.length}`;
    document.getElementById('hindiFlashcard').classList.remove('flipped');
}

function flipCard() {
    document.getElementById('hindiFlashcard').classList.toggle('flipped');
}

function nextFlashcard() {
    currentFlashcard = (currentFlashcard + 1) % hindiWords.length;
    showFlashcard();
}

function prevFlashcard() {
    currentFlashcard = (currentFlashcard - 1 + hindiWords.length) % hindiWords.length;
    showFlashcard();
}

// ===== HINDI QUIZ =====
let hindiScore = 0;
let hindiTotal = 0;

const hindiQuestions = [
    { q: "\"सूर्य\" का पर्यायवाची शब्द क्या है?", options: ["चंद्र", "दिनकर", "तारा", "नभ"], answer: 1 },
    { q: "\"अंधकार\" का विलोम शब्द क्या है?", options: ["रात", "प्रकाश", "काला", "अँधेरा"], answer: 1 },
    { q: "\"राम\" कौन सी संज्ञा है?", options: ["जातिवाचक", "व्यक्तिवाचक", "भाववाचक", "समूहवाचक"], answer: 1 },
    { q: "\"वह खाना खाता है\" - काल बताइए?", options: ["भूतकाल", "वर्तमानकाल", "भविष्यकाल", "संदिग्ध काल"], answer: 1 },
    { q: "\"पुस्तकालय\" में कौन सा समास है?", options: ["द्वंद्व", "तत्पुरुष", "बहुव्रीहि", "कर्मधारय"], answer: 1 },
    { q: "\"गाय\" का लिंग बदलिए?", options: ["गायक", "बैल", "गौ", "गोवंश"], answer: 1 },
    { q: "\"सुंदर\" शब्द क्या है?", options: ["संज्ञा", "सर्वनाम", "विशेषण", "क्रिया"], answer: 2 },
    { q: "\"जल\" का पर्यायवाची?", options: ["अग्नि", "पानी", "वायु", "धरा"], answer: 1 }
];

function loadHindiQuiz() {
    const idx = Math.floor(Math.random() * hindiQuestions.length);
    const q = hindiQuestions[idx];
    document.getElementById('hindiQuestion').textContent = q.q;
    document.getElementById('hindiResult').textContent = '';

    const optDiv = document.getElementById('hindiOptions');
    optDiv.innerHTML = '';
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = () => checkHindiAnswer(i, q.answer);
        optDiv.appendChild(btn);
    });
}

function checkHindiAnswer(selected, correct) {
    hindiTotal++;
    const resultDiv = document.getElementById('hindiResult');
    if (selected === correct) {
        hindiScore++;
        resultDiv.textContent = '✅ सही उत्तर! शाबाश!';
        resultDiv.style.color = '#2ecc71';
    } else {
        resultDiv.textContent = '❌ गलत उत्तर!';
        resultDiv.style.color = '#e74c3c';
    }
    document.getElementById('hindiScore').textContent = hindiScore;
    document.getElementById('hindiTotal').textContent = hindiTotal;
}

// ===== CALCULATOR =====
function calcInput(val) {
    document.getElementById('calcDisplay').value += val;
}

function calcClear() {
    document.getElementById('calcDisplay').value = '';
}

function calcResult() {
    try {
        document.getElementById('calcDisplay').value = eval(document.getElementById('calcDisplay').value);
    } catch {
        document.getElementById('calcDisplay').value = 'Error';
    }
}

// ===== POMODORO TIMER =====
let timerInterval = null;
let timeLeft = 25 * 60;

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timerDisplay').textContent = `${mins}:${secs}`;
}

function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            alert('⏰ Time is up! Great study session, Samuel!');
            return;
        }
        timeLeft--;
        updateTimerDisplay();
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function resetTimer() {
    pauseTimer();
    timeLeft = 25 * 60;
    updateTimerDisplay();
}

function setTimer(mins) {
    pauseTimer();
    timeLeft = mins * 60;
    updateTimerDisplay();
}

// ===== INITIALIZE =====
window.onload = function () {
    showDailyQuote();
    loadMathQuiz();
    showFlashcard();
    loadHindiQuiz();
    updateTimerDisplay();
};
