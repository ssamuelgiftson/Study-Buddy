// ============================================
//   STUDYBUDDY v2 - PDF BOOK BASED LEARNING
//   By Samuel Giftson S
// ============================================

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ===== GLOBAL STATE =====
let books = JSON.parse(localStorage.getItem('studyBuddyBooks')) || [];
let notes = JSON.parse(localStorage.getItem('studyBuddyNotes')) || [];
let stats = JSON.parse(localStorage.getItem('studyBuddyStats')) || {
    quizzesTaken: 0, totalCorrect: 0, totalAnswered: 0, lastStudyDate: null, streak: 0
};
let currentUploadFile = null;
let currentUploadText = '';
let currentReaderBook = null;
let currentReaderPage = 0;
let quizQuestions = [];
let currentQuizIndex = 0;
let quizCorrect = 0;
let quizWrong = 0;
let flashcards = [];
let currentFCIndex = 0;
let editingNoteId = null;

// ===== SECTION NAVIGATION =====
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);

    if (id === 'library') renderLibrary();
    if (id === 'quiz') populateBookSelect('quizBookSelect');
    if (id === 'flashcards') populateBookSelect('flashcardBookSelect');
    if (id === 'notes') renderNotes();
}

// ===== THEME =====
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const btn = document.querySelector('.theme-toggle');
    btn.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
    localStorage.setItem('sbTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// ===== DAILY QUOTE =====
const quotes = [
    "\"The only way to do great work is to love what you do.\" — Steve Jobs",
    "\"Education is the most powerful weapon to change the world.\" — Nelson Mandela",
    "\"Practice makes a man perfect!\" — Keep Going, Samuel! 💪",
    "\"The expert in anything was once a beginner.\" — Helen Hayes",
    "\"Success is the sum of small efforts repeated day in and day out.\"",
    "\"Believe you can and you're halfway there.\" — Theodore Roosevelt",
    "\"Reading is to the mind what exercise is to the body.\" — Joseph Addison",
    "\"The beautiful thing about learning is that nobody can take it away from you.\"",
    "\"A room without books is like a body without a soul.\" — Cicero",
    "\"हिंदी हमारी मातृभाषा है, इसे गर्व से सीखें!\" 🇮🇳"
];

function showDailyQuote() {
    const el = document.getElementById('dailyQuote');
    if (el) el.textContent = quotes[new Date().getDate() % quotes.length];
}

// ===== STREAK TRACKER =====
function updateStreak() {
    const today = new Date().toDateString();
    if (stats.lastStudyDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (stats.lastStudyDate === yesterday.toDateString()) {
            stats.streak++;
        } else if (stats.lastStudyDate !== today) {
            stats.streak = 1;
        }
        stats.lastStudyDate = today;
        saveStats();
    }
}

function saveStats() {
    localStorage.setItem('studyBuddyStats', JSON.stringify(stats));
    updateDashboard();
}

function updateDashboard() {
    const tb = document.getElementById('totalBooks');
    const tq = document.getElementById('totalQuizzes');
    const ts = document.getElementById('totalScore');
    const ss = document.getElementById('studyStreak');

    if (tb) tb.textContent = books.length;
    if (tq) tq.textContent = stats.quizzesTaken;
    if (ts) ts.textContent = stats.totalAnswered > 0
        ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) + '%' : '0%';
    if (ss) ss.textContent = stats.streak;

    renderRecentBooks();
}

function renderRecentBooks() {
    const container = document.getElementById('recentBooks');
    if (!container) return;

    if (books.length === 0) {
        container.innerHTML = '<p class="empty-message">No books yet. Click the 📤 button to upload your first book!</p>';
        return;
    }

    const recent = books.slice(-4).reverse();
    container.innerHTML = recent.map(book => `
        <div class="recent-book-card" onclick="openReader('${book.id}')">
            <h4>${getSubjectEmoji(book.subject)} ${book.title}</h4>
            <p>${book.subject.toUpperCase()} • ${book.pages} pages</p>
            <p>${book.date}</p>
        </div>
    `).join('');
}

function getSubjectEmoji(subject) {
    const emojis = { math: '📐', english: '📖', hindi: '📝', science: '🔬', social: '🌍', computer: '💻', other: '📦' };
    return emojis[subject] || '📄';
}

// ============================================
//   PDF UPLOAD & PROCESSING
// ============================================

function openUploadModal() {
    document.getElementById('uploadModal').classList.add('show');
    resetUploadForm();
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('show');
    resetUploadForm();
}

function resetUploadForm() {
    document.getElementById('uploadForm').style.display = 'none';
    document.getElementById('uploadZone').style.display = 'block';
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('bookTitle').value = '';
    document.getElementById('bookSubject').value = '';
    document.getElementById('bookAuthor').value = '';
    currentUploadFile = null;
    currentUploadText = '';
}

// Handle file selection
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        alert('⚠️ Please select a valid PDF file!');
        return;
    }

    currentUploadFile = file;

    // Show form
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('uploadForm').style.display = 'block';
    document.getElementById('uploadFileName').textContent = file.name;
    document.getElementById('uploadFileSize').textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    // Auto-fill title from filename
    const title = file.name.replace('.pdf', '').replace(/[_-]/g, ' ');
    document.getElementById('bookTitle').value = title;

    // Open modal if not open
    document.getElementById('uploadModal').classList.add('show');
}

// Process the upload
async function processUpload() {
    const title = document.getElementById('bookTitle').value.trim();
    const subject = document.getElementById('bookSubject').value;
    const author = document.getElementById('bookAuthor').value.trim();

    if (!title || !subject) {
        alert('⚠️ Please enter a title and select a subject!');
        return;
    }

    if (!currentUploadFile) {
        alert('⚠️ No file selected!');
        return;
    }

    // Show progress
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('uploadBtn').disabled = true;
    document.getElementById('uploadBtn').textContent = '⏳ Processing...';

    try {
        // Read PDF
        const arrayBuffer = await currentUploadFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        let fullText = '';
        const pageTexts = [];

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            pageTexts.push(pageText);
            fullText += pageText + '\n\n';

            // Update progress
            const progress = Math.round((i / totalPages) * 100);
            document.getElementById('uploadProgressBar').style.width = progress + '%';
            document.getElementById('uploadStatus').textContent = `Extracting page ${i} of ${totalPages}...`;
        }

        document.getElementById('uploadStatus').textContent = 'Generating questions...';

        // Create book entry
        const book = {
            id: 'book_' + Date.now(),
            title: title,
            subject: subject,
            author: author,
            pages: totalPages,
            pageTexts: pageTexts,
            fullText: fullText,
            date: new Date().toLocaleDateString(),
            timestamp: Date.now()
        };

        // Save to books array
        books.push(book);
        saveBooks();

        updateStreak();
        updateDashboard();

        document.getElementById('uploadStatus').textContent = '✅ Book uploaded successfully!';

        setTimeout(() => {
            closeUploadModal();
            showSection('library');
        }, 1000);

    } catch (error) {
        console.error('PDF processing error:', error);
        alert('❌ Error processing PDF. Please try another file.\n\nError: ' + error.message);
        document.getElementById('uploadBtn').disabled = false;
        document.getElementById('uploadBtn').textContent = '📤 Upload & Process';
    }
}

function saveBooks() {
    try {
        localStorage.setItem('studyBuddyBooks', JSON.stringify(books));
    } catch (e) {
        // If localStorage is full, remove oldest book's pageTexts
        if (e.name === 'QuotaExceededError') {
            alert('⚠️ Storage is full! Try removing some books.');
        }
    }
}

// ============================================
//   LIBRARY
// ============================================

function renderLibrary(filter = 'all') {
    const grid = document.getElementById('libraryGrid');
    const empty = document.getElementById('emptyLibrary');

    const filtered = filter === 'all' ? books : books.filter(b => b.subject === filter);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-library">
                <span class="empty-icon">📚</span>
                <h3>${filter === 'all' ? 'Your library is empty' : 'No ' + filter + ' books found'}</h3>
                <p>Upload your first PDF book to get started!</p>
                <button class="btn" onclick="document.getElementById('pdfUploadInput').click()">📤 Upload Book</button>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(book => `
        <div class="book-card" data-subject="${book.subject}">
            <div class="book-card-header" style="background: linear-gradient(135deg, ${getSubjectColor(book.subject)})">
                <h3>${book.title}</h3>
                <p>${book.author || 'Unknown Author'}</p>
                <span class="book-subject-badge">${getSubjectEmoji(book.subject)} ${book.subject.toUpperCase()}</span>
            </div>
            <div class="book-card-body">
                <div class="book-meta">
                    <span>📄 ${book.pages} pages</span>
                    <span>📅 ${book.date}</span>
                </div>
                <div class="book-card-actions">
                    <button class="btn-sm btn-read" onclick="openReader('${book.id}')">📖 Read</button>
                    <button class="btn-sm btn-quiz" onclick="startQuizFromLibrary('${book.id}')">🧠 Quiz</button>
                    <button class="btn-sm btn-flash" onclick="startFlashcardsFromLibrary('${book.id}')">🔤 Cards</button>
                    <button class="btn-sm btn-delete" onclick="deleteBook('${book.id}')">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

function getSubjectColor(subject) {
    const colors = {
        math: '#4f46e5, #7c3aed',
        english: '#059669, #10b981',
        hindi: '#db2777, #ec4899',
        science: '#0891b2, #06b6d4',
        social: '#d97706, #f59e0b',
        computer: '#7c3aed, #8b5cf6',
        other: '#64748b, #94a3b8'
    };
    return colors[subject] || colors.other;
}

function filterBooks(filter, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderLibrary(filter);
}

function deleteBook(bookId) {
    if (!confirm('🗑️ Are you sure you want to delete this book?')) return;
    books = books.filter(b => b.id !== bookId);
    saveBooks();
    renderLibrary();
    updateDashboard();
}

// ============================================
//   READER
// ============================================

function openReader(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    currentReaderBook = book;
    currentReaderPage = 0;
    showSection('reader');
    renderReaderPage();
    document.getElementById('readerBookTitle').textContent = `📘 ${book.title} — ${book.subject.toUpperCase()}`;
}

function renderReaderPage() {
    if (!currentReaderBook) return;

    const content = document.getElementById('readerContent');
    const pageTexts = currentReaderBook.pageTexts;
    const text = pageTexts[currentReaderPage] || 'No content on this page.';

    content.textContent = text;

    document.getElementById('currentPage').textContent = currentReaderPage + 1;
    document.getElementById('totalPages').textContent = pageTexts.length;
}

function nextPage() {
    if (!currentReaderBook) return;
    if (currentReaderPage < currentReaderBook.pageTexts.length - 1) {
        currentReaderPage++;
        renderReaderPage();
    }
}

function prevPage() {
    if (!currentReaderBook) return;
    if (currentReaderPage > 0) {
        currentReaderPage--;
        renderReaderPage();
    }
}

// ============================================
//   QUIZ - AUTO GENERATED FROM BOOK
// ============================================

function populateBookSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Select a Book --</option>';
    books.forEach(book => {
        const opt = document.createElement('option');
        opt.value = book.id;
        opt.textContent = `${getSubjectEmoji(book.subject)} ${book.title}`;
        select.appendChild(opt);
    });
    select.value = currentVal;
}

function startQuizFromLibrary(bookId) {
    showSection('quiz');
    setTimeout(() => {
        document.getElementById('quizBookSelect').value = bookId;
        loadQuizForBook(bookId);
    }, 100);
}

function loadQuizForBook(bookId) {
    if (!bookId) return;
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    // Generate questions from book text
    quizQuestions = generateQuestions(book.fullText, book.subject);
    currentQuizIndex = 0;
    quizCorrect = 0;
    quizWrong = 0;

    if (quizQuestions.length === 0) {
        document.getElementById('quizArea').innerHTML = `
            <div class="empty-reader">
                <span class="empty-icon">⚠️</span>
                <h3>Not enough content</h3>
                <p>This book doesn't have enough readable text to generate questions. Try uploading a text-rich PDF.</p>
            </div>
        `;
        document.getElementById('quizContainer').style.display = 'none';
        document.getElementById('quizResults').style.display = 'none';
        return;
    }

    document.getElementById('quizArea').innerHTML = '';
    document.getElementById('quizContainer').style.display = 'block';
    document.getElementById('quizResults').style.display = 'none';

    showQuizQuestion();
    updateStreak();
}

function generateQuestions(text, subject) {
    const questions = [];
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // Split into sentences
    const sentences = cleanText
        .split(/[.!?।]+/)
        .map(s => s.trim())
        .filter(s => s.length > 30 && s.length < 300 && /[a-zA-Zа-яА-Я\u0900-\u097F]/.test(s));

    if (sentences.length < 4) return [];

    // Extract key words (longer, meaningful words)
    const wordFreq = {};
    const allWords = cleanText.split(/\s+/).filter(w => w.length > 4 && !/^\d+$/.test(w) && !/^[^a-zA-Z\u0900-\u097F]+$/.test(w));
    allWords.forEach(w => {
        const lower = w.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
        if (lower.length > 4) wordFreq[lower] = (wordFreq[lower] || 0) + 1;
    });

    const importantWords = Object.entries(wordFreq)
        .filter(([w, c]) => c >= 2 && c <= 20)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)
        .map(([w]) => w);

    // 1. FILL IN THE BLANK questions
    const usedSentences = new Set();
    for (let i = 0; i < sentences.length && questions.length < 8; i++) {
        const sentence = sentences[i];
        if (usedSentences.has(sentence)) continue;

        // Find an important word in this sentence
        const words = sentence.split(/\s+/);
        let targetWord = null;
        let targetIndex = -1;

        for (let j = 0; j < words.length; j++) {
            const clean = words[j].toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
            if (importantWords.includes(clean) && clean.length > 4) {
                targetWord = words[j];
                targetIndex = j;
                break;
            }
        }

        if (!targetWord) continue;
        usedSentences.add(sentence);

        // Create blank sentence
        const blankSentence = words.map((w, idx) => idx === targetIndex ? '________' : w).join(' ');

        // Generate wrong options
        const wrongOptions = importantWords
            .filter(w => w !== targetWord.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, ''))
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        if (wrongOptions.length < 3) continue;

        const cleanTarget = targetWord.replace(/[^a-zA-Z\u0900-\u097F\s]/g, '');
        const allOptions = [cleanTarget, ...wrongOptions].sort(() => Math.random() - 0.5);
        const correctIdx = allOptions.indexOf(cleanTarget);

        questions.push({
            type: 'fill',
            question: `Fill in the blank:\n\n"${blankSentence}"`,
            options: allOptions,
            answer: correctIdx
        });
    }

    // 2. TRUE/FALSE questions
    for (let i = 0; i < sentences.length && questions.length < 12; i++) {
        const sentence = sentences[i];
        if (usedSentences.has(sentence) || sentence.length > 200) continue;
        if (Math.random() > 0.4) continue;

        usedSentences.add(sentence);
        const isTrue = Math.random() > 0.5;

        let displaySentence = sentence;
        if (!isTrue) {
            // Modify sentence slightly to make it false
            const words = sentence.split(/\s+/);
            if (words.length > 5) {
                // Swap two words to create a false statement
                const idx1 = Math.floor(Math.random() * (words.length - 2)) + 1;
                const idx2 = Math.min(idx1 + 2, words.length - 1);
                [words[idx1], words[idx2]] = [words[idx2], words[idx1]];
                displaySentence = words.join(' ');
            }
        }

        questions.push({
            type: 'tf',
            question: `True or False?\n\n"${displaySentence}"`,
            options: ['True', 'False'],
            answer: isTrue ? 0 : 1
        });
    }

    // 3. WHICH SENTENCE questions (from the text)
    for (let i = 0; i < Math.min(sentences.length - 3, 5) && questions.length < 15; i++) {
        if (Math.random() > 0.5) continue;

        const correctSentence = sentences[Math.floor(Math.random() * sentences.length)];
        if (usedSentences.has(correctSentence) || correctSentence.length > 150) continue;
        usedSentences.add(correctSentence);

        // Create a question about what the text mentions
        const preview = correctSentence.substring(0, 60) + '...';

        const wrongSentences = [
            'This topic is not discussed in the chapter.',
            'The book does not mention this concept.',
            'This statement is from a different subject.'
        ];

        const allOpts = [preview, ...wrongSentences].sort(() => Math.random() - 0.5);
        const correctIdx = allOpts.indexOf(preview);

        questions.push({
            type: 'mention',
            question: 'Which of the following is mentioned in the text?',
            options: allOpts,
            answer: correctIdx
        });
    }

    // Shuffle and limit
    return questions.sort(() => Math.random() - 0.5).slice(0, 10);
}

function showQuizQuestion() {
    if (currentQuizIndex >= quizQuestions.length) {
        showQuizResults();
        return;
    }

    const q = quizQuestions[currentQuizIndex];
    const total = quizQuestions.length;

    document.getElementById('quizProgress').style.width = ((currentQuizIndex / total) * 100) + '%';
    document.getElementById('quizProgressText').textContent = `Question ${currentQuizIndex + 1} of ${total}`;
    document.getElementById('quizQuestion').textContent = q.question;
    document.getElementById('quizResult').textContent = '';
    document.getElementById('nextQuizBtn').style.display = 'none';

    const optDiv = document.getElementById('quizOptions');
    optDiv.innerHTML = '';
    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = () => selectQuizAnswer(i, q.answer, btn);
        optDiv.appendChild(btn);
    });

    document.getElementById('quizCorrect').textContent = quizCorrect;
    document.getElementById('quizWrong').textContent = quizWrong;
    const total2 = quizCorrect + quizWrong;
    document.getElementById('quizScorePercent').textContent = total2 > 0 ? Math.round((quizCorrect / total2) * 100) + '%' : '0%';
}

function selectQuizAnswer(selected, correct, btn) {
    // Disable all buttons
    const btns = document.getElementById('quizOptions').querySelectorAll('button');
    btns.forEach(b => b.onclick = null);

    if (selected === correct) {
        quizCorrect++;
        btn.classList.add('correct');
        document.getElementById('quizResult').textContent = '✅ Correct! Well done!';
        document.getElementById('quizResult').style.color = '#10b981';
    } else {
        quizWrong++;
        btn.classList.add('wrong');
        btns[correct].classList.add('correct');
        document.getElementById('quizResult').textContent = '❌ Wrong! See the correct answer above.';
        document.getElementById('quizResult').style.color = '#ef4444';
    }

    document.getElementById('quizCorrect').textContent = quizCorrect;
    document.getElementById('quizWrong').textContent = quizWrong;
    const t = quizCorrect + quizWrong;
    document.getElementById('quizScorePercent').textContent = t > 0 ? Math.round((quizCorrect / t) * 100) + '%' : '0%';

    document.getElementById('nextQuizBtn').style.display = 'inline-block';
}

function nextQuizQuestion() {
    currentQuizIndex++;
    showQuizQuestion();
}

function showQuizResults() {
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('quizResults').style.display = 'block';

    const total = quizCorrect + quizWrong;
    const percent = total > 0 ? Math.round((quizCorrect / total) * 100) : 0;

    document.getElementById('resultPercent').textContent = percent + '%';
    document.getElementById('finalCorrect').textContent = quizCorrect;
    document.getElementById('finalWrong').textContent = quizWrong;
    document.getElementById('finalTotal').textContent = total;

    const circle = document.getElementById('resultCircle');
    if (percent >= 80) {
        circle.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        document.getElementById('resultMessage').textContent = '🌟 Excellent! You really know this material!';
    } else if (percent >= 60) {
        circle.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        document.getElementById('resultMessage').textContent = '👍 Good job! Keep studying to improve!';
    } else {
        circle.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        document.getElementById('resultMessage').textContent = '📖 Keep reading! Practice makes perfect!';
    }

    // Update stats
    stats.quizzesTaken++;
    stats.totalCorrect += quizCorrect;
    stats.totalAnswered += total;
    saveStats();
}

// ============================================
//   FLASHCARDS - AUTO GENERATED
// ============================================

function startFlashcardsFromLibrary(bookId) {
    showSection('flashcards');
    setTimeout(() => {
        document.getElementById('flashcardBookSelect').value = bookId;
        loadFlashcardsForBook(bookId);
    }, 100);
}

function loadFlashcardsForBook(bookId) {
    if (!bookId) return;
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    flashcards = generateFlashcards(book.fullText);
    currentFCIndex = 0;

    if (flashcards.length === 0) {
        document.getElementById('flashcardArea').innerHTML = `
            <div class="empty-reader">
                <span class="empty-icon">⚠️</span>
                <h3>Not enough content</h3>
                <p>Cannot generate flashcards from this book.</p>
            </div>
        `;
        document.getElementById('flashcardContainer').style.display = 'none';
        return;
    }

    document.getElementById('flashcardArea').innerHTML = '';
    document.getElementById('flashcardContainer').style.display = 'block';
    showCurrentFC();
}

function generateFlashcards(text) {
    const cards = [];
    const cleanText = text.replace(/\s+/g, ' ').trim();

    const sentences = cleanText
        .split(/[.!?।]+/)
        .map(s => s.trim())
        .filter(s => s.length > 25 && s.length < 250);

    // Extract keyword-context pairs
    const wordFreq = {};
    cleanText.split(/\s+/).forEach(w => {
        const clean = w.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
        if (clean.length > 5) wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    });

    const keywords = Object.entries(wordFreq)
        .filter(([w, c]) => c >= 2 && c <= 15)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([w]) => w);

    const usedKeywords = new Set();

    for (const sentence of sentences) {
        if (cards.length >= 20) break;

        for (const keyword of keywords) {
            if (usedKeywords.has(keyword)) continue;
            if (sentence.toLowerCase().includes(keyword)) {
                cards.push({
                    front: keyword.charAt(0).toUpperCase() + keyword.slice(1),
                    back: sentence.length > 150 ? sentence.substring(0, 150) + '...' : sentence
                });
                usedKeywords.add(keyword);
                break;
            }
        }
    }

    // If we got very few keyword cards, just use sentences
    if (cards.length < 5) {
        const selectedSentences = sentences
            .filter(s => s.length > 30 && s.length < 200)
            .sort(() => Math.random() - 0.5)
            .slice(0, 15);

        selectedSentences.forEach((s, i) => {
            const words = s.split(/\s+/);
            const halfIdx = Math.floor(words.length / 2);
            cards.push({
                front: words.slice(0, halfIdx).join(' ') + '...',
                back: s
            });
        });
    }

    return cards;
}

function showCurrentFC() {
    if (flashcards.length === 0) return;
    const card = flashcards[currentFCIndex];
    document.getElementById('fcFront').textContent = card.front;
    document.getElementById('fcBack').textContent = card.back;
    document.getElementById('fcCount').textContent = `${currentFCIndex + 1} / ${flashcards.length}`;
    document.getElementById('flashcardDeck').classList.remove('flipped');
}

function flipCurrentCard() {
    document.getElementById('flashcardDeck').classList.toggle('flipped');
}

function nextFC() {
    currentFCIndex = (currentFCIndex + 1) % flashcards.length;
    showCurrentFC();
}

function prevFC() {
    currentFCIndex = (currentFCIndex - 1 + flashcards.length) % flashcards.length;
    showCurrentFC();
}

// ============================================
//   NOTES SYSTEM
// ============================================

function addNewNote() {
    editingNoteId = null;
    document.getElementById('noteEditor').style.display = 'block';
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteSubject').value = 'general';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteTitle').focus();
}

function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const subject = document.getElementById('noteSubject').value;
    const content = document.getElementById('noteContent').value.trim();

    if (!title || !content) {
        alert('⚠️ Please enter a title and content!');
        return;
    }

    if (editingNoteId) {
        const note = notes.find(n => n.id === editingNoteId);
        if (note) {
            note.title = title;
            note.subject = subject;
            note.content = content;
            note.modified = new Date().toLocaleDateString();
        }
    } else {
        notes.push({
            id: 'note_' + Date.now(),
            title, subject, content,
            date: new Date().toLocaleDateString(),
            modified: new Date().toLocaleDateString()
        });
    }

    localStorage.setItem('studyBuddyNotes', JSON.stringify(notes));
    document.getElementById('noteEditor').style.display = 'none';
    renderNotes();
    updateStreak();
}

function cancelNote() {
    document.getElementById('noteEditor').style.display = 'none';
}

function renderNotes() {
    const container = document.getElementById('notesList');
    if (!container) return;

    if (notes.length === 0) {
        container.innerHTML = `
            <div class="empty-reader">
                <span class="empty-icon">📝</span>
                <h3>No notes yet</h3>
                <p>Click "New Note" to start writing!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notes.slice().reverse().map(note => `
        <div class="note-card" onclick="editNote('${note.id}')">
            <button class="note-delete" onclick="event.stopPropagation(); deleteNote('${note.id}')">✕</button>
            <h4>${note.title}</h4>
            <span class="note-subject-tag">${getSubjectEmoji(note.subject)} ${note.subject}</span>
            <p>${note.content.substring(0, 150)}${note.content.length > 150 ? '...' : ''}</p>
            <span class="note-date">📅 ${note.modified || note.date}</span>
        </div>
    `).join('');
}

function editNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    editingNoteId = noteId;
    document.getElementById('noteEditor').style.display = 'block';
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteSubject').value = note.subject;
    document.getElementById('noteContent').value = note.content;
}

function deleteNote(noteId) {
    if (!confirm('🗑️ Delete this note?')) return;
    notes = notes.filter(n => n.id !== noteId);
    localStorage.setItem('studyBuddyNotes', JSON.stringify(notes));
    renderNotes();
}

// ============================================
//   TIMER
// ============================================

let timerInterval = null;
let timeLeft = 25 * 60;
let timerTotal = 25 * 60;

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timerDisplay').textContent = `${mins}:${secs}`;

    // Update ring
    const ring = document.getElementById('timerRing');
    if (ring) {
        const circumference = 2 * Math.PI * 110; // radius = 110
        const offset = circumference * (1 - timeLeft / timerTotal);
        ring.style.strokeDashoffset = offset;
    }
}

function startTimer() {
    if (timerInterval) return;
    updateStreak();
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

function resetTimer() { pauseTimer(); timeLeft = timerTotal; updateTimerDisplay(); }

function setTimer(mins) {
    pauseTimer();
    timeLeft = mins * 60;
    timerTotal = mins * 60;
    updateTimerDisplay();
}

// ============================================
//   DRAG & DROP
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const zone = document.getElementById('uploadZone');
    if (zone) {
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                currentUploadFile = file;
                document.getElementById('uploadZone').style.display = 'none';
                document.getElementById('uploadForm').style.display = 'block';
                document.getElementById('uploadFileName').textContent = file.name;
                document.getElementById('uploadFileSize').textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
                document.getElementById('bookTitle').value = file.name.replace('.pdf', '').replace(/[_-]/g, ' ');
            } else {
                alert('⚠️ Please drop a PDF file!');
            }
        });
        zone.addEventListener('click', () => document.getElementById('pdfUploadInput').click());
    }
});

// ============================================
//   INITIALIZE
// ============================================

window.onload = function () {
    // Load theme
    if (localStorage.getItem('sbTheme') === 'dark') {
        document.body.classList.add('dark-theme');
        document.querySelector('.theme-toggle').textContent = '☀️';
    }

    showDailyQuote();
    updateDashboard();
    updateTimerDisplay();
};
