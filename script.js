// ============================================
//   STUDYBUDDY v4 — SMART AI + PDF IMAGES
//   By Samuel Giftson S
// ============================================

pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ===== TOAST =====
function toast(msg,type='info'){const c=document.getElementById('toastContainer');const t=document.createElement('div');t.className=`toast toast-${type}`;const ic={success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};t.innerHTML=`<span>${ic[type]||''}</span> ${msg}`;c.appendChild(t);setTimeout(()=>t.remove(),4000);}

// ===== LOADING =====
function showLoad(t){document.getElementById('loadingText').textContent=t;document.getElementById('loadingOverlay').classList.add('show');}
function hideLoad(){document.getElementById('loadingOverlay').classList.remove('show');}

// ===== INDEXEDDB =====
const DBN='StudyBuddyDB4';let db=null;
function openDB(){return new Promise((res,rej)=>{const r=indexedDB.open(DBN,1);r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains('books'))d.createObjectStore('books',{keyPath:'id'});if(!d.objectStoreNames.contains('notes'))d.createObjectStore('notes',{keyPath:'id'});if(!d.objectStoreNames.contains('pdfs'))d.createObjectStore('pdfs',{keyPath:'id'});};r.onsuccess=e=>{db=e.target.result;res(db);};r.onerror=e=>rej(e);});}
function dbPut(s,d){return new Promise((res,rej)=>{const tx=db.transaction(s,'readwrite');tx.objectStore(s).put(d);tx.oncomplete=()=>res();tx.onerror=e=>rej(e);});}
function dbAll(s){return new Promise((res,rej)=>{const tx=db.transaction(s,'readonly');const r=tx.objectStore(s).getAll();r.onsuccess=()=>res(r.result);r.onerror=e=>rej(e);});}
function dbDel(s,id){return new Promise((res,rej)=>{const tx=db.transaction(s,'readwrite');tx.objectStore(s).delete(id);tx.oncomplete=()=>res();tx.onerror=e=>rej(e);});}
function dbGet(s,id){return new Promise((res,rej)=>{const tx=db.transaction(s,'readonly');const r=tx.objectStore(s).get(id);r.onsuccess=()=>res(r.result);r.onerror=e=>rej(e);});}

// ===== STATE =====
let books=[],notesArr=[];
let stats=JSON.parse(localStorage.getItem('sbStats4'))||{quiz:0,correct:0,answered:0,lastDate:null,streak:0};
let chosenFile=null,readerBook=null,readerPage=0,readerZoom=1.3,readerPdf=null;
let quizQs=[],quizIdx=0,qC=0,qW=0;
let fcs=[],fcI=0,editNoteId=null;

// ===== NAV =====
function showSection(id){document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));document.getElementById(id).classList.add('active');window.scrollTo(0,0);if(id==='library')renderLib();if(id==='quiz')fillSel('quizBookSel');if(id==='flashcards')fillSel('fcBookSel');if(id==='notes')renderNotes();}

// ===== THEME =====
function toggleTheme(){document.body.classList.toggle('dark-theme');document.querySelector('.theme-toggle').textContent=document.body.classList.contains('dark-theme')?'☀️':'🌙';localStorage.setItem('sbTheme',document.body.classList.contains('dark-theme')?'dark':'light');}

// ===== QUOTE =====
const quotes=["\"Education is the most powerful weapon.\" — Mandela","\"Practice makes a man perfect!\" 💪","\"Believe you can and you're halfway there.\" — Roosevelt","\"Reading is to the mind what exercise is to the body.\"","\"The expert in anything was once a beginner.\"","\"அறிவே ஆற்றல் — Knowledge is Power\" 🟢","\"कल करे सो आज कर — Don't delay\" 📝","\"Success = Small efforts repeated daily\""];
function showQuote(){const e=document.getElementById('dailyQuote');if(e)e.textContent=quotes[new Date().getDate()%quotes.length];}

// ===== DASHBOARD =====
function updateDash(){
    const tb=document.getElementById('totalBooks'),tq=document.getElementById('totalQuizzes'),ts=document.getElementById('totalScore'),ss=document.getElementById('studyStreak');
    if(tb)tb.textContent=books.length;if(tq)tq.textContent=stats.quiz;
    if(ts)ts.textContent=stats.answered>0?Math.round((stats.correct/stats.answered)*100)+'%':'0%';
    if(ss)ss.textContent=stats.streak;renderRecent();
}
function renderRecent(){
    const c=document.getElementById('recentBooks');if(!c)return;
    if(!books.length){c.innerHTML='<p class="empty-msg">No books yet. Click 📤 to upload!</p>';return;}
    c.innerHTML=books.slice(-5).reverse().map(b=>`<div class="recent-book-card" onclick="openReader('${b.id}')"><h4>${emo(b.subject)} ${b.title}</h4><p>${b.subject} · ${b.pages}p</p></div>`).join('');
}
function emo(s){return{math:'📐',english:'📖',hindi:'📝',tamil:'🟢',science:'🔬',social:'🌍',computer:'💻',other:'📦'}[s]||'📄';}
function clr(s){return{math:'#4f46e5,#7c3aed',english:'#059669,#10b981',hindi:'#db2777,#ec4899',tamil:'#059669,#0d9488',science:'#0891b2,#06b6d4',social:'#d97706,#f59e0b',computer:'#7c3aed,#8b5cf6',other:'#64748b,#94a3b8'}[s]||'#64748b,#94a3b8';}
function updStreak(){const today=new Date().toDateString();if(stats.lastDate!==today){const y=new Date();y.setDate(y.getDate()-1);stats.streak=stats.lastDate===y.toDateString()?stats.streak+1:1;stats.lastDate=today;localStorage.setItem('sbStats4',JSON.stringify(stats));}}

// ============================================
//   UPLOAD — WITH TUTORIAL
// ============================================
function openUploadModal(){
    document.getElementById('uploadModal').classList.add('show');
    document.getElementById('step1').style.display='block';
    document.getElementById('step2').style.display='none';
    document.getElementById('fileInput').value='';
    chosenFile=null;
    const seen=localStorage.getItem('sbTutSeen');
    document.getElementById('tutorialBox').classList.toggle('hidden',seen==='yes');
}
function closeUploadModal(){document.getElementById('uploadModal').classList.remove('show');chosenFile=null;}
function changeFile(){document.getElementById('step1').style.display='block';document.getElementById('step2').style.display='none';chosenFile=null;}
function showTutorial(){document.getElementById('tutorialBox').classList.remove('hidden');}
function dismissTutorial(){document.getElementById('tutorialBox').classList.add('hidden');localStorage.setItem('sbTutSeen','yes');}

function onFileChosen(e){
    const f=e.target.files[0];if(!f)return;
    if(f.type!=='application/pdf'){toast('Select a PDF file!','error');return;}
    if(f.size>50*1024*1024){toast('File too large! Max 50MB.','error');return;}
    chosenFile=f;
    document.getElementById('step1').style.display='none';
    document.getElementById('step2').style.display='block';
    document.getElementById('fName').textContent=f.name;
    document.getElementById('fSize').textContent=(f.size/(1024*1024)).toFixed(1)+' MB';
    document.getElementById('bTitle').value=f.name.replace('.pdf','').replace(/[_\-]+/g,' ');
    document.getElementById('bSubject').value='';document.getElementById('bAuthor').value='';
    document.getElementById('upProg').style.display='none';
    toast('File selected! Fill details below.','info');
}

async function startProcessing(){
    const title=document.getElementById('bTitle').value.trim();
    const subject=document.getElementById('bSubject').value;
    const author=document.getElementById('bAuthor').value.trim();
    if(!title){toast('Enter a book title!','warning');return;}
    if(!subject){toast('Select a subject!','warning');return;}
    if(!chosenFile){toast('No file selected!','error');return;}
    const btn=document.getElementById('upGoBtn');btn.disabled=true;btn.textContent='⏳ Processing...';
    document.getElementById('upProg').style.display='block';
    document.getElementById('upFill').style.width='0%';
    document.getElementById('upFill').style.background='';
    try{
        const ab=await readFile(chosenFile);
        document.getElementById('upStatus').textContent='Loading PDF...';document.getElementById('upFill').style.width='10%';
        const pdf=await pdfjsLib.getDocument({data:ab}).promise;
        const total=pdf.numPages;
        let fullText='';const pageTexts=[];
        for(let i=1;i<=total;i++){
            try{const pg=await pdf.getPage(i);const tc=await pg.getTextContent();const t=tc.items.map(x=>x.str).join(' ').trim();pageTexts.push(t||`[Page ${i}]`);fullText+=t+'\n\n';}
            catch(pe){pageTexts.push(`[Page ${i}]`);}
            document.getElementById('upFill').style.width=(10+Math.round((i/total)*70))+'%';
            document.getElementById('upStatus').textContent=`Extracting page ${i}/${total}...`;
        }
        document.getElementById('upFill').style.width='85%';document.getElementById('upStatus').textContent='Saving...';
        const clean=fullText.replace(/\s+/g,' ').trim();
        if(clean.length<50)toast('⚠️ Low text content. May be scanned PDF.','warning');
        // Save PDF binary for image rendering
        await dbPut('pdfs',{id:'pdf_'+Date.now(),bookId:'book_'+Date.now(),data:ab});
        const book={id:'book_'+Date.now(),title,subject,author:author||'Unknown',pages:total,pageTexts,fullText:clean.substring(0,600000),date:new Date().toLocaleDateString(),ts:Date.now(),pdfId:'pdf_'+(Date.now()-1),textLen:clean.length};
        // Fix: make pdfId match
        const pdfId='pdf_'+Date.now();
        await dbPut('pdfs',{id:pdfId,data:ab});
        book.pdfId=pdfId;
        await dbPut('books',book);
        books.push(book);
        document.getElementById('upFill').style.width='100%';document.getElementById('upStatus').textContent='✅ Done!';
        updStreak();updateDash();
        toast(`"${title}" uploaded! ${total} pages.`,'success');
        setTimeout(()=>{closeUploadModal();showSection('library');},700);
    }catch(err){
        console.error('Upload error:',err);toast(`Failed: ${err.message}`,'error');
        document.getElementById('upStatus').textContent='❌ '+err.message;
        document.getElementById('upFill').style.background='#ef4444';
    }finally{btn.disabled=false;btn.textContent='📤 Upload & Process';}
}
function readFile(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('Read failed'));r.readAsArrayBuffer(f);});}

// Drag drop
document.addEventListener('DOMContentLoaded',()=>{const z=document.getElementById('dropZone');if(!z)return;z.addEventListener('dragover',e=>{e.preventDefault();z.classList.add('drag-over');});z.addEventListener('dragleave',()=>z.classList.remove('drag-over'));z.addEventListener('drop',e=>{e.preventDefault();z.classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f&&f.type==='application/pdf'){chosenFile=f;document.getElementById('step1').style.display='none';document.getElementById('step2').style.display='block';document.getElementById('fName').textContent=f.name;document.getElementById('fSize').textContent=(f.size/(1024*1024)).toFixed(1)+' MB';document.getElementById('bTitle').value=f.name.replace('.pdf','').replace(/[_\-]+/g,' ');toast('Dropped! Fill details.','info');}else toast('Drop a PDF!','error');});});

// ============================================
//   LIBRARY
// ============================================
function renderLib(filter='all'){
    const g=document.getElementById('libraryGrid');
    const list=filter==='all'?books:books.filter(b=>b.subject===filter);
    if(!list.length){g.innerHTML=`<div class="empty-library"><span>📚</span><h3>${filter==='all'?'Library empty':'No '+filter+' books'}</h3><button class="btn" onclick="openUploadModal()">📤 Upload</button></div>`;return;}
    g.innerHTML=list.map(b=>`<div class="book-card"><div class="bc-top" style="background:linear-gradient(135deg,${clr(b.subject)})"><h3>${b.title}</h3><p>${b.author}</p><span class="bc-badge">${emo(b.subject)} ${b.subject}</span></div><div class="bc-bot"><div class="bc-meta"><span>📄 ${b.pages}p</span><span>📅 ${b.date}</span></div><div class="bc-acts"><button class="btn-sm btn-read" onclick="openReader('${b.id}')">📖 Read</button><button class="btn-sm btn-quiz" onclick="goQuiz('${b.id}')">🧠 Quiz</button><button class="btn-sm btn-flash" onclick="goFlash('${b.id}')">🔤 Cards</button><button class="btn-sm btn-delete" onclick="rmBook('${b.id}')">🗑️</button></div></div></div>`).join('');
}
function filterBooks(f,btn){document.querySelectorAll('.fbtn').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');renderLib(f);}
async function rmBook(id){if(!confirm('Delete book?'))return;const b=books.find(x=>x.id===id);if(b&&b.pdfId)await dbDel('pdfs',b.pdfId).catch(()=>{});await dbDel('books',id);books=books.filter(x=>x.id!==id);renderLib();updateDash();toast('Deleted.','info');}

// ============================================
//   READER — PDF AS IMAGES! 📸
// ============================================
async function openReader(id){
    let book=books.find(b=>b.id===id);
    if(!book){book=await dbGet('books',id);if(!book){toast('Not found!','error');return;}}
    readerBook=book;readerPage=0;readerZoom=1.3;readerPdf=null;
    showSection('reader');
    document.getElementById('readerTitle').textContent=`📖 ${book.title}`;
    // Load PDF for image rendering
    showLoad('Loading book...');
    try{
        const pdfData=await dbGet('pdfs',book.pdfId);
        if(pdfData&&pdfData.data){
            readerPdf=await pdfjsLib.getDocument({data:pdfData.data}).promise;
            // Fill page jump selector
            const sel=document.getElementById('pageJump');sel.innerHTML='';
            for(let i=1;i<=readerPdf.numPages;i++){const o=document.createElement('option');o.value=i-1;o.textContent='Page '+i;sel.appendChild(o);}
            await renderPdfPage();
            toast('Book loaded with images! 📸','success');
        }else{
            // Fallback to text
            renderTextPage();
        }
    }catch(err){
        console.warn('PDF render error, using text:',err);
        renderTextPage();
    }
    hideLoad();
}

async function renderPdfPage(){
    if(!readerPdf){renderTextPage();return;}
    const area=document.getElementById('readerArea');
    area.innerHTML='<p style="color:var(--t3);font-size:.8rem;">Rendering page...</p>';
    try{
        const page=await readerPdf.getPage(readerPage+1);
        const viewport=page.getViewport({scale:readerZoom});
        const canvas=document.createElement('canvas');
        canvas.className='pdf-canvas';
        canvas.width=viewport.width;canvas.height=viewport.height;
        const ctx=canvas.getContext('2d');
        await page.render({canvasContext:ctx,viewport:viewport}).promise;
        area.innerHTML='';area.appendChild(canvas);
    }catch(err){
        console.warn('Page render error:',err);
        renderTextPage();
    }
    document.getElementById('pageInfo').textContent=`${readerPage+1} / ${readerBook.pages}`;
    document.getElementById('pageJump').value=readerPage;
}

function renderTextPage(){
    if(!readerBook)return;
    const area=document.getElementById('readerArea');
    const text=readerBook.pageTexts?.[readerPage]||'No content.';
    area.innerHTML=`<div style="padding:20px;white-space:pre-wrap;line-height:1.8;font-size:.92rem;max-width:100%;word-wrap:break-word;">${text}</div>`;
    document.getElementById('pageInfo').textContent=`${readerPage+1} / ${readerBook.pages}`;
}

async function nextPage(){if(!readerBook||readerPage>=readerBook.pages-1)return;readerPage++;if(readerPdf)await renderPdfPage();else renderTextPage();}
async function prevPage(){if(!readerBook||readerPage<=0)return;readerPage--;if(readerPdf)await renderPdfPage();else renderTextPage();}
async function jumpToPage(p){readerPage=parseInt(p);if(readerPdf)await renderPdfPage();else renderTextPage();}
async function zoomIn(){readerZoom=Math.min(readerZoom+0.2,3);if(readerPdf)await renderPdfPage();}
async function zoomOut(){readerZoom=Math.max(readerZoom-0.2,0.5);if(readerPdf)await renderPdfPage();}

// ============================================
//   SMART QUIZ — MUCH BETTER AI 🧠
// ============================================
function fillSel(id){const s=document.getElementById(id);if(!s)return;const v=s.value;s.innerHTML='<option value="">-- Pick a Book --</option>';books.forEach(b=>{const o=document.createElement('option');o.value=b.id;o.textContent=`${emo(b.subject)} ${b.title}`;s.appendChild(o);});s.value=v;}
function goQuiz(id){showSection('quiz');setTimeout(()=>{document.getElementById('quizBookSel').value=id;loadQuiz(id);},100);}

function loadQuiz(id){
    if(!id)return;const book=books.find(b=>b.id===id);
    if(!book||!book.fullText||book.fullText.length<100){document.getElementById('quizArea').innerHTML='<div class="empty-state"><span>⚠️</span><h3>Not enough text</h3><p>This PDF needs more readable content.</p></div>';document.getElementById('quizBox').style.display='none';document.getElementById('quizResult').style.display='none';return;}
    quizQs=smartQuestions(book.fullText,book.subject);quizIdx=0;qC=0;qW=0;
    if(!quizQs.length){document.getElementById('quizArea').innerHTML='<div class="empty-state"><span>⚠️</span><h3>Couldn\'t generate</h3><p>Try a different book.</p></div>';document.getElementById('quizBox').style.display='none';document.getElementById('quizResult').style.display='none';return;}
    document.getElementById('quizArea').innerHTML='';document.getElementById('quizBox').style.display='block';document.getElementById('quizResult').style.display='none';
    showQ();updStreak();toast(`${quizQs.length} smart questions ready!`,'success');
}

function smartQuestions(text,subject){
    const qs=[];const clean=text.replace(/\s+/g,' ').trim();
    const sents=clean.split(/[.!?।\n]+/).map(s=>s.trim()).filter(s=>s.length>20&&s.length<280&&/[a-zA-Z\u0900-\u097F]{3,}/.test(s));
    if(sents.length<3)return[];

    // Better keyword extraction with scoring
    const stopWords=new Set(['the','and','for','that','this','with','from','have','been','were','they','their','which','about','would','could','should','these','those','other','after','before','there','where','when','what','also','into','some','than','then','only','very','more','most','such','each','because','between','through','during','without','within','another','being','having','does','will','just','over','under','both','same','many','much','while','since','until','upon','here','still','even','well','back','down','like','make','made','know','take','come','give','look','find','want','tell','good','great','first','last','long','little','just','around','every','never','might','shall']);

    const freq={};
    clean.split(/\s+/).forEach(w=>{
        const c=w.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g,'');
        if(c.length>3&&!stopWords.has(c)&&!/^\d+$/.test(c))freq[c]=(freq[c]||0)+1;
    });

    const keywords=Object.entries(freq).filter(([w,c])=>c>=2&&c<=30&&w.length>3).sort((a,b)=>b[1]-a[1]).slice(0,60).map(([w])=>w);
    const used=new Set();

    // 1. DEFINITION QUESTIONS — "X is/are/means/refers to"
    const defPatterns=[/(\w[\w\s]{2,30})\s+(?:is|are|was|were|means|refers to|is defined as|is called|is known as)\s+(.{15,150})/gi,
        /(\w[\w\s]{2,30})\s+(?:को|है|हैं|कहते हैं|कहा जाता है)\s+(.{10,150})/gi];

    for(const pat of defPatterns){
        let match;const regex=new RegExp(pat.source,pat.flags);
        while((match=regex.exec(clean))!==null&&qs.length<4){
            const term=match[1].trim();const def=match[2].trim().split(/[.!?]/)[0];
            if(term.length<3||term.length>40||def.length<10||used.has(term.toLowerCase()))continue;
            used.add(term.toLowerCase());

            // Create "What is X?" question
            const wrongDefs=sents.filter(s=>!s.toLowerCase().includes(term.toLowerCase())&&s.length>15&&s.length<120).sort(()=>Math.random()-.5).slice(0,3).map(s=>s.length>80?s.substring(0,80)+'...':s);
            if(wrongDefs.length<3)continue;

            const correctAns=def.length>80?def.substring(0,80)+'...':def;
            const opts=[correctAns,...wrongDefs].sort(()=>Math.random()-.5);
            qs.push({q:`What is "${term}"?`,opts,ans:opts.indexOf(correctAns),type:'Definition',explain:`${term} — ${def}`});
        }
    }

    // 2. SMART FILL IN THE BLANK — picks the most important word
    for(const s of sents){
        if(qs.length>=7||used.has(s))continue;
        const words=s.split(/\s+/);if(words.length<6)continue;

        // Find the most important word (highest frequency keyword)
        let bestWord=null,bestIdx=-1,bestScore=0;
        for(let j=1;j<words.length-1;j++){
            const c=words[j].toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g,'');
            const score=freq[c]||0;
            if(c.length>4&&keywords.includes(c)&&score>bestScore){bestWord=words[j];bestIdx=j;bestScore=score;}
        }
        if(!bestWord)continue;used.add(s);

        const blank=words.map((w,i)=>i===bestIdx?'________':w).join(' ');
        const cleanTarget=bestWord.replace(/[^a-zA-Z\u0900-\u097F\s]/g,'');

        // Smart wrong answers — pick words from same category/length
        const wrongs=keywords.filter(w=>w!==cleanTarget.toLowerCase()&&Math.abs(w.length-cleanTarget.length)<5).sort(()=>Math.random()-.5).slice(0,3);
        if(wrongs.length<3)continue;

        const opts=[cleanTarget,...wrongs].sort(()=>Math.random()-.5);
        qs.push({q:`Fill in the blank:\n\n"${blank}"`,opts,ans:opts.indexOf(cleanTarget),type:'Fill in Blank',explain:`Answer: ${cleanTarget}\n\nFull: ${s}`});
    }

    // 3. TRUE/FALSE with smart modification
    for(const s of sents){
        if(qs.length>=10||used.has(s)||s.length>160)continue;
        if(Math.random()>.5)continue;used.add(s);

        const isTrue=Math.random()>.45;
        let display=s;
        if(!isTrue){
            const w=s.split(/\s+/);
            // Smarter: replace a keyword with a different keyword
            let modified=false;
            for(let i=1;i<w.length-1;i++){
                const c=w[i].toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g,'');
                if(keywords.includes(c)&&c.length>4){
                    const replacement=keywords.find(k=>k!==c&&k.length>=c.length-3&&k.length<=c.length+3);
                    if(replacement){w[i]=replacement;modified=true;break;}
                }
            }
            if(!modified&&w.length>5){const i=2;const j=Math.min(i+3,w.length-1);[w[i],w[j]]=[w[j],w[i]];}
            display=w.join(' ');
        }
        qs.push({q:`True or False?\n\n"${display}"`,opts:['True ✅','False ❌'],ans:isTrue?0:1,type:'True/False',explain:isTrue?`Correct! This statement is from the text.`:`The original text says:\n"${s}"`});
    }

    // 4. "WHICH IS MENTIONED" — comprehension
    for(let i=0;i<4&&qs.length<13;i++){
        const s=sents[Math.floor(Math.random()*sents.length)];
        if(used.has(s)||s.length>130||s.length<25)continue;used.add(s);

        const preview=s.length>75?s.substring(0,75)+'...':s;
        const wrongs=['This concept is NOT discussed in the text.','The author does not mention this at all.','This belongs to a completely different topic.'];
        const opts=[preview,...wrongs].sort(()=>Math.random()-.5);
        qs.push({q:'Which of the following appears in your book?',opts,ans:opts.indexOf(preview),type:'Comprehension',explain:`Found in text: "${s}"`});
    }

    // 5. WORD MEANING (if we can find pairs)
    const wordPairs=[];
    for(const s of sents){
        const m=s.match(/['"](\w+)['"]\s*(?:means|is called|refers to|known as)\s+['"]?(.{5,50})['"]?/i);
        if(m)wordPairs.push({word:m[1],meaning:m[2].trim()});
    }
    for(const wp of wordPairs.slice(0,2)){
        if(qs.length>=15)break;
        const wrongs=keywords.filter(k=>k!==wp.word.toLowerCase()).sort(()=>Math.random()-.5).slice(0,3);
        if(wrongs.length<3)continue;
        const opts=[wp.meaning,...wrongs.map(w=>w.charAt(0).toUpperCase()+w.slice(1))].sort(()=>Math.random()-.5);
        qs.push({q:`What does "${wp.word}" mean or refer to?`,opts,ans:opts.indexOf(wp.meaning),type:'Vocabulary',explain:`${wp.word} = ${wp.meaning}`});
    }

    return qs.sort(()=>Math.random()-.5).slice(0,12);
}

function showQ(){
    if(quizIdx>=quizQs.length){showRes();return;}
    const q=quizQs[quizIdx];const total=quizQs.length;
    document.getElementById('qProg').style.width=((quizIdx/total)*100)+'%';
    document.getElementById('qProgTxt').textContent=`Q ${quizIdx+1} / ${total}`;
    document.getElementById('qText').textContent=q.q;
    document.getElementById('qTypeBadge').textContent=q.type||'Question';
    document.getElementById('qFeedback').textContent='';
    const expl=document.getElementById('qExplanation');expl.textContent='';expl.classList.remove('show');
    document.getElementById('nextQBtn').style.display='none';
    const od=document.getElementById('qOpts');od.innerHTML='';
    q.opts.forEach((o,i)=>{const b=document.createElement('button');b.textContent=o;b.onclick=()=>pickAns(i,q.ans,b,q.explain);od.appendChild(b);});
    updScoreBar();
}

function pickAns(pick,correct,btn,explain){
    const btns=document.getElementById('qOpts').querySelectorAll('button');
    btns.forEach(b=>{b.onclick=null;b.classList.add('disabled');});
    const fb=document.getElementById('qFeedback');
    if(pick===correct){qC++;btn.classList.add('correct');fb.textContent='✅ Correct!';fb.style.color='#10b981';}
    else{qW++;btn.classList.add('wrong');btns[correct].classList.add('correct');fb.textContent='❌ Wrong!';fb.style.color='#ef4444';}
    // Show explanation
    if(explain){const ex=document.getElementById('qExplanation');ex.textContent='💡 '+explain;ex.classList.add('show');}
    updScoreBar();document.getElementById('nextQBtn').style.display='inline-block';
}

function nextQ(){quizIdx++;showQ();}
function updScoreBar(){document.getElementById('qC').textContent=qC;document.getElementById('qW').textContent=qW;const t=qC+qW;document.getElementById('qP').textContent=t>0?Math.round((qC/t)*100)+'%':'0%';}

function showRes(){
    document.getElementById('quizBox').style.display='none';document.getElementById('quizResult').style.display='block';
    const t=qC+qW;const pct=t>0?Math.round((qC/t)*100):0;
    document.getElementById('resPct').textContent=pct+'%';document.getElementById('resC').textContent=qC;document.getElementById('resW').textContent=qW;document.getElementById('resT').textContent=t;
    const ring=document.getElementById('resRing');
    if(pct>=80){ring.style.background='linear-gradient(135deg,#10b981,#059669)';document.getElementById('resMsg').textContent='🌟 Excellent, Samuel!';}
    else if(pct>=50){ring.style.background='linear-gradient(135deg,#f59e0b,#d97706)';document.getElementById('resMsg').textContent='👍 Good effort!';}
    else{ring.style.background='linear-gradient(135deg,#ef4444,#dc2626)';document.getElementById('resMsg').textContent='📖 Read more & retry!';}
    stats.quiz++;stats.correct+=qC;stats.answered+=t;localStorage.setItem('sbStats4',JSON.stringify(stats));updateDash();
}

// ============================================
//   SMART FLASHCARDS 🔤
// ============================================
function goFlash(id){showSection('flashcards');setTimeout(()=>{document.getElementById('fcBookSel').value=id;loadFC(id);},100);}

function loadFC(id){
    if(!id)return;const book=books.find(b=>b.id===id);
    if(!book||!book.fullText||book.fullText.length<100){document.getElementById('fcArea').innerHTML='<div class="empty-state"><span>⚠️</span><h3>Not enough text</h3></div>';document.getElementById('fcBox').style.display='none';return;}
    fcs=smartFlashcards(book.fullText);fcI=0;
    if(!fcs.length){document.getElementById('fcArea').innerHTML='<div class="empty-state"><span>⚠️</span><h3>Can\'t generate</h3></div>';document.getElementById('fcBox').style.display='none';return;}
    document.getElementById('fcArea').innerHTML='';document.getElementById('fcBox').style.display='block';
    showFCCard();toast(`${fcs.length} smart flashcards!`,'success');
}

function smartFlashcards(text){
    const cards=[];const clean=text.replace(/\s+/g,' ').trim();
    const sents=clean.split(/[.!?।\n]+/).map(s=>s.trim()).filter(s=>s.length>15&&s.length<250);

    // 1. Find definitions
    const defPat=/(\w[\w\s]{2,30})\s+(?:is|are|was|means|refers to|is defined as|is called|is known as)\s+([^.!?]{10,120})/gi;
    let m;
    while((m=defPat.exec(clean))!==null&&cards.length<8){
        const term=m[1].trim();const def=m[2].trim();
        if(term.length<3||term.length>35||def.length<10)continue;
        cards.push({front:`📌 ${term}`,back:def,cat:'Definition'});
    }

    // 2. Keyword-context cards
    const freq={};const stopWords=new Set(['the','and','for','that','this','with','from','have','been','were','they','their','which','about','would','could','should','these','those','also','into','some','than','then','only','very','more','most','such','each']);
    clean.split(/\s+/).forEach(w=>{const c=w.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g,'');if(c.length>4&&!stopWords.has(c))freq[c]=(freq[c]||0)+1;});
    const kws=Object.entries(freq).filter(([w,c])=>c>=2&&c<=20).sort((a,b)=>b[1]-a[1]).slice(0,30).map(([w])=>w);
    const usedKw=new Set(cards.map(c=>c.front.toLowerCase()));

    for(const s of sents){
        if(cards.length>=20)break;
        for(const k of kws){
            if(usedKw.has(k))continue;
            if(s.toLowerCase().includes(k)){
                cards.push({front:`🔑 ${k.charAt(0).toUpperCase()+k.slice(1)}`,back:s.length>130?s.substring(0,130)+'...':s,cat:'Key Concept'});
                usedKw.add(k);break;
            }
        }
    }

    // 3. Important sentences as summary cards
    if(cards.length<10){
        const important=sents.filter(s=>s.length>30&&s.length<150&&/\b(important|key|main|primary|essential|significant|fundamental|basic|crucial)\b/i.test(s));
        important.slice(0,5).forEach(s=>{
            cards.push({front:'📚 Key Point',back:s,cat:'Summary'});
        });
    }

    return cards.slice(0,20);
}

function showFCCard(){
    if(!fcs.length)return;const c=fcs[fcI];
    document.getElementById('fcF').textContent=c.front;document.getElementById('fcB').textContent=c.back;
    document.getElementById('fcCt').textContent=`${fcI+1} / ${fcs.length}`;
    document.getElementById('fcCard').classList.remove('flipped');
    document.getElementById('fcCategory').innerHTML=`<span>${c.cat||'Card'}</span>`;
    document.getElementById('fcProg').style.width=(((fcI+1)/fcs.length)*100)+'%';
}
function flipFC(){document.getElementById('fcCard').classList.toggle('flipped');}
function nextFC(){fcI=(fcI+1)%fcs.length;showFCCard();}
function prevFC(){fcI=(fcI-1+fcs.length)%fcs.length;showFCCard();}

// ============================================
//   TAMIL 🟢
// ============================================
const tamilWords=[
    {t:'பள்ளி',e:'School',h:'विद्यालय'},{t:'புத்தகம்',e:'Book',h:'किताब'},
    {t:'ஆசிரியர்',e:'Teacher',h:'शिक्षक'},{t:'மாணவன்',e:'Student',h:'छात्र'},
    {t:'கணிதம்',e:'Mathematics',h:'गणित'},{t:'அறிவியல்',e:'Science',h:'विज्ञान'},
    {t:'வரலாறு',e:'History',h:'इतिहास'},{t:'மொழி',e:'Language',h:'भाषा'},
    {t:'நீர்',e:'Water',h:'पानी'},{t:'தீ',e:'Fire',h:'आग'},
    {t:'காற்று',e:'Air/Wind',h:'हवा'},{t:'பூமி',e:'Earth',h:'पृथ्वी'},
    {t:'வானம்',e:'Sky',h:'आकाश'},{t:'மழை',e:'Rain',h:'बारिश'},
    {t:'சூரியன்',e:'Sun',h:'सूर्य'},{t:'நிலா',e:'Moon',h:'चाँद'},
    {t:'அன்பு',e:'Love',h:'प्यार'},{t:'நன்றி',e:'Thank you',h:'धन्यवाद'},
    {t:'வணக்கம்',e:'Hello/Greetings',h:'नमस्ते'},{t:'வீடு',e:'House',h:'घर'},
    {t:'உணவு',e:'Food',h:'भोजन'},{t:'தண்ணீர்',e:'Drinking water',h:'पीने का पानी'},
    {t:'பழம்',e:'Fruit',h:'फल'},{t:'மரம்',e:'Tree',h:'पेड़'},
    {t:'பூ',e:'Flower',h:'फूल'}
];
let tFCI=0;

function showTamilFC(){
    const w=tamilWords[tFCI];
    document.getElementById('tamilFCF').textContent=w.t;
    document.getElementById('tamilFCB').textContent=`${w.e}\n${w.h}`;
    document.getElementById('tamilFCCt').textContent=`${tFCI+1}/${tamilWords.length}`;
    document.getElementById('tamilFC').classList.remove('flipped');
}
function flipTamilFC(){document.getElementById('tamilFC').classList.toggle('flipped');}
function nextTamilFC(){tFCI=(tFCI+1)%tamilWords.length;showTamilFC();}
function prevTamilFC(){tFCI=(tFCI-1+tamilWords.length)%tamilWords.length;showTamilFC();}

// Tamil Quiz
let tqC=0,tqW=0;
const tamilQuiz=[
    {q:'"பள்ளி" என்பதன் ஆங்கில அர்த்தம் என்ன?',o:['Hospital','School','Temple','Market'],a:1},
    {q:'"Water" என்பதன் தமிழ் சொல் என்ன?',o:['தீ','காற்று','நீர்','மண்'],a:2},
    {q:'தமிழ் எழுத்துகளின் மொத்த எண்ணிக்கை?',o:['247','200','300','150'],a:0},
    {q:'உயிர் எழுத்துகள் எத்தனை?',o:['18','12','216','10'],a:1},
    {q:'மெய் எழுத்துகள் எத்தனை?',o:['12','216','20','18'],a:3},
    {q:'"சூரியன்" means?',o:['Moon','Star','Sun','Cloud'],a:2},
    {q:'"ஆசிரியர்" means?',o:['Student','Teacher','Doctor','Farmer'],a:1},
    {q:'எந்த எழுத்து ஆய்த எழுத்து?',o:['அ','க','ஃ','ங'],a:2},
    {q:'"நன்றி" means?',o:['Sorry','Please','Thank you','Welcome'],a:2},
    {q:'"அறிவே ஆற்றல்" means?',o:['Money is power','Knowledge is power','Unity is strength','Health is wealth'],a:1},
    {q:'"வானம்" means?',o:['Earth','Sky','Water','Fire'],a:1},
    {q:'இறந்தகாலம் means?',o:['Future tense','Present tense','Past tense','None'],a:2},
];

function loadTamilQuiz(){
    const idx=Math.floor(Math.random()*tamilQuiz.length);const q=tamilQuiz[idx];
    document.getElementById('tamilQText').textContent=q.q;
    document.getElementById('tamilQFb').textContent='';
    const od=document.getElementById('tamilQOpts');od.innerHTML='';
    q.o.forEach((o,i)=>{const b=document.createElement('button');b.textContent=o;b.onclick=()=>{
        od.querySelectorAll('button').forEach(x=>{x.onclick=null;x.classList.add('disabled');});
        const fb=document.getElementById('tamilQFb');
        if(i===q.a){tqC++;b.classList.add('correct');fb.textContent='✅ சரி! Correct!';fb.style.color='#10b981';}
        else{tqW++;b.classList.add('wrong');od.children[q.a].classList.add('correct');fb.textContent='❌ தவறு! Wrong!';fb.style.color='#ef4444';}
        document.getElementById('tqC').textContent=tqC;document.getElementById('tqW').textContent=tqW;
    };od.appendChild(b);});
}

// ============================================
//   NOTES
// ============================================
function openNoteEd(){editNoteId=null;document.getElementById('noteEd').style.display='block';document.getElementById('nTitle').value='';document.getElementById('nSubject').value='general';document.getElementById('nContent').value='';document.getElementById('nTitle').focus();}
function closeNoteEd(){document.getElementById('noteEd').style.display='none';}

async function saveNote(){
    const title=document.getElementById('nTitle').value.trim();const subject=document.getElementById('nSubject').value;const content=document.getElementById('nContent').value.trim();
    if(!title||!content){toast('Enter title & content!','warning');return;}
    if(editNoteId){const n=notesArr.find(x=>x.id===editNoteId);if(n){n.title=title;n.subject=subject;n.content=content;n.mod=new Date().toLocaleDateString();await dbPut('notes',n);}}
    else{const note={id:'n_'+Date.now(),title,subject,content,date:new Date().toLocaleDateString(),mod:new Date().toLocaleDateString()};notesArr.push(note);await dbPut('notes',note);}
    closeNoteEd();renderNotes();toast('Saved!','success');updStreak();
}

function renderNotes(){
    const c=document.getElementById('notesList');if(!c)return;
    if(!notesArr.length){c.innerHTML='<div class="empty-state"><span>📝</span><h3>No notes</h3><p>Click "+ New" to start!</p></div>';return;}
    c.innerHTML=notesArr.slice().reverse().map(n=>`<div class="note-card" onclick="editNote('${n.id}')"><button class="ndel" onclick="event.stopPropagation();delNote('${n.id}')">✕</button><h4>${n.title}</h4><span class="nt">${emo(n.subject)} ${n.subject}</span><p>${n.content.substring(0,100)}${n.content.length>100?'...':''}</p><span class="nd">📅 ${n.mod||n.date}</span></div>`).join('');
}

function editNote(id){const n=notesArr.find(x=>x.id===id);if(!n)return;editNoteId=id;document.getElementById('noteEd').style.display='block';document.getElementById('nTitle').value=n.title;document.getElementById('nSubject').value=n.subject;document.getElementById('nContent').value=n.content;}
async function delNote(id){if(!confirm('Delete?'))return;await dbDel('notes',id);notesArr=notesArr.filter(x=>x.id!==id);renderNotes();toast('Deleted.','info');}

// ============================================
//   TIMER
// ============================================
let tInt=null,tL=25*60,tT=25*60;
function updTmr(){const m=Math.floor(tL/60).toString().padStart(2,'0');const s=(tL%60).toString().padStart(2,'0');document.getElementById('timerDisplay').textContent=`${m}:${s}`;const r=document.getElementById('timerRing');if(r){r.style.strokeDashoffset=628*(1-tL/tT);}}
function startTimer(){if(tInt)return;updStreak();tInt=setInterval(()=>{if(tL<=0){clearInterval(tInt);tInt=null;toast('⏰ Time up!','success');return;}tL--;updTmr();},1000);}
function pauseTimer(){clearInterval(tInt);tInt=null;}
function resetTimer(){pauseTimer();tL=tT;updTmr();}
function setTimer(m){pauseTimer();tL=m*60;tT=m*60;updTmr();}

// ============================================
//   INIT
// ============================================
window.onload=async function(){
    if(localStorage.getItem('sbTheme')==='dark'){document.body.classList.add('dark-theme');document.querySelector('.theme-toggle').textContent='☀️';}
    showQuote();updTmr();showTamilFC();loadTamilQuiz();
    try{await openDB();books=await dbAll('books');notesArr=await dbAll('notes');console.log(`✅ ${books.length} books, ${notesArr.length} notes`);toast(`Ready! ${books.length} books loaded.`,'success');}
    catch(err){console.error(err);toast('DB error. Refresh page.','error');}
    updateDash();
};
