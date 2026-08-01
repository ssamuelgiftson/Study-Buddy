// ========================================
//  STUDYBUDDY - COMPLETE JAVASCRIPT
//  By Samuel Giftson S
// ========================================

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
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
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
    "\"हिंदी हमारी मातृभाषा है, इसे गर्व से सीखें!\" 🇮🇳",
    "\"Reading is to the mind what exercise is to the body.\" - Joseph Addison",
    "\"A room without books is like a body without a soul.\" - Marcus Cicero"
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
    { q: "What is (a-b)(a+b)?", options: ["a² + b²", "a² - b²", "2ab", "a² + 2ab + b²"], answer: 1 },
    { q: "What is the cube root of 64?", options: ["2", "3", "4", "8"], answer: 2 },
    { q: "If 3x - 7 = 8, find x?", options: ["3", "4", "5", "6"], answer: 2 }
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
        resultDiv.textContent = '❌ Wrong! Try the next one!';
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

function flipCard() { document.getElementById('hindiFlashcard').classList.toggle('flipped'); }
function nextFlashcard() { currentFlashcard = (currentFlashcard + 1) % hindiWords.length; showFlashcard(); }
function prevFlashcard() { currentFlashcard = (currentFlashcard - 1 + hindiWords.length) % hindiWords.length; showFlashcard(); }

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

// ===== ENGLISH FLASHCARDS =====
const engWords = [
    { word: "Benevolent", meaning: "Kind, generous (दयालु)" },
    { word: "Eloquent", meaning: "Fluent, expressive in speaking (वाक्पटु)" },
    { word: "Resilient", meaning: "Able to recover quickly (लचीला)" },
    { word: "Diligent", meaning: "Hardworking, careful (परिश्रमी)" },
    { word: "Ambiguous", meaning: "Having double meaning (अस्पष्ट)" },
    { word: "Inevitable", meaning: "Certain to happen (अनिवार्य)" },
    { word: "Compassion", meaning: "Deep sympathy (करुणा)" },
    { word: "Perseverance", meaning: "Continued effort (दृढ़ता)" },
    { word: "Magnificent", meaning: "Extremely beautiful (शानदार)" },
    { word: "Catastrophe", meaning: "A great disaster (विपत्ति)" },
    { word: "Reluctant", meaning: "Unwilling, hesitant (अनिच्छुक)" },
    { word: "Abundant", meaning: "Existing in large amounts (प्रचुर)" },
    { word: "Melancholy", meaning: "Deep sadness (उदासी)" },
    { word: "Courageous", meaning: "Brave, fearless (साहसी)" },
    { word: "Gratitude", meaning: "Thankfulness (कृतज्ञता)" }
];

let currentEngFlashcard = 0;

function showEngFlashcard() {
    const card = engWords[currentEngFlashcard];
    document.getElementById('engWord').textContent = card.word;
    document.getElementById('engMeaning').textContent = card.meaning;
    document.getElementById('engFlashcardCount').textContent = `${currentEngFlashcard + 1} / ${engWords.length}`;
    document.getElementById('engFlashcard').classList.remove('flipped');
}

function flipEngCard() { document.getElementById('engFlashcard').classList.toggle('flipped'); }
function nextEngFlashcard() { currentEngFlashcard = (currentEngFlashcard + 1) % engWords.length; showEngFlashcard(); }
function prevEngFlashcard() { currentEngFlashcard = (currentEngFlashcard - 1 + engWords.length) % engWords.length; showEngFlashcard(); }

// ===== ENGLISH QUIZ =====
let engScore = 0;
let engTotal = 0;

const engQuestions = [
    { q: "Which is a correct passive voice? 'She writes a letter.'", options: ["A letter is written by her.", "A letter was written by her.", "A letter written by her.", "She is written a letter."], answer: 0 },
    { q: "Choose the correct article: '__ honest man'", options: ["A", "An", "The", "No article"], answer: 1 },
    { q: "What type of noun is 'happiness'?", options: ["Common", "Proper", "Abstract", "Collective"], answer: 2 },
    { q: "Identify the tense: 'They have been playing since morning.'", options: ["Present Perfect", "Present Perfect Continuous", "Past Perfect", "Simple Present"], answer: 1 },
    { q: "'He said, \"I am going.\"' — Indirect speech?", options: ["He said that he is going.", "He said that he was going.", "He said that I am going.", "He told that he was going."], answer: 1 },
    { q: "Which is an exclamatory sentence?", options: ["What is your name?", "Please sit down.", "What a beautiful day!", "I like ice cream."], answer: 2 },
    { q: "'Can' is used to express:", options: ["Permission", "Ability", "Obligation", "Possibility"], answer: 1 },
    { q: "Choose the synonym of 'Brave':", options: ["Timid", "Courageous", "Lazy", "Weak"], answer: 1 },
    { q: "What is the antonym of 'Ancient'?", options: ["Old", "Modern", "Historic", "Traditional"], answer: 1 },
    { q: "'Neither...nor' is a:", options: ["Conjunction", "Preposition", "Interjection", "Adverb"], answer: 0 },
    { q: "Identify the adjective: 'She wore a beautiful dress.'", options: ["She", "wore", "beautiful", "dress"], answer: 2 },
    { q: "Which modal shows necessity?", options: ["Can", "May", "Must", "Would"], answer: 2 }
];

function loadEngQuiz() {
    const idx = Math.floor(Math.random() * engQuestions.length);
    const q = engQuestions[idx];
    document.getElementById('engQuestion').textContent = q.q;
    document.getElementById('engResult').textContent = '';
    const optDiv = document.getElementById('engOptions');
    optDiv.innerHTML = '';
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = () => checkEngAnswer(i, q.answer);
        optDiv.appendChild(btn);
    });
}

function checkEngAnswer(selected, correct) {
    engTotal++;
    const resultDiv = document.getElementById('engResult');
    if (selected === correct) {
        engScore++;
        resultDiv.textContent = '✅ Correct! Great job!';
        resultDiv.style.color = '#2ecc71';
    } else {
        resultDiv.textContent = '❌ Wrong! Keep practicing!';
        resultDiv.style.color = '#e74c3c';
    }
    document.getElementById('engScore').textContent = engScore;
    document.getElementById('engTotal').textContent = engTotal;
}

// ===== SPOT THE ERROR QUIZ =====
let errorScore = 0;
let errorTotal = 0;

const errorQuestions = [
    { q: "Find the error: 'He go to school every day.'", options: ["He goes to school", "He go to school", "He going to school", "He gone to school"], answer: 0 },
    { q: "Find the error: 'She is more taller than me.'", options: ["She is most taller", "She is more tall", "She is taller than me", "She is taller than I"], answer: 2 },
    { q: "Find the error: 'I have went to the market.'", options: ["I have gone to the market", "I have go to the market", "I have going to the market", "I had went to the market"], answer: 0 },
    { q: "Find the error: 'Each of the boys have a pen.'", options: ["Each of the boys has a pen", "Each boys have a pen", "Every boys have a pen", "Each of the boy have a pen"], answer: 0 },
    { q: "Find the error: 'He is knowing the answer.'", options: ["He is know the answer", "He knows the answer", "He known the answer", "He knowing the answer"], answer: 1 },
    { q: "Find the error: 'One of my friend is a doctor.'", options: ["One of my friends is a doctor", "One of my friend are a doctor", "One friend of my is a doctor", "One of friend is a doctor"], answer: 0 }
];

function loadErrorQuiz() {
    const idx = Math.floor(Math.random() * errorQuestions.length);
    const q = errorQuestions[idx];
    document.getElementById('errorSentence').textContent = q.q;
    document.getElementById('errorResult').textContent = '';
    const optDiv = document.getElementById('errorOptions');
    optDiv.innerHTML = '';
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = () => checkErrorAnswer(i, q.answer);
        optDiv.appendChild(btn);
    });
}

function checkErrorAnswer(selected, correct) {
    errorTotal++;
    const resultDiv = document.getElementById('errorResult');
    if (selected === correct) {
        errorScore++;
        resultDiv.textContent = '✅ Correct! You found the right sentence!';
        resultDiv.style.color = '#2ecc71';
    } else {
        resultDiv.textContent = '❌ Not quite! Try again!';
        resultDiv.style.color = '#e74c3c';
    }
    document.getElementById('errorScore').textContent = errorScore;
    document.getElementById('errorTotal').textContent = errorTotal;
}

// ===== CALCULATOR =====
function calcInput(val) { document.getElementById('calcDisplay').value += val; }
function calcClear() { document.getElementById('calcDisplay').value = ''; }
function calcResult() {
    try {
        document.getElementById('calcDisplay').value = eval(document.getElementById('calcDisplay').value);
    } catch { document.getElementById('calcDisplay').value = 'Error'; }
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

function pauseTimer() { clearInterval(timerInterval); timerInterval = null; }

function resetTimer() { pauseTimer(); timeLeft = 25 * 60; updateTimerDisplay(); }

function setTimer(mins) { pauseTimer(); timeLeft = mins * 60; updateTimerDisplay(); }

// ========================================
//  BOOK PANEL SYSTEM
// ========================================

// ===== Toggle Book Panel =====
function toggleBookPanel() {
    const panel = document.getElementById('bookPanel');
    const overlay = document.getElementById('overlay');
    panel.classList.toggle('open');
    overlay.classList.toggle('show');
}

// ===== Toggle Book Group (Accordion) =====
function toggleBookGroup(groupId) {
    const group = document.getElementById(groupId);
    const arrow = document.getElementById(groupId + 'Arrow');
    group.classList.toggle('open');
    if (arrow) {
        arrow.textContent = group.classList.contains('open') ? '▲' : '▼';
    }
}

// ===== Selected Books State =====
let selectedBooks = JSON.parse(localStorage.getItem('selectedBooks')) || {};
let selectedChapters = JSON.parse(localStorage.getItem('selectedChapters')) || {};

// ===== Select Book =====
function selectBook(subject, bookName, element) {
    // Remove previous selection styling
    if (element) {
        const siblings = element.parentElement.querySelectorAll('.book-item');
        siblings.forEach(s => s.classList.remove('selected'));
        element.classList.add('selected');
    }

    selectedBooks[subject] = bookName;
    localStorage.setItem('selectedBooks', JSON.stringify(selectedBooks));
    updateBookDisplay();
}

// ===== Select Chapter =====
function selectChapter(subject, chapterName) {
    selectedChapters[subject] = chapterName;
    localStorage.setItem('selectedChapters', JSON.stringify(selectedChapters));

    // Highlight active chapter button
    const allBtns = document.querySelectorAll('.chapter-btn');
    allBtns.forEach(btn => {
        if (btn.textContent.includes(chapterName.substring(0, 10))) {
            btn.classList.add('active');
        }
    });

    updateBookDisplay();
    loadDynamicContent(subject, chapterName);

    // Auto navigate to that subject
    showSection(subject);
    toggleBookPanel();
}

// ===== Update Display =====
function updateBookDisplay() {
    // Update book indicator
    const parts = [];
    for (const [subj, book] of Object.entries(selectedBooks)) {
        const ch = selectedChapters[subj] || '';
        parts.push(`${subj.toUpperCase()}: ${book}${ch ? ' → ' + ch : ''}`);
    }
    document.getElementById('currentBookDisplay').textContent = parts.length ? parts.join(' | ') : 'None Selected';

    // Update home card labels
    const subjects = ['math', 'english', 'hindi', 'science'];
    subjects.forEach(subj => {
        const label = document.getElementById(subj + 'BookLabel');
        if (label) {
            const book = selectedBooks[subj];
            const ch = selectedChapters[subj];
            label.textContent = book ? `📘 ${book}${ch ? ' → ' + ch : ''}` : 'No book selected';
        }
    });

    // Update chapter banners
    subjects.forEach(subj => {
        const banner = document.getElementById(subj + 'ChapterBanner');
        if (banner) {
            const book = selectedBooks[subj];
            const ch = selectedChapters[subj];
            if (book && ch) {
                banner.textContent = `📘 ${book} → 📖 ${ch}`;
            } else if (book) {
                banner.textContent = `📘 Currently studying: ${book}`;
            } else {
                banner.textContent = '📘 Select a book from the 📚 button to load chapters';
            }
        }
    });
}

// ========================================
//  DYNAMIC CONTENT BASED ON CHAPTER
// ========================================

const chapterContent = {
    math: {
        'Ch1: Rational Numbers': {
            title: '📐 Chapter 1: Rational Numbers',
            content: `
                <h4>🔑 Key Concepts:</h4>
                <ul>
                    <li><strong>Rational Numbers:</strong> Numbers in the form p/q where q ≠ 0</li>
                    <li><strong>Natural Numbers:</strong> 1, 2, 3, 4... (N)</li>
                    <li><strong>Whole Numbers:</strong> 0, 1, 2, 3... (W)</li>
                    <li><strong>Integers:</strong> ...-3, -2, -1, 0, 1, 2, 3... (Z)</li>
                </ul>
                <h4>📌 Properties:</h4>
                <ul>
                    <li><strong>Closure:</strong> a + b is rational, a × b is rational</li>
                    <li><strong>Commutative:</strong> a + b = b + a, a × b = b × a</li>
                    <li><strong>Associative:</strong> (a + b) + c = a + (b + c)</li>
                    <li><strong>Additive Identity:</strong> a + 0 = a</li>
                    <li><strong>Multiplicative Identity:</strong> a × 1 = a</li>
                    <li><strong>Additive Inverse:</strong> a + (-a) = 0</li>
                    <li><strong>Distributive:</strong> a(b + c) = ab + ac</li>
                </ul>
                <h4>💡 Remember:</h4>
                <p>Between any two rational numbers, there are infinitely many rational numbers!</p>
            `
        },
        'Ch2: Linear Equations': {
            title: '📐 Chapter 2: Linear Equations in One Variable',
            content: `
                <h4>🔑 Key Concepts:</h4>
                <ul>
                    <li><strong>Linear Equation:</strong> An equation where the highest power of variable is 1</li>
                    <li><strong>Example:</strong> 2x + 3 = 7</li>
                    <li><strong>Solution:</strong> The value that satisfies the equation</li>
                </ul>
                <h4>📌 Steps to Solve:</h4>
                <ul>
                    <li>Step 1: Simplify both sides</li>
                    <li>Step 2: Move variables to one side (transpose)</li>
                    <li>Step 3: Move constants to the other side</li>
                    <li>Step 4: Solve for the variable</li>
                </ul>
                <h4>📝 Example:</h4>
                <p>Solve: 3x + 5 = 17</p>
                <p>→ 3x = 17 - 5 = 12</p>
                <p>→ x = 12/3 = <strong>4</strong> ✅</p>
            `
        },
        'Ch5: Squares and Square Roots': {
            title: '📐 Chapter 5: Squares and Square Roots',
            content: `
                <h4>🔑 Key Concepts:</h4>
                <ul>
                    <li><strong>Perfect Square:</strong> A number that is square of an integer</li>
                    <li><strong>Examples:</strong> 1, 4, 9, 16, 25, 36, 49, 64, 81, 100...</li>
                </ul>
                <h4>📌 Properties of Perfect Squares:</h4>
                <ul>
                    <li>Numbers ending in 2, 3, 7, or 8 are never perfect squares</li>
                    <li>A perfect square has even number of zeros at end</li>
                    <li>Square of even number is even</li>
                    <li>Square of odd number is odd</li>
                </ul>
                <h4>📌 Finding Square Root:</h4>
                <ul>
                    <li><strong>Prime Factorization Method</strong></li>
                    <li><strong>Long Division Method</strong></li>
                </ul>
                <h4>💡 Quick Squares to Remember:</h4>
                <p>11² = 121 | 12² = 144 | 13² = 169 | 14² = 196 | 15² = 225</p>
                <p>16² = 256 | 17² = 289 | 18² = 324 | 19² = 361 | 20² = 400</p>
            `
        },
        'Ch9: Mensuration': {
            title: '📐 Chapter 9: Mensuration',
            content: `
                <h4>🔑 Key Formulas:</h4>
                <ul>
                    <li><strong>Trapezium Area:</strong> ½ × (a + b) × h</li>
                    <li><strong>Rhombus Area:</strong> ½ × d₁ × d₂</li>
                    <li><strong>Cube SA:</strong> 6a² | <strong>Volume:</strong> a³</li>
                    <li><strong>Cuboid SA:</strong> 2(lb + bh + hl) | <strong>Volume:</strong> l × b × h</li>
                    <li><strong>Cylinder SA:</strong> 2πr(r + h) | <strong>Volume:</strong> πr²h</li>
                </ul>
            `
        },
        'Ch12: Factorisation': {
            title: '📐 Chapter 12: Factorisation',
            content: `
                <h4>🔑 Key Identities:</h4>
                <ul>
                    <li>(a + b)² = a² + 2ab + b²</li>
                    <li>(a - b)² = a² - 2ab + b²</li>
                    <li>a² - b² = (a + b)(a - b)</li>
                    <li>(x + a)(x + b) = x² + (a+b)x + ab</li>
                </ul>
                <h4>📌 Methods of Factorisation:</h4>
                <ul>
                    <li>Taking Common Factor</li>
                    <li>Regrouping Terms</li>
                    <li>Using Identities</li>
                    <li>Splitting Middle Term</li>
                </ul>
            `
        }
    },
    english: {
        'The Best Christmas Present': {
            title: '📖 Ch 1: The Best Christmas Present in the World',
            content: `
                <h4>📝 Summary:</h4>
                <p>The story is about a letter written by Jim Macpherson, a British soldier during World War I, to his wife Connie. The narrator finds this letter in an old desk and decides to return it to Mrs. Macpherson on Christmas Day.</p>
                <h4>🔑 Key Points:</h4>
                <ul>
                    <li>The letter describes an informal Christmas truce between British and German soldiers</li>
                    <li>Both sides celebrated Christmas together in no man's land</li>
                    <li>They shared food, drinks, and played football</li>
                    <li>The message is about peace, hope, and humanity</li>
                </ul>
                <h4>📌 Vocabulary:</h4>
                <ul>
                    <li><strong>Truce:</strong> An agreement to stop fighting temporarily</li>
                    <li><strong>No man's land:</strong> Area between enemy trenches</li>
                    <li><strong>Fusty:</strong> Old-fashioned, musty</li>
                    <li><strong>Rummaged:</strong> Searched untidily</li>
                </ul>
            `
        },
        'The Tsunami': {
            title: '📖 Ch 2: The Tsunami',
            content: `
                <h4>📝 Summary:</h4>
                <p>This chapter describes the devastating tsunami of December 2004 that struck the Andaman and Nicobar Islands and parts of Tamil Nadu. It tells stories of survival and bravery.</p>
                <h4>🔑 Key Points:</h4>
                <ul>
                    <li>The tsunami was caused by an earthquake in the Indian Ocean</li>
                    <li>Stories of Ignesious, Sanjeev, Meghna, and Almas</li>
                    <li>Animals sensed the tsunami before humans</li>
                    <li>Shows human courage and the power of nature</li>
                </ul>
                <h4>📌 Vocabulary:</h4>
                <ul>
                    <li><strong>Tsunami:</strong> A huge sea wave caused by earthquake</li>
                    <li><strong>Devastation:</strong> Great destruction</li>
                    <li><strong>Tremor:</strong> Shaking movement</li>
                    <li><strong>Surge:</strong> A sudden powerful forward movement</li>
                </ul>
            `
        },
        'The Selfish Giant': {
            title: '📖 Ch 3: The Selfish Giant (It So Happened)',
            content: `
                <h4>📝 Summary:</h4>
                <p>A story by Oscar Wilde about a Giant who doesn't let children play in his beautiful garden. His selfishness brings eternal winter. When he finally opens his heart, spring returns.</p>
                <h4>🔑 Key Points:</h4>
                <ul>
                    <li>The Giant builds a wall to keep children out</li>
                    <li>Spring, Summer, and Autumn avoid his garden</li>
                    <li>Only Winter, Frost, Snow, and North Wind stay</li>
                    <li>A little boy melts the Giant's heart</li>
                    <li>Theme: Selfishness brings suffering; love brings joy</li>
                </ul>
                <h4>📌 Vocabulary:</h4>
                <ul>
                    <li><strong>Selfish:</strong> Caring only about yourself</li>
                    <li><strong>Trespassers:</strong> People who enter without permission</li>
                    <li><strong>Blossoms:</strong> Flowers on a tree</li>
                    <li><strong>Gruff:</strong> Rough, harsh voice</li>
                </ul>
            `
        }
    },
    hindi: {
        'ध्वनि': {
            title: '📝 पाठ 1: ध्वनि (सूर्यकांत त्रिपाठी निराला)',
            content: `
                <h4>📝 कविता का सार:</h4>
                <p>यह कविता वसंत ऋतु के आगमन का वर्णन करती है। कवि प्रकृति की सुंदरता और नवजीवन का गुणगान करते हैं।</p>
                <h4>🔑 मुख्य बिंदु:</h4>
                <ul>
                    <li>वसंत ऋतु का स्वागत</li>
                    <li>प्रकृति में नया जीवन</li>
                    <li>फूलों का खिलना</li>
                    <li>आशा और उत्साह का संदेश</li>
                </ul>
                <h4>📌 कठिन शब्दार्थ:</h4>
                <ul>
                    <li><strong>अभी न होगा मेरा अंत:</strong> मैं अभी समाप्त नहीं होऊंगा</li>
                    <li><strong>ध्वनि:</strong> आवाज़, Sound</li>
                    <li><strong>कलि:</strong> कली (Bud)</li>
                </ul>
            `
        },
        'लाख की चूड़ियाँ': {
            title: '📝 पाठ 2: लाख की चूड़ियाँ',
            content: `
                <h4>📝 कहानी का सार:</h4>
                <p>यह कहानी बदलू नामक एक मनिहार की है जो लाख की सुंदर चूड़ियाँ बनाता था। मशीनी युग में उसके हस्तशिल्प की कद्र कम हो गई।</p>
                <h4>🔑 मुख्य बिंदु:</h4>
                <ul>
                    <li>बदलू एक कुशल कारीगर था</li>
                    <li>वह लाख की चूड़ियाँ बनाता था</li>
                    <li>कांच की चूड़ियों ने उसके काम को प्रभावित किया</li>
                    <li>हस्तशिल्प बनाम मशीनी उत्पादन</li>
                </ul>
                <h4>📌 कठिन शब्दार्थ:</h4>
                <ul>
                    <li><strong>मनिहार:</strong> चूड़ी बनाने वाला</li>
                    <li><strong>हस्तशिल्प:</strong> हाथ से बनी कला</li>
                    <li><strong>लाख:</strong> एक प्राकृतिक पदार्थ (Lac)</li>
                </ul>
            `
        },
        'कबीर की साखियाँ': {
            title: '📝 पाठ 9: कबीर की साखियाँ',
            content: `
                <h4>📝 सार:</h4>
                <p>कबीर दास जी की साखियाँ (दोहे) जीवन के गहरे सत्य बताती हैं।</p>
                <h4>🔑 मुख्य शिक्षाएँ:</h4>
                <ul>
                    <li>ज्ञान का महत्व</li>
                    <li>अहंकार का त्याग</li>
                    <li>प्रेम और सद्भाव</li>
                    <li>गुरु का महत्व</li>
                </ul>
                <h4>📌 प्रसिद्ध दोहा:</h4>
                <p><em>"गुरु गोविंद दोउ खड़े, काके लागूं पाय।<br>
                बलिहारी गुरु आपने, गोविंद दियो बताय।।"</em></p>
                <p><strong>अर्थ:</strong> गुरु और भगवान दोनों सामने खड़े हैं, पहले किसके चरण छूऊं? गुरु की महिमा है कि उन्होंने भगवान से मिलाया।</p>
            `
        }
    },
    science: {
        'Ch8: Force and Pressure': {
            title: '🔬 Chapter 8: Force and Pressure',
            content: `
                <h4>🔑 Key Concepts:</h4>
                <ul>
                    <li><strong>Force:</strong> A push or pull on an object</li>
                    <li><strong>Contact Forces:</strong> Muscular force, Friction</li>
                    <li><strong>Non-Contact Forces:</strong> Gravitational, Magnetic, Electrostatic</li>
                    <li><strong>Pressure:</strong> Force per unit area = F/A</li>
                </ul>
                <h4>📌 Effects of Force:</h4>
                <ul>
                    <li>Can change speed of an object</li>
                    <li>Can change direction of motion</li>
                    <li>Can change shape of an object</li>
                </ul>
                <h4>💡 Formulas:</h4>
                <p><strong>Pressure = Force ÷ Area</strong></p>
                <p>Unit: Pascal (Pa) or N/m²</p>
            `
        },
        'Ch9: Friction': {
            title: '🔬 Chapter 9: Friction',
            content: `
                <h4>🔑 Key Concepts:</h4>
                <ul>
                    <li><strong>Friction:</strong> Force that opposes motion between surfaces in contact</li>
                    <li><strong>Static Friction:</strong> Acts on stationary objects</li>
                    <li><strong>Sliding Friction:</strong> Acts on sliding objects</li>
                    <li><strong>Rolling Friction:</strong> Acts on rolling objects</li>
                </ul>
                <h4>📌 Friction depends on:</h4>
                <ul>
                    <li>Nature of surfaces (rough/smooth)</li>
                    <li>Weight of the object</li>
                </ul>
                <h4>✅ Advantages:</h4>
                <p>Walking, Writing, Braking, Gripping</p>
                <h4>❌ Disadvantages:</h4>
                <p>Wear & tear, Heat generation, Energy loss</p>
            `
        },
        'Ch10: Sound': {
            title: '🔬 Chapter 10: Sound',
            content: `
                <h4>🔑 Key Concepts:</h4>
                <ul>
                    <li><strong>Sound:</strong> Produced by vibration of objects</li>
                    <li><strong>Medium:</strong> Sound needs a medium to travel (solid, liquid, gas)</li>
                    <li><strong>Frequency:</strong> Number of vibrations per second (Hz)</li>
                    <li><strong>Amplitude:</strong> Maximum displacement of vibrating object</li>
                </ul>
                <h4>📌 Important Facts:</h4>
                <ul>
                    <li>Sound cannot travel through vacuum</li>
                    <li>Speed of sound in air: ~340 m/s</li>
                    <li>Human hearing range: 20 Hz to 20,000 Hz</li>
                    <li><strong>Noise Pollution:</strong> Above 80 dB is harmful</li>
                </ul>
            `
        }
    }
};

function loadDynamicContent(subject, chapter) {
    const container = document.getElementById(subject + 'DynamicContent');
    if (!container) return;

    const data = chapterContent[subject]?.[chapter];

    if (data) {
        container.innerHTML = `
            <div class="dynamic-chapter-content">
                <h3>${data.title}</h3>
                ${data.content}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="dynamic-chapter-content">
                <h3>📖 ${chapter}</h3>
                <p>📌 Chapter notes will be updated soon!</p>
                <p>💡 Tip: You can add your own notes using the <strong>➕ Add Custom Book</strong> option in the 📚 panel.</p>
            </div>
        `;
    }
}

// ========================================
//  CUSTOM BOOKS SYSTEM
// ========================================

let customBooks = JSON.parse(localStorage.getItem('customBooks')) || [];

function addCustomBook() {
    const subject = document.getElementById('customSubject').value;
    const bookName = document.getElementById('customBookName').value.trim();
    const chapterName = document.getElementById('customChapterName').value.trim();
    const notes = document.getElementById('customNotes').value.trim();

    if (!subject || !bookName) {
        alert('⚠️ Please select a subject and enter a book name!');
        return;
    }

    const entry = {
        id: Date.now(),
        subject: subject,
        bookName: bookName,
        chapterName: chapterName,
        notes: notes,
        date: new Date().toLocaleDateString()
    };

    customBooks.push(entry);
    localStorage.setItem('customBooks', JSON.stringify(customBooks));

    // Clear form
    document.getElementById('customBookName').value = '';
    document.getElementById('customChapterName').value = '';
    document.getElementById('customNotes').value = '';

    renderCustomBooks();
    alert('✅ Book/Notes added successfully!');
}

function deleteCustomBook(id) {
    customBooks = customBooks.filter(b => b.id !== id);
    localStorage.setItem('customBooks', JSON.stringify(customBooks));
    renderCustomBooks();
}

function renderCustomBooks() {
    const container = document.getElementById('customBooksList');
    if (!container) return;

    if (customBooks.length === 0) {
        container.innerHTML = '<p style="padding: 15px; text-align: center; color: var(--text-light);">No custom books added yet.</p>';
        return;
    }

    container.innerHTML = customBooks.map(book => `
        <div class="custom-entry" onclick="loadCustomContent('${book.subject}', '${book.bookName}', '${book.chapterName}', \`${book.notes.replace(/`/g, "'")}\`)">
            <button class="delete-custom" onclick="event.stopPropagation(); deleteCustomBook(${book.id})">✕</button>
            <h5>📘 ${book.bookName}</h5>
            <p>${book.subject.toUpperCase()} ${book.chapterName ? '→ ' + book.chapterName : ''}</p>
            <p style="font-size: 0.75rem; color: var(--text-light);">Added: ${book.date}</p>
        </div>
    `).join('');
}

function loadCustomContent(subject, bookName, chapterName, notes) {
    selectBook(subject, bookName, null);
    if (chapterName) {
        selectedChapters[subject] = chapterName;
        localStorage.setItem('selectedChapters', JSON.stringify(selectedChapters));
    }

    const container = document.getElementById(subject + 'DynamicContent');
    if (container && notes) {
        container.innerHTML = `
            <div class="dynamic-chapter-content">
                <h3>📘 ${bookName}${chapterName ? ' → ' + chapterName : ''}</h3>
                <p>${notes.replace(/\n/g, '<br>')}</p>
            </div>
        `;
    }

    updateBookDisplay();
    showSection(subject);
    toggleBookPanel();
}

// ========================================
//  INITIALIZE
// ========================================
window.onload = function () {
    // Load theme
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        document.querySelector('.theme-toggle').textContent = '☀️';
    }

    showDailyQuote();
    loadMathQuiz();
    showFlashcard();
    loadHindiQuiz();
    showEngFlashcard();
    loadEngQuiz();
    loadErrorQuiz();
    updateTimerDisplay();
    updateBookDisplay();
    renderCustomBooks();

    // Load saved chapter content
    for (const [subject, chapter] of Object.entries(selectedChapters)) {
        loadDynamicContent(subject, chapter);
    }
};
