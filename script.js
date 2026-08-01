// =============================================
//  STUDYBUDDY — CLEAN WORKING VERSION
//  By Samuel Giftson S
// =============================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ---- TOAST ----
function toast(msg, type) {
    var box = document.getElementById('toastBox');
    var el = document.createElement('div');
    el.className = 'toast-item toast-' + (type || 'info');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function() { el.remove(); }, 4000);
}

// ---- DATABASE ----
var db = null;

function openDatabase() {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open('StudyBuddyV6', 1);
        request.onupgradeneeded = function(e) {
            var d = e.target.result;
            if (!d.objectStoreNames.contains('books')) d.createObjectStore('books', { keyPath: 'id' });
            if (!d.objectStoreNames.contains('pdfs')) d.createObjectStore('pdfs', { keyPath: 'id' });
            if (!d.objectStoreNames.contains('notes')) d.createObjectStore('notes', { keyPath: 'id' });
        };
        request.onsuccess = function(e) { db = e.target.result; resolve(); };
        request.onerror = function() { reject('DB error'); };
    });
}

function dbSave(storeName, data) {
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(data);
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
}

function dbGetAll(storeName) {
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).getAll();
        req.onsuccess = function() { resolve(req.result); };
        req.onerror = reject;
    });
}

function dbGet(storeName, id) {
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).get(id);
        req.onsuccess = function() { resolve(req.result); };
        req.onerror = reject;
    });
}

function dbRemove(storeName, id) {
    return new Promise(function(resolve, reject) {
        var tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
}

// ---- STATE ----
var allBooks = [];
var allNotes = [];
var stats = JSON.parse(localStorage.getItem('sbstats') || '{"q":0,"c":0,"a":0}');
var currentFile = null;

// ---- NAVIGATION ----
function navigate(pageId) {
    var pages = document.querySelectorAll('.pg');
    for (var i = 0; i < pages.length; i++) {
        pages[i].classList.remove('show');
    }
    document.getElementById(pageId).classList.add('show');
    window.scrollTo(0, 0);

    if (pageId === 'library') renderLibrary();
    if (pageId === 'quiz') populateSelect('quizBookPicker');
    if (pageId === 'flashcards') populateSelect('fcBookPicker');
    if (pageId === 'helper') populateSelect('aiBookPicker');
    if (pageId === 'notes') renderNotes();
}

// ---- THEME ----
function switchTheme() {
    document.body.classList.toggle('dark-theme');
    var btn = document.querySelector('.themebtn');
    btn.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
    localStorage.setItem('sbtheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// ---- DASHBOARD ----
function updateDashboard() {
    document.getElementById('stBooks').textContent = allBooks.length;
    document.getElementById('stQuiz').textContent = stats.q;
    document.getElementById('stScore').textContent = stats.a > 0 ? Math.round(stats.c / stats.a * 100) + '%' : '0%';
}

function subjectEmoji(s) {
    var map = { math:'📐', english:'📖', hindi:'📝', tamil:'🟢', science:'🔬', social:'🌍', computer:'💻', other:'📦' };
    return map[s] || '📄';
}

function subjectColor(s) {
    var map = { math:'#4f46e5,#7c3aed', english:'#059669,#10b981', hindi:'#db2777,#ec4899', tamil:'#059669,#0d9488', science:'#0891b2,#06b6d4', social:'#d97706,#f59e0b', computer:'#7c3aed,#8b5cf6' };
    return map[s] || '#64748b,#94a3b8';
}

// ---- UPLOAD ----
function openUploadDialog() {
    document.getElementById('uploadOverlay').classList.add('show');
    resetUploadDialog();
    if (localStorage.getItem('sbtut')) {
        document.getElementById('uploadTutorial').style.display = 'none';
    }
}

function closeUploadDialog() {
    document.getElementById('uploadOverlay').classList.remove('show');
}

function resetUploadDialog() {
    document.getElementById('uploadStep1').style.display = 'block';
    document.getElementById('uploadStep2').style.display = 'none';
    document.getElementById('uploadProgressArea').style.display = 'none';
    document.getElementById('realFileInput').value = '';
    currentFile = null;
}

function handleFilePick(event) {
    var file = event.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
        toast('Please pick a PDF file!', 'err');
        return;
    }
    currentFile = file;
    document.getElementById('uploadStep1').style.display = 'none';
    document.getElementById('uploadStep2').style.display = 'block';
    document.getElementById('pickedFileName').textContent = file.name;
    document.getElementById('pickedFileSize').textContent = (file.size / 1048576).toFixed(1) + ' MB';
    document.getElementById('uploadTitle').value = file.name.replace('.pdf', '').replace(/[_-]+/g, ' ');
    document.getElementById('uploadSubject').value = '';
    localStorage.setItem('sbtut', '1');
    toast('File selected!', 'info');
}

async function processUpload() {
    var title = document.getElementById('uploadTitle').value.trim();
    var subject = document.getElementById('uploadSubject').value;
    if (!title) { toast('Enter a title!', 'warn'); return; }
    if (!subject) { toast('Pick a subject!', 'warn'); return; }
    if (!currentFile) { toast('No file chosen!', 'err'); return; }

    var btn = document.getElementById('uploadGoBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Processing...';
    document.getElementById('uploadProgressArea').style.display = 'block';
    var fillBar = document.getElementById('uploadProgFill');
    var statusText = document.getElementById('uploadStatusText');

    try {
        // Read file
        statusText.textContent = 'Reading file...';
        fillBar.style.width = '5%';

        var arrayBuffer = await new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function() { resolve(reader.result); };
            reader.onerror = function() { reject(new Error('Cannot read file')); };
            reader.readAsArrayBuffer(currentFile);
        });

        // ★ FIX: Copy the ArrayBuffer BEFORE pdf.js consumes it
        var arrayBufferCopy = arrayBuffer.slice(0);

        // Load PDF
        statusText.textContent = 'Loading PDF...';
        fillBar.style.width = '15%';
        var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        var totalPages = pdf.numPages;

        // Extract text
        var pageTexts = [];
        var fullText = '';
        for (var i = 1; i <= totalPages; i++) {
            try {
                var page = await pdf.getPage(i);
                var textContent = await page.getTextContent();
                var pageText = textContent.items.map(function(item) { return item.str; }).join(' ').trim();
                pageTexts.push(pageText || '');
                fullText += pageText + '\n\n';
            } catch (e) {
                pageTexts.push('');
            }
            var pct = 15 + Math.round((i / totalPages) * 65);
            fillBar.style.width = pct + '%';
            statusText.textContent = 'Extracting page ' + i + ' / ' + totalPages + '...';
        }

        // Save PDF binary using the COPY (not the original)
        statusText.textContent = 'Saving...';
        fillBar.style.width = '85%';
        var pdfId = 'pdf_' + Date.now();
        await dbSave('pdfs', { id: pdfId, data: arrayBufferCopy });

        // Save book record
        var book = {
            id: 'book_' + Date.now(),
            title: title,
            subject: subject,
            pages: totalPages,
            pageTexts: pageTexts,
            fullText: fullText.replace(/\s+/g, ' ').trim().substring(0, 500000),
            pdfId: pdfId,
            date: new Date().toLocaleDateString()
        };
        await dbSave('books', book);
        allBooks.push(book);

        fillBar.style.width = '100%';
        statusText.textContent = '✅ Done!';
        updateDashboard();
        toast('"' + title + '" uploaded! ' + totalPages + ' pages.', 'ok');

        setTimeout(function() {
            closeUploadDialog();
            navigate('library');
        }, 600);
    } catch (err) {
        console.error('Upload error:', err);
        toast('Error: ' + err.message, 'err');
        statusText.textContent = '❌ ' + err.message;
    }
    btn.disabled = false;
    btn.textContent = '📤 Upload & Process';
}
// ---- LIBRARY ----
function renderLibrary() {
    var grid = document.getElementById('libContent');
    if (allBooks.length === 0) {
        grid.innerHTML = '<p class="placeholder">📚 No books yet. Upload your first PDF!</p>';
        return;
    }
    var html = '';
    for (var i = 0; i < allBooks.length; i++) {
        var b = allBooks[i];
        html += '<div class="libcard">' +
            '<div class="libcard-top" style="background:linear-gradient(135deg,' + subjectColor(b.subject) + ')">' +
            '<h3>' + b.title + '</h3><p>' + subjectEmoji(b.subject) + ' ' + b.subject + '</p></div>' +
            '<div class="libcard-bot"><div class="libcard-meta"><span>📄 ' + b.pages + ' pages</span><span>' + b.date + '</span></div>' +
            '<div class="libcard-btns">' +
            '<button class="btn small" style="background:var(--p)" onclick="openReader(\'' + b.id + '\')">📖 Read</button>' +
            '<button class="btn small" style="background:var(--ok)" onclick="goQuizFromLib(\'' + b.id + '\')">🧠 Quiz</button>' +
            '<button class="btn small" style="background:var(--w);color:#1e293b" onclick="goFCFromLib(\'' + b.id + '\')">🔤 Cards</button>' +
            '<button class="btn small" style="background:var(--e)" onclick="deleteBook(\'' + b.id + '\')">🗑️ Delete</button>' +
            '</div></div></div>';
    }
    grid.innerHTML = html;
}

async function deleteBook(bookId) {
    if (!confirm('🗑️ Delete this book?')) return;
    var book = allBooks.find(function(b) { return b.id === bookId; });
    if (book && book.pdfId) {
        try { await dbRemove('pdfs', book.pdfId); } catch(e) {}
    }
    await dbRemove('books', bookId);
    allBooks = allBooks.filter(function(b) { return b.id !== bookId; });
    renderLibrary();
    updateDashboard();
    toast('Book deleted!', 'info');
}

// ---- READER ----
var readerPdfDoc = null;
var readerCurrentPage = 0;
var readerZoomLevel = 1.3;
var readerCurrentBook = null;

async function openReader(bookId) {
    var book = allBooks.find(function(b) { return b.id === bookId; });
    if (!book) { toast('Book not found!', 'err'); return; }

    readerCurrentBook = book;
    readerCurrentPage = 0;
    readerZoomLevel = 1.3;
    readerPdfDoc = null;

    navigate('reader');
    document.getElementById('readerBookTitle').textContent = '📖 ' + book.title;
    document.getElementById('readerDisplay').innerHTML = '<p class="placeholder">⏳ Loading book...</p>';

    try {
        var pdfData = await dbGet('pdfs', book.pdfId);
        if (pdfData && pdfData.data) {
            readerPdfDoc = await pdfjsLib.getDocument({ data: pdfData.data }).promise;

            // Fill page selector
            var sel = document.getElementById('readerPageSelect');
            sel.innerHTML = '';
            for (var i = 0; i < readerPdfDoc.numPages; i++) {
                var opt = document.createElement('option');
                opt.value = i;
                opt.textContent = 'Page ' + (i + 1);
                sel.appendChild(opt);
            }
            await renderReaderPage();
            toast('Book loaded with images! 📸', 'ok');
        } else {
            showReaderText();
        }
    } catch (err) {
        console.warn('Reader error:', err);
        showReaderText();
    }
}

async function renderReaderPage() {
    if (!readerPdfDoc) { showReaderText(); return; }
    var display = document.getElementById('readerDisplay');
    display.innerHTML = '';

    try {
        var page = await readerPdfDoc.getPage(readerCurrentPage + 1);
        var viewport = page.getViewport({ scale: readerZoomLevel });
        var canvas = document.createElement('canvas');
        canvas.className = 'pdfcanvas';
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        var ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        display.appendChild(canvas);
    } catch (e) {
        showReaderText();
    }

    document.getElementById('readerPageNum').textContent = (readerCurrentPage + 1) + ' / ' + readerCurrentBook.pages;
    document.getElementById('readerPageSelect').value = readerCurrentPage;
}

function showReaderText() {
    var display = document.getElementById('readerDisplay');
    var text = readerCurrentBook.pageTexts[readerCurrentPage] || 'No text on this page.';
    display.innerHTML = '<div style="padding:16px;white-space:pre-wrap;line-height:1.7;font-size:0.88rem;word-break:break-word;">' + text + '</div>';
    document.getElementById('readerPageNum').textContent = (readerCurrentPage + 1) + ' / ' + readerCurrentBook.pages;
}

async function readerNext() {
    if (!readerCurrentBook || readerCurrentPage >= readerCurrentBook.pages - 1) return;
    readerCurrentPage++;
    readerPdfDoc ? await renderReaderPage() : showReaderText();
}

async function readerPrev() {
    if (!readerCurrentBook || readerCurrentPage <= 0) return;
    readerCurrentPage--;
    readerPdfDoc ? await renderReaderPage() : showReaderText();
}

async function readerJump(pageNum) {
    readerCurrentPage = pageNum;
    readerPdfDoc ? await renderReaderPage() : showReaderText();
}

async function readerZoomChange(delta) {
    readerZoomLevel = Math.max(0.5, Math.min(3, readerZoomLevel + delta));
    if (readerPdfDoc) await renderReaderPage();
}

// ---- SELECT POPULATOR ----
function populateSelect(selectId) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var oldVal = sel.value;
    var first = sel.options[0] ? sel.options[0].textContent : '-- Pick --';
    sel.innerHTML = '<option value="">' + first + '</option>';
    for (var i = 0; i < allBooks.length; i++) {
        var b = allBooks[i];
        var opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = subjectEmoji(b.subject) + ' ' + b.title;
        sel.appendChild(opt);
    }
    sel.value = oldVal;
}

// ---- QUIZ ----
var quizQuestions = [];
var quizIndex = 0;
var quizCorrect = 0;
var quizWrong = 0;

function goQuizFromLib(bookId) {
    navigate('quiz');
    setTimeout(function() {
        document.getElementById('quizBookPicker').value = bookId;
        quizBookChanged();
    }, 100);
}

function quizBookChanged() {
    var bookId = document.getElementById('quizBookPicker').value;
    var rangeDiv = document.getElementById('quizPageRange');
    if (!bookId) { rangeDiv.style.display = 'none'; return; }
    var book = allBooks.find(function(b) { return b.id === bookId; });
    if (!book) { rangeDiv.style.display = 'none'; return; }
    rangeDiv.style.display = 'block';
    document.getElementById('quizFrom').value = 1;
    document.getElementById('quizFrom').max = book.pages;
    document.getElementById('quizTo').value = Math.min(book.pages, 10);
    document.getElementById('quizTo').max = book.pages;
}

function quizStart() {
    var bookId = document.getElementById('quizBookPicker').value;
    if (!bookId) { toast('Pick a book!', 'warn'); return; }
    var book = allBooks.find(function(b) { return b.id === bookId; });
    if (!book) return;

    var from = Math.max(0, parseInt(document.getElementById('quizFrom').value) - 1);
    var to = Math.min(book.pages, parseInt(document.getElementById('quizTo').value));
    var numQ = parseInt(document.getElementById('quizNumQ').value);

    if (from >= to) { toast('Invalid page range!', 'warn'); return; }

    // Get text for selected pages
    var chapterText = book.pageTexts.slice(from, to).join(' ').replace(/\s+/g, ' ').trim();
    if (chapterText.length < 80) { toast('Not enough text in those pages. Try wider range.', 'warn'); return; }

    quizQuestions = generateQuestions(chapterText, numQ);
    quizIndex = 0;
    quizCorrect = 0;
    quizWrong = 0;

    if (quizQuestions.length === 0) { toast('Could not generate questions. Try different pages.', 'warn'); return; }

    document.getElementById('quizSetupBox').style.display = 'none';
    document.getElementById('quizPlayBox').style.display = 'block';
    document.getElementById('quizResultBox').style.display = 'none';
    showQuizQuestion();
    toast(quizQuestions.length + ' questions from pages ' + (from+1) + '-' + to + '!', 'ok');
}

function generateQuestions(text, count) {
    var results = [];
    var sentences = text.split(/[.!?।\n]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 20 && s.length < 250; });
    if (sentences.length < 3) return [];

    // Get keywords
    var stopWords = 'the and for that this with from have been were they their which about would could should these those also into some than then only very more most such each because between through during without another does will just over under both same many much while since until upon here still even well back down like make made know take come give look find want tell good great first last long little around every never might shall a an is are was in on to of it'.split(' ');
    var freq = {};
    text.split(/\s+/).forEach(function(w) {
        var c = w.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
        if (c.length > 3 && stopWords.indexOf(c) === -1) freq[c] = (freq[c] || 0) + 1;
    });

    var keywords = [];
    for (var word in freq) {
        if (freq[word] >= 2 && freq[word] <= 25) keywords.push({ word: word, count: freq[word] });
    }
    keywords.sort(function(a, b) { return b.count - a.count; });
    keywords = keywords.slice(0, 50).map(function(k) { return k.word; });

    var used = {};

    // Fill in blank questions
    for (var si = 0; si < sentences.length && results.length < Math.ceil(count * 0.5); si++) {
        var sent = sentences[si];
        if (used[sent]) continue;
        var words = sent.split(/\s+/);
        if (words.length < 5) continue;

        var bestWord = null;
        var bestIndex = -1;
        for (var wi = 1; wi < words.length - 1; wi++) {
            var clean = words[wi].toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
            if (keywords.indexOf(clean) !== -1 && clean.length > 4) {
                bestWord = words[wi];
                bestIndex = wi;
                break;
            }
        }
        if (!bestWord) continue;
        used[sent] = true;

        var blanked = words.map(function(w, idx) { return idx === bestIndex ? '________' : w; }).join(' ');
        var correctAnswer = bestWord.replace(/[^a-zA-Z\u0900-\u097F\s]/g, '');
        var wrongAnswers = keywords.filter(function(k) { return k !== correctAnswer.toLowerCase(); }).sort(function() { return Math.random() - 0.5; }).slice(0, 3);
        if (wrongAnswers.length < 3) continue;

        var options = [correctAnswer].concat(wrongAnswers).sort(function() { return Math.random() - 0.5; });
        results.push({
            question: 'Fill in the blank:\n\n"' + blanked + '"',
            options: options,
            answer: options.indexOf(correctAnswer),
            type: 'Fill in Blank',
            explanation: 'Answer: ' + correctAnswer + '\n"' + sent + '"'
        });
    }

    // True/False questions
    for (var ti = 0; ti < sentences.length && results.length < Math.ceil(count * 0.8); ti++) {
        var tfSent = sentences[ti];
        if (used[tfSent] || tfSent.length > 160 || Math.random() > 0.5) continue;
        used[tfSent] = true;

        var isTrue = Math.random() > 0.4;
        var displaySent = tfSent;
        if (!isTrue) {
            var tfWords = tfSent.split(/\s+/);
            for (var ri = 1; ri < tfWords.length - 1; ri++) {
                var rc = tfWords[ri].toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
                if (keywords.indexOf(rc) !== -1 && rc.length > 4) {
                    var replacement = keywords.find(function(k) { return k !== rc; });
                    if (replacement) { tfWords[ri] = replacement; break; }
                }
            }
            displaySent = tfWords.join(' ');
        }
        results.push({
            question: 'True or False?\n\n"' + displaySent + '"',
            options: ['True ✅', 'False ❌'],
            answer: isTrue ? 0 : 1,
            type: 'True/False',
            explanation: isTrue ? 'Correct as stated.' : 'Original: "' + tfSent + '"'
        });
    }

    // Comprehension
    for (var ci = 0; ci < 5 && results.length < count; ci++) {
        var compSent = sentences[Math.floor(Math.random() * sentences.length)];
        if (used[compSent] || compSent.length > 120) continue;
        used[compSent] = true;
        var preview = compSent.length > 70 ? compSent.substring(0, 70) + '...' : compSent;
        var wrongOpts = ['Not mentioned in the text', 'Belongs to another chapter', 'The book doesn\'t discuss this'];
        var compOpts = [preview].concat(wrongOpts).sort(function() { return Math.random() - 0.5; });
        results.push({
            question: 'Which is from your book?',
            options: compOpts,
            answer: compOpts.indexOf(preview),
            type: 'Comprehension',
            explanation: 'Found: "' + compSent + '"'
        });
    }

    // Shuffle and limit
    results.sort(function() { return Math.random() - 0.5; });
    return results.slice(0, count);
}

function showQuizQuestion() {
    if (quizIndex >= quizQuestions.length) { showQuizResults(); return; }
    var q = quizQuestions[quizIndex];
    document.getElementById('quizProgFill').style.width = (quizIndex / quizQuestions.length * 100) + '%';
    document.getElementById('quizProgLabel').textContent = 'Q' + (quizIndex + 1) + ' / ' + quizQuestions.length;
    document.getElementById('quizTypeBadge').textContent = q.type;
    document.getElementById('quizQuestionText').textContent = q.question;
    document.getElementById('quizFeedback').textContent = '';
    var expEl = document.getElementById('quizExplain');
    expEl.textContent = '';
    expEl.classList.remove('visible');
    document.getElementById('quizNextBtn').style.display = 'none';

    var optDiv = document.getElementById('quizOptionsArea');
    optDiv.innerHTML = '';
    q.options.forEach(function(opt, idx) {
        var btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = function() { pickQuizAnswer(idx, q.answer, btn, q.explanation); };
        optDiv.appendChild(btn);
    });
    updateQuizScore();
}

function pickQuizAnswer(picked, correct, clickedBtn, explanation) {
    var buttons = document.getElementById('quizOptionsArea').querySelectorAll('button');
    buttons.forEach(function(b) { b.onclick = null; b.classList.add('locked'); });

    var fb = document.getElementById('quizFeedback');
    if (picked === correct) {
        quizCorrect++;
        clickedBtn.classList.add('correct');
        fb.textContent = '✅ Correct!';
        fb.style.color = 'var(--ok)';
    } else {
        quizWrong++;
        clickedBtn.classList.add('wrong');
        buttons[correct].classList.add('correct');
        fb.textContent = '❌ Wrong!';
        fb.style.color = 'var(--e)';
    }

    if (explanation) {
        var expEl = document.getElementById('quizExplain');
        expEl.textContent = '💡 ' + explanation;
        expEl.classList.add('visible');
    }
    updateQuizScore();
    document.getElementById('quizNextBtn').style.display = 'inline-block';
}

function quizNextQuestion() { quizIndex++; showQuizQuestion(); }

function updateQuizScore() {
    document.getElementById('quizCorrectNum').textContent = quizCorrect;
    document.getElementById('quizWrongNum').textContent = quizWrong;
    var total = quizCorrect + quizWrong;
    document.getElementById('quizPercentNum').textContent = total > 0 ? Math.round(quizCorrect / total * 100) + '%' : '0%';
}

function showQuizResults() {
    document.getElementById('quizPlayBox').style.display = 'none';
    document.getElementById('quizResultBox').style.display = 'block';
    var total = quizCorrect + quizWrong;
    var pct = total > 0 ? Math.round(quizCorrect / total * 100) : 0;
    document.getElementById('quizResultPct').textContent = pct + '%';
    var circle = document.getElementById('quizResultCircle');
    circle.style.background = pct >= 80 ? 'linear-gradient(135deg,#10b981,#059669)' : pct >= 50 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#ef4444,#dc2626)';
    document.getElementById('quizResultMsg').textContent = pct >= 80 ? '🌟 Excellent!' : pct >= 50 ? '👍 Good effort!' : '📖 Keep studying!';
    stats.q++;
    stats.c += quizCorrect;
    stats.a += total;
    localStorage.setItem('sbstats', JSON.stringify(stats));
    updateDashboard();
}

function quizReset() {
    document.getElementById('quizSetupBox').style.display = 'block';
    document.getElementById('quizPlayBox').style.display = 'none';
    document.getElementById('quizResultBox').style.display = 'none';
}

// ---- FLASHCARDS ----
var fcCards = [];
var fcIndex = 0;

function goFCFromLib(bookId) {
    navigate('flashcards');
    setTimeout(function() {
        document.getElementById('fcBookPicker').value = bookId;
        fcLoadBook(bookId);
    }, 100);
}

function fcLoadBook(bookId) {
    if (!bookId) return;
    var book = allBooks.find(function(b) { return b.id === bookId; });
    if (!book || !book.fullText || book.fullText.length < 80) {
        document.getElementById('fcContent').innerHTML = '<p class="placeholder">⚠️ Not enough text</p>';
        document.getElementById('fcCardArea').style.display = 'none';
        return;
    }

    fcCards = [];
    var sents = book.fullText.split(/[.!?।\n]+/).filter(function(s) { return s.trim().length > 15 && s.trim().length < 200; });
    var freq = {};
    book.fullText.split(/\s+/).forEach(function(w) {
        var c = w.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
        if (c.length > 4) freq[c] = (freq[c] || 0) + 1;
    });
    var kws = [];
    for (var w in freq) { if (freq[w] >= 2 && freq[w] <= 15) kws.push(w); }
    kws.sort(function(a, b) { return (freq[b] || 0) - (freq[a] || 0); });
    kws = kws.slice(0, 25);

    var usedKW = {};
    sents.forEach(function(s) {
        if (fcCards.length >= 20) return;
        var trimmed = s.trim();
        for (var ki = 0; ki < kws.length; ki++) {
            var kw = kws[ki];
            if (usedKW[kw]) continue;
            if (trimmed.toLowerCase().indexOf(kw) !== -1) {
                fcCards.push({ front: kw.charAt(0).toUpperCase() + kw.slice(1), back: trimmed.length > 120 ? trimmed.substring(0, 120) + '...' : trimmed });
                usedKW[kw] = true;
                break;
            }
        }
    });

    if (fcCards.length === 0) {
        document.getElementById('fcContent').innerHTML = '<p class="placeholder">⚠️ Cannot generate flashcards</p>';
        document.getElementById('fcCardArea').style.display = 'none';
        return;
    }

    fcIndex = 0;
    document.getElementById('fcContent').innerHTML = '';
    document.getElementById('fcCardArea').style.display = 'block';
    fcShowCard();
    toast(fcCards.length + ' flashcards ready!', 'ok');
}

function fcShowCard() {
    var card = fcCards[fcIndex];
    document.getElementById('fcFrontText').textContent = card.front;
    document.getElementById('fcBackText').textContent = card.back;
    document.getElementById('fcCounter').textContent = (fcIndex + 1) + ' / ' + fcCards.length;
    document.getElementById('fcTheCard').classList.remove('flipped');
}

function fcFlip() { document.getElementById('fcTheCard').classList.toggle('flipped'); }
function fcGoNext() { fcIndex = (fcIndex + 1) % fcCards.length; fcShowCard(); }
function fcGoPrev() { fcIndex = (fcIndex - 1 + fcCards.length) % fcCards.length; fcShowCard(); }

// ---- TAMIL ----
var tamilWords = [
    {t:'பள்ளி',e:'School'},{t:'புத்தகம்',e:'Book'},{t:'ஆசிரியர்',e:'Teacher'},
    {t:'மாணவன்',e:'Student'},{t:'கணிதம்',e:'Mathematics'},{t:'அறிவியல்',e:'Science'},
    {t:'வரலாறு',e:'History'},{t:'நீர்',e:'Water'},{t:'தீ',e:'Fire'},
    {t:'காற்று',e:'Wind'},{t:'பூமி',e:'Earth'},{t:'வானம்',e:'Sky'},
    {t:'மழை',e:'Rain'},{t:'சூரியன்',e:'Sun'},{t:'நிலா',e:'Moon'},
    {t:'அன்பு',e:'Love'},{t:'நன்றி',e:'Thank you'},{t:'வணக்கம்',e:'Hello'},
    {t:'வீடு',e:'House'},{t:'உணவு',e:'Food'},{t:'மரம்',e:'Tree'},
    {t:'பூ',e:'Flower'},{t:'பழம்',e:'Fruit'},{t:'கடல்',e:'Sea'},{t:'மலை',e:'Mountain'}
];
var tamilFCIndex = 0;

function tamilShowFC() {
    var w = tamilWords[tamilFCIndex];
    document.getElementById('tamilFront').textContent = w.t;
    document.getElementById('tamilBack').textContent = w.e;
    document.getElementById('tamilCounter').textContent = (tamilFCIndex + 1) + ' / ' + tamilWords.length;
    document.getElementById('tamilCard').classList.remove('flipped');
}

function tamilFlip() { document.getElementById('tamilCard').classList.toggle('flipped'); }
function tamilNext() { tamilFCIndex = (tamilFCIndex + 1) % tamilWords.length; tamilShowFC(); }
function tamilPrev() { tamilFCIndex = (tamilFCIndex - 1 + tamilWords.length) % tamilWords.length; tamilShowFC(); }

var tamilQuizC = 0;
var tamilQuizW = 0;
var tamilQuizData = [
    {q:'"பள்ளி" means?',o:['Hospital','School','Temple','Market'],a:1},
    {q:'"Water" in Tamil?',o:['தீ','காற்று','நீர்','மண்'],a:2},
    {q:'Tamil letters total?',o:['247','200','300','150'],a:0},
    {q:'Vowels count?',o:['18','12','216','10'],a:1},
    {q:'Consonants count?',o:['12','216','20','18'],a:3},
    {q:'"சூரியன்" means?',o:['Moon','Star','Sun','Cloud'],a:2},
    {q:'"ஆசிரியர்" means?',o:['Student','Teacher','Doctor','Farmer'],a:1},
    {q:'ஆய்த எழுத்து?',o:['அ','க','ஃ','ங'],a:2},
    {q:'"நன்றி" means?',o:['Sorry','Please','Thank you','Welcome'],a:2},
    {q:'"அறிவே ஆற்றல்" means?',o:['Money=power','Knowledge=power','Unity=strength','Health=wealth'],a:1}
];

function tamilQuizLoad() {
    var q = tamilQuizData[Math.floor(Math.random() * tamilQuizData.length)];
    document.getElementById('tamilQText').textContent = q.q;
    document.getElementById('tamilQFb').textContent = '';
    var optDiv = document.getElementById('tamilQOpts');
    optDiv.innerHTML = '';
    q.o.forEach(function(opt, idx) {
        var btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = function() {
            optDiv.querySelectorAll('button').forEach(function(b) { b.onclick = null; b.classList.add('locked'); });
            var fb = document.getElementById('tamilQFb');
            if (idx === q.a) {
                tamilQuizC++;
                btn.classList.add('correct');
                fb.textContent = '✅ சரி! Correct!';
                fb.style.color = 'var(--ok)';
            } else {
                tamilQuizW++;
                btn.classList.add('wrong');
                optDiv.children[q.a].classList.add('correct');
                fb.textContent = '❌ தவறு! Wrong!';
                fb.style.color = 'var(--e)';
            }
            document.getElementById('tamilScoreC').textContent = tamilQuizC;
            document.getElementById('tamilScoreW').textContent = tamilQuizW;
        };
        optDiv.appendChild(btn);
    });
}

// ---- AI HELPER ----
var aiSelectedBookId = null;

function aiSelectBook(bookId) {
    aiSelectedBookId = bookId;
    if (bookId) {
        var book = allBooks.find(function(b) { return b.id === bookId; });
        if (book) addChatMessage('bot', '📘 Loaded "' + book.title + '" (' + book.pages + ' pages). Ask me anything!');
    }
}

function aiSendMessage() {
    var input = document.getElementById('chatInput');
    var query = input.value.trim();
    if (!query) return;
    input.value = '';
    addChatMessage('user', query);

    if (!aiSelectedBookId) {
        addChatMessage('bot', '⚠️ Please select a book first!');
        return;
    }

    var book = allBooks.find(function(b) { return b.id === aiSelectedBookId; });
    if (!book) { addChatMessage('bot', '❌ Book not found!'); return; }

    // Search the book
    var queryWords = query.toLowerCase().split(/\s+/).filter(function(w) { return w.length > 2; });
    var sentences = book.fullText.split(/[.!?।\n]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 15; });

    var scored = sentences.map(function(s) {
        var lower = s.toLowerCase();
        var score = 0;
        queryWords.forEach(function(w) { if (lower.indexOf(w) !== -1) score += 2; });
        return { text: s, score: score };
    }).filter(function(x) { return x.score > 0; }).sort(function(a, b) { return b.score - a.score; });

    if (scored.length > 0) {
        var response = '📖 Found in your book:<br><br>';
        scored.slice(0, 3).forEach(function(item, i) {
            var display = item.text.length > 200 ? item.text.substring(0, 200) + '...' : item.text;
            response += '<div class="foundtext"><b>Match ' + (i+1) + ':</b><br>' + display + '</div>';
        });
        addChatMessage('bot', response, true);
    } else {
        // Handle special queries
        var q = query.toLowerCase();
        if (q.indexOf('page') !== -1) {
            var pageMatch = q.match(/page\s*(\d+)/);
            if (pageMatch) {
                var pg = parseInt(pageMatch[1]) - 1;
                if (pg >= 0 && pg < book.pageTexts.length) {
                    var pageText = book.pageTexts[pg] || 'No readable text.';
                    var preview = pageText.length > 300 ? pageText.substring(0, 300) + '...' : pageText;
                    addChatMessage('bot', '📄 Page ' + (pg+1) + ':<br><div class="foundtext">' + preview + '</div>', true);
                    return;
                }
            }
        }
        addChatMessage('bot', '🤔 Couldn\'t find "' + query + '" in your book. Try different keywords or ask about a specific page!');
    }
}

function addChatMessage(who, message, isHTML) {
    var chatArea = document.getElementById('chatArea');
    var div = document.createElement('div');
    div.className = 'chatmsg ' + who;
    var avatar = who === 'bot' ? '🤖' : '👤';
    var content = isHTML ? message : message.replace(/</g, '&lt;').replace(/\n/g, '<br>');
    div.innerHTML = '<div class="chatavatar">' + avatar + '</div><div class="chatbubble">' + content + '</div>';
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
}

// ---- NOTES ----
var editingNoteId = null;

function noteStartNew() {
    editingNoteId = null;
    document.getElementById('noteEditArea').style.display = 'block';
    document.getElementById('noteEditTitle').value = '';
    document.getElementById('noteEditBody').value = '';
    document.getElementById('noteEditTitle').focus();
}

function noteCancel() {
    document.getElementById('noteEditArea').style.display = 'none';
}

async function noteSave() {
    var title = document.getElementById('noteEditTitle').value.trim();
    var body = document.getElementById('noteEditBody').value.trim();
    if (!title || !body) { toast('Enter title and content!', 'warn'); return; }

    if (editingNoteId) {
        var existing = allNotes.find(function(n) { return n.id === editingNoteId; });
        if (existing) {
            existing.title = title;
            existing.body = body;
            existing.modified = new Date().toLocaleDateString();
            await dbSave('notes', existing);
        }
    } else {
        var note = {
            id: 'note_' + Date.now(),
            title: title,
            body: body,
            date: new Date().toLocaleDateString(),
            modified: new Date().toLocaleDateString()
        };
        allNotes.push(note);
        await dbSave('notes', note);
    }
    noteCancel();
    renderNotes();
    toast('Note saved!', 'ok');
}

function renderNotes() {
    var container = document.getElementById('noteListArea');
    if (allNotes.length === 0) {
        container.innerHTML = '<p class="placeholder">📝 No notes yet. Click "+ New" to start!</p>';
        return;
    }
    var html = '';
    for (var i = allNotes.length - 1; i >= 0; i--) {
        var n = allNotes[i];
        html += '<div class="notecard" onclick="noteEdit(\'' + n.id + '\')">' +
            '<button class="notedel" onclick="event.stopPropagation();noteDelete(\'' + n.id + '\')">✕</button>' +
            '<h4>' + n.title + '</h4>' +
            '<p>' + n.body.substring(0, 80) + (n.body.length > 80 ? '...' : '') + '</p>' +
            '<p class="small">📅 ' + (n.modified || n.date) + '</p></div>';
    }
    container.innerHTML = html;
}

function noteEdit(id) {
    var note = allNotes.find(function(n) { return n.id === id; });
    if (!note) return;
    editingNoteId = id;
    document.getElementById('noteEditArea').style.display = 'block';
    document.getElementById('noteEditTitle').value = note.title;
    document.getElementById('noteEditBody').value = note.body;
}

async function noteDelete(id) {
    if (!confirm('Delete this note?')) return;
    await dbRemove('notes', id);
    allNotes = allNotes.filter(function(n) { return n.id !== id; });
    renderNotes();
    toast('Deleted!', 'info');
}

// ---- TIMER ----
var timerInterval = null;
var timerSecondsLeft = 25 * 60;
var timerTotalSeconds = 25 * 60;

function timerUpdateDisplay() {
    var mins = Math.floor(timerSecondsLeft / 60).toString().padStart(2, '0');
    var secs = (timerSecondsLeft % 60).toString().padStart(2, '0');
    document.getElementById('timerDisplay').textContent = mins + ':' + secs;
}

function timerStart() {
    if (timerInterval) return;
    timerInterval = setInterval(function() {
        if (timerSecondsLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            toast('⏰ Time is up!', 'ok');
            return;
        }
        timerSecondsLeft--;
        timerUpdateDisplay();
    }, 1000);
}

function timerPause() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function timerReset() {
    timerPause();
    timerSecondsLeft = timerTotalSeconds;
    timerUpdateDisplay();
}

function timerSetMinutes(mins) {
    timerPause();
    timerSecondsLeft = mins * 60;
    timerTotalSeconds = mins * 60;
    timerUpdateDisplay();
}

// ---- DRAG & DROP ----
document.addEventListener('DOMContentLoaded', function() {
    var picker = document.getElementById('filePicker');
    if (picker) {
        picker.addEventListener('dragover', function(e) { e.preventDefault(); picker.style.borderColor = 'var(--a)'; });
        picker.addEventListener('dragleave', function() { picker.style.borderColor = 'var(--p)'; });
        picker.addEventListener('drop', function(e) {
            e.preventDefault();
            picker.style.borderColor = 'var(--p)';
            var file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                currentFile = file;
                document.getElementById('uploadStep1').style.display = 'none';
                document.getElementById('uploadStep2').style.display = 'block';
                document.getElementById('pickedFileName').textContent = file.name;
                document.getElementById('pickedFileSize').textContent = (file.size / 1048576).toFixed(1) + ' MB';
                document.getElementById('uploadTitle').value = file.name.replace('.pdf', '').replace(/[_-]+/g, ' ');
                toast('File dropped!', 'info');
            } else {
                toast('Please drop a PDF file!', 'err');
            }
        });
    }
});

// ---- INIT ----
window.onload = async function() {
    console.log('StudyBuddy starting...');

    // Theme
    if (localStorage.getItem('sbtheme') === 'dark') {
        document.body.classList.add('dark-theme');
        document.querySelector('.themebtn').textContent = '☀️';
    }

    // Quote
    var quotes = [
        '"Education is the most powerful weapon." — Mandela',
        '"Practice makes perfect!" 💪',
        '"Believe you can and you\'re halfway there."',
        '"Knowledge is Power — அறிவே ஆற்றல்" 🟢',
        '"The expert was once a beginner."'
    ];
    document.getElementById('homeQuote').textContent = quotes[new Date().getDate() % quotes.length];

    // Timer
    timerUpdateDisplay();

    // Tamil
    tamilShowFC();
    tamilQuizLoad();

    // Database
    try {
        await openDatabase();
        allBooks = await dbGetAll('books');
        allNotes = await dbGetAll('notes');
        console.log('Loaded ' + allBooks.length + ' books, ' + allNotes.length + ' notes');
        toast('StudyBuddy ready! ' + allBooks.length + ' books loaded.', 'ok');
    } catch (err) {
        console.error('Database error:', err);
        toast('Database error. Try refreshing.', 'err');
    }

    updateDashboard();
};
function saveName(){var n=document.getElementById('nameInput').value.trim();if(!n){toast('Enter your name!','warn');return;}localStorage.setItem('sbName',n);document.getElementById('namePopup').classList.add('hidden');updateGreeting();toast('Welcome, '+n+'! 🎉','ok');}
function updateGreeting(){var n=localStorage.getItem('sbName');if(!n)return;var h=new Date().getHours();var g,m;if(h>=5&&h<12){g='🌅 Good Morning, '+n+'!';m='Great time to study! 💪';}else if(h>=12&&h<17){g='☀️ Good Afternoon, '+n+'!';m='Keep going! 🚀';}else if(h>=17&&h<21){g='🌇 Good Evening, '+n+'!';m='Revision time! 📝';}else{g='🌙 Good Night, '+n+'!';m='Quick revision before bed! 🧠';}var a=document.getElementById('heroGreeting');var b=document.getElementById('heroMessage');if(a)a.textContent=g;if(b)b.textContent=m;}
(function(){var n=localStorage.getItem('sbName');if(n){var p=document.getElementById('namePopup');if(p)p.classList.add('hidden');updateGreeting();}})();
