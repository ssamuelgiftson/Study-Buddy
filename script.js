// =============================================
//  STUDYBUDDY — COMPLETE WORKING VERSION
//  By Samuel Giftson S
// =============================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ============ TOAST ============
function toast(msg, type) {
    var box = document.getElementById('toastBox');
    var el = document.createElement('div');
    el.className = 'toast-item toast-' + (type || 'info');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function () {
        el.remove();
    }, 4000);
}

// ============ DATABASE ============
var db = null;

function openDatabase() {
    return new Promise(function (resolve, reject) {
        var request = indexedDB.open('StudyBuddyV7', 1);
        request.onupgradeneeded = function (e) {
            var d = e.target.result;
            if (!d.objectStoreNames.contains('books')) d.createObjectStore('books', { keyPath: 'id' });
            if (!d.objectStoreNames.contains('pdfs')) d.createObjectStore('pdfs', { keyPath: 'id' });
            if (!d.objectStoreNames.contains('notes')) d.createObjectStore('notes', { keyPath: 'id' });
        };
        request.onsuccess = function (e) {
            db = e.target.result;
            resolve();
        };
        request.onerror = function () {
            reject('DB error');
        };
    });
}

function dbSave(storeName, data) {
    return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(data);
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
}

function dbGetAll(storeName) {
    return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).getAll();
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = reject;
    });
}

function dbGet(storeName, id) {
    return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readonly');
        var req = tx.objectStore(storeName).get(id);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = reject;
    });
}

function dbRemove(storeName, id) {
    return new Promise(function (resolve, reject) {
        var tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = resolve;
        tx.onerror = reject;
    });
}

// ============ STATE ============
var allBooks = [];
var allNotes = [];
var stats = JSON.parse(localStorage.getItem('sbstats') || '{"q":0,"c":0,"a":0}');
var currentFile = null;

// ============ NAVIGATION ============
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

// ============ THEME ============
function switchTheme() {
    document.body.classList.toggle('dark-theme');
    var btn = document.querySelector('.themebtn');
    btn.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
    localStorage.setItem('sbtheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// ============ DASHBOARD ============
function updateDashboard() {
    document.getElementById('stBooks').textContent = allBooks.length;
    document.getElementById('stQuiz').textContent = stats.q;
    document.getElementById('stScore').textContent = stats.a > 0 ? Math.round(stats.c / stats.a * 100) + '%' : '0%';
}

function subjectEmoji(s) {
    var map = { math: '📐', english: '📖', hindi: '📝', tamil: '📗', science: '🔬', social: '🌍', computer: '💻', other: '📦' };
    return map[s] || '📄';
}

function subjectColor(s) {
    var map = { math: '#4f46e5,#7c3aed', english: '#059669,#10b981', hindi: '#db2777,#ec4899', tamil: '#059669,#0d9488', science: '#0891b2,#06b6d4', social: '#d97706,#f59e0b', computer: '#7c3aed,#8b5cf6' };
    return map[s] || '#64748b,#94a3b8';
}

// ============ NAME GREETING ============
function saveName() {
    var n = document.getElementById('nameInput').value.trim();
    if (!n) {
        toast('Enter your name!', 'warn');
        return;
    }
    localStorage.setItem('sbName', n);
    document.getElementById('namePopup').classList.add('hidden');
    updateGreeting();
    toast('Welcome, ' + n + '! 🎉', 'ok');
}

function updateGreeting() {
    var n = localStorage.getItem('sbName');
    if (!n) return;

    var h = new Date().getHours();
    var g, m;

    if (h >= 5 && h < 12) {
        g = '🌅 Good Morning, ' + n + '!';
        m = 'Great time to study! Start your day strong 💪';
    } else if (h >= 12 && h < 17) {
        g = '☀️ Good Afternoon, ' + n + '!';
        m = 'Keep the momentum going! You got this 🚀';
    } else if (h >= 17 && h < 21) {
        g = '🌇 Good Evening, ' + n + '!';
        m = 'Evening revision time! Review what you learned 📝';
    } else {
        g = '🌙 Good Night, ' + n + '!';
        m = 'Quick revision before bed helps memory! 🧠';
    }

    var a = document.getElementById('heroGreeting');
    var b = document.getElementById('heroMessage');
    if (a) a.textContent = g;
    if (b) b.textContent = m;
}

// ============ UPLOAD ============
function openUploadDialog() {
    document.getElementById('uploadOverlay').classList.add('show');
    resetUploadDialog();
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
        statusText.textContent = 'Reading file...';
        fillBar.style.width = '5%';

        var arrayBuffer = await new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(reader.result); };
            reader.onerror = function () { reject(new Error('Cannot read file')); };
            reader.readAsArrayBuffer(currentFile);
        });

        // Copy BEFORE pdf.js consumes it
        var arrayBufferCopy = arrayBuffer.slice(0);

        statusText.textContent = 'Loading PDF...';
        fillBar.style.width = '15%';
        var pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        var totalPages = pdf.numPages;

        var pageTexts = [];
        var fullText = '';
        for (var i = 1; i <= totalPages; i++) {
            try {
                var page = await pdf.getPage(i);
                var textContent = await page.getTextContent();
                var pageText = textContent.items.map(function (item) { return item.str; }).join(' ').trim();
                pageTexts.push(pageText || '');
                fullText += pageText + '\n\n';
            } catch (e) {
                pageTexts.push('');
            }
            var pct = 15 + Math.round((i / totalPages) * 65);
            fillBar.style.width = pct + '%';
            statusText.textContent = 'Extracting page ' + i + ' / ' + totalPages + '...';
        }

        statusText.textContent = 'Saving...';
        fillBar.style.width = '85%';
        var pdfId = 'pdf_' + Date.now();
        await dbSave('pdfs', { id: pdfId, data: arrayBufferCopy });

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

        setTimeout(function () {
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

// ============ LIBRARY ============
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
    var book = allBooks.find(function (b) { return b.id === bookId; });
    if (book && book.pdfId) {
        try { await dbRemove('pdfs', book.pdfId); } catch (e) { }
    }
    await dbRemove('books', bookId);
    allBooks = allBooks.filter(function (b) { return b.id !== bookId; });
    renderLibrary();
    updateDashboard();
    toast('Book deleted!', 'info');
}

// ============ READER ============
var readerPdfDoc = null;
var readerCurrentPage = 0;
var readerZoomLevel = 1.3;
var readerCurrentBook = null;

async function openReader(bookId) {
    var book = allBooks.find(function (b) { return b.id === bookId; });
    if (!book) { toast('Book not found!', 'err'); return; }

    readerCurrentBook = book;
    readerCurrentPage = 0;
    readerZoomLevel = 1.3;
    readerPdfDoc = null;

    navigate('reader');
    document.getElementById('readerBookTitle').textContent = '📖 ' + book.title;
    document.getElementById('readerDisplay').innerHTML = '<p class="placeholder">⏳ Loading...</p>';

    try {
        var pdfData = await dbGet('pdfs', book.pdfId);
        if (pdfData && pdfData.data) {
            readerPdfDoc = await pdfjsLib.getDocument({ data: pdfData.data }).promise;
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

// ============ SELECT POPULATOR ============
function populateSelect(selectId) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var oldVal = sel.value;
    var firstText = sel.options[0] ? sel.options[0].textContent : '-- Pick --';
    sel.innerHTML = '<option value="">' + firstText + '</option>';
    for (var i = 0; i < allBooks.length; i++) {
        var b = allBooks[i];
        var opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = subjectEmoji(b.subject) + ' ' + b.title;
        sel.appendChild(opt);
    }
    sel.value = oldVal;
}

// ============ MATH QUIZ ============
var mathSC = 0, mathSW = 0;
var mathQuizData = [
    { q: 'What is (a + b)² equal to?', o: ['a² + b²', 'a² + 2ab + b²', 'a² - 2ab + b²', '2a² + 2b²'], a: 1 },
    { q: 'Area of Trapezium = ?', o: ['l × b', '½(a+b)×h', 'π×r²', '½×b×h'], a: 1 },
    { q: 'What is 15% of 200?', o: ['15', '20', '25', '30'], a: 3 },
    { q: 'If x + 5 = 12, what is x?', o: ['5', '6', '7', '8'], a: 2 },
    { q: 'Volume of cube with side 3cm?', o: ['9 cm³', '18 cm³', '27 cm³', '36 cm³'], a: 2 },
    { q: 'What is √144?', o: ['10', '11', '12', '13'], a: 2 },
    { q: 'Sum of angles in quadrilateral?', o: ['180°', '270°', '360°', '540°'], a: 2 },
    { q: 'What is 2³ × 3²?', o: ['36', '48', '72', '108'], a: 2 },
    { q: 'SI for P=1000, R=10%, T=2yr?', o: ['100', '150', '200', '250'], a: 2 },
    { q: 'What is (a-b)(a+b)?', o: ['a²+b²', 'a²-b²', '2ab', 'a²+2ab+b²'], a: 1 },
    { q: 'Cube root of 64?', o: ['2', '3', '4', '8'], a: 2 },
    { q: '3x - 7 = 8, find x?', o: ['3', '4', '5', '6'], a: 2 }
];

function mathQuizLoad() {
    var q = mathQuizData[Math.floor(Math.random() * mathQuizData.length)];
    document.getElementById('mathQText').textContent = q.q;
    document.getElementById('mathQFb').textContent = '';
    var od = document.getElementById('mathQOpts');
    od.innerHTML = '';
    q.o.forEach(function (opt, idx) {
        var btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = function () {
            od.querySelectorAll('button').forEach(function (b) { b.onclick = null; b.classList.add('locked'); });
            var fb = document.getElementById('mathQFb');
            if (idx === q.a) { mathSC++; btn.classList.add('correct'); fb.textContent = '✅ Correct!'; fb.style.color = 'var(--ok)'; }
            else { mathSW++; btn.classList.add('wrong'); od.children[q.a].classList.add('correct'); fb.textContent = '❌ Wrong!'; fb.style.color = 'var(--e)'; }
            document.getElementById('mathSC').textContent = mathSC;
            document.getElementById('mathSW').textContent = mathSW;
        };
        od.appendChild(btn);
    });
}

// ============ ENGLISH VOCAB & QUIZ ============
var engWords = [
    { w: 'Benevolent', m: 'Kind, generous (दयालु)' },
    { w: 'Eloquent', m: 'Fluent speaker (वाक्पटु)' },
    { w: 'Resilient', m: 'Recovers quickly (लचीला)' },
    { w: 'Diligent', m: 'Hardworking (परिश्रमी)' },
    { w: 'Ambiguous', m: 'Double meaning (अस्पष्ट)' },
    { w: 'Inevitable', m: 'Certain to happen (अनिवार्य)' },
    { w: 'Compassion', m: 'Deep sympathy (करुणा)' },
    { w: 'Perseverance', m: 'Continued effort (दृढ़ता)' },
    { w: 'Magnificent', m: 'Extremely beautiful (शानदार)' },
    { w: 'Catastrophe', m: 'A great disaster (विपत्ति)' },
    { w: 'Reluctant', m: 'Unwilling (अनिच्छुक)' },
    { w: 'Abundant', m: 'Large amounts (प्रचुर)' },
    { w: 'Courageous', m: 'Brave (साहसी)' },
    { w: 'Gratitude', m: 'Thankfulness (कृतज्ञता)' },
    { w: 'Melancholy', m: 'Deep sadness (उदासी)' }
];
var engFCI = 0;

function engFCShow() {
    document.getElementById('engFCF').textContent = engWords[engFCI].w;
    document.getElementById('engFCB').textContent = engWords[engFCI].m;
    document.getElementById('engFCCt').textContent = (engFCI + 1) + ' / ' + engWords.length;
    document.getElementById('engFC').classList.remove('flipped');
}
function engFCFlip() { document.getElementById('engFC').classList.toggle('flipped'); }
// ============ PRONUNCIATION ============
var currentPronunciation = 'US'; // 'US' or 'UK'

function setPronunciation(type) {
    currentPronunciation = type;
    document.getElementById('pronUSBtn').classList.remove('active');
    document.getElementById('pronUKBtn').classList.remove('active');
    if (type === 'US') {
        document.getElementById('pronUSBtn').classList.add('active');
    } else {
        document.getElementById('pronUKBtn').classList.add('active');
    }
    toast('Switched to ' + (type === 'US' ? '🇺🇸 American' : '🇬🇧 British') + ' pronunciation', 'info');
}

function speakWord(word) {
    if (!('speechSynthesis' in window)) {
        toast('Speech not supported in this browser!', 'err');
        return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    var utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Get available voices
    var voices = window.speechSynthesis.getVoices();

    if (currentPronunciation === 'US') {
        // Try to find American English voice
        var usVoice = voices.find(function (v) {
            return v.lang === 'en-US';
        });
        if (usVoice) utterance.voice = usVoice;
        utterance.lang = 'en-US';
    } else {
        // Try to find British English voice
        var ukVoice = voices.find(function (v) {
            return v.lang === 'en-GB';
        });
        if (ukVoice) utterance.voice = ukVoice;
        utterance.lang = 'en-GB';
    }

    window.speechSynthesis.speak(utterance);
}

function speakCurrentWord() {
    var word = engWords[engFCI].w;
    speakWord(word);

    // Visual feedback
    var speakBtn = document.querySelector('.speak-btn');
    if (speakBtn) {
        speakBtn.classList.add('speaking');
        setTimeout(function () {
            speakBtn.classList.remove('speaking');
        }, 1500);
    }
}

// Load voices (some browsers load them async)
if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = function () {
        window.speechSynthesis.getVoices();
    };
}

// ============ DICTIONARY (LEARNED WORDS) ============
var learnedWords = JSON.parse(localStorage.getItem('sbDictionary') || '[]');

function markAsLearned() {
    var currentWord = engWords[engFCI];

    // Check if already learned
    var exists = learnedWords.find(function (w) {
        return w.word === currentWord.w;
    });

    if (exists) {
        toast('"' + currentWord.w + '" is already in your dictionary!', 'warn');
        return;
    }

    learnedWords.push({
        word: currentWord.w,
        meaning: currentWord.m,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now()
    });

    localStorage.setItem('sbDictionary', JSON.stringify(learnedWords));
    renderDictionary();
    toast('✅ "' + currentWord.w + '" added to dictionary!', 'ok');
}

function renderDictionary(filter) {
    var container = document.getElementById('dictionaryList');
    var countEl = document.getElementById('dictCount');

    if (countEl) {
        countEl.textContent = learnedWords.length + ' word' + (learnedWords.length !== 1 ? 's' : '') + ' learned';
    }

    if (learnedWords.length === 0) {
        container.innerHTML = '<p class="placeholder">No words learned yet. Flip cards and click ✅ Learned!</p>';
        return;
    }

    var wordsToShow = learnedWords;
    if (filter) {
        var lowerFilter = filter.toLowerCase();
        wordsToShow = learnedWords.filter(function (w) {
            return w.word.toLowerCase().indexOf(lowerFilter) !== -1 || w.meaning.toLowerCase().indexOf(lowerFilter) !== -1;
        });
    }

    if (wordsToShow.length === 0) {
        container.innerHTML = '<p class="placeholder">No matching words found</p>';
        return;
    }

    var html = '';
    // Show newest first
    for (var i = wordsToShow.length - 1; i >= 0; i--) {
        var w = wordsToShow[i];
        html += '<div class="dict-word">' +
            '<div class="dict-word-text">' +
            '<h4>' + w.word + '</h4>' +
            '<p>' + w.meaning + '</p>' +
            '<span class="dict-word-date">📅 ' + w.date + '</span>' +
            '</div>' +
            '<div class="dict-word-actions">' +
            '<button class="dict-speak-btn" onclick="speakWord(\'' + w.word + '\')" title="Speak">🔊</button>' +
            '<button class="dict-remove-btn" onclick="removeFromDictionary(\'' + w.word + '\')" title="Remove">✕</button>' +
            '</div></div>';
    }
    container.innerHTML = html;
}

function removeFromDictionary(word) {
    learnedWords = learnedWords.filter(function (w) {
        return w.word !== word;
    });
    localStorage.setItem('sbDictionary', JSON.stringify(learnedWords));
    renderDictionary();
    toast('"' + word + '" removed from dictionary', 'info');
}

function filterDictionary(searchText) {
    renderDictionary(searchText);
}

function clearDictionary() {
    if (!confirm('🗑️ Clear all learned words?')) return;
    learnedWords = [];
    localStorage.setItem('sbDictionary', JSON.stringify(learnedWords));
    renderDictionary();
    toast('Dictionary cleared!', 'info');
}
function engFCNext() { engFCI = (engFCI + 1) % engWords.length; engFCShow(); }
function engFCPrev() { engFCI = (engFCI - 1 + engWords.length) % engWords.length; engFCShow(); }

var engSC = 0, engSW = 0;
var engQuizData = [
    { q: 'Passive voice of "She writes a letter"?', o: ['A letter is written by her', 'A letter was written', 'She is written', 'Letter writes she'], a: 0 },
    { q: 'Correct article: "__ honest man"', o: ['A', 'An', 'The', 'No article'], a: 1 },
    { q: '"Happiness" is what type of noun?', o: ['Common', 'Proper', 'Abstract', 'Collective'], a: 2 },
    { q: '"Can" expresses:', o: ['Permission', 'Ability', 'Obligation', 'Possibility'], a: 1 },
    { q: 'Synonym of "Brave":', o: ['Timid', 'Courageous', 'Lazy', 'Weak'], a: 1 },
    { q: 'Antonym of "Ancient":', o: ['Old', 'Modern', 'Historic', 'Traditional'], a: 1 },
    { q: '"What a beautiful day!" is:', o: ['Declarative', 'Interrogative', 'Imperative', 'Exclamatory'], a: 3 },
    { q: 'Which modal shows necessity?', o: ['Can', 'May', 'Must', 'Would'], a: 2 },
    { q: '"Neither...nor" is a:', o: ['Conjunction', 'Preposition', 'Interjection', 'Adverb'], a: 0 },
    { q: 'Adjective in "She wore a beautiful dress":', o: ['She', 'wore', 'beautiful', 'dress'], a: 2 }
];

function engQuizLoad() {
    var q = engQuizData[Math.floor(Math.random() * engQuizData.length)];
    document.getElementById('engQText').textContent = q.q;
    document.getElementById('engQFb').textContent = '';
    var od = document.getElementById('engQOpts');
    od.innerHTML = '';
    q.o.forEach(function (opt, idx) {
        var btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = function () {
            od.querySelectorAll('button').forEach(function (b) { b.onclick = null; b.classList.add('locked'); });
            var fb = document.getElementById('engQFb');
            if (idx === q.a) { engSC++; btn.classList.add('correct'); fb.textContent = '✅ Correct!'; fb.style.color = 'var(--ok)'; }
            else { engSW++; btn.classList.add('wrong'); od.children[q.a].classList.add('correct'); fb.textContent = '❌ Wrong!'; fb.style.color = 'var(--e)'; }
            document.getElementById('engSC').textContent = engSC;
            document.getElementById('engSW').textContent = engSW;
        };
        od.appendChild(btn);
    });
}

// ============ HINDI VOCAB & QUIZ ============
var hindiWords = [
    { w: 'अभिलाषा', m: 'Desire (इच्छा)' },
    { w: 'अद्भुत', m: 'Amazing (अनोखा)' },
    { w: 'विद्यालय', m: 'School' },
    { w: 'परिश्रम', m: 'Hard Work (मेहनत)' },
    { w: 'साहस', m: 'Courage (बहादुरी)' },
    { w: 'विज्ञान', m: 'Science' },
    { w: 'गणित', m: 'Mathematics' },
    { w: 'पर्यावरण', m: 'Environment' },
    { w: 'स्वतंत्रता', m: 'Freedom' },
    { w: 'अनुशासन', m: 'Discipline' },
    { w: 'सहानुभूति', m: 'Sympathy' },
    { w: 'प्रयत्न', m: 'Effort' },
    { w: 'उत्साह', m: 'Enthusiasm' },
    { w: 'कर्तव्य', m: 'Duty' },
    { w: 'सफलता', m: 'Success' }
];
var hindiFCI = 0;

function hindiFCShow() {
    document.getElementById('hindiFCF').textContent = hindiWords[hindiFCI].w;
    document.getElementById('hindiFCB').textContent = hindiWords[hindiFCI].m;
    document.getElementById('hindiFCCt').textContent = (hindiFCI + 1) + ' / ' + hindiWords.length;
    document.getElementById('hindiFC').classList.remove('flipped');
}
function hindiFCFlip() { document.getElementById('hindiFC').classList.toggle('flipped'); }
function hindiFCNext() { hindiFCI = (hindiFCI + 1) % hindiWords.length; hindiFCShow(); }
function hindiFCPrev() { hindiFCI = (hindiFCI - 1 + hindiWords.length) % hindiWords.length; hindiFCShow(); }

var hindiSC = 0, hindiSW = 0;
var hindiQuizData = [
    { q: '"सूर्य" का पर्यायवाची?', o: ['चंद्र', 'दिनकर', 'तारा', 'नभ'], a: 1 },
    { q: '"अंधकार" का विलोम?', o: ['रात', 'प्रकाश', 'काला', 'अँधेरा'], a: 1 },
    { q: '"राम" कौन सी संज्ञा है?', o: ['जातिवाचक', 'व्यक्तिवाचक', 'भाववाचक', 'समूहवाचक'], a: 1 },
    { q: '"वह खाना खाता है" — काल?', o: ['भूतकाल', 'वर्तमानकाल', 'भविष्यकाल', 'संदिग्ध'], a: 1 },
    { q: '"गाय" का लिंग बदलें?', o: ['गायक', 'बैल', 'गौ', 'गोवंश'], a: 1 },
    { q: '"सुंदर" शब्द क्या है?', o: ['संज्ञा', 'सर्वनाम', 'विशेषण', 'क्रिया'], a: 2 },
    { q: '"जल" का पर्यायवाची?', o: ['अग्नि', 'पानी', 'वायु', 'धरा'], a: 1 },
    { q: '"कर्तव्य" means?', o: ['Right', 'Duty', 'Power', 'Money'], a: 1 }
];

function hindiQuizLoad() {
    var q = hindiQuizData[Math.floor(Math.random() * hindiQuizData.length)];
    document.getElementById('hindiQText').textContent = q.q;
    document.getElementById('hindiQFb').textContent = '';
    var od = document.getElementById('hindiQOpts');
    od.innerHTML = '';
    q.o.forEach(function (opt, idx) {
        var btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = function () {
            od.querySelectorAll('button').forEach(function (b) { b.onclick = null; b.classList.add('locked'); });
            var fb = document.getElementById('hindiQFb');
            if (idx === q.a) { hindiSC++; btn.classList.add('correct'); fb.textContent = '✅ सही!'; fb.style.color = 'var(--ok)'; }
            else { hindiSW++; btn.classList.add('wrong'); od.children[q.a].classList.add('correct'); fb.textContent = '❌ गलत!'; fb.style.color = 'var(--e)'; }
            document.getElementById('hindiSC').textContent = hindiSC;
            document.getElementById('hindiSW').textContent = hindiSW;
        };
        od.appendChild(btn);
    });
}

// ============ TAMIL — 40 WORDS! ============
var tamilWords = [
    { t: 'பள்ளி', e: 'School' }, { t: 'புத்தகம்', e: 'Book' },
    { t: 'ஆசிரியர்', e: 'Teacher' }, { t: 'மாணவன்', e: 'Student' },
    { t: 'கணிதம்', e: 'Mathematics' }, { t: 'அறிவியல்', e: 'Science' },
    { t: 'வரலாறு', e: 'History' }, { t: 'நீர்', e: 'Water' },
    { t: 'தீ', e: 'Fire' }, { t: 'காற்று', e: 'Wind/Air' },
    { t: 'பூமி', e: 'Earth' }, { t: 'வானம்', e: 'Sky' },
    { t: 'மழை', e: 'Rain' }, { t: 'சூரியன்', e: 'Sun' },
    { t: 'நிலா', e: 'Moon' }, { t: 'அன்பு', e: 'Love' },
    { t: 'நன்றி', e: 'Thank you' }, { t: 'வணக்கம்', e: 'Hello/Greetings' },
    { t: 'வீடு', e: 'House/Home' }, { t: 'உணவு', e: 'Food' },
    { t: 'மரம்', e: 'Tree' }, { t: 'பூ', e: 'Flower' },
    { t: 'பழம்', e: 'Fruit' }, { t: 'கடல்', e: 'Sea/Ocean' },
    { t: 'மலை', e: 'Mountain' }, { t: 'நதி', e: 'River' },
    { t: 'விலங்கு', e: 'Animal' }, { t: 'பறவை', e: 'Bird' },
    { t: 'மீன்', e: 'Fish' }, { t: 'பசு', e: 'Cow' },
    { t: 'நாய்', e: 'Dog' }, { t: 'பூனை', e: 'Cat' },
    { t: 'குழந்தை', e: 'Child/Baby' }, { t: 'தாய்', e: 'Mother' },
    { t: 'தந்தை', e: 'Father' }, { t: 'நண்பன்', e: 'Friend' },
    { t: 'கண்', e: 'Eye' }, { t: 'வாய்', e: 'Mouth' },
    { t: 'இதயம்', e: 'Heart' }, { t: 'அறிவு', e: 'Knowledge/Wisdom' }
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

var tamilQuizC = 0, tamilQuizW = 0;
var tamilQuizData = [
    { q: '"பள்ளி" means?', o: ['Hospital', 'School', 'Temple', 'Market'], a: 1 },
    { q: '"Water" in Tamil?', o: ['தீ', 'காற்று', 'நீர்', 'மண்'], a: 2 },
    { q: 'Total Tamil letters?', o: ['247', '200', '300', '150'], a: 0 },
    { q: 'Vowels (உயிர்) count?', o: ['18', '12', '216', '10'], a: 1 },
    { q: 'Consonants (மெய்) count?', o: ['12', '216', '20', '18'], a: 3 },
    { q: '"சூரியன்" means?', o: ['Moon', 'Star', 'Sun', 'Cloud'], a: 2 },
    { q: '"ஆசிரியர்" means?', o: ['Student', 'Teacher', 'Doctor', 'Farmer'], a: 1 },
    { q: 'ஆய்த எழுத்து is?', o: ['அ', 'க', 'ஃ', 'ங'], a: 2 },
    { q: '"நன்றி" means?', o: ['Sorry', 'Please', 'Thank you', 'Welcome'], a: 2 },
    { q: '"அறிவே ஆற்றல்" means?', o: ['Money=power', 'Knowledge=power', 'Unity=strength', 'Health=wealth'], a: 1 },
    { q: '"வானம்" means?', o: ['Earth', 'Sky', 'Water', 'Fire'], a: 1 },
    { q: 'Past tense in Tamil?', o: ['எதிர்காலம்', 'நிகழ்காலம்', 'இறந்தகாலம்', 'None'], a: 2 },
    { q: '"மலை" means?', o: ['River', 'Sea', 'Mountain', 'Forest'], a: 2 },
    { q: '"பறவை" means?', o: ['Fish', 'Bird', 'Animal', 'Insect'], a: 1 },
    { q: '"தாய்" means?', o: ['Father', 'Mother', 'Sister', 'Brother'], a: 1 }
];

function tamilQuizLoad() {
    var q = tamilQuizData[Math.floor(Math.random() * tamilQuizData.length)];
    document.getElementById('tamilQText').textContent = q.q;
    document.getElementById('tamilQFb').textContent = '';
    var od = document.getElementById('tamilQOpts');
    od.innerHTML = '';
    q.o.forEach(function (opt, idx) {
        var btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = function () {
            od.querySelectorAll('button').forEach(function (b) { b.onclick = null; b.classList.add('locked'); });
            var fb = document.getElementById('tamilQFb');
            if (idx === q.a) { tamilQuizC++; btn.classList.add('correct'); fb.textContent = '✅ சரி! Correct!'; fb.style.color = 'var(--ok)'; }
            else { tamilQuizW++; btn.classList.add('wrong'); od.children[q.a].classList.add('correct'); fb.textContent = '❌ தவறு! Wrong!'; fb.style.color = 'var(--e)'; }
            document.getElementById('tamilScoreC').textContent = tamilQuizC;
            document.getElementById('tamilScoreW').textContent = tamilQuizW;
        };
        od.appendChild(btn);
    });
}

// ============ BOOK QUIZ — BY CHAPTER ============
var quizQuestions = [];
var quizIndex = 0;
var quizCorrect = 0;
var quizWrong = 0;

function goQuizFromLib(bookId) {
    navigate('quiz');
    setTimeout(function () {
        document.getElementById('quizBookPicker').value = bookId;
        quizBookChanged();
    }, 100);
}

function quizBookChanged() {
    var bookId = document.getElementById('quizBookPicker').value;
    var rangeDiv = document.getElementById('quizPageRange');
    if (!bookId) { rangeDiv.style.display = 'none'; return; }
    var book = allBooks.find(function (b) { return b.id === bookId; });
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
    var book = allBooks.find(function (b) { return b.id === bookId; });
    if (!book) return;

    var from = Math.max(0, parseInt(document.getElementById('quizFrom').value) - 1);
    var to = Math.min(book.pages, parseInt(document.getElementById('quizTo').value));
    var numQ = parseInt(document.getElementById('quizNumQ').value);

    if (from >= to) { toast('Invalid page range!', 'warn'); return; }

    var chapterText = book.pageTexts.slice(from, to).join(' ').replace(/\s+/g, ' ').trim();
    if (chapterText.length < 80) { toast('Not enough text in those pages.', 'warn'); return; }

    quizQuestions = generateQuestions(chapterText, numQ);
    quizIndex = 0;
    quizCorrect = 0;
    quizWrong = 0;

    if (quizQuestions.length === 0) { toast('Could not generate questions.', 'warn'); return; }

    document.getElementById('quizSetupBox').style.display = 'none';
    document.getElementById('quizPlayBox').style.display = 'block';
    document.getElementById('quizResultBox').style.display = 'none';
    showQuizQuestion();
    toast(quizQuestions.length + ' questions from pages ' + (from + 1) + '-' + to + '!', 'ok');
}

function generateQuestions(text, count) {
    var results = [];
    var sentences = text.split(/[.!?।\n]+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 20 && s.length < 250; });
    if (sentences.length < 3) return [];

    var stopWords = 'the and for that this with from have been were they their which about would could should these those also into some than then only very more most such each because between through during without another does will just over under both same many much while since until upon here still even well back down like make made know take come give look find want tell good great first last long little around every never might shall a an is are was in on to of it'.split(' ');
    var freq = {};
    text.split(/\s+/).forEach(function (w) {
        var c = w.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
        if (c.length > 3 && stopWords.indexOf(c) === -1) freq[c] = (freq[c] || 0) + 1;
    });

    var keywords = [];
    for (var word in freq) {
        if (freq[word] >= 2 && freq[word] <= 25) keywords.push({ word: word, count: freq[word] });
    }
    keywords.sort(function (a, b) { return b.count - a.count; });
    keywords = keywords.slice(0, 50).map(function (k) { return k.word; });

    var used = {};

    // Fill in blank
    for (var si = 0; si < sentences.length && results.length < Math.ceil(count * 0.5); si++) {
        var sent = sentences[si];
        if (used[sent]) continue;
        var words = sent.split(/\s+/);
        if (words.length < 5) continue;
        var bestWord = null, bestIndex = -1;
        for (var wi = 1; wi < words.length - 1; wi++) {
            var clean = words[wi].toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
            if (keywords.indexOf(clean) !== -1 && clean.length > 4) { bestWord = words[wi]; bestIndex = wi; break; }
        }
        if (!bestWord) continue;
        used[sent] = true;
        var blanked = words.map(function (w, idx) { return idx === bestIndex ? '________' : w; }).join(' ');
        var correctAnswer = bestWord.replace(/[^a-zA-Z\u0900-\u097F\s]/g, '');
        var wrongAnswers = keywords.filter(function (k) { return k !== correctAnswer.toLowerCase(); }).sort(function () { return Math.random() - 0.5; }).slice(0, 3);
        if (wrongAnswers.length < 3) continue;
        var options = [correctAnswer].concat(wrongAnswers).sort(function () { return Math.random() - 0.5; });
        results.push({ question: 'Fill in the blank:\n\n"' + blanked + '"', options: options, answer: options.indexOf(correctAnswer), type: 'Fill in Blank', explanation: 'Answer: ' + correctAnswer });
    }

    // True/False
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
                    var replacement = keywords.find(function (k) { return k !== rc; });
                    if (replacement) { tfWords[ri] = replacement; break; }
                }
            }
            displaySent = tfWords.join(' ');
        }
        results.push({ question: 'True or False?\n\n"' + displaySent + '"', options: ['True ✅', 'False ❌'], answer: isTrue ? 0 : 1, type: 'True/False', explanation: isTrue ? 'Correct!' : 'Original: "' + tfSent + '"' });
    }

    // Comprehension
    for (var ci = 0; ci < 5 && results.length < count; ci++) {
        var compSent = sentences[Math.floor(Math.random() * sentences.length)];
        if (used[compSent] || compSent.length > 120) continue;
        used[compSent] = true;
        var preview = compSent.length > 70 ? compSent.substring(0, 70) + '...' : compSent;
        var wrongOpts = ['Not mentioned in text', 'From another chapter', 'Book doesn\'t discuss this'];
        var compOpts = [preview].concat(wrongOpts).sort(function () { return Math.random() - 0.5; });
        results.push({ question: 'Which is from your book?', options: compOpts, answer: compOpts.indexOf(preview), type: 'Comprehension', explanation: 'Found: "' + compSent + '"' });
    }

    results.sort(function () { return Math.random() - 0.5; });
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
    q.options.forEach(function (opt, idx) {
        var btn = document.createElement('button');
        btn.textContent = opt;
        btn.onclick = function () { pickQuizAnswer(idx, q.answer, btn, q.explanation); };
        optDiv.appendChild(btn);
    });
    updateQuizScore();
}

function pickQuizAnswer(picked, correct, clickedBtn, explanation) {
    var buttons = document.getElementById('quizOptionsArea').querySelectorAll('button');
    buttons.forEach(function (b) { b.onclick = null; b.classList.add('locked'); });
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

// ============ BOOK FLASHCARDS ============
var fcCards = [];
var fcIndex = 0;

function goFCFromLib(bookId) {
    navigate('flashcards');
    setTimeout(function () {
        document.getElementById('fcBookPicker').value = bookId;
        fcLoadBook(bookId);
    }, 100);
}

function fcLoadBook(bookId) {
    if (!bookId) return;
    var book = allBooks.find(function (b) { return b.id === bookId; });
    if (!book || !book.fullText || book.fullText.length < 80) {
        document.getElementById('fcContent').innerHTML = '<p class="placeholder">⚠️ Not enough text</p>';
        document.getElementById('fcCardArea').style.display = 'none';
        return;
    }
    fcCards = [];
    var sents = book.fullText.split(/[.!?।\n]+/).filter(function (s) { return s.trim().length > 15 && s.trim().length < 200; });
    var freq = {};
    book.fullText.split(/\s+/).forEach(function (w) {
        var c = w.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
        if (c.length > 4) freq[c] = (freq[c] || 0) + 1;
    });
    var kws = [];
    for (var w in freq) { if (freq[w] >= 2 && freq[w] <= 15) kws.push(w); }
    kws.sort(function (a, b) { return (freq[b] || 0) - (freq[a] || 0); });
    kws = kws.slice(0, 25);
    var usedKW = {};
    sents.forEach(function (s) {
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


// ============ AI HELPER (GEMINI) ============
var aiSelectedBookId = null;
var aiApiKey = localStorage.getItem('sbGeminiKey') || '';
var aiBookContext = '';

function saveApiKey() {
    var key = document.getElementById('apiKeyInput').value.trim();
    if (!key) {
        toast('Please paste your API key!', 'warn');
        return;
    }
    if (key.length < 20) {
        toast('That key looks too short. Please paste the full API key.', 'warn');
        return;
    }
    aiApiKey = key;
    localStorage.setItem('sbGeminiKey', key);
    document.getElementById('apiKeyBox').style.display = 'none';
    toast('API key saved! AI is ready! 🤖', 'ok');
    addChatMessage('bot', '✅ API key saved! I\'m ready to help you study. Select a book and ask me anything!');
}

function checkApiKey() {
    if (aiApiKey) {
        document.getElementById('apiKeyBox').style.display = 'none';
    }
}

function aiSelectBook(bookId) {
    aiSelectedBookId = bookId;
    aiBookContext = '';

    if (bookId) {
        var book = allBooks.find(function (b) { return b.id === bookId; });
        if (book) {
            // Get first ~4000 chars as context (fits in Gemini's context)
            aiBookContext = book.fullText ? book.fullText.substring(0, 4000) : '';
            addChatMessage('bot', '📘 Loaded "' + book.title + '" (' + book.pages + ' pages). I can now answer questions about this book!\n\nTry the quick buttons below or type your question.');
        }
    }
}

function sendQuickPrompt(prompt) {
    if (!aiSelectedBookId) {
        toast('Select a book first!', 'warn');
        return;
    }
    document.getElementById('chatInput').value = prompt;
    aiSendMessage();
}

async function aiSendMessage() {
    var input = document.getElementById('chatInput');
    var query = input.value.trim();
    if (!query) return;
    input.value = '';

    addChatMessage('user', query);

    // Check if API key exists
    if (!aiApiKey) {
        addChatMessage('bot', '⚠️ Please set up your API key first! Scroll up to the setup box.');
        document.getElementById('apiKeyBox').style.display = 'block';
        return;
    }

    // Check if book is selected
    if (!aiSelectedBookId) {
        addChatMessage('bot', '⚠️ Please select a book first using the dropdown above!');
        return;
    }

    var book = allBooks.find(function (b) { return b.id === aiSelectedBookId; });
    if (!book) {
        addChatMessage('bot', '❌ Book not found!');
        return;
    }

    // Check for page-specific request
    var pageContext = '';
    var pageMatch = query.toLowerCase().match(/page\s*(\d+)/);
    var pageRangeMatch = query.toLowerCase().match(/page\s*(\d+)\s*(?:to|-)\s*(\d+)/);

    if (pageRangeMatch) {
        var fromPg = parseInt(pageRangeMatch[1]) - 1;
        var toPg = parseInt(pageRangeMatch[2]);
        if (fromPg >= 0 && toPg <= book.pages) {
            pageContext = book.pageTexts.slice(fromPg, toPg).join('\n\n');
            pageContext = pageContext.substring(0, 5000);
        }
    } else if (pageMatch) {
        var pg = parseInt(pageMatch[1]) - 1;
        if (pg >= 0 && pg < book.pageTexts.length) {
            pageContext = book.pageTexts[pg] || '';
        }
    }

    // Build the context to send to Gemini
    var contextToUse = pageContext || aiBookContext;
    if (!contextToUse || contextToUse.trim().length < 20) {
        contextToUse = book.fullText ? book.fullText.substring(0, 4000) : 'No text available from this book.';
    }

    // Show typing indicator
    document.getElementById('aiTyping').style.display = 'block';
    scrollChatDown();

    try {
        var response = await callGemini(query, contextToUse, book.title);
        document.getElementById('aiTyping').style.display = 'none';
        addChatMessage('bot', response);
    } catch (err) {
        document.getElementById('aiTyping').style.display = 'none';
        console.error('Gemini error:', err);

        if (err.message && err.message.indexOf('API_KEY_INVALID') !== -1) {
            addChatMessage('bot', '❌ Invalid API key. Please check your key and try again.');
            localStorage.removeItem('sbGeminiKey');
            aiApiKey = '';
            document.getElementById('apiKeyBox').style.display = 'block';
        } else if (err.message && err.message.indexOf('QUOTA') !== -1) {
            addChatMessage('bot', '⚠️ API limit reached. Wait a minute and try again. (Free tier: 15 requests/minute)');
        } else {
            addChatMessage('bot', '❌ Error: ' + (err.message || 'Something went wrong. Try again!'));
        }
    }
}

async function callGemini(question, bookContext, bookTitle) {
    var systemPrompt = 'You are StudyBuddy AI, a helpful study assistant for a Grade 8 CBSE student named ' +
        (localStorage.getItem('sbName') || 'Samuel') + '. ' +
        'You are helping them study from their textbook: "' + bookTitle + '". ' +
        'Rules:\n' +
        '1. Answer based on the book content provided below.\n' +
        '2. Use simple language a 13-year-old can understand.\n' +
        '3. Use bullet points, numbering, and formatting for clarity.\n' +
        '4. If creating quiz questions, include answers.\n' +
        '5. If summarizing, highlight key points clearly.\n' +
        '6. If the content doesn\'t have enough info, say so honestly.\n' +
        '7. Be encouraging and supportive!\n' +
        '8. Keep responses focused and not too long.\n\n' +
        'BOOK CONTENT:\n' + bookContext;

    var requestBody = {
        contents: [
            {
                parts: [
                    { text: systemPrompt + '\n\nStudent\'s question: ' + question }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024
        }
    };

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + aiApiKey;

    var response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        var errorData = await response.json().catch(function () { return {}; });
        var errorMsg = 'API error';
        if (errorData.error && errorData.error.message) {
            errorMsg = errorData.error.message;
        }
        throw new Error(errorMsg);
    }

    var data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        return data.candidates[0].content.parts[0].text;
    } else {
        throw new Error('No response from AI. Try again!');
    }
}

function addChatMessage(who, message) {
    var chatArea = document.getElementById('chatArea');
    var div = document.createElement('div');
    div.className = 'chatmsg ' + who;
    var avatar = who === 'bot' ? '🤖' : '👤';

    // Format the message (convert markdown-like to HTML)
    var formatted = message
        .replace(/</g, '&lt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^## (.+)$/gm, '<h4 style="color:var(--p);margin:8px 0 4px;">$1</h4>')
        .replace(/^### (.+)$/gm, '<h4 style="color:var(--p);margin:6px 0 3px;">$1</h4>')
        .replace(/^- (.+)$/gm, '• $1')
        .replace(/^(\d+)\. (.+)$/gm, '<b>$1.</b> $2')
        .replace(/\n/g, '<br>');

    div.innerHTML = '<div class="chatavatar">' + avatar + '</div><div class="chatbubble">' + formatted + '</div>';
    chatArea.appendChild(div);
    scrollChatDown();
}

function scrollChatDown() {
    var chatArea = document.getElementById('chatArea');
    setTimeout(function () {
        chatArea.scrollTop = chatArea.scrollHeight;
    }, 100);
}
// ============ NOTES ============
var editingNoteId = null;

function noteStartNew() {
    editingNoteId = null;
    document.getElementById('noteEditArea').style.display = 'block';
    document.getElementById('noteEditTitle').value = '';
    document.getElementById('noteEditBody').value = '';
}

function noteCancel() {
    document.getElementById('noteEditArea').style.display = 'none';
}

async function noteSave() {
    var title = document.getElementById('noteEditTitle').value.trim();
    var body = document.getElementById('noteEditBody').value.trim();
    if (!title || !body) { toast('Enter title and content!', 'warn'); return; }
    if (editingNoteId) {
        var existing = allNotes.find(function (n) { return n.id === editingNoteId; });
        if (existing) {
            existing.title = title;
            existing.body = body;
            existing.modified = new Date().toLocaleDateString();
            await dbSave('notes', existing);
        }
    } else {
        var note = { id: 'note_' + Date.now(), title: title, body: body, date: new Date().toLocaleDateString(), modified: new Date().toLocaleDateString() };
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
        container.innerHTML = '<p class="placeholder">📝 No notes yet. Click "+ New Note" to start!</p>';
        return;
    }
    var html = '';
    for (var i = allNotes.length - 1; i >= 0; i--) {
        var n = allNotes[i];
        html += '<div class="notecard" onclick="noteEdit(\'' + n.id + '\')">' +
            '<button class="notedel" onclick="event.stopPropagation();noteDelete(\'' + n.id + '\')">✕</button>' +
            '<h4>' + n.title + '</h4>' +
            '<p>' + n.body.substring(0, 100) + (n.body.length > 100 ? '...' : '') + '</p>' +
            '<p class="small">📅 ' + (n.modified || n.date) + '</p></div>';
    }
    container.innerHTML = html;
}

function noteEdit(id) {
    var note = allNotes.find(function (n) { return n.id === id; });
    if (!note) return;
    editingNoteId = id;
    document.getElementById('noteEditArea').style.display = 'block';
    document.getElementById('noteEditTitle').value = note.title;
    document.getElementById('noteEditBody').value = note.body;
}

async function noteDelete(id) {
    if (!confirm('Delete this note?')) return;
    await dbRemove('notes', id);
    allNotes = allNotes.filter(function (n) { return n.id !== id; });
    renderNotes();
    toast('Deleted!', 'info');
}

// ============ TIMER ============
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
    timerInterval = setInterval(function () {
        if (timerSecondsLeft <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            toast('⏰ Time is up! Great session!', 'ok');
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

// ============ DRAG DROP ============
document.addEventListener('DOMContentLoaded', function () {
    var picker = document.getElementById('filePicker');
    if (picker) {
        picker.addEventListener('dragover', function (e) { e.preventDefault(); });
        picker.addEventListener('drop', function (e) {
            e.preventDefault();
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

// ============ INIT ============
window.onload = async function () {
    console.log('StudyBuddy starting...');

    // Name greeting
    var savedName = localStorage.getItem('sbName');
    if (savedName) {
        var popup = document.getElementById('namePopup');
        if (popup) popup.classList.add('hidden');
        updateGreeting();
    }

    // Theme
    if (localStorage.getItem('sbtheme') === 'dark') {
        document.body.classList.add('dark-theme');
        document.querySelector('.themebtn').textContent = '☀️';
    }

    // Quote
    var quotes = [
        '"Education is the most powerful weapon." — Mandela',
        '"Practice makes perfect!" 💪',
        '"Believe you can and you\'re halfway there." — Roosevelt',
        '"Knowledge is Power — அறிவே ஆற்றல்" 🟢',
        '"The expert was once a beginner."',
        '"कल करे सो आज कर — Don\'t delay" 📝',
        '"Success = Small efforts repeated daily"',
        '"Reading is exercise for the mind" 📖'
    ];
    var quoteEl = document.getElementById('homeQuote');
    if (quoteEl) quoteEl.textContent = quotes[new Date().getDate() % quotes.length];

    // Timer
    timerUpdateDisplay();

    // Subject flashcards & quizzes
    engFCShow();
    renderDictionary();
    engQuizLoad();
    hindiFCShow();
    hindiQuizLoad();
    tamilShowFC();
    tamilQuizLoad();
    mathQuizLoad();

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
    // Check AI API key
    checkApiKey();
    updateDashboard();
};
