pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function toast(msg, type) {
    var box = document.getElementById('toastBox');
    var el = document.createElement('div');
    el.className = 'toast-item toast-' + (type || 'info');
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(function() { el.remove(); }, 4000);
}

var db = null;

function openDatabase() {
    return new Promise(function(resolve, reject) {
        var request = indexedDB.open('StudyBuddyV7', 1);
        request.onupgradeneeded = function(e) {
            var d = e.target.result;
            if (!d.objectStoreNames.contains('books')) {
                d.createObjectStore('books', { keyPath: 'id' });
            }
            if (!d.objectStoreNames.contains('pdfs')) {
                d.createObjectStore('pdfs', { keyPath: 'id' });
            }
            if (!d.objectStoreNames.contains('notes')) {
                d.createObjectStore('notes', { keyPath: 'id' });
            }
        };
        request.onsuccess = function(e) {
            db = e.target.result;
            resolve();
        };
        request.onerror = function() {
            reject('DB error');
        };
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

var allBooks = [];
var allNotes = [];
var stats = JSON.parse(localStorage.getItem('sbstats') || '{"q":0,"c":0,"a":0}');
var currentFile = null;

function navigate(pageId) {
    var pages = document.querySelectorAll('.pg');
    for (var i = 0; i < pages.length; i++) {
        pages[i].classList.remove('show');
    }
    document.getElementById(pageId).classList.add('show');
    window.scrollTo(0, 0);
    if (pageId === 'library') { renderLibrary(); }
    if (pageId === 'quiz') { populateSelect('quizBookPicker'); }
    if (pageId === 'flashcards') { populateSelect('fcBookPicker'); }
    if (pageId === 'helper') { populateSelect('aiBookPicker'); }
    if (pageId === 'notes') { renderNotes(); }
}

function switchTheme() {
    document.body.classList.toggle('dark-theme');
    var btn = document.querySelector('.themebtn');
    if (document.body.classList.contains('dark-theme')) {
        btn.textContent = '☀️';
    } else {
        btn.textContent = '🌙';
    }
    localStorage.setItem('sbtheme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

function updateDashboard() {
    document.getElementById('stBooks').textContent = allBooks.length;
    document.getElementById('stQuiz').textContent = stats.q;
    if (stats.a > 0) {
        document.getElementById('stScore').textContent = Math.round(stats.c / stats.a * 100) + '%';
    } else {
        document.getElementById('stScore').textContent = '0%';
    }
}

function subjectEmoji(s) {
    var map = {
        math: '📐',
        english: '📖',
        hindi: '📝',
        tamil: '📗',
        science: '🔬',
        social: '🌍',
        computer: '💻',
        other: '📦'
    };
    return map[s] || '📄';
}

function subjectColor(s) {
    var map = {
        math: '#4f46e5,#7c3aed',
        english: '#059669,#10b981',
        hindi: '#db2777,#ec4899',
        tamil: '#059669,#0d9488',
        science: '#0891b2,#06b6d4',
        social: '#d97706,#f59e0b',
        computer: '#7c3aed,#8b5cf6'
    };
    return map[s] || '#64748b,#94a3b8';
}

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
    if (!n) { return; }
    var h = new Date().getHours();
    var g = '';
    var m = '';
    if (h >= 5 && h < 12) {
        g = '🌅 Good Morning, ' + n + '!';
        m = 'Great time to study! 💪';
    } else if (h >= 12 && h < 17) {
        g = '☀️ Good Afternoon, ' + n + '!';
        m = 'Keep the momentum going! 🚀';
    } else if (h >= 17 && h < 21) {
        g = '🌇 Good Evening, ' + n + '!';
        m = 'Revision time! 📝';
    } else {
        g = '🌙 Good Night, ' + n + '!';
        m = 'Quick revision before bed! 🧠';
    }
    var greetEl = document.getElementById('heroGreeting');
    var msgEl = document.getElementById('heroMessage');
    if (greetEl) { greetEl.textContent = g; }
    if (msgEl) { msgEl.textContent = m; }
}

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
    if (!file) { return; }
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
    if (!title) {
        toast('Enter a title!', 'warn');
        return;
    }
    if (!subject) {
        toast('Pick a subject!', 'warn');
        return;
    }
    if (!currentFile) {
        toast('No file chosen!', 'err');
        return;
    }

    var btn = document.getElementById('uploadGoBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Processing...';
    document.getElementById('uploadProgressArea').style.display = 'block';
    var fillBar = document.getElementById('uploadProgFill');
    var statusText = document.getElementById('uploadStatusText');

    try {
        statusText.textContent = 'Reading file...';
        fillBar.style.width = '5%';

        var arrayBuffer = await new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function() { resolve(reader.result); };
            reader.onerror = function() { reject(new Error('Cannot read file')); };
            reader.readAsArrayBuffer(currentFile);
        });

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
                var pageText = textContent.items.map(function(item) {
                    return item.str;
                }).join(' ').trim();
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

function renderLibrary() {
    var grid = document.getElementById('libContent');
    if (allBooks.length === 0) {
        grid.innerHTML = '<p class="placeholder">📚 No books yet. Upload your first PDF!</p>';
        return;
    }
    var html = '';
    for (var i = 0; i < allBooks.length; i++) {
        var b = allBooks[i];
        html += '<div class="libcard">';
        html += '<div class="libcard-top" style="background:linear-gradient(135deg,' + subjectColor(b.subject) + ')">';
        html += '<h3>' + b.title + '</h3>';
        html += '<p>' + subjectEmoji(b.subject) + ' ' + b.subject + '</p>';
        html += '</div>';
        html += '<div class="libcard-bot">';
        html += '<div class="libcard-meta"><span>📄 ' + b.pages + ' pages</span><span>' + b.date + '</span></div>';
        html += '<div class="libcard-btns">';
        html += '<button class="btn small" style="background:var(--p)" onclick="openReader(\'' + b.id + '\')">📖 Read</button>';
        html += '<button class="btn small" style="background:var(--ok)" onclick="goQuizFromLib(\'' + b.id + '\')">🧠 Quiz</button>';
        html += '<button class="btn small" style="background:var(--w);color:#1e293b" onclick="goFCFromLib(\'' + b.id + '\')">🔤 Cards</button>';
        html += '<button class="btn small" style="background:var(--e)" onclick="deleteBook(\'' + b.id + '\')">🗑️ Delete</button>';
        html += '</div></div></div>';
    }
    grid.innerHTML = html;
}

async function deleteBook(bookId) {
    if (!confirm('🗑️ Delete this book?')) { return; }
    var book = allBooks.find(function(b) { return b.id === bookId; });
    if (book && book.pdfId) {
        try { await dbRemove('pdfs', book.pdfId); } catch (e) {}
    }
    await dbRemove('books', bookId);
    allBooks = allBooks.filter(function(b) { return b.id !== bookId; });
    renderLibrary();
    updateDashboard();
    toast('Book deleted!', 'info');
}

var readerPdfDoc = null;
var readerCurrentPage = 0;
var readerZoomLevel = 1.3;
var readerCurrentBook = null;

async function openReader(bookId) {
    var book = allBooks.find(function(b) { return b.id === bookId; });
    if (!book) {
        toast('Book not found!', 'err');
        return;
    }
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
            toast('Book loaded! 📸', 'ok');
        } else {
            showReaderText();
        }
    } catch (err) {
        console.warn('Reader error:', err);
        showReaderText();
    }
}

async function renderReaderPage() {
    if (!readerPdfDoc) {
        showReaderText();
        return;
    }
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
    if (!readerCurrentBook || readerCurrentPage >= readerCurrentBook.pages - 1) { return; }
    readerCurrentPage++;
    if (readerPdfDoc) { await renderReaderPage(); } else { showReaderText(); }
}

async function readerPrev() {
    if (!readerCurrentBook || readerCurrentPage <= 0) { return; }
    readerCurrentPage--;
    if (readerPdfDoc) { await renderReaderPage(); } else { showReaderText(); }
}

async function readerJump(pageNum) {
    readerCurrentPage = pageNum;
    if (readerPdfDoc) { await renderReaderPage(); } else { showReaderText(); }
}

async function readerZoomChange(delta) {
    readerZoomLevel = Math.max(0.5, Math.min(3, readerZoomLevel + delta));
    if (readerPdfDoc) { await renderReaderPage(); }
}

function populateSelect(selectId) {
    var sel = document.getElementById(selectId);
    if (!sel) { return; }
    var oldVal = sel.value;
    sel.innerHTML = '<option value="">-- Pick a Book --</option>';
    for (var i = 0; i < allBooks.length; i++) {
        var b = allBooks[i];
        var opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = subjectEmoji(b.subject) + ' ' + b.title;
        sel.appendChild(opt);
    }
    sel.value = oldVal;
}

var mathSC = 0;
var mathSW = 0;
var mathQuizData = [
    { q: '(a + b)² = ?', o: ['a²+b²', 'a²+2ab+b²', 'a²-2ab+b²', '2a²+2b²'], a: 1 },
    { q: 'Trapezium area = ?', o: ['l×b', '½(a+b)×h', 'πr²', '½bh'], a: 1 },
    { q: '15% of 200?', o: ['15', '20', '25', '30'], a: 3 },
    { q: 'x+5=12, x=?', o: ['5', '6', '7', '8'], a: 2 },
    { q: 'Cube vol side 3cm?', o: ['9cm³', '18cm³', '27cm³', '36cm³'], a: 2 },
    { q: '√144 = ?', o: ['10', '11', '12', '13'], a: 2 },
    { q: 'Quadrilateral angles?', o: ['180°', '270°', '360°', '540°'], a: 2 },
    { q: '(a-b)(a+b) = ?', o: ['a²+b²', 'a²-b²', '2ab', 'a²+2ab+b²'], a: 1 }
];

function mathQuizLoad() {
    var q = mathQuizData[Math.floor(Math.random() * mathQuizData.length)];
    document.getElementById('mathQText').textContent = q.q;
    document.getElementById('mathQFb').textContent = '';
    var od = document.getElementById('mathQOpts');
    od.innerHTML = '';
    for (var i = 0; i < q.o.length; i++) {
        var btn = document.createElement('button');
        btn.textContent = q.o[i];
        btn.setAttribute('data-idx', i);
        btn.setAttribute('data-ans', q.a);
        btn.onclick = function() {
            var idx = parseInt(this.getAttribute('data-idx'));
            var ans = parseInt(this.getAttribute('data-ans'));
            var allBtns = od.querySelectorAll('button');
            for (var j = 0; j < allBtns.length; j++) {
                allBtns[j].onclick = null;
                allBtns[j].classList.add('locked');
            }
            var fb = document.getElementById('mathQFb');
            if (idx === ans) {
                mathSC++;
                this.classList.add('correct');
                fb.textContent = '✅ Correct!';
                fb.style.color = 'var(--ok)';
            } else {
                mathSW++;
                this.classList.add('wrong');
                allBtns[ans].classList.add('correct');
                fb.textContent = '❌ Wrong!';
                fb.style.color = 'var(--e)';
            }
            document.getElementById('mathSC').textContent = mathSC;
            document.getElementById('mathSW').textContent = mathSW;
        };
        od.appendChild(btn);
    }
}

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
    { w: 'Catastrophe', m: 'Great disaster (विपत्ति)' },
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

function engFCFlip() {
    document.getElementById('engFC').classList.toggle('flipped');
}

function engFCNext() {
    engFCI = (engFCI + 1) % engWords.length;
    engFCShow();
}

function engFCPrev() {
    engFCI = (engFCI - 1 + engWords.length) % engWords.length;
    engFCShow();
}

var currentPronunciation = 'US';

function setPronunciation(type) {
    currentPronunciation = type;
    var usBtn = document.getElementById('pronUSBtn');
    var ukBtn = document.getElementById('pronUKBtn');
    if (usBtn) { usBtn.classList.remove('active'); }
    if (ukBtn) { ukBtn.classList.remove('active'); }
    if (type === 'US' && usBtn) { usBtn.classList.add('active'); }
    if (type === 'UK' && ukBtn) { ukBtn.classList.add('active'); }
    toast('Switched to ' + (type === 'US' ? '🇺🇸 American' : '🇬🇧 British'), 'info');
}

function speakWord(word) {
    if (!window.speechSynthesis) {
        toast('Speech not supported!', 'err');
        return;
    }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(word);
    u.rate = 0.85;
    u.lang = currentPronunciation === 'US' ? 'en-US' : 'en-GB';
    var voices = window.speechSynthesis.getVoices();
    for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang === u.lang) {
            u.voice = voices[i];
            break;
        }
    }
    window.speechSynthesis.speak(u);
}

function speakCurrentWord() {
    speakWord(engWords[engFCI].w);
}

if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = function() {
        window.speechSynthesis.getVoices();
    };
}

var learnedWords = JSON.parse(localStorage.getItem('sbDictionary') || '[]');

function markAsLearned() {
    var cw = engWords[engFCI];
    for (var i = 0; i < learnedWords.length; i++) {
        if (learnedWords[i].word === cw.w) {
            toast('"' + cw.w + '" already in dictionary!', 'warn');
            return;
        }
    }
    learnedWords.push({ word: cw.w, meaning: cw.m, date: new Date().toLocaleDateString() });
    localStorage.setItem('sbDictionary', JSON.stringify(learnedWords));
    renderDictionary();
    toast('✅ "' + cw.w + '" added!', 'ok');
}

function renderDictionary(filter) {
    var container = document.getElementById('dictionaryList');
    var countEl = document.getElementById('dictCount');
    if (!container) { return; }
    if (countEl) {
        countEl.textContent = learnedWords.length + ' word' + (learnedWords.length !== 1 ? 's' : '') + ' learned';
    }
    if (learnedWords.length === 0) {
        container.innerHTML = '<p class="placeholder">No words learned yet!</p>';
        return;
    }
    var wordsToShow = learnedWords;
    if (filter) {
        var lf = filter.toLowerCase();
        wordsToShow = [];
        for (var i = 0; i < learnedWords.length; i++) {
            if (learnedWords[i].word.toLowerCase().indexOf(lf) !== -1 || learnedWords[i].meaning.toLowerCase().indexOf(lf) !== -1) {
                wordsToShow.push(learnedWords[i]);
            }
        }
    }
    if (wordsToShow.length === 0) {
        container.innerHTML = '<p class="placeholder">No matching words</p>';
        return;
    }
    var html = '';
    for (var j = wordsToShow.length - 1; j >= 0; j--) {
        var w = wordsToShow[j];
        html += '<div class="dict-word">';
        html += '<div class="dict-word-text">';
        html += '<h4>' + w.word + '</h4>';
        html += '<p>' + w.meaning + '</p>';
        html += '<span class="dict-word-date">📅 ' + w.date + '</span>';
        html += '</div>';
        html += '<div class="dict-word-actions">';
        html += '<button class="dict-speak-btn" onclick="speakWord(\'' + w.word + '\')">🔊</button>';
        html += '<button class="dict-remove-btn" onclick="removeFromDictionary(\'' + w.word + '\')">✕</button>';
        html += '</div></div>';
    }
    container.innerHTML = html;
}

function removeFromDictionary(word) {
    learnedWords = learnedWords.filter(function(w) { return w.word !== word; });
    localStorage.setItem('sbDictionary', JSON.stringify(learnedWords));
    renderDictionary();
}

function filterDictionary(s) {
    renderDictionary(s);
}

function clearDictionary() {
    if (!confirm('Clear all?')) { return; }
    learnedWords = [];
    localStorage.setItem('sbDictionary', '[]');
    renderDictionary();
}

var engSC = 0;
var engSW = 0;
var engQuizData = [
    { q: 'Passive: "She writes a letter"?', o: ['A letter is written by her', 'A letter was written', 'She is written', 'Letter writes she'], a: 0 },
    { q: 'Correct article: "__ honest man"', o: ['A', 'An', 'The', 'No article'], a: 1 },
    { q: '"Happiness" noun type?', o: ['Common', 'Proper', 'Abstract', 'Collective'], a: 2 },
    { q: '"Can" expresses:', o: ['Permission', 'Ability', 'Obligation', 'Possibility'], a: 1 },
    { q: 'Synonym of "Brave":', o: ['Timid', 'Courageous', 'Lazy', 'Weak'], a: 1 },
    { q: 'Antonym of "Ancient":', o: ['Old', 'Modern', 'Historic', 'Traditional'], a: 1 },
    { q: '"What a beautiful day!" is:', o: ['Declarative', 'Interrogative', 'Imperative', 'Exclamatory'], a: 3 },
    { q: 'Which modal = necessity?', o: ['Can', 'May', 'Must', 'Would'], a: 2 }
];

function engQuizLoad() {
    var q = engQuizData[Math.floor(Math.random() * engQuizData.length)];
    document.getElementById('engQText').textContent = q.q;
    document.getElementById('engQFb').textContent = '';
    var od = document.getElementById('engQOpts');
    od.innerHTML = '';
    for (var i = 0; i < q.o.length; i++) {
        var btn = document.createElement('button');
        btn.textContent = q.o[i];
        btn.setAttribute('data-idx', i);
        btn.setAttribute('data-ans', q.a);
        btn.onclick = function() {
            var idx = parseInt(this.getAttribute('data-idx'));
            var ans = parseInt(this.getAttribute('data-ans'));
            var allBtns = od.querySelectorAll('button');
            for (var j = 0; j < allBtns.length; j++) {
                allBtns[j].onclick = null;
                allBtns[j].classList.add('locked');
            }
            var fb = document.getElementById('engQFb');
            if (idx === ans) {
                engSC++;
                this.classList.add('correct');
                fb.textContent = '✅ Correct!';
                fb.style.color = 'var(--ok)';
            } else {
                engSW++;
                this.classList.add('wrong');
                allBtns[ans].classList.add('correct');
                fb.textContent = '❌ Wrong!';
                fb.style.color = 'var(--e)';
            }
            document.getElementById('engSC').textContent = engSC;
            document.getElementById('engSW').textContent = engSW;
        };
        od.appendChild(btn);
    }
}

var hindiWords = [
    { w: 'अभिलाषा', m: 'Desire' }, { w: 'अद्भुत', m: 'Amazing' },
    { w: 'विद्यालय', m: 'School' }, { w: 'परिश्रम', m: 'Hard Work' },
    { w: 'साहस', m: 'Courage' }, { w: 'विज्ञान', m: 'Science' },
    { w: 'गणित', m: 'Mathematics' }, { w: 'पर्यावरण', m: 'Environment' },
    { w: 'स्वतंत्रता', m: 'Freedom' }, { w: 'अनुशासन', m: 'Discipline' },
    { w: 'सहानुभूति', m: 'Sympathy' }, { w: 'प्रयत्न', m: 'Effort' },
    { w: 'उत्साह', m: 'Enthusiasm' }, { w: 'कर्तव्य', m: 'Duty' },
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

var hindiSC = 0;
var hindiSW = 0;
var hindiQuizData = [
    { q: '"सूर्य" का पर्यायवाची?', o: ['चंद्र', 'दिनकर', 'तारा', 'नभ'], a: 1 },
    { q: '"अंधकार" का विलोम?', o: ['रात', 'प्रकाश', 'काला', 'अँधेरा'], a: 1 },
    { q: '"राम" कौन सी संज्ञा?', o: ['जातिवाचक', 'व्यक्तिवाचक', 'भाववाचक', 'समूहवाचक'], a: 1 },
    { q: '"सुंदर" शब्द क्या है?', o: ['संज्ञा', 'सर्वनाम', 'विशेषण', 'क्रिया'], a: 2 },
    { q: '"जल" का पर्यायवाची?', o: ['अग्नि', 'पानी', 'वायु', 'धरा'], a: 1 }
];

function hindiQuizLoad() {
    var q = hindiQuizData[Math.floor(Math.random() * hindiQuizData.length)];
    document.getElementById('hindiQText').textContent = q.q;
    document.getElementById('hindiQFb').textContent = '';
    var od = document.getElementById('hindiQOpts');
    od.innerHTML = '';
    for (var i = 0; i < q.o.length; i++) {
        var btn = document.createElement('button');
        btn.textContent = q.o[i];
        btn.setAttribute('data-idx', i);
        btn.setAttribute('data-ans', q.a);
        btn.onclick = function() {
            var idx = parseInt(this.getAttribute('data-idx'));
            var ans = parseInt(this.getAttribute('data-ans'));
            var allBtns = od.querySelectorAll('button');
            for (var j = 0; j < allBtns.length; j++) {
                allBtns[j].onclick = null;
                allBtns[j].classList.add('locked');
            }
            var fb = document.getElementById('hindiQFb');
            if (idx === ans) {
                hindiSC++;
                this.classList.add('correct');
                fb.textContent = '✅ सही!';
                fb.style.color = 'var(--ok)';
            } else {
                hindiSW++;
                this.classList.add('wrong');
                allBtns[ans].classList.add('correct');
                fb.textContent = '❌ गलत!';
                fb.style.color = 'var(--e)';
            }
            document.getElementById('hindiSC').textContent = hindiSC;
            document.getElementById('hindiSW').textContent = hindiSW;
        };
        od.appendChild(btn);
    }
}

var tamilWords = [
    { t: 'பள்ளி', e: 'School' }, { t: 'புத்தகம்', e: 'Book' },
    { t: 'ஆசிரியர்', e: 'Teacher' }, { t: 'மாணவன்', e: 'Student' },
    { t: 'கணிதம்', e: 'Mathematics' }, { t: 'அறிவியல்', e: 'Science' },
    { t: 'வரலாறு', e: 'History' }, { t: 'நீர்', e: 'Water' },
    { t: 'தீ', e: 'Fire' }, { t: 'காற்று', e: 'Wind' },
    { t: 'பூமி', e: 'Earth' }, { t: 'வானம்', e: 'Sky' },
    { t: 'மழை', e: 'Rain' }, { t: 'சூரியன்', e: 'Sun' },
    { t: 'நிலா', e: 'Moon' }, { t: 'அன்பு', e: 'Love' },
    { t: 'நன்றி', e: 'Thank you' }, { t: 'வணக்கம்', e: 'Hello' },
    { t: 'வீடு', e: 'House' }, { t: 'உணவு', e: 'Food' },
    { t: 'மரம்', e: 'Tree' }, { t: 'பூ', e: 'Flower' },
    { t: 'பழம்', e: 'Fruit' }, { t: 'கடல்', e: 'Sea' },
    { t: 'மலை', e: 'Mountain' }, { t: 'நதி', e: 'River' },
    { t: 'விலங்கு', e: 'Animal' }, { t: 'பறவை', e: 'Bird' },
    { t: 'மீன்', e: 'Fish' }, { t: 'பசு', e: 'Cow' },
    { t: 'நாய்', e: 'Dog' }, { t: 'பூனை', e: 'Cat' },
    { t: 'குழந்தை', e: 'Child' }, { t: 'தாய்', e: 'Mother' },
    { t: 'தந்தை', e: 'Father' }, { t: 'நண்பன்', e: 'Friend' },
    { t: 'கண்', e: 'Eye' }, { t: 'வாய்', e: 'Mouth' },
    { t: 'இதயம்', e: 'Heart' }, { t: 'அறிவு', e: 'Knowledge' }
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
    { q: '"பள்ளி" means?', o: ['Hospital', 'School', 'Temple', 'Market'], a: 1 },
    { q: '"Water" in Tamil?', o: ['தீ', 'காற்று', 'நீர்', 'மண்'], a: 2 },
    { q: 'Total Tamil letters?', o: ['247', '200', '300', '150'], a: 0 },
    { q: 'Vowels count?', o: ['18', '12', '216', '10'], a: 1 },
    { q: 'Consonants count?', o: ['12', '216', '20', '18'], a: 3 },
    { q: '"சூரியன்" means?', o: ['Moon', 'Star', 'Sun', 'Cloud'], a: 2 },
    { q: '"ஆசிரியர்" means?', o: ['Student', 'Teacher', 'Doctor', 'Farmer'], a: 1 },
    { q: 'ஆய்த எழுத்து?', o: ['அ', 'க', 'ஃ', 'ங'], a: 2 },
    { q: '"நன்றி" means?', o: ['Sorry', 'Please', 'Thank you', 'Welcome'], a: 2 },
    { q: '"அறிவே ஆற்றல்"?', o: ['Money=power', 'Knowledge=power', 'Unity=strength', 'Health=wealth'], a: 1 },
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
    for (var i = 0; i < q.o.length; i++) {
        var btn = document.createElement('button');
        btn.textContent = q.o[i];
        btn.setAttribute('data-idx', i);
        btn.setAttribute('data-ans', q.a);
        btn.onclick = function() {
            var idx = parseInt(this.getAttribute('data-idx'));
            var ans = parseInt(this.getAttribute('data-ans'));
            var allBtns = od.querySelectorAll('button');
            for (var j = 0; j < allBtns.length; j++) {
                allBtns[j].onclick = null;
                allBtns[j].classList.add('locked');
            }
            var fb = document.getElementById('tamilQFb');
            if (idx === ans) {
                tamilQuizC++;
                this.classList.add('correct');
                fb.textContent = '✅ சரி!';
                fb.style.color = 'var(--ok)';
            } else {
                tamilQuizW++;
                this.classList.add('wrong');
                allBtns[ans].classList.add('correct');
                fb.textContent = '❌ தவறு!';
                fb.style.color = 'var(--e)';
            }
            document.getElementById('tamilScoreC').textContent = tamilQuizC;
            document.getElementById('tamilScoreW').textContent = tamilQuizW;
        };
        od.appendChild(btn);
    }
}

var quizQuestions = [];
var quizIndex = 0;
var quizCorrect = 0;
var quizWrong = 0;

function goQuizFromLib(id) {
    navigate('quiz');
    setTimeout(function() {
        document.getElementById('quizBookPicker').value = id;
        quizBookChanged();
    }, 100);
}

function quizBookChanged() {
    var id = document.getElementById('quizBookPicker').value;
    var rangeDiv = document.getElementById('quizPageRange');
    if (!id) { rangeDiv.style.display = 'none'; return; }
    var book = allBooks.find(function(b) { return b.id === id; });
    if (!book) { rangeDiv.style.display = 'none'; return; }
    rangeDiv.style.display = 'block';
    document.getElementById('quizFrom').value = 1;
    document.getElementById('quizFrom').max = book.pages;
    document.getElementById('quizTo').value = Math.min(book.pages, 10);
    document.getElementById('quizTo').max = book.pages;
}

function quizStart() {
    var id = document.getElementById('quizBookPicker').value;
    if (!id) { toast('Pick a book!', 'warn'); return; }
    var book = allBooks.find(function(b) { return b.id === id; });
    if (!book) { return; }
    var from = Math.max(0, parseInt(document.getElementById('quizFrom').value) - 1);
    var to = Math.min(book.pages, parseInt(document.getElementById('quizTo').value));
    var numQ = parseInt(document.getElementById('quizNumQ').value);
    if (from >= to) { toast('Invalid page range!', 'warn'); return; }
    var chapterText = book.pageTexts.slice(from, to).join(' ').replace(/\s+/g, ' ').trim();
    if (chapterText.length < 80) { toast('Not enough text!', 'warn'); return; }
    quizQuestions = generateQuestions(chapterText, numQ);
    quizIndex = 0;
    quizCorrect = 0;
    quizWrong = 0;
    if (quizQuestions.length === 0) { toast('Could not generate questions.', 'warn'); return; }
    document.getElementById('quizSetupBox').style.display = 'none';
    document.getElementById('quizPlayBox').style.display = 'block';
    document.getElementById('quizResultBox').style.display = 'none';
    showQuizQuestion();
    toast(quizQuestions.length + ' questions ready!', 'ok');
}

function generateQuestions(text, count) {
    var results = [];
    var sentences = text.split(/[.!?\n]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 20 && s.length < 250; });
    if (sentences.length < 3) { return results; }

    var stopList = 'the and for that this with from have been were they their which about would could should these those also into some than then only very more most such each because between through during without another does will just over under both same many much while since until upon here still even well back down like make made know take come give look find want tell good great first last long little around every never might shall a an is are was in on to of it';
    var stops = stopList.split(' ');

    var freq = {};
    var words = text.split(/\s+/);
    for (var wi = 0; wi < words.length; wi++) {
        var clean = words[wi].toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
        if (clean.length > 3 && stops.indexOf(clean) === -1) {
            freq[clean] = (freq[clean] || 0) + 1;
        }
    }

    var keywords = [];
    for (var word in freq) {
        if (freq[word] >= 2 && freq[word] <= 25) {
            keywords.push(word);
        }
    }
    keywords.sort(function(a, b) { return (freq[b] || 0) - (freq[a] || 0); });
    keywords = keywords.slice(0, 50);

    var used = {};

    for (var si = 0; si < sentences.length && results.length < Math.ceil(count * 0.5); si++) {
        var sent = sentences[si];
        if (used[sent]) { continue; }
        var sWords = sent.split(/\s+/);
        if (sWords.length < 5) { continue; }
        var bestWord = null;
        var bestIndex = -1;
        for (var bwi = 1; bwi < sWords.length - 1; bwi++) {
            var bwClean = sWords[bwi].toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
            if (keywords.indexOf(bwClean) !== -1 && bwClean.length > 4) {
                bestWord = sWords[bwi];
                bestIndex = bwi;
                break;
            }
        }
        if (!bestWord) { continue; }
        used[sent] = true;
        var blanked = '';
        for (var bli = 0; bli < sWords.length; bli++) {
            if (bli === bestIndex) { blanked += '________ '; }
            else { blanked += sWords[bli] + ' '; }
        }
        blanked = blanked.trim();
        var correctAns = bestWord.replace(/[^a-zA-Z\u0900-\u097F\s]/g, '');
        var wrongAns = [];
        for (var wai = 0; wai < keywords.length && wrongAns.length < 3; wai++) {
            if (keywords[wai] !== correctAns.toLowerCase()) {
                wrongAns.push(keywords[wai]);
            }
        }
        if (wrongAns.length < 3) { continue; }
        var options = [correctAns, wrongAns[0], wrongAns[1], wrongAns[2]];
        options.sort(function() { return Math.random() - 0.5; });
        results.push({
            question: 'Fill in the blank:\n\n"' + blanked + '"',
            options: options,
            answer: options.indexOf(correctAns),
            type: 'Fill in Blank',
            explanation: 'Answer: ' + correctAns
        });
    }

    for (var ti = 0; ti < sentences.length && results.length < Math.ceil(count * 0.8); ti++) {
        var tfSent = sentences[ti];
        if (used[tfSent] || tfSent.length > 160 || Math.random() > 0.5) { continue; }
        used[tfSent] = true;
        var isTrue = Math.random() > 0.4;
        var displaySent = tfSent;
        if (!isTrue) {
            var tfW = tfSent.split(/\s+/);
            for (var ri = 1; ri < tfW.length - 1; ri++) {
                var rc = tfW[ri].toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
                if (keywords.indexOf(rc) !== -1 && rc.length > 4) {
                    for (var rj = 0; rj < keywords.length; rj++) {
                        if (keywords[rj] !== rc) {
                            tfW[ri] = keywords[rj];
                            break;
                        }
                    }
                    break;
                }
            }
            displaySent = tfW.join(' ');
        }
        results.push({
            question: 'True or False?\n\n"' + displaySent + '"',
            options: ['True ✅', 'False ❌'],
            answer: isTrue ? 0 : 1,
            type: 'True/False',
            explanation: isTrue ? 'Correct!' : 'Original: "' + tfSent + '"'
        });
    }

    for (var ci = 0; ci < 5 && results.length < count; ci++) {
        var compSent = sentences[Math.floor(Math.random() * sentences.length)];
        if (used[compSent] || compSent.length > 120) { continue; }
        used[compSent] = true;
        var preview = compSent.length > 70 ? compSent.substring(0, 70) + '...' : compSent;
        var wrongOpts = ['Not mentioned in text', 'From another chapter', 'Not discussed'];
        var compOpts = [preview, wrongOpts[0], wrongOpts[1], wrongOpts[2]];
        compOpts.sort(function() { return Math.random() - 0.5; });
        results.push({
            question: 'Which is from your book?',
            options: compOpts,
            answer: compOpts.indexOf(preview),
            type: 'Comprehension',
            explanation: 'Found: "' + compSent + '"'
        });
    }

    results.sort(function() { return Math.random() - 0.5; });
    return results.slice(0, count);
}

function showQuizQuestion() {
    if (quizIndex >= quizQuestions.length) {
        showQuizResults();
        return;
    }
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
    for (var i = 0; i < q.options.length; i++) {
        var btn = document.createElement('button');
        btn.textContent = q.options[i];
        btn.setAttribute('data-idx', i);
        btn.setAttribute('data-ans', q.answer);
        btn.setAttribute('data-exp', q.explanation || '');
        btn.onclick = function() {
            var idx = parseInt(this.getAttribute('data-idx'));
            var ans = parseInt(this.getAttribute('data-ans'));
            var exp = this.getAttribute('data-exp');
            var allBtns = optDiv.querySelectorAll('button');
            for (var j = 0; j < allBtns.length; j++) {
                allBtns[j].onclick = null;
                allBtns[j].classList.add('locked');
            }
            var fb = document.getElementById('quizFeedback');
            if (idx === ans) {
                quizCorrect++;
                this.classList.add('correct');
                fb.textContent = '✅ Correct!';
                fb.style.color = 'var(--ok)';
            } else {
                quizWrong++;
                this.classList.add('wrong');
                allBtns[ans].classList.add('correct');
                fb.textContent = '❌ Wrong!';
                fb.style.color = 'var(--e)';
            }
            if (exp) {
                var exEl = document.getElementById('quizExplain');
                exEl.textContent = '💡 ' + exp;
                exEl.classList.add('visible');
            }
            updateQuizScore();
            document.getElementById('quizNextBtn').style.display = 'inline-block';
        };
        optDiv.appendChild(btn);
    }
    updateQuizScore();
}

function quizNextQuestion() {
    quizIndex++;
    showQuizQuestion();
}

function updateQuizScore() {
    document.getElementById('quizCorrectNum').textContent = quizCorrect;
    document.getElementById('quizWrongNum').textContent = quizWrong;
    var total = quizCorrect + quizWrong;
    if (total > 0) {
        document.getElementById('quizPercentNum').textContent = Math.round(quizCorrect / total * 100) + '%';
    } else {
        document.getElementById('quizPercentNum').textContent = '0%';
    }
}

function showQuizResults() {
    document.getElementById('quizPlayBox').style.display = 'none';
    document.getElementById('quizResultBox').style.display = 'block';
    var total = quizCorrect + quizWrong;
    var pct = total > 0 ? Math.round(quizCorrect / total * 100) : 0;
    document.getElementById('quizResultPct').textContent = pct + '%';
    var circle = document.getElementById('quizResultCircle');
    if (pct >= 80) {
        circle.style.background = 'linear-gradient(135deg,#10b981,#059669)';
        document.getElementById('quizResultMsg').textContent = '🌟 Excellent!';
    } else if (pct >= 50) {
        circle.style.background = 'linear-gradient(135deg,#f59e0b,#d97706)';
        document.getElementById('quizResultMsg').textContent = '👍 Good effort!';
    } else {
        circle.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
        document.getElementById('quizResultMsg').textContent = '📖 Keep studying!';
    }
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

var fcCards = [];
var fcIndex = 0;

function goFCFromLib(id) {
    navigate('flashcards');
    setTimeout(function() {
        document.getElementById('fcBookPicker').value = id;
        fcLoadBook(id);
    }, 100);
}

function fcLoadBook(id) {
    if (!id) { return; }
    var book = allBooks.find(function(b) { return b.id === id; });
    if (!book || !book.fullText || book.fullText.length < 80) {
        document.getElementById('fcContent').innerHTML = '<p class="placeholder">⚠️ Not enough text</p>';
        document.getElementById('fcCardArea').style.display = 'none';
        return;
    }
    fcCards = [];
    var sents = book.fullText.split(/[.!?\n]+/).filter(function(s) {
        return s.trim().length > 15 && s.trim().length < 200;
    });
    var freqMap = {};
    var allW = book.fullText.split(/\s+/);
    for (var i = 0; i < allW.length; i++) {
        var c = allW[i].toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g, '');
        if (c.length > 4) { freqMap[c] = (freqMap[c] || 0) + 1; }
    }
    var kws = [];
    for (var w in freqMap) {
        if (freqMap[w] >= 2 && freqMap[w] <= 15) { kws.push(w); }
    }
    kws.sort(function(a, b) { return (freqMap[b] || 0) - (freqMap[a] || 0); });
    kws = kws.slice(0, 25);
    var usedKW = {};
    for (var si = 0; si < sents.length; si++) {
        if (fcCards.length >= 20) { break; }
        var trimmed = sents[si].trim();
        for (var ki = 0; ki < kws.length; ki++) {
            if (usedKW[kws[ki]]) { continue; }
            if (trimmed.toLowerCase().indexOf(kws[ki]) !== -1) {
                var back = trimmed.length > 120 ? trimmed.substring(0, 120) + '...' : trimmed;
                fcCards.push({
                    front: kws[ki].charAt(0).toUpperCase() + kws[ki].slice(1),
                    back: back
                });
                usedKW[kws[ki]] = true;
                break;
            }
        }
    }
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

var aiSelectedBookId = null;
var aiApiKey = localStorage.getItem('sbGeminiKey') || '';
var aiBookContext = '';

function saveApiKey() {
    var key = document.getElementById('apiKeyInput').value.trim();
    if (!key) {
        toast('Paste your API key!', 'warn');
        return;
    }
    if (key.length < 20) {
        toast('Key too short!', 'warn');
        return;
    }
    aiApiKey = key;
    localStorage.setItem('sbGeminiKey', key);
    document.getElementById('apiKeyBox').style.display = 'none';
    toast('API key saved! 🤖', 'ok');
    addChatMessage('bot', '✅ Ready! Select a book and ask anything!');
}

function checkApiKey() {
    if (aiApiKey) {
        var box = document.getElementById('apiKeyBox');
        if (box) { box.style.display = 'none'; }
    }
}

function aiSelectBook(bookId) {
    aiSelectedBookId = bookId;
    aiBookContext = '';
    if (bookId) {
        var book = allBooks.find(function(b) { return b.id === bookId; });
        if (book) {
            aiBookContext = book.fullText ? book.fullText.substring(0, 4000) : '';
            addChatMessage('bot', '📘 Loaded "' + book.title + '" (' + book.pages + ' pages). Ask me anything!');
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
    if (!query) { return; }
    input.value = '';
    addChatMessage('user', query);

    if (!aiApiKey) {
        addChatMessage('bot', '⚠️ Set up your API key first!');
        var box = document.getElementById('apiKeyBox');
        if (box) { box.style.display = 'block'; }
        return;
    }
    if (!aiSelectedBookId) {
        addChatMessage('bot', '⚠️ Select a book first!');
        return;
    }
    var book = allBooks.find(function(b) { return b.id === aiSelectedBookId; });
    if (!book) {
        addChatMessage('bot', '❌ Book not found!');
        return;
    }

    var pageContext = '';
    var queryLower = query.toLowerCase();

    var rangeMatch = queryLower.match(/page\s*(\d+)\s*(?:to|-)\s*(\d+)/);
    var singleMatch = queryLower.match(/page\s*(\d+)/);

    if (rangeMatch) {
        var f = parseInt(rangeMatch[1]) - 1;
        var t = parseInt(rangeMatch[2]);
        if (f >= 0 && t <= book.pages) {
            pageContext = book.pageTexts.slice(f, t).join('\n\n').substring(0, 5000);
        }
    } else if (singleMatch) {
        var pg = parseInt(singleMatch[1]) - 1;
        if (pg >= 0 && pg < book.pageTexts.length) {
            pageContext = book.pageTexts[pg] || '';
        }
    }

    var contextToUse = pageContext || aiBookContext;
    if (!contextToUse || contextToUse.trim().length < 20) {
        contextToUse = book.fullText ? book.fullText.substring(0, 4000) : 'No text available.';
    }

    var typingEl = document.getElementById('aiTyping');
    if (typingEl) { typingEl.style.display = 'block'; }
    scrollChatDown();

    try {
        var response = await callGemini(query, contextToUse, book.title);
        if (typingEl) { typingEl.style.display = 'none'; }
        addChatMessage('bot', response);
    } catch (err) {
        if (typingEl) { typingEl.style.display = 'none'; }
        console.error('AI error:', err);
        var errMsg = err.message || 'Something went wrong';
        if (errMsg.indexOf('API_KEY_INVALID') !== -1) {
            addChatMessage('bot', '❌ Invalid API key. Please check and re-enter.');
            localStorage.removeItem('sbGeminiKey');
            aiApiKey = '';
            var keyBox = document.getElementById('apiKeyBox');
            if (keyBox) { keyBox.style.display = 'block'; }
        } else {
            addChatMessage('bot', '❌ ' + errMsg);
        }
    }
}

async function callGemini(question, bookContext, bookTitle) {
    var userName = localStorage.getItem('sbName') || 'Student';
    var prompt = 'You are StudyBuddy AI for Grade 8 CBSE student ' + userName + '. ';
    prompt += 'Book: "' + bookTitle + '". ';
    prompt += 'Use simple language. Use bullet points. Be encouraging. ';
    prompt += 'Based on this content:\n\n' + bookContext + '\n\nQuestion: ' + question;

    var requestBody = {
        contents: [
            {
                parts: [
                    { text: prompt }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024
        }
    };

    var modelUrls = [
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=',
        'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key='
    ];

    var lastError = 'No models available';

    for (var i = 0; i < modelUrls.length; i++) {
        try {
            var url = modelUrls[i] + aiApiKey;
            var response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            var data = await response.json();

            if (response.ok && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                return data.candidates[0].content.parts[0].text;
            }

            if (data.error && data.error.message) {
                lastError = data.error.message;
                if (lastError.indexOf('not found') !== -1 || lastError.indexOf('not supported') !== -1) {
                    console.log('Model ' + (i + 1) + ' not found, trying next...');
                    continue;
                }
                if (lastError.indexOf('quota') !== -1 || lastError.indexOf('exceeded') !== -1 || lastError.indexOf('QUOTA') !== -1) {
                    console.log('Model ' + (i + 1) + ' quota exceeded, trying next...');
                    continue;
                }
                throw new Error(lastError);
            }
        } catch (fetchErr) {
            var errMessage = fetchErr.message || 'Connection error';
            if (errMessage.indexOf('not found') !== -1 || errMessage.indexOf('Failed to fetch') !== -1 || errMessage.indexOf('quota') !== -1 || errMessage.indexOf('exceeded') !== -1) {
                lastError = errMessage;
                continue;
            }
            lastError = errMessage;
        }
    }

    throw new Error(lastError);
}

function addChatMessage(who, message) {
    var chatArea = document.getElementById('chatArea');
    var div = document.createElement('div');
    div.className = 'chatmsg ' + who;
    var avatar = who === 'bot' ? '🤖' : '👤';
    var formatted = message
        .replace(/</g, '&lt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '• $1')
        .replace(/\n/g, '<br>');
    div.innerHTML = '<div class="chatavatar">' + avatar + '</div><div class="chatbubble">' + formatted + '</div>';
    chatArea.appendChild(div);
    scrollChatDown();
}

function scrollChatDown() {
    var chatArea = document.getElementById('chatArea');
    setTimeout(function() {
        chatArea.scrollTop = chatArea.scrollHeight;
    }, 100);
}

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
    if (!title || !body) {
        toast('Enter title and content!', 'warn');
        return;
    }
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
        container.innerHTML = '<p class="placeholder">📝 No notes yet. Click "+ New Note" to start!</p>';
        return;
    }
    var html = '';
    for (var i = allNotes.length - 1; i >= 0; i--) {
        var n = allNotes[i];
        html += '<div class="notecard" onclick="noteEdit(\'' + n.id + '\')">';
        html += '<button class="notedel" onclick="event.stopPropagation();noteDelete(\'' + n.id + '\')">✕</button>';
        html += '<h4>' + n.title + '</h4>';
        html += '<p>' + n.body.substring(0, 100) + (n.body.length > 100 ? '...' : '') + '</p>';
        html += '<p class="small">📅 ' + (n.modified || n.date) + '</p>';
        html += '</div>';
    }
    container.innerHTML = html;
}

function noteEdit(id) {
    var note = allNotes.find(function(n) { return n.id === id; });
    if (!note) { return; }
    editingNoteId = id;
    document.getElementById('noteEditArea').style.display = 'block';
    document.getElementById('noteEditTitle').value = note.title;
    document.getElementById('noteEditBody').value = note.body;
}

async function noteDelete(id) {
    if (!confirm('Delete this note?')) { return; }
    await dbRemove('notes', id);
    allNotes = allNotes.filter(function(n) { return n.id !== id; });
    renderNotes();
    toast('Deleted!', 'info');
}

var timerInterval = null;
var timerSecondsLeft = 25 * 60;
var timerTotalSeconds = 25 * 60;

function timerUpdateDisplay() {
    var mins = Math.floor(timerSecondsLeft / 60).toString().padStart(2, '0');
    var secs = (timerSecondsLeft % 60).toString().padStart(2, '0');
    document.getElementById('timerDisplay').textContent = mins + ':' + secs;
}

function timerStart() {
    if (timerInterval) { return; }
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

document.addEventListener('DOMContentLoaded', function() {
    var picker = document.getElementById('filePicker');
    if (picker) {
        picker.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        picker.addEventListener('drop', function(e) {
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
                toast('Please drop a PDF!', 'err');
            }
        });
    }
});

window.onload = async function() {
    console.log('StudyBuddy starting...');

    var savedName = localStorage.getItem('sbName');
    if (savedName) {
        var popup = document.getElementById('namePopup');
        if (popup) { popup.classList.add('hidden'); }
        updateGreeting();
    }

    if (localStorage.getItem('sbtheme') === 'dark') {
        document.body.classList.add('dark-theme');
        document.querySelector('.themebtn').textContent = '☀️';
    }

    var quotes = [
        '"Education is the most powerful weapon." — Mandela',
        '"Practice makes perfect!" 💪',
        '"Believe you can and you\'re halfway there."',
        '"அறிவே ஆற்றல் — Knowledge is Power" 📗',
        '"The expert was once a beginner."'
    ];
    var quoteEl = document.getElementById('homeQuote');
    if (quoteEl) {
        quoteEl.textContent = quotes[new Date().getDate() % quotes.length];
    }

    timerUpdateDisplay();
    engFCShow();
    engQuizLoad();
    renderDictionary();
    hindiFCShow();
    hindiQuizLoad();
    tamilShowFC();
    tamilQuizLoad();
    mathQuizLoad();
    checkApiKey();

    try {
        await openDatabase();
        allBooks = await dbGetAll('books');
        allNotes = await dbGetAll('notes');
        console.log('Loaded ' + allBooks.length + ' books, ' + allNotes.length + ' notes');
        toast('StudyBuddy ready! ' + allBooks.length + ' books.', 'ok');
    } catch (err) {
        console.error('Database error:', err);
        toast('Database error. Try refreshing.', 'err');
    }

    updateDashboard();
};
