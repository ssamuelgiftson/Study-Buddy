// =============================================
//  STUDYBUDDY v5 — WORKING PDF + AI HELPER
//  By Samuel Giftson S
// =============================================
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Toast
function T(m,t='info'){const c=document.getElementById('toasts'),d=document.createElement('div');d.className='toast t-'+t;d.textContent=m;c.appendChild(d);setTimeout(()=>d.remove(),4000);}

// DB
const DB='SB5';let db;
function openDB(){return new Promise((ok,no)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=e=>{const d=e.target.result;['books','notes','pdfs'].forEach(s=>{if(!d.objectStoreNames.contains(s))d.createObjectStore(s,{keyPath:'id'});});};r.onsuccess=e=>{db=e.target.result;ok();};r.onerror=no;});}
function dbP(s,d){return new Promise((ok,no)=>{const t=db.transaction(s,'readwrite');t.objectStore(s).put(d);t.oncomplete=ok;t.onerror=no;});}
function dbA(s){return new Promise((ok,no)=>{const t=db.transaction(s,'readonly'),r=t.objectStore(s).getAll();r.onsuccess=()=>ok(r.result);r.onerror=no;});}
function dbD(s,id){return new Promise((ok,no)=>{const t=db.transaction(s,'readwrite');t.objectStore(s).delete(id);t.oncomplete=ok;t.onerror=no;});}
function dbG(s,id){return new Promise((ok,no)=>{const t=db.transaction(s,'readonly'),r=t.objectStore(s).get(id);r.onsuccess=()=>ok(r.result);r.onerror=no;});}

// State
let books=[],notes=[];
let stats=JSON.parse(localStorage.getItem('sb5s'))||{q:0,c:0,a:0,d:null,s:0};
let chosenFile=null;
// Reader
let rdBook=null,rdPage=0,rdZoom=1.2,rdPdf=null;
// Quiz
let qs=[],qi=0,qc=0,qw=0;
// Flashcards
let fc=[],fi=0;
// Notes
let editId=null;
// AI
let aiBookId=null;

// === NAV ===
function go(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById(id).classList.add('active');window.scrollTo(0,0);if(id==='library')renderLib();if(id==='quiz')fillSel('qBook');if(id==='flashcards')fillSel('fcBook');if(id==='helper')fillSel('aiBook');if(id==='notes')renderNotes();}

// === THEME ===
function toggleTheme(){document.body.classList.toggle('dark-theme');document.querySelector('.theme-btn').textContent=document.body.classList.contains('dark-theme')?'☀️':'🌙';localStorage.setItem('sbT',document.body.classList.contains('dark-theme')?'d':'l');}

// === QUOTE ===
const QQ=["\"Education is the most powerful weapon.\" — Mandela","\"Practice makes perfect!\" 💪","\"Believe you can and you're halfway there.\"","\"அறிவே ஆற்றல் — Knowledge is Power\"","\"Reading is exercise for the mind.\"","\"कल करे सो आज कर\"","\"Success = Small daily efforts\"","\"The expert was once a beginner.\""];
function showQ(){const e=document.getElementById('quote');if(e)e.textContent=QQ[new Date().getDate()%QQ.length];}

// === DASHBOARD ===
function emo(s){return{math:'📐',english:'📖',hindi:'📝',tamil:'🟢',science:'🔬',social:'🌍',computer:'💻',other:'📦'}[s]||'📄';}
function clr(s){return{math:'#4f46e5,#7c3aed',english:'#059669,#10b981',hindi:'#db2777,#ec4899',tamil:'#059669,#0d9488',science:'#0891b2,#06b6d4',social:'#d97706,#f59e0b',computer:'#7c3aed,#8b5cf6',other:'#64748b,#94a3b8'}[s]||'#64748b,#94a3b8';}
function dash(){
    const e=i=>document.getElementById(i);
    e('sBooks').textContent=books.length;e('sQuiz').textContent=stats.q;
    e('sScore').textContent=stats.a?Math.round(stats.c/stats.a*100)+'%':'0%';
    e('sStreak').textContent=stats.s;
    const h=document.getElementById('homeBooks');
    if(!books.length){h.innerHTML='<p class="muted">No books yet — upload your first PDF!</p>';return;}
    h.innerHTML=books.slice(-5).reverse().map(b=>`<div class="hbook" onclick="openRd('${b.id}')"><h4>${emo(b.sub)} ${b.title}</h4><p>${b.pages}p · ${b.date}</p></div>`).join('');
}
function streak(){const d=new Date().toDateString();if(stats.d!==d){const y=new Date();y.setDate(y.getDate()-1);stats.s=stats.d===y.toDateString()?stats.s+1:1;stats.d=d;localStorage.setItem('sb5s',JSON.stringify(stats));}}

// ============================================
//  UPLOAD
// ============================================
function openUpload(){document.getElementById('upModal').classList.add('show');upReset();const seen=localStorage.getItem('sbTut');if(seen)document.getElementById('upTut').style.display='none';}
function closeUpload(){document.getElementById('upModal').classList.remove('show');}
function upReset(){document.getElementById('upS1').style.display='block';document.getElementById('upS2').style.display='none';document.getElementById('upProg').style.display='none';document.getElementById('fileInp').value='';chosenFile=null;}

function onFile(e){
    const f=e.target.files[0];if(!f)return;
    if(f.type!=='application/pdf'){T('Select a PDF!','err');return;}
    chosenFile=f;
    document.getElementById('upS1').style.display='none';document.getElementById('upS2').style.display='block';
    document.getElementById('upFN').textContent=f.name;document.getElementById('upFS').textContent=(f.size/1048576).toFixed(1)+'MB';
    document.getElementById('upTitle').value=f.name.replace('.pdf','').replace(/[_-]+/g,' ');
    document.getElementById('upSubj').value='';T('File selected!','info');
    localStorage.setItem('sbTut','1');
}

async function doUpload(){
    const title=document.getElementById('upTitle').value.trim(),sub=document.getElementById('upSubj').value,auth=document.getElementById('upAuth').value.trim();
    if(!title){T('Enter title!','warn');return;}if(!sub){T('Pick subject!','warn');return;}if(!chosenFile){T('No file!','err');return;}
    const btn=document.getElementById('upBtn');btn.disabled=true;btn.textContent='⏳...';
    document.getElementById('upProg').style.display='block';
    const fill=document.getElementById('upFill'),stat=document.getElementById('upStat');
    fill.style.width='0%';fill.style.background='';
    try{
        const ab=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsArrayBuffer(chosenFile);});
        stat.textContent='Loading PDF...';fill.style.width='10%';
        const pdf=await pdfjsLib.getDocument({data:ab}).promise;
        const n=pdf.numPages;let full='';const pts=[];
        for(let i=1;i<=n;i++){
            try{const pg=await pdf.getPage(i);const tc=await pg.getTextContent();const t=tc.items.map(x=>x.str).join(' ').trim();pts.push(t||'');full+=t+'\n\n';}
            catch(pe){pts.push('');}
            fill.style.width=(10+Math.round(i/n*70))+'%';stat.textContent=`Page ${i}/${n}...`;
        }
        fill.style.width='85%';stat.textContent='Saving...';
        const clean=full.replace(/\s+/g,' ').trim();
        const pdfId='pdf_'+Date.now();
        await dbP('pdfs',{id:pdfId,data:ab});
        const book={id:'b_'+Date.now(),title,sub,auth:auth||'Unknown',pages:n,pts,text:clean.substring(0,600000),date:new Date().toLocaleDateString(),pdfId,tl:clean.length};
        await dbP('books',book);books.push(book);
        fill.style.width='100%';stat.textContent='✅ Done!';
        streak();dash();T(`"${title}" uploaded! ${n} pages.`,'ok');
        setTimeout(()=>{closeUpload();go('library');},600);
    }catch(err){console.error(err);T('Error: '+err.message,'err');stat.textContent='❌'+err.message;fill.style.background='#ef4444';}
    finally{btn.disabled=false;btn.textContent='📤 Upload & Process';}
}

// Drag drop
document.addEventListener('DOMContentLoaded',()=>{const z=document.getElementById('dropzone');if(!z)return;z.ondragover=e=>{e.preventDefault();z.classList.add('drag');};z.ondragleave=()=>z.classList.remove('drag');z.ondrop=e=>{e.preventDefault();z.classList.remove('drag');const f=e.dataTransfer.files[0];if(f&&f.type==='application/pdf'){chosenFile=f;document.getElementById('upS1').style.display='none';document.getElementById('upS2').style.display='block';document.getElementById('upFN').textContent=f.name;document.getElementById('upFS').textContent=(f.size/1048576).toFixed(1)+'MB';document.getElementById('upTitle').value=f.name.replace('.pdf','').replace(/[_-]+/g,' ');T('Dropped!','info');}else T('Drop a PDF!','err');};});

// ============================================
//  LIBRARY
// ============================================
function renderLib(f='all'){
    const g=document.getElementById('libGrid');
    const ls=f==='all'?books:books.filter(b=>b.sub===f);
    if(!ls.length){g.innerHTML=`<div class="empty"><span>📚</span><p>${f==='all'?'Empty library':'No '+f+' books'}</p><button class="btn accent" onclick="openUpload()">📤 Upload</button></div>`;return;}
    g.innerHTML=ls.map(b=>`<div class="bcard"><div class="bc-top" style="background:linear-gradient(135deg,${clr(b.sub)})"><span class="bc-badge">${emo(b.sub)}</span><h3>${b.title}</h3><p>${b.auth}</p></div><div class="bc-bot"><div class="bc-meta"><span>📄${b.pages}p</span><span>${b.date}</span></div><div class="bc-acts"><button class="btn sm b-read" onclick="openRd('${b.id}')">📖Read</button><button class="btn sm b-quiz" onclick="goQuiz('${b.id}')">🧠Quiz</button><button class="btn sm b-fc" onclick="goFC('${b.id}')">🔤Cards</button><button class="btn sm b-del" onclick="delBook('${b.id}')">🗑️Delete</button></div></div></div>`).join('');
}
function fil(f,btn){document.querySelectorAll('.fil').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderLib(f);}
async function delBook(id){if(!confirm('🗑️ Delete this book permanently?'))return;const b=books.find(x=>x.id===id);if(b&&b.pdfId)try{await dbD('pdfs',b.pdfId);}catch(e){}await dbD('books',id);books=books.filter(x=>x.id!==id);renderLib();dash();T('Book deleted','info');}

// ============================================
//  READER — REAL PDF PAGES WITH PICTURES! 📸
// ============================================
async function openRd(id){
    let b=books.find(x=>x.id===id);if(!b){T('Not found!','err');return;}
    rdBook=b;rdPage=0;rdZoom=1.2;rdPdf=null;go('reader');
    document.getElementById('rdTitle').textContent='📖 '+b.title;
    const area=document.getElementById('rdArea');
    area.innerHTML='<div class="empty"><span>⏳</span><p>Loading book...</p></div>';
    try{
        const pd=await dbG('pdfs',b.pdfId);
        if(pd&&pd.data){rdPdf=await pdfjsLib.getDocument({data:pd.data}).promise;
            const sel=document.getElementById('rdJump');sel.innerHTML='';
            for(let i=1;i<=rdPdf.numPages;i++){const o=document.createElement('option');o.value=i-1;o.textContent='Page '+i;sel.appendChild(o);}
            await renderPg();T('Book loaded with pictures!','ok');
        }else{renderTxt();}
    }catch(err){console.warn(err);renderTxt();}
}
async function renderPg(){
    if(!rdPdf){renderTxt();return;}
    const area=document.getElementById('rdArea');area.innerHTML='';
    try{
        const pg=await rdPdf.getPage(rdPage+1);const vp=pg.getViewport({scale:rdZoom});
        const cv=document.createElement('canvas');cv.className='pdf-canvas';cv.width=vp.width;cv.height=vp.height;
        await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
        area.appendChild(cv);
    }catch(e){renderTxt();}
    document.getElementById('rdInfo').textContent=`${rdPage+1}/${rdBook.pages}`;document.getElementById('rdJump').value=rdPage;
}
function renderTxt(){const area=document.getElementById('rdArea');area.innerHTML=`<div style="padding:16px;white-space:pre-wrap;line-height:1.7;font-size:.88rem;max-width:100%;word-break:break-word;">${rdBook.pts[rdPage]||'No text on this page.'}</div>`;document.getElementById('rdInfo').textContent=`${rdPage+1}/${rdBook.pages}`;}
async function rdNext(){if(rdBook&&rdPage<rdBook.pages-1){rdPage++;rdPdf?await renderPg():renderTxt();}}
async function rdPrev(){if(rdBook&&rdPage>0){rdPage--;rdPdf?await renderPg():renderTxt();}}
async function rdGo(p){rdPage=p;rdPdf?await renderPg():renderTxt();}
async function rdZoom(d){rdZoom=Math.max(.5,Math.min(3,rdZoom+d*.2));if(rdPdf)await renderPg();}

// ============================================
//  QUIZ — CHAPTER/PAGE SELECTION + SMART AI
// ============================================
function fillSel(id){const s=document.getElementById(id);if(!s)return;const v=s.value;s.innerHTML='<option value="">-- Pick Book --</option>';books.forEach(b=>{const o=document.createElement('option');o.value=b.id;o.textContent=`${emo(b.sub)} ${b.title}`;s.appendChild(o);});s.value=v;}
function goQuiz(id){go('quiz');setTimeout(()=>{document.getElementById('qBook').value=id;onQuizBookChange();},100);}

function onQuizBookChange(){
    const id=document.getElementById('qBook').value;
    const setup=document.getElementById('chapterSetup');
    if(!id){setup.style.display='none';return;}
    const b=books.find(x=>x.id===id);if(!b){setup.style.display='none';return;}
    setup.style.display='block';
    document.getElementById('qFrom').value=1;document.getElementById('qFrom').max=b.pages;
    document.getElementById('qTo').value=Math.min(b.pages,10);document.getElementById('qTo').max=b.pages;
}

function startQuiz(){
    const id=document.getElementById('qBook').value;if(!id){T('Pick a book!','warn');return;}
    const b=books.find(x=>x.id===id);if(!b){T('Not found!','err');return;}
    const from=Math.max(1,+document.getElementById('qFrom').value)-1;
    const to=Math.min(b.pages,+document.getElementById('qTo').value);
    const count=+document.getElementById('qCount').value;
    if(from>=to){T('Invalid page range!','warn');return;}

    // Get text for selected pages only
    const chapterText=b.pts.slice(from,to).join(' ').replace(/\s+/g,' ').trim();
    if(chapterText.length<80){T('Not enough text in these pages. Try a wider range.','warn');return;}

    qs=makeQs(chapterText,count);qi=0;qc=0;qw=0;
    if(!qs.length){T('Couldn\'t make questions from these pages.','warn');return;}

    document.getElementById('quizSetup').style.display='none';
    document.getElementById('quizPlay').style.display='block';
    document.getElementById('quizDone').style.display='none';
    showQQ();streak();T(`${qs.length} questions from pages ${from+1}-${to}!`,'ok');
}

function makeQs(text,count){
    const res=[];
    const sents=text.split(/[.!?।\n]+/).map(s=>s.trim()).filter(s=>s.length>20&&s.length<260&&/[a-zA-Z\u0900-\u097F]{3}/.test(s));
    if(sents.length<3)return[];

    const stop=new Set('the and for that this with from have been were they their which about would could should these those also into some than then only very more most such each because between through during without another being having does will just over under both same many much while since until upon here still even well back down like make made know take come give look find want tell good great first last long little around every never might shall'.split(' '));
    const freq={};text.split(/\s+/).forEach(w=>{const c=w.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g,'');if(c.length>3&&!stop.has(c))freq[c]=(freq[c]||0)+1;});
    const kw=Object.entries(freq).filter(([w,c])=>c>=2&&c<=25&&w.length>3).sort((a,b)=>b[1]-a[1]).slice(0,50).map(([w])=>w);
    const used=new Set();

    // 1. Definitions
    const dp=/(\w[\w\s]{2,28})\s+(?:is|are|was|means|refers to|is defined as|is called|is known as)\s+([^.!?]{10,120})/gi;
    let m;while((m=dp.exec(text))&&res.length<Math.ceil(count*.3)){
        const term=m[1].trim(),def=m[2].trim().split(/[.!?]/)[0];
        if(term.length<3||def.length<8||used.has(term.toLowerCase()))continue;used.add(term.toLowerCase());
        const wd=sents.filter(s=>!s.toLowerCase().includes(term.toLowerCase())&&s.length>12).sort(()=>Math.random()-.5).slice(0,3).map(s=>s.length>80?s.substring(0,80)+'...':s);
        if(wd.length<3)continue;const ca=def.length>80?def.substring(0,80)+'...':def;
        const opts=[ca,...wd].sort(()=>Math.random()-.5);
        res.push({q:`What is "${term}"?`,o:opts,a:opts.indexOf(ca),t:'Definition',ex:`${term}: ${def}`});
    }

    // 2. Fill blank
    for(const s of sents){
        if(res.length>=Math.ceil(count*.6)||used.has(s))continue;
        const words=s.split(/\s+/);if(words.length<5)continue;
        let bw=null,bi=-1,bs=0;
        for(let j=1;j<words.length-1;j++){const c=words[j].toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g,'');if(kw.includes(c)&&(freq[c]||0)>bs){bw=words[j];bi=j;bs=freq[c];}}
        if(!bw)continue;used.add(s);
        const blank=words.map((w,i)=>i===bi?'________':w).join(' ');
        const ct=bw.replace(/[^a-zA-Z\u0900-\u097F\s]/g,'');
        const wr=kw.filter(w=>w!==ct.toLowerCase()&&Math.abs(w.length-ct.length)<4).sort(()=>Math.random()-.5).slice(0,3);
        if(wr.length<3)continue;
        const opts=[ct,...wr].sort(()=>Math.random()-.5);
        res.push({q:`Fill in the blank:\n\n"${blank}"`,o:opts,a:opts.indexOf(ct),t:'Fill in Blank',ex:`Answer: ${ct}\n\n"${s}"`});
    }

    // 3. True/False
    for(const s of sents){
        if(res.length>=Math.ceil(count*.85)||used.has(s)||s.length>160||Math.random()>.5)continue;used.add(s);
        const isT=Math.random()>.4;let disp=s;
        if(!isT){const w=s.split(/\s+/);for(let i=1;i<w.length-1;i++){const c=w[i].toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g,'');
        if(kw.includes(c)&&c.length>4){const rep=kw.find(k=>k!==c);if(rep){w[i]=rep;break;}}}disp=w.join(' ');}
        res.push({q:`True or False?\n\n"${disp}"`,o:['True ✅','False ❌'],a:isT?0:1,t:'True/False',ex:isT?'This is correct as stated in the text.':`Original: "${s}"`});
    }

    // 4. Comprehension
    for(let i=0;i<5&&res.length<count;i++){
        const s=sents[Math.floor(Math.random()*sents.length)];if(used.has(s)||s.length>120)continue;used.add(s);
        const prev=s.length>70?s.substring(0,70)+'...':s;
        const wr=['Not mentioned in the text','Belongs to a different chapter','The book doesn\'t discuss this'];
        const opts=[prev,...wr].sort(()=>Math.random()-.5);
        res.push({q:'Which is from your book?',o:opts,a:opts.indexOf(prev),t:'Comprehension',ex:`Found: "${s}"`});
    }

    return res.sort(()=>Math.random()-.5).slice(0,count);
}

function showQQ(){
    if(qi>=qs.length){showQRes();return;}
    const q=qs[qi];
    document.getElementById('qProg').style.width=(qi/qs.length*100)+'%';
    document.getElementById('qProgT').textContent=`Q${qi+1}/${qs.length}`;
    document.getElementById('qBadge').textContent=q.t;
    document.getElementById('qText').textContent=q.q;
    document.getElementById('qFb').textContent='';
    const ex=document.getElementById('qExp');ex.textContent='';ex.classList.remove('show');
    document.getElementById('qNext').style.display='none';
    const od=document.getElementById('qOpts');od.innerHTML='';
    q.o.forEach((o,i)=>{const b=document.createElement('button');b.textContent=o;b.onclick=()=>pickQ(i,q.a,b,q.ex);od.appendChild(b);});
    updQS();
}

function pickQ(pick,ans,btn,ex){
    document.getElementById('qOpts').querySelectorAll('button').forEach(b=>{b.onclick=null;b.classList.add('dis');});
    const fb=document.getElementById('qFb');
    if(pick===ans){qc++;btn.classList.add('correct');fb.textContent='✅ Correct!';fb.style.color='var(--ok)';}
    else{qw++;btn.classList.add('wrong');document.getElementById('qOpts').children[ans].classList.add('correct');fb.textContent='❌ Wrong!';fb.style.color='var(--e)';}
    if(ex){const el=document.getElementById('qExp');el.textContent='💡 '+ex;el.classList.add('show');}
    updQS();document.getElementById('qNext').style.display='inline-block';
}
function quizNext(){qi++;showQQ();}
function updQS(){document.getElementById('qcC').textContent=qc;document.getElementById('qcW').textContent=qw;const t=qc+qw;document.getElementById('qcP').textContent=t?Math.round(qc/t*100)+'%':'0%';}

function showQRes(){
    document.getElementById('quizPlay').style.display='none';document.getElementById('quizDone').style.display='block';
    const t=qc+qw,p=t?Math.round(qc/t*100):0;
    document.getElementById('resPct').textContent=p+'%';document.getElementById('rfC').textContent=qc;document.getElementById('rfW').textContent=qw;document.getElementById('rfT').textContent=t;
    const r=document.getElementById('resRing');
    r.style.background=p>=80?'linear-gradient(135deg,#10b981,#059669)':p>=50?'linear-gradient(135deg,#f59e0b,#d97706)':'linear-gradient(135deg,#ef4444,#dc2626)';
    document.getElementById('resMsg').textContent=p>=80?'🌟 Excellent!':p>=50?'👍 Good effort!':'📖 Read more!';
    stats.q++;stats.c+=qc;stats.a+=t;localStorage.setItem('sb5s',JSON.stringify(stats));dash();
}

// ============================================
//  FLASHCARDS
// ============================================
function goFC(id){go('flashcards');setTimeout(()=>{document.getElementById('fcBook').value=id;fcLoad(id);},100);}
function fcLoad(id){
    if(!id)return;const b=books.find(x=>x.id===id);
    if(!b||!b.text||b.text.length<80){document.getElementById('fcArea').innerHTML='<div class="empty"><span>⚠️</span><p>Not enough text</p></div>';document.getElementById('fcBox').style.display='none';return;}
    fc=makeFC(b.text);fi=0;
    if(!fc.length){document.getElementById('fcArea').innerHTML='<div class="empty"><span>⚠️</span><p>Can\'t generate</p></div>';document.getElementById('fcBox').style.display='none';return;}
    document.getElementById('fcArea').innerHTML='';document.getElementById('fcBox').style.display='block';fcShow();T(fc.length+' cards!','ok');
}
function makeFC(text){
    const cards=[];const sents=text.split(/[.!?।\n]+/).map(s=>s.trim()).filter(s=>s.length>15&&s.length<200);
    // Definitions
    const dp=/(\w[\w\s]{2,28})\s+(?:is|are|was|means|refers to|is defined as|is called|is known as)\s+([^.!?]{8,100})/gi;
    let m;while((m=dp.exec(text))&&cards.length<10){cards.push({f:'📌 '+m[1].trim(),b:m[2].trim(),c:'Definition'});}
    // Keywords
    const freq={};text.split(/\s+/).forEach(w=>{const c=w.toLowerCase().replace(/[^a-zA-Z\u0900-\u097F]/g,'');if(c.length>4)freq[c]=(freq[c]||0)+1;});
    const kw=Object.entries(freq).filter(([,c])=>c>=2&&c<=15).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([w])=>w);
    const used=new Set(cards.map(c=>c.f));
    for(const s of sents){if(cards.length>=20)break;for(const k of kw){if(used.has(k))continue;if(s.toLowerCase().includes(k)){cards.push({f:'🔑 '+k.charAt(0).toUpperCase()+k.slice(1),b:s.length>120?s.substring(0,120)+'...':s,c:'Key Concept'});used.add(k);break;}}}
    return cards;
}
function fcShow(){if(!fc.length)return;const c=fc[fi];document.getElementById('fcF').textContent=c.f;document.getElementById('fcB').textContent=c.b;document.getElementById('fcCt').textContent=`${fi+1}/${fc.length}`;document.getElementById('fcCard').classList.remove('flipped');document.getElementById('fcCat').innerHTML=`<span>${c.c||''}</span>`;}
function fcFlip(){document.getElementById('fcCard').classList.toggle('flipped');}
function fcNext(){fi=(fi+1)%fc.length;fcShow();}
function fcPrev(){fi=(fi-1+fc.length)%fc.length;fcShow();}

// ============================================
//  TAMIL
// ============================================
const TW=[{t:'பள்ளி',e:'School'},{t:'புத்தகம்',e:'Book'},{t:'ஆசிரியர்',e:'Teacher'},{t:'மாணவன்',e:'Student'},{t:'கணிதம்',e:'Maths'},{t:'அறிவியல்',e:'Science'},{t:'வரலாறு',e:'History'},{t:'நீர்',e:'Water'},{t:'தீ',e:'Fire'},{t:'காற்று',e:'Wind'},{t:'பூமி',e:'Earth'},{t:'வானம்',e:'Sky'},{t:'மழை',e:'Rain'},{t:'சூரியன்',e:'Sun'},{t:'நிலா',e:'Moon'},{t:'அன்பு',e:'Love'},{t:'நன்றி',e:'Thanks'},{t:'வணக்கம்',e:'Hello'},{t:'வீடு',e:'House'},{t:'உணவு',e:'Food'},{t:'மரம்',e:'Tree'},{t:'பூ',e:'Flower'},{t:'பழம்',e:'Fruit'},{t:'கடல்',e:'Sea'},{t:'மலை',e:'Mountain'}];
let tfi=0;
function tFCShow(){document.getElementById('tFCF').textContent=TW[tfi].t;document.getElementById('tFCB').textContent=TW[tfi].e;document.getElementById('tFCCt').textContent=`${tfi+1}/${TW.length}`;document.getElementById('tFC').classList.remove('flipped');}
function tFCFlip(){document.getElementById('tFC').classList.toggle('flipped');}
function tFCNext(){tfi=(tfi+1)%TW.length;tFCShow();}
function tFCPrev(){tfi=(tfi-1+TW.length)%TW.length;tFCShow();}

let tqc=0,tqw=0;
const TQ=[{q:'"பள்ளி" means?',o:['Hospital','School','Temple','Market'],a:1},{q:'"Water" in Tamil?',o:['தீ','காற்று','நீர்','மண்'],a:2},{q:'Tamil letters total?',o:['247','200','300','150'],a:0},{q:'Vowels count?',o:['18','12','216','10'],a:1},{q:'Consonants count?',o:['12','216','20','18'],a:3},{q:'"சூரியன்" means?',o:['Moon','Star','Sun','Cloud'],a:2},{q:'"ஆசிரியர்" means?',o:['Student','Teacher','Doctor','Farmer'],a:1},{q:'ஆய்த எழுத்து?',o:['அ','க','ஃ','ங'],a:2},{q:'"நன்றி" means?',o:['Sorry','Please','Thank you','Welcome'],a:2},{q:'"அறிவே ஆற்றல்" means?',o:['Money=power','Knowledge=power','Unity=strength','Health=wealth'],a:1},{q:'"வானம்" means?',o:['Earth','Sky','Water','Fire'],a:1},{q:'Past tense in Tamil?',o:['எதிர்காலம்','நிகழ்காலம்','இறந்தகாலம்','None'],a:2}];
function tQuiz(){
    const q=TQ[Math.floor(Math.random()*TQ.length)];
    document.getElementById('tqText').textContent=q.q;document.getElementById('tqFb').textContent='';
    const od=document.getElementById('tqOpts');od.innerHTML='';
    q.o.forEach((o,i)=>{const b=document.createElement('button');b.textContent=o;b.onclick=()=>{
        od.querySelectorAll('button').forEach(x=>{x.onclick=null;x.classList.add('dis');});
        const fb=document.getElementById('tqFb');
        if(i===q.a){tqc++;b.classList.add('correct');fb.textContent='✅ சரி!';fb.style.color='var(--ok)';}
        else{tqw++;b.classList.add('wrong');od.children[q.a].classList.add('correct');fb.textContent='❌ தவறு!';fb.style.color='var(--e)';}
        document.getElementById('tqC').textContent=tqc;document.getElementById('tqW').textContent=tqw;
    };od.appendChild(b);});
}

// ============================================
//  AI STUDY HELPER 🤖
// ============================================
function aiSetBook(id){aiBookId=id;if(id){const b=books.find(x=>x.id===id);if(b)addChat('bot',`📘 Loaded "${b.title}" (${b.pages} pages). Ask me anything about it!`);}}

function aiSend(){
    const inp=document.getElementById('chatInput');const q=inp.value.trim();if(!q)return;inp.value='';
    addChat('user',q);

    if(!aiBookId){addChat('bot','⚠️ Please select a book first using the dropdown above!');return;}
    const b=books.find(x=>x.id===aiBookId);
    if(!b){addChat('bot','❌ Book not found!');return;}

    // Search the book
    const results=searchBook(b,q);

    if(results.length>0){
        let response='📖 Here\'s what I found in your book:\n\n';
        results.forEach((r,i)=>{response+=`<div class="found-text"><b>📌 Match ${i+1}:</b><br>${r}</div>`;});
        response+='<br>💡 <b>Tip:</b> Try asking more specific questions for better results!';
        addChat('bot',response,true);
    }else{
        // Try to give helpful response based on query
        let response=getHelpfulResponse(q,b);
        addChat('bot',response,true);
    }
}

function searchBook(book,query){
    const results=[];const qWords=query.toLowerCase().split(/\s+/).filter(w=>w.length>2);
    const sents=book.text.split(/[.!?।\n]+/).map(s=>s.trim()).filter(s=>s.length>15);

    // Score each sentence
    const scored=sents.map(s=>{
        const lower=s.toLowerCase();
        let score=0;
        qWords.forEach(w=>{
            if(lower.includes(w))score+=2;
            // Partial match
            if(w.length>4){const partial=w.substring(0,Math.ceil(w.length*.7));if(lower.includes(partial))score+=1;}
        });
        return{s,score};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);

    // Return top matches
    scored.slice(0,3).forEach(x=>{
        const highlight=x.s.length>200?x.s.substring(0,200)+'...':x.s;
        results.push(highlight);
    });
    return results;
}

function getHelpfulResponse(query,book){
    const q=query.toLowerCase();

    if(q.includes('summarize')||q.includes('summary')){
        const firstPage=book.pts[0]||'';
        const summary=firstPage.length>300?firstPage.substring(0,300)+'...':firstPage;
        return `📝 Here's the beginning of your book:\n<div class="found-text">${summary}</div>\n💡 For a specific page summary, try: "summarize page 5"`;
    }

    if(q.includes('page')){
        const pageMatch=q.match(/page\s*(\d+)/i);
        if(pageMatch){
            const pg=parseInt(pageMatch[1])-1;
            if(pg>=0&&pg<book.pts.length){
                const text=book.pts[pg];
                const preview=text.length>300?text.substring(0,300)+'...':text;
                return `📄 Page ${pg+1}:\n<div class="found-text">${preview||'No readable text on this page.'}</div>`;
            }
        }
    }

    if(q.includes('how many pages')||q.includes('pages')){
        return `📚 "${book.title}" has <b>${book.pages} pages</b> and approximately <b>${Math.round(book.tl/5)} words</b>.`;
    }

    // Default
    return `🤔 I couldn't find a direct match for "${query}" in your book.\n\n💡 Try:\n• More specific keywords\n• "What is [concept]?"\n• "Summarize page [number]"\n• "Find [topic]"\n\n📖 Your book has ${book.pages} pages with ${Math.round(book.tl/5)} words to search through!`;
}

function addChat(who,msg,isHTML=false){
    const box=document.getElementById('chatBox');
    const div=document.createElement('div');div.className='chat-msg '+who;
    div.innerHTML=`<div class="chat-av">${who==='bot'?'🤖':'👤'}</div><div class="chat-bubble">${isHTML?msg:msg.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>`;
    box.appendChild(div);box.scrollTop=box.scrollHeight;
}

// ============================================
//  NOTES
// ============================================
function noteNew(){editId=null;document.getElementById('noteEd').style.display='block';document.getElementById('ntTitle').value='';document.getElementById('ntSubj').value='general';document.getElementById('ntBody').value='';document.getElementById('ntTitle').focus();}
function noteCancel(){document.getElementById('noteEd').style.display='none';}
async function noteSave(){
    const t=document.getElementById('ntTitle').value.trim(),s=document.getElementById('ntSubj').value,c=document.getElementById('ntBody').value.trim();
    if(!t||!c){T('Enter title & content!','warn');return;}
    if(editId){const n=notes.find(x=>x.id===editId);if(n){n.title=t;n.sub=s;n.body=c;n.mod=new Date().toLocaleDateString();await dbP('notes',n);}}
    else{const n={id:'n_'+Date.now(),title:t,sub:s,body:c,date:new Date().toLocaleDateString(),mod:new Date().toLocaleDateString()};notes.push(n);await dbP('notes',n);}
    noteCancel();renderNotes();T('Saved!','ok');
}
function renderNotes(){
    const c=document.getElementById('noteList');
    if(!notes.length){c.innerHTML='<div class="empty"><span>📝</span><p>No notes yet</p></div>';return;}
    c.innerHTML=notes.slice().reverse().map(n=>`<div class="ncard" onclick="noteEdit('${n.id}')"><button class="ndel" onclick="event.stopPropagation();noteDel('${n.id}')">✕</button><h4>${n.title}</h4><span class="nt">${emo(n.sub)} ${n.sub}</span><p>${n.body.substring(0,90)}${n.body.length>90?'...':''}</p><span class="nd">📅${n.mod||n.date}</span></div>`).join('');
}
function noteEdit(id){const n=notes.find(x=>x.id===id);if(!n)return;editId=id;document.getElementById('noteEd').style.display='block';document.getElementById('ntTitle').value=n.title;document.getElementById('ntSubj').value=n.sub;document.getElementById('ntBody').value=n.body;}
async function noteDel(id){if(!confirm('Delete note?'))return;await dbD('notes',id);notes=notes.filter(x=>x.id!==id);renderNotes();T('Deleted','info');}

// ============================================
//  TIMER
// ============================================
let tI=null,tL=1500,tT=1500;
function tmrUpd(){const m=Math.floor(tL/60).toString().padStart(2,'0'),s=(tL%60).toString().padStart(2,'0');document.getElementById('tmrTxt').textContent=m+':'+s;const r=document.getElementById('tmrRing');if(r)r.style.strokeDashoffset=565*(1-tL/tT);}
function tmrStart(){if(tI)return;streak();tI=setInterval(()=>{if(tL<=0){clearInterval(tI);tI=null;T('⏰ Time up!','ok');return;}tL--;tmrUpd();},1000);}
function tmrPause(){clearInterval(tI);tI=null;}
function tmrReset(){tmrPause();tL=tT;tmrUpd();}
function tmrSet(m){tmrPause();tL=m*60;tT=m*60;tmrUpd();}

// ============================================
//  INIT
// ============================================
window.onload=async function(){
    if(localStorage.getItem('sbT')==='d'){document.body.classList.add('dark-theme');document.querySelector('.theme-btn').textContent='☀️';}
    showQ();tmrUpd();tFCShow();tQuiz();
    try{await openDB();books=await dbA('books');notes=await dbA('notes');T(`Ready! ${books.length} books loaded.`,'ok');}
    catch(e){console.error(e);T('DB error — refresh page','err');}
    dash();
};
