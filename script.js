// ============================================
//   STUDYBUDDY v3 — PDF UPLOAD FIXED
//   By Samuel Giftson S
// ============================================

// ===== PDF.js Setup =====
pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ========== TOAST SYSTEM ==========
function toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    t.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// ========== LOADING OVERLAY ==========
function showLoading(text) {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

// ========== INDEXEDDB STORAGE ==========
const DB_NAME = 'StudyBuddyDB';
const DB_VERSION = 1;
let db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            if (!database.objectStoreNames.contains('books')) {
                database.createObjectStore('books', { keyPath: 'id' });
            }
            if (!database.objectStoreNames.contains('notes')) {
                database.createObjectStore('notes', { keyPath: 'id' });
            }
        };

        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };

        request.onerror = (e) => {
            console.error('DB Error:', e);
            reject(e);
        };
    });
}

function dbSave(store, data) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(data);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
    });
}

function dbGetAll(store) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e);
    });
}

function dbDelete(store, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
    });
}

function dbGet(store, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e);
    });
}

// ========== GLOBAL STATE ==========
let books = [];
let notesArr = [];
let stats = JSON.parse(localStorage.getItem('sbStats')) || {
    quizzesTaken: 0, totalCorrect: 0, totalAnswered: 0,
    lastDate: null, streak: 0
};

let chosenFile = null;
let readerBook = null;
let readerPage = 0;
let quizQs = [];
let quizIdx = 0;
let qCorrect = 0;
let qWrong = 0;
let fcards = [];
let fcIdx = 0;
let editNoteId = null;

// ========== NAVIGATION ==========
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);

    if (id === 'library') renderLibrary();
    if (id === 'quiz') fillBookSelect('quizBookSelect');
    if (id === 'flashcards') fillBookSelect('flashcardBookSelect');
    if (id === 'notes') renderNotes();
}

// ========== THEME ==========
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const btn = document.querySelector('.theme-toggle');
    btn.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
    localStorage.setItem('sbTheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// ========== QUOTE ==========
const quotes = [
    '"Education is the most powerful weapon." — Nelson Mandela',
    '"Practice makes a man perfect!" — Keep Going, Samuel! 💪',
    '"The expert in anything was once a beginner." — Helen Hayes',
    '"Believe you can and you\'re halfway there." — Roosevelt',
    '"Reading is to the mind what exercise is to the body."',
    '"Success is the sum of small efforts repeated daily."',
    '"The only way to do great work is to love what you do." — Steve Jobs',
    '"A room without books is like a body without a soul." — Cicero'
];

function showQuote() {
    const el = document.getElementById('dailyQuote');
    if (el) el.textContent = quotes[new Date().getDate() % quotes.length];
}

// ========== DASHBOARD ==========
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
    const c = document.getElementById('recentBooks');
    if (!c) return;

    if (books.length === 0) {
        c.innerHTML = '<p class="empty-message">No books yet. Click 📤 Upload Book to get started!</p>';
        return;
    }

    c.innerHTML = books.slice(-5).reverse().map(b => `
        <div class="recent-book-card" onclick="openReader('${b.id}')">
            <h4>${getEmoji(b.subject)} ${b.title}</h4>
            <p>${b.subject.toUpperCase()} · ${b.pages} pages</p>
            <p>${b.date}</p>
        </div>
    `).join('');
}

function getEmoji(s) {
    return { math:'📐', english:'📖', hindi:'📝', science:'🔬', social:'🌍', computer:'💻', other:'📦' }[s] || '📄';
}

function getColor(s) {
    return { math:'#4f46e5,#7c3aed', english:'#059669,#10b981', hindi:'#db2777,#ec4899',
        science:'#0891b2,#06b6d4', social:'#d97706,#f59e0b', computer:'#7c3aed,#8b5cf6',
        other:'#64748b,#94a3b8' }[s] || '#64748b,#94a3b8';
}

function updateStreak() {
    const today = new Date().toDateString();
    if (stats.lastDate !== today) {
        const y = new Date(); y.setDate(y.getDate() - 1);
        stats.streak = (stats.lastDate === y.toDateString()) ? stats.streak + 1 : 1;
        stats.lastDate = today;
        localStorage.setItem('sbStats', JSON.stringify(stats));
    }
}

// ============================================
//   PDF UPLOAD — THE FIX
// ============================================

function openUploadModal() {
    document.getElementById('uploadModal').classList.add('show');
    // Reset to step 1
    document.getElementById('step1').style.display = 'block';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'none';
    document.getElementById('fileInput').value = '';
    chosenFile = null;
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('show');
    chosenFile = null;
}

function changeFile() {
    document.getElementById('step1').style.display = 'block';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('fileInput').value = '';
    chosenFile = null;
}

function onFileChosen(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        toast('Please select a PDF file!', 'error');
        return;
    }

    if (file.size > 50 * 1024 * 1024) {
        toast('File too large! Max 50MB.', 'error');
        return;
    }

    chosenFile = file;

    // Show step 2
    document.getElementById('step1').style.display = 'none';
    document.getElementById('step2').style.display = 'block';

    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

    // Auto-fill title
    document.getElementById('bookTitle').value = file.name.replace('.pdf', '').replace(/[_\-]+/g, ' ');
    document.getElementById('bookSubject').value = '';
    document.getElementById('bookAuthor').value = '';

    toast('File selected! Fill in the details below.', 'info');
}

// THE MAIN FIX — Processing with proper error handling
async function startProcessing() {
    const title = document.getElementById('bookTitle').value.trim();
    const subject = document.getElementById('bookSubject').value;
    const author = document.getElementById('bookAuthor').value.trim();

    if (!title) { toast('Please enter a book title!', 'warning'); return; }
    if (!subject) { toast('Please select a subject!', 'warning'); return; }
    if (!chosenFile) { toast('No file selected!', 'error'); return; }

    // Disable button
    const btn = document.getElementById('uploadGoBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Processing...';

    // Show progress
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressStatus').textContent = 'Reading PDF file...';

    try {
        // Step 1: Read file as ArrayBuffer
        const arrayBuffer = await readFileAsArrayBuffer(chosenFile);

        document.getElementById('progressStatus').textContent = 'Loading PDF...';
        document.getElementById('progressFill').style.width = '10%';

        // Step 2: Load PDF with pdf.js
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;

        document.getElementById('progressStatus').textContent = `Extracting text from ${totalPages} pages...`;
        document.getElementById('progressFill').style.width = '20%';

        // Step 3: Extract text page by page
        const pageTexts = [];
        let fullText = '';

        for (let i = 1; i <= totalPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const text = content.items.map(item => item.str).join(' ').trim();
                pageTexts.push(text || `[Page ${i} - No extractable text]`);
                fullText += text + '\n\n';
            } catch (pageErr) {
                console.warn(`Page ${i} error:`, pageErr);
                pageTexts.push(`[Page ${i} - Could not extract]`);
            }

            // Update progress
            const pct = 20 + Math.round((i / totalPages) * 60);
            document.getElementById('progressFill').style.width = pct + '%';
            document.getElementById('progressStatus').textContent = `Extracting page ${i} / ${totalPages}...`;
        }

        document.getElementById('progressFill').style.width = '85%';
        document.getElementById('progressStatus').textContent = 'Saving book...';

        // Check if we got any meaningful text
        const cleanedText = fullText.replace(/\s+/g, ' ').trim();
        if (cleanedText.length < 50) {
            toast('⚠️ This PDF has very little readable text. It might be a scanned/image PDF. The book is saved but quizzes may not work well.', 'warning');
        }

        // Step 4: Save to IndexedDB
        const book = {
            id: 'book_' + Date.now(),
            title: title,
            subject: subject,
            author: author || 'Unknown',
            pages: totalPages,
            pageTexts: pageTexts,
            fullText: cleanedText.substring(0, 500000), // Limit to 500k chars
            date: new Date().toLocaleDateString(),
            timestamp: Date.now(),
            textLength: cleanedText.length
        };

        await dbSave('books', book);

        // Update local array
        books.push(book);

        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('progressStatus').textContent = '✅ Done!';

        updateStreak();
        updateDashboard();

        toast(`"${title}" uploaded successfully! ${totalPages} pages extracted.`, 'success');

        setTimeout(() => {
            closeUploadModal();
            showSection('library');
        }, 800);

    } catch (error) {
        console.error('Upload Error:', error);
        toast(`Upload failed: ${error.message}`, 'error');

        // Show detailed error
        document.getElementById('progressStatus').textContent = `❌ Error: ${error.message}`;
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressFill').style.background = '#ef4444';
    } finally {
        btn.disabled = false;
        btn.textContent = '📤 Upload & Process';
    }
}

// Helper: Read file as ArrayBuffer
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// Drag and drop
document.addEventListener('DOMContentLoaded', () => {
    const zone = document.getElementById('dropZone');
    if (!zone) return;

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            chosenFile = file;
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('fileSize').textContent = (file.size / (1024*1024)).toFixed(1) + ' MB';
            document.getElementById('bookTitle').value = file.name.replace('.pdf','').replace(/[_\-]+/g,' ');
            toast('File dropped! Fill in details.', 'info');
        } else {
            toast('Please drop a PDF file!', 'error');
        }
    });
});

// ============================================
//   LIBRARY
// ============================================

function renderLibrary(filter = 'all') {
    const grid = document.getElementById('libraryGrid');
    const list = filter === 'all' ? books : books.filter(b => b.subject === filter);

    if (list.length === 0) {
        grid.innerHTML = `
            <div class="empty-library">
                <span class="empty-icon">📚</span>
                <h3>${filter === 'all' ? 'Your library is empty' : 'No ' + filter + ' books'}</h3>
                <p>Upload a PDF to get started!</p>
                <button class="btn" onclick="openUploadModal()">📤 Upload</button>
            </div>`;
        return;
    }

    grid.innerHTML = list.map(b => `
        <div class="book-card">
            <div class="book-card-top" style="background:linear-gradient(135deg,${getColor(b.subject)})">
                <h3>${b.title}</h3>
                <p>${b.author}</p>
                <span class="book-badge">${getEmoji(b.subject)} ${b.subject}</span>
            </div>
            <div class="book-card-bottom">
                <div class="book-meta">
                    <span>📄 ${b.pages} pages</span>
                    <span>📅 ${b.date}</span>
                </div>
                <div class="book-actions">
                    <button class="btn-sm btn-read" onclick="openReader('${b.id}')">📖 Read</button>
                    <button class="btn-sm btn-quiz" onclick="goQuiz('${b.id}')">🧠 Quiz</button>
                    <button class="btn-sm btn-flash" onclick="goFlash('${b.id}')">🔤 Cards</button>
                    <button class="btn-sm btn-delete" onclick="removeBook('${b.id}')">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterBooks(f, btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderLibrary(f);
}

async function removeBook(id) {
    if (!confirm('Delete this book?')) return;
    await dbDelete('books', id);
    books = books.filter(b => b.id !== id);
    renderLibrary();
    updateDashboard();
    toast('Book deleted.', 'info');
}

// ============================================
//   READER
// ============================================

async function openReader(id) {
    let book = books.find(b => b.id === id);
    if (!book) {
        book = await dbGet('books', id);
        if (!book) { toast('Book not found!', 'error'); return; }
    }
    readerBook = book;
    readerPage = 0;
    showSection('reader');
    document.getElementById('readerTitle').textContent = `📖 ${book.title}`;
    renderPage();
}

function renderPage() {
    if (!readerBook) return;
    const text = readerBook.pageTexts[readerPage] || 'No content on this page.';
    document.getElementById('readerContent').textContent = text;
    document.getElementById('currentPage').textContent = readerPage + 1;
    document.getElementById('totalPages').textContent = readerBook.pageTexts.length;
}

function nextPage() { if (readerBook && readerPage < readerBook.pageTexts.length - 1) { readerPage++; renderPage(); } }
function prevPage() { if (readerBook && readerPage > 0) { readerPage--; renderPage(); } }

// ============================================
//   QUIZ — AUTO GENERATED
// ============================================

function fillBookSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const val = sel.value;
    sel.innerHTML = '<option value="">-- Select a Book --</option>';
    books.forEach(b => {
        const o = document.createElement('option');
        o.value = b.id; o.textContent = `${getEmoji(b.subject)} ${b.title}`;
        sel.appendChild(o);
    });
    sel.value = val;
}

function goQuiz(id) {
    showSection('quiz');
    setTimeout(() => { document.getElementById('quizBookSelect').value = id; loadQuizForBook(id); }, 100);
}

function loadQuizForBook(id) {
    if (!id) return;
    const book = books.find(b => b.id === id);
    if (!book) { toast('Book not found!', 'error'); return; }

    if (!book.fullText || book.fullText.trim().length < 100) {
        document.getElementById('quizArea').innerHTML = `
            <div class="empty-state"><span>⚠️</span>
            <h3>Not enough text</h3>
            <p>This PDF doesn't have enough readable text for a quiz. It might be a scanned/image PDF.</p></div>`;
        document.getElementById('quizContainer').style.display = 'none';
        document.getElementById('quizResults').style.display = 'none';
        return;
    }

    quizQs = makeQuestions(book.fullText, book.subject);
    quizIdx = 0; qCorrect = 0; qWrong = 0;

    if (quizQs.length === 0) {
        document.getElementById('quizArea').innerHTML = `
            <div class="empty-state"><span>⚠️</span>
            <h3>Couldn't generate questions</h3>
            <p>Try a different book with more text content.</p></div>`;
        document.getElementById('quizContainer').style.display = 'none';
        document.getElementById('quizResults').style.display = 'none';
        return;
    }

    document.getElementById('quizArea').innerHTML = '';
    document.getElementById('quizContainer').style.display = 'block';
    document.getElementById('quizResults').style.display = 'none';

    showQ();
    updateStreak();
    toast(`Quiz loaded! ${quizQs.length} questions from "${book.title}"`, 'success');
}

function makeQuestions(text, subject) {
    const qs = [];
    const clean = text.replace(/\s+/g, ' ').trim();

    const sentences = clean.split(/[.!?।]+/)
        .map(s => s.trim())
        .filter(s => s.length > 25 && s.length < 250 && /[a-zA-Z\u0900-\u097F]{3,}/.test(s));

    if (sentences.length < 3) return [];

    // Get important words
    const freq = {};
    clean.split(/\s+/).forEach(w => {
        const c = w.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
        if (c.length > 4) freq[c] = (freq[c] || 0) + 1;
    });

    const keywords = Object.entries(freq)
        .filter(([w, c]) => c >= 2 && c <= 25)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 40)
        .map(([w]) => w);

    const used = new Set();

    // Fill in blank
    for (const s of sentences) {
        if (qs.length >= 6 || used.has(s)) continue;
        const words = s.split(/\s+/);
        let target = null, tIdx = -1;

        for (let j = 0; j < words.length; j++) {
            const c = words[j].toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
            if (keywords.includes(c) && c.length > 4) { target = words[j]; tIdx = j; break; }
        }

        if (!target) continue;
        used.add(s);

        const blank = words.map((w, i) => i === tIdx ? '________' : w).join(' ');
        const cleanT = target.replace(/[^a-zA-Z\u0900-\u097F\s]/g, '');
        const wrongs = keywords.filter(w => w !== cleanT.toLowerCase()).sort(() => Math.random() - 0.5).slice(0, 3);
        if (wrongs.length < 3) continue;

        const opts = [cleanT, ...wrongs].sort(() => Math.random() - 0.5);
        qs.push({ q: `Fill in the blank:\n\n"${blank}"`, opts, ans: opts.indexOf(cleanT) });
    }

    // True/False
    for (const s of sentences) {
        if (qs.length >= 10 || used.has(s) || s.length > 180) continue;
        if (Math.random() > 0.5) continue;
        used.add(s);

        const isTrue = Math.random() > 0.5;
        let display = s;
        if (!isTrue) {
            const w = s.split(/\s+/);
            if (w.length > 4) {
                const i = Math.floor(Math.random() * (w.length - 2)) + 1;
                const j = Math.min(i + 2, w.length - 1);
                [w[i], w[j]] = [w[j], w[i]];
                display = w.join(' ');
            }
        }

        qs.push({ q: `True or False?\n\n"${display}"`, opts: ['True', 'False'], ans: isTrue ? 0 : 1 });
    }

    // "Which is mentioned?"
    for (let i = 0; i < 4 && qs.length < 12; i++) {
        const s = sentences[Math.floor(Math.random() * sentences.length)];
        if (used.has(s) || s.length > 140) continue;
        used.add(s);

        const preview = s.length > 70 ? s.substring(0, 70) + '...' : s;
        const wrongs = ['This is not mentioned in the text.', 'The book does not discuss this.', 'This belongs to a different topic.'];
        const opts = [preview, ...wrongs].sort(() => Math.random() - 0.5);

        qs.push({ q: 'Which of the following is mentioned in your book?', opts, ans: opts.indexOf(preview) });
    }

    return qs.sort(() => Math.random() - 0.5).slice(0, 10);
}

function showQ() {
    if (quizIdx >= quizQs.length) { showResults(); return; }
    const q = quizQs[quizIdx];
    const total = quizQs.length;

    document.getElementById('quizProgress').style.width = ((quizIdx / total) * 100) + '%';
    document.getElementById('quizProgressText').textContent = `Q ${quizIdx + 1} / ${total}`;
    document.getElementById('quizQuestion').textContent = q.q;
    document.getElementById('quizFeedback').textContent = '';
    document.getElementById('nextQuizBtn').style.display = 'none';

    const optDiv = document.getElementById('quizOptions');
    optDiv.innerHTML = '';
    q.opts.forEach((o, i) => {
        const btn = document.createElement('button');
        btn.textContent = o;
        btn.onclick = () => pickAnswer(i, q.ans, btn);
        optDiv.appendChild(btn);
    });

    updateScoreBar();
}

function pickAnswer(pick, correct, btn) {
    const btns = document.getElementById('quizOptions').querySelectorAll('button');
    btns.forEach(b => { b.onclick = null; b.classList.add('disabled'); });

    if (pick === correct) {
        qCorrect++; btn.classList.add('correct');
        document.getElementById('quizFeedback').textContent = '✅ Correct!';
        document.getElementById('quizFeedback').style.color = '#10b981';
    } else {
        qWrong++; btn.classList.add('wrong'); btns[correct].classList.add('correct');
        document.getElementById('quizFeedback').textContent = '❌ Wrong!';
        document.getElementById('quizFeedback').style.color = '#ef4444';
    }

    updateScoreBar();
    document.getElementById('nextQuizBtn').style.display = 'inline-block';
}

function nextQuizQuestion() { quizIdx++; showQ(); }

function updateScoreBar() {
    document.getElementById('quizCorrect').textContent = qCorrect;
    document.getElementById('quizWrong').textContent = qWrong;
    const t = qCorrect + qWrong;
    document.getElementById('quizPercent').textContent = t > 0 ? Math.round((qCorrect / t) * 100) + '%' : '0%';
}

function showResults() {
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('quizResults').style.display = 'block';

    const t = qCorrect + qWrong;
    const pct = t > 0 ? Math.round((qCorrect / t) * 100) : 0;

    document.getElementById('resultPercent').textContent = pct + '%';
    document.getElementById('finalCorrect').textContent = qCorrect;
    document.getElementById('finalWrong').textContent = qWrong;
    document.getElementById('finalTotal').textContent = t;

    const circle = document.getElementById('resultCircle');
    if (pct >= 80) {
        circle.style.background = 'linear-gradient(135deg,#10b981,#059669)';
        document.getElementById('resultMessage').textContent = '🌟 Excellent work, Samuel!';
    } else if (pct >= 50) {
        circle.style.background = 'linear-gradient(135deg,#f59e0b,#d97706)';
        document.getElementById('resultMessage').textContent = '👍 Good effort! Keep it up!';
    } else {
        circle.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
        document.getElementById('resultMessage').textContent = '📖 Read more and try again!';
    }

    stats.quizzesTaken++; stats.totalCorrect += qCorrect; stats.totalAnswered += t;
    localStorage.setItem('sbStats', JSON.stringify(stats));
    updateDashboard();
}

// ============================================
//   FLASHCARDS
// ============================================

function goFlash(id) {
    showSection('flashcards');
    setTimeout(() => { document.getElementById('flashcardBookSelect').value = id; loadFlashcardsForBook(id); }, 100);
}

function loadFlashcardsForBook(id) {
    if (!id) return;
    const book = books.find(b => b.id === id);
    if (!book || !book.fullText || book.fullText.length < 100) {
        document.getElementById('flashcardArea').innerHTML = `
            <div class="empty-state"><span>⚠️</span><h3>Not enough text</h3><p>Can't generate flashcards.</p></div>`;
        document.getElementById('flashcardContainer').style.display = 'none';
        return;
    }

    fcards = makeFlashcards(book.fullText);
    fcIdx = 0;

    if (fcards.length === 0) {
        document.getElementById('flashcardArea').innerHTML = `
            <div class="empty-state"><span>⚠️</span><h3>Couldn't generate cards</h3><p>Try a different book.</p></div>`;
        document.getElementById('flashcardContainer').style.display = 'none';
        return;
    }

    document.getElementById('flashcardArea').innerHTML = '';
    document.getElementById('flashcardContainer').style.display = 'block';
    showFC();
    toast(`${fcards.length} flashcards ready!`, 'success');
}

function makeFlashcards(text) {
    const cards = [];
    const sentences = text.split(/[.!?।]+/).map(s => s.trim()).filter(s => s.length > 20 && s.length < 200);

    const freq = {};
    text.split(/\s+/).forEach(w => {
        const c = w.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
        if (c.length > 5) freq[c] = (freq[c] || 0) + 1;
    });

    const kw = Object.entries(freq).filter(([,c]) => c >= 2 && c <= 15).sort((a,b) => b[1]-a[1]).slice(0,25).map(([w]) => w);
    const usedKw = new Set();

    for (const s of sentences) {
        if (cards.length >= 20) break;
        for (const k of kw) {
            if (usedKw.has(k)) continue;
            if (s.toLowerCase().includes(k)) {
                cards.push({ front: k.charAt(0).toUpperCase() + k.slice(1), back: s });
                usedKw.add(k);
                break;
            }
        }
    }

    if (cards.length < 5) {
        sentences.sort(() => Math.random() - 0.5).slice(0, 12).forEach(s => {
            const w = s.split(/\s+/);
            const h = Math.floor(w.length / 2);
            cards.push({ front: w.slice(0, h).join(' ') + '...', back: s });
        });
    }

    return cards;
}

function showFC() {
    if (fcards.length === 0) return;
    document.getElementById('fcFront').textContent = fcards[fcIdx].front;
    document.getElementById('fcBack').textContent = fcards[fcIdx].back;
    document.getElementById('fcCount').textContent = `${fcIdx + 1} / ${fcards.length}`;
    document.getElementById('fcCard').classList.remove('flipped');
}

function flipFC() { document.getElementById('fcCard').classList.toggle('flipped'); }
function nextFC() { fcIdx = (fcIdx + 1) % fcards.length; showFC(); }
function prevFC() { fcIdx = (fcIdx - 1 + fcards.length) % fcards.length; showFC(); }

// ============================================
//   NOTES
// ============================================

function openNoteEditor() {
    editNoteId = null;
    document.getElementById('noteEditor').style.display = 'block';
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteSubject').value = 'general';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteTitle').focus();
}

function closeNoteEditor() { document.getElementById('noteEditor').style.display = 'none'; }

async function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const subject = document.getElementById('noteSubject').value;
    const content = document.getElementById('noteContent').value.trim();

    if (!title || !content) { toast('Enter title and content!', 'warning'); return; }

    if (editNoteId) {
        const n = notesArr.find(n => n.id === editNoteId);
        if (n) { n.title = title; n.subject = subject; n.content = content; n.modified = new Date().toLocaleDateString(); await dbSave('notes', n); }
    } else {
        const note = { id: 'note_' + Date.now(), title, subject, content, date: new Date().toLocaleDateString(), modified: new Date().toLocaleDateString() };
        notesArr.push(note);
        await dbSave('notes', note);
    }

    closeNoteEditor();
    renderNotes();
    toast('Note saved!', 'success');
    updateStreak();
}

function renderNotes() {
    const c = document.getElementById('notesList');
    if (!c) return;

    if (notesArr.length === 0) {
        c.innerHTML = `<div class="empty-state"><span>📝</span><h3>No notes</h3><p>Click "+ New Note" to start!</p></div>`;
        return;
    }

    c.innerHTML = notesArr.slice().reverse().map(n => `
        <div class="note-card" onclick="editExistingNote('${n.id}')">
            <button class="note-del" onclick="event.stopPropagation();deleteNote('${n.id}')">✕</button>
            <h4>${n.title}</h4>
            <span class="note-tag">${getEmoji(n.subject)} ${n.subject}</span>
            <p>${n.content.substring(0, 120)}${n.content.length > 120 ? '...' : ''}</p>
            <span class="note-date">📅 ${n.modified || n.date}</span>
        </div>
    `).join('');
}

function editExistingNote(id) {
    const n = notesArr.find(n => n.id === id);
    if (!n) return;
    editNoteId = id;
    document.getElementById('noteEditor').style.display = 'block';
    document.getElementById('noteTitle').value = n.title;
    document.getElementById('noteSubject').value = n.subject;
    document.getElementById('noteContent').value = n.content;
}

async function deleteNote(id) {
    if (!confirm('Delete note?')) return;
    await dbDelete('notes', id);
    notesArr = notesArr.filter(n => n.id !== id);
    renderNotes();
    toast('Note deleted.', 'info');
}

// ============================================
//   TIMER
// ============================================

let timerInt = null;
let tLeft = 25 * 60;
let tTotal = 25 * 60;

function updateTimer() {
    const m = Math.floor(tLeft / 60).toString().padStart(2, '0');
    const s = (tLeft % 60).toString().padStart(2, '0');
    document.getElementById('timerDisplay').textContent = `${m}:${s}`;

    const ring = document.getElementById('timerRing');
    if (ring) {
        const circ = 2 * Math.PI * 105;
        ring.style.strokeDashoffset = circ * (1 - tLeft / tTotal);
    }
}

function startTimer() {
    if (timerInt) return;
    updateStreak();
    timerInt = setInterval(() => {
        if (tLeft <= 0) { clearInterval(timerInt); timerInt = null; toast('⏰ Time up! Great session!', 'success'); return; }
        tLeft--; updateTimer();
    }, 1000);
}

function pauseTimer() { clearInterval(timerInt); timerInt = null; }
function resetTimer() { pauseTimer(); tLeft = tTotal; updateTimer(); }
function setTimer(m) { pauseTimer(); tLeft = m * 60; tTotal = m * 60; updateTimer(); }

// ============================================
//   INIT
// ============================================

window.onload = async function () {
    // Theme
    if (localStorage.getItem('sbTheme') === 'dark') {
        document.body.classList.add('dark-theme');
        document.querySelector('.theme-toggle').textContent = '☀️';
    }

    showQuote();
    updateTimer();

    // Open database and load data
    try {
        await openDB();
        books = await dbGetAll('books');
        notesArr = await dbGetAll('notes');
        console.log(`✅ Loaded ${books.length} books, ${notesArr.length} notes`);
        toast(`StudyBuddy ready! ${books.length} books loaded.`, 'success');
    } catch (err) {
        console.error('DB init error:', err);
        toast('Database error. Try refreshing.', 'error');
    }

    updateDashboard();
};
