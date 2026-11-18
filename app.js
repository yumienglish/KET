/* KET Adventure – giao diện, chấm điểm, làm lại câu sai, ghi âm, gửi bài */
'use strict';

/* ============ TIỆN ÍCH ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const alts = k => String(k || '').split('|').map(x => x.trim()).filter(Boolean);
const ia = 'autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"';
const fmtSec = s => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtDur = s => { s = Math.max(0, Math.round(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ' giờ ' : '') + (h || m ? m + ' phút ' : '') + (s % 60) + ' giây'; };
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

// Từ mới: {{khoá}} hoặc {{khoá|chữ hiển thị}} → nút bấm xem nghĩa
const vt = s => String(s || '').replace(/\{\{([^}|]+)(?:\|([^}]+))?\}\}/g, (_, k, shown) =>
  VOCAB[k] ? `<button type="button" class="vw" data-v="${esc(k)}">${esc(shown || k)}</button>` : esc(shown || k));
const plain = s => String(s || '').replace(/\{\{([^}|]+)(?:\|([^}]+))?\}\}/g, (_, k, shown) => shown || k).replace(/<[^>]+>/g, '');

// Chấm câu trả lời chữ: bỏ hoa/thường, dấu câu, khoảng trắng; đổi số chữ → số; bỏ các từ mở đầu như "they", "she's", "because"
const NUMW = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
const FILL = /^(because|cos|they|he|she|it|is|are|s|re|the|a|an|go|goes|meet|meets) /;
function norm(s){
  s = String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘`]/g, "'");
  s = s.replace(/'/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.split(' ').map(w => NUMW[w] != null ? String(NUMW[w]) : w).join(' ');
  let prev; do { prev = s; s = s.replace(FILL, ''); } while (s !== prev);
  s = s.replace(/ (years old|year old|years)$/, '');
  return s.replace(/ /g, '');
}
const letters = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

/* ============ TỪ MỚI: bong bóng nghĩa + phát âm ============ */
let VOICE = null;
function pickVoice(){
  try {
    const vs = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
    VOICE = vs.find(v => /^en[-_]GB/i.test(v.lang) && /female|libby|sonia|serena|kate|hazel|google uk english female/i.test(v.name)) ||
      vs.find(v => /^en[-_]GB/i.test(v.lang)) || vs.find(v => /^en[-_]US/i.test(v.lang)) || vs[0] || null;
  } catch (e) {}
}
if ('speechSynthesis' in window){ pickVoice(); try { speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {} }
function say(text){
  try {
    if (!('speechSynthesis' in window) || !text) return;
    speechSynthesis.cancel(); try { speechSynthesis.resume(); } catch (e) {}
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE ? VOICE.lang : 'en-GB'; if (VOICE) u.voice = VOICE; u.rate = .85;
    speechSynthesis.speak(u);
  } catch (e) {}
}
function showPop(btn){
  const v = VOCAB[btn.dataset.v]; if (!v) return;
  const p = $('#pop');
  p.innerHTML = `<div class="pw"><b>${esc(v.w)}</b> <button type="button" class="say" aria-label="Nghe lại">🔊</button></div>
    <div class="pi">${esc(v.ipa || '')}</div><div class="pv">${esc(v.vi)}</div>`;
  p.hidden = false;
  const r = btn.getBoundingClientRect(), pw = Math.min(280, window.innerWidth - 24);
  p.style.width = pw + 'px';
  let left = r.left + r.width / 2 - pw / 2 + window.scrollX;
  left = Math.max(12 + window.scrollX, Math.min(left, window.scrollX + window.innerWidth - pw - 12));
  p.style.left = left + 'px';
  const h = p.offsetHeight;
  const below = r.bottom + 8 + h < window.innerHeight || r.top < h + 16;
  p.style.top = (below ? r.bottom + 8 : r.top - h - 8) + window.scrollY + 'px';
  $('.say', p).onclick = () => say(v.w);
  say(v.w);
}
const hidePop = () => { const p = $('#pop'); if (p) p.hidden = true; };
document.addEventListener('click', e => {
  const b = e.target.closest('.vw');
  if (b){ e.preventDefault(); e.stopPropagation(); showPop(b); return; }
  if (!e.target.closest('#pop')) hidePop();
}, true);
window.addEventListener('resize', hidePop);

/* ============ ĐIỀU HƯỚNG ============ */
const WEEK_NO = parseInt(new URLSearchParams(location.search).get('w'), 10);
const LESSON = WEEK_NO && WEEK_NO <= OPEN_WEEK ? LESSONS[WEEK_NO] : null;
const ME_KEY = 'ket-me';
const storeKey = w => 'ket-w' + w;

// Câu chào trang chủ: mỗi lần mở đổi 1 câu (không lặp lại câu lần trước)
const HI_LINES = [
  'Every new word is a new superpower. 💪',
  'Your brain loves new words. Let’s feed it! 🧠',
  'Small steps every week = BIG English! 🚀',
  'Mistakes mean you’re trying. Keep going! 🌱',
  'You’re getting better every single week. 📈',
  'Ready for a new adventure? Let’s go! 🎒',
  'Today’s you is smarter than yesterday’s you. ✨',
  'Listen it, say it, own it! 🎤',
  'Curious minds go far. Let’s explore! 🔭',
  'One more step towards your KET star. ⭐',
];
function hiLine(){
  let last = lsGet('ket-hi'), i;
  do { i = Math.floor(Math.random() * HI_LINES.length); } while (HI_LINES.length > 1 && i === last);
  lsSet('ket-hi', i);
  return HI_LINES[i];
}
// Sao thành tích của 1 bài đã xong: ≥90% → 3 sao, ≥70% → 2 sao, còn lại 1 sao
function starsOf(s){
  if (!s || s.phase !== 'done') return 0;
  const r = s.r2 || s.r1; if (!r || !r.total) return 3;
  const p = r.score / r.total;
  return p >= .9 ? 3 : p >= .7 ? 2 : 1;
}
const starRow = n => [1, 2, 3].map(i => `<span class="${i <= n ? '' : 'off'}">⭐</span>`).join('');

/* ============ AVATAR: chọn hình có sẵn hoặc ảnh trong máy (chỉ lưu trên máy em, không gửi đi) ============ */
const AV_KEY = 'ket-avatar';
const AVATARS = ['🦊', '🐼', '🐯', '🐨', '🦄', '🐸', '🐱', '🐶', '🐵', '🦁', '🐰', '🐧', '🐙', '🦖', '🐝', '🐳', '🦋', '🐲', '👾', '🤖', '🐻', '🦉', '🐬', '🦒'];
const avGet = () => { const a = lsGet(AV_KEY); return a && (a.e || (typeof a.img === 'string' && a.img.startsWith('data:image/'))) ? a : null; };
function avHTML(cls = ''){
  const a = avGet();
  return `<span class="av ${cls}">${a && a.img ? `<img src="${esc(a.img)}" alt="">` : a ? a.e : '🙂'}</span>`;
}
function avPicker(){
  const a = avGet() || {};
  return `<div class="avpick">
      <label class="avopt photo${a.img ? ' on' : ''}" title="My photo">${a.img ? `<img src="${esc(a.img)}" alt="">` : '📷'}<small>My photo</small><input type="file" accept="image/*" hidden data-avfile></label>
      ${AVATARS.map(e => `<button type="button" class="avopt${a.e === e ? ' on' : ''}" data-av="${e}">${e}</button>`).join('')}
    </div>`;
}
// thu ảnh về hình vuông 200px (cắt giữa) để nhẹ, lưu được trong máy
function shrinkImg(file){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const w = im.naturalWidth, h = im.naturalHeight, s = Math.min(w, h);
      URL.revokeObjectURL(url); if (!s) return rej(new Error('empty'));
      const c = document.createElement('canvas'); c.width = c.height = 200;
      c.getContext('2d').drawImage(im, (w - s) / 2, (h - s) / 2, s, s, 0, 0, 200, 200);
      res(c.toDataURL('image/jpeg', .85));
    };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    im.src = url;
  });
}
// gắn sự kiện cho 1 ô chọn avatar; onChange chạy sau khi đã lưu
function bindAvPicker(box, onChange){
  box.innerHTML = avPicker();
  box.onclick = ev => {
    const b = ev.target.closest('[data-av]'); if (!b) return;
    lsSet(AV_KEY, { e: b.dataset.av }); box.innerHTML = avPicker(); onChange();
  };
  box.onchange = async ev => {
    const f = ev.target.closest('[data-avfile]'); if (!f || !f.files || !f.files[0]) return;
    try {
      lsSet(AV_KEY, { img: await shrinkImg(f.files[0]) });
      if (!avGet()) throw new Error('not saved');
      box.innerHTML = avPicker(); onChange();
    } catch (e){ alert('Không mở được ảnh này, em chọn ảnh khác nhé.'); }
  };
}

function renderHome(){
  document.title = 'KET Adventure 🚀';
  $('#heroSub').textContent = 'Explore · Listen · Speak · Shine ✨';
  const weeks = Object.keys(LESSONS).map(Number).filter(w => w <= OPEN_WEEK).sort((a, b) => b - a);
  const next = LESSONS[OPEN_WEEK + 1];
  const me = lsGet(ME_KEY) || {};
  const first = String(me.name || '').trim().split(/\s+/).pop();
  let stars = 0, words = 0;
  weeks.forEach(w => { const n = starsOf(lsGet(storeKey(w))); stars += n; if (n) words += (LESSONS[w].newWords || []).length; });
  $('#app').innerHTML = `<section class="card hi">
      <button type="button" class="avbtn" id="avBtn" title="Change avatar">${avHTML('big')}<span class="avedit">✏️</span></button>
      <div id="avBox" class="avbox" hidden></div>
      <h2>Hi ${first ? esc(first) : 'superstar'}! 🌟</h2>
      <p class="hiline">${hiLine()}</p>
      <div class="stats">
        <div class="stat"><b>⭐ ${stars}</b><span>stars</span></div>
        <div class="stat"><b>📒 ${words}</b><span>new words</span></div>
        <div class="stat"><b>🏁 ${weeks.filter(w => starsOf(lsGet(storeKey(w)))).length}</b><span>adventures</span></div>
      </div>
      <div class="lvl"><span class="lvn">🏆 Level ${1 + Math.floor(stars / 6)}</span><div class="lvbar"><i style="width:${Math.round(stars % 6 / 6 * 100)}%"></i></div><span class="lvx">⭐ ${stars % 6}/6</span></div>
      ${stars ? '' : '<p class="muted small" style="margin:10px 0 0">Your first stars are waiting for you! ⭐</p>'}
    </section>
    ${weeks.map(w => {
      const L = LESSONS[w], s = lsGet(storeKey(w)) || {};
      const r = s.r2 || s.r1;
      const st = s.phase === 'done' ? `<span class="tag ok stars">${starRow(starsOf(s))}${r ? ' ' + r.score + '/' + r.total : ''}</span>`
        : s.phase === 'retry' || s.phase === 'review' ? '<span class="tag warn">✏️ Làm lại câu sai</span>'
        : s.startedAt ? '<span class="tag">⏳ In progress</span>' : '<span class="tag new">🆕 New</span>';
      return `<a class="card lesson" href="?w=${w}">
        <div class="lnum c${w % 4}">${esc(L.code)}</div>
        <div class="linfo"><div class="lt">Week ${w}${w === OPEN_WEEK ? ' · <b class="now">This week</b>' : ''}</div>
          <div class="ln">${esc(L.title)}</div><div class="ls">${esc(L.unit)}</div></div>
        <div class="lend">${st}${s.phase === 'done' ? '' : '<span class="play">▶</span>'}</div></a>`;
    }).join('')}
    ${next ? `<div class="card lesson locked"><div class="lnum">🔒</div><div class="linfo"><div class="lt">Week ${OPEN_WEEK + 1}</div><div class="ln">Next adventure unlocks soon!</div></div></div>` : ''}`;
  const box = $('#avBox');
  $('#avBtn').onclick = () => { box.hidden = !box.hidden; if (!box.hidden) bindAvPicker(box, () => { $('#avBtn .av').outerHTML = avHTML('big'); }); };
}

/* ============ TRẠNG THÁI BÀI ============ */
let S = null;
// phase: work → (Submit) review: xem đúng/sai, khoá hết → (Làm lại câu sai) retry: chỉ hiện câu sai + gợi ý → (Nộp lần 2) done
const blank = () => ({ name: '', cls: '', startedAt: null, leaves: 0, t: {}, pick: [], best: null, rec: {}, plays: {}, phase: 'work', r1: null, r2: null, sid: '', sent1: false, sent2: false, retryAt: null });
const save = () => lsSet(storeKey(WEEK_NO), S);
const exOf = type => LESSON.ex.filter(e => e.type === type);

/* ============ GHI ÂM (lưu IndexedDB để không mất khi đóng trang) ============ */
let IDBP = null;
function idb(){
  if (!IDBP) IDBP = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('no indexedDB'));
    const r = indexedDB.open('ket-selfstudy', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('rec');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return IDBP;
}
const within = (p, ms = 4000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
async function idbPut(k, v){ const d = await idb(); return new Promise((res, rej) => { const t = d.transaction('rec', 'readwrite'); t.objectStore('rec').put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
async function idbGet(k){ const d = await idb(); return new Promise((res, rej) => { const q = d.transaction('rec').objectStore('rec').get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); }); }
const RECBLOB = {}; // qk → Blob
const recId = qk => 'w' + WEEK_NO + '-' + qk;
async function storeRec(qk, blob){ RECBLOB[qk] = blob; try { await within(blob.arrayBuffer().then(buf => idbPut(recId(qk), { buf, type: blob.type }))); } catch (e) {} }
async function loadRec(qk){
  if (RECBLOB[qk]) return RECBLOB[qk];
  try { const v = await within(idbGet(recId(qk))); if (v && v.buf) return (RECBLOB[qk] = new Blob([v.buf], { type: v.type || 'audio/webm' })); } catch (e) {}
  return null;
}
const MAX_REC = 60;
const extOf = t => /mp4|aac|m4a/.test(t) ? 'm4a' : /ogg/.test(t) ? 'ogg' : /wav/.test(t) ? 'wav' : 'webm';
function pickMime(){
  const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
  return c.find(m => MediaRecorder.isTypeSupported(m)) || '';
}
let REC = null, recMsg = {};
async function recStart(qk){
  if (REC || S.phase !== 'work') return;
  stopAllAudio(); recMsg[qk] = '';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder){
    recMsg[qk] = 'Trình duyệt này không ghi âm được. Hãy mở trang bằng Chrome (Android, máy tính) hoặc Safari (iPhone, iPad).'; paintSpeak(); return;
  }
  let stream;
  muteAway = true; // hộp xin quyền micro không tính là rời trang
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e){
    releaseAway();
    const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
    recMsg[qk] = denied ? 'Micro đang bị chặn. Bấm biểu tượng 🔒 cạnh địa chỉ trang, cho phép Micro rồi thử lại.' : 'Không tìm thấy micro. Kiểm tra micro hoặc tai nghe rồi thử lại.';
    paintSpeak(); return;
  }
  releaseAway();
  if (REC){ stream.getTracks().forEach(t => t.stop()); return; }
  const mime = pickMime(); let mr;
  try { mr = new MediaRecorder(stream, Object.assign({ audioBitsPerSecond: 48000 }, mime ? { mimeType: mime } : {})); } catch (e){ mr = new MediaRecorder(stream); }
  const r = { qk, mr, stream, chunks: [], t0: Date.now() };
  REC = r;
  mr.ondataavailable = e => { if (e.data && e.data.size) r.chunks.push(e.data); };
  mr.onstop = () => recDone(r);
  mr.start(1000);
  r.timer = setInterval(() => {
    const s = (Date.now() - r.t0) / 1000, tm = $('#rt-' + qk);
    if (tm) tm.textContent = fmtSec(s);
    if (s >= MAX_REC) recStop();
  }, 250);
  paintSpeak();
}
function recStop(){ if (REC && REC.mr.state !== 'inactive') REC.mr.stop(); }
async function recDone(r){
  clearInterval(r.timer);
  try { r.stream.getTracks().forEach(t => t.stop()); } catch (e) {}
  if (REC === r) REC = null;
  const type = r.mr.mimeType || (r.chunks[0] && r.chunks[0].type) || 'audio/webm';
  const dur = Math.min(MAX_REC, (Date.now() - r.t0) / 1000);
  const blob = new Blob(r.chunks, { type });
  if (blob.size < 500 || dur < 1){ recMsg[r.qk] = 'Bản ghi ngắn quá. Em ghi lại nhé.'; paintSpeak(); return; }
  S.rec[r.qk] = { mime: type.split(';')[0], ext: extOf(type), dur: Math.round(dur), size: blob.size, at: Date.now() };
  save();
  await storeRec(r.qk, blob);
  paintSpeak(); progress();
}

/* ============ PHÁT AUDIO ============ */
const players = [];
function stopAllAudio(){ players.forEach(a => { try { a.pause(); } catch (e) {} }); $$('audio').forEach(a => a.pause()); try { speechSynthesis.cancel(); } catch (e) {} }
document.addEventListener('play', ev => $$('audio').forEach(a => { if (a !== ev.target) a.pause(); }), true);
let QA = null, QA_K = null; // audio câu hỏi speaking
function playQ(qk, src){
  if (REC) return;
  if (QA && QA_K === qk && !QA.paused){ QA.pause(); QA.currentTime = 0; return; }
  stopAllAudio();
  if (!QA){ QA = new Audio(); players.push(QA); ['ended', 'pause', 'playing'].forEach(ev => QA.addEventListener(ev, paintPlayBtns)); }
  QA.src = src; QA_K = qk;
  QA.play().then(() => { S.plays[qk] = (S.plays[qk] || 0) + 1; save(); paintPlayBtns(); }).catch(paintPlayBtns);
}
// chỉ đổi nút ▶/⏹ (không vẽ lại cả khung để không làm dừng bản ghi em đang nghe)
function paintPlayBtns(){
  $$('[data-play]').forEach(b => {
    const qk = b.dataset.play, playing = QA && QA_K === qk && !QA.paused && !QA.ended;
    b.textContent = playing ? '⏹ Stop' : '▶ Listen';
    b.className = 'btn sm ' + (playing ? 'grey' : 'blue');
    const c = $('#pc-' + qk); if (c) c.textContent = S.plays[qk] ? 'listened ' + S.plays[qk] + '×' : '';
  });
}
// đang nghe bản ghi của mình thì tắt câu hỏi đang phát
document.addEventListener('play', ev => { if (QA && ev.target !== QA && !QA.paused) QA.pause(); }, true);

/* ============ DỰNG BÀI ============ */
function inp(k, label, extra = ''){ return `<input class="txt" data-k="${k}" ${ia} ${extra} aria-label="${esc(label)}">`; }

// số thứ tự bài hiển thị (1, 2, 3…), không dùng số bài trong sách
const exNo = e => LESSON.ex.indexOf(e) + 1;
function exHead(e){
  return `<div class="ex-head"><span class="badge">Exercise ${exNo(e)}</span><h2>${esc(e.title)}</h2></div>
    ${e.track ? `<div class="listen"><audio controls preload="none" src="audio/${e.track}.mp3"></audio></div>` : ''}
    <p class="how">${vt(e.how)}</p>`;
}

function exReasons(e){
  return `<div class="pic" id="pic-${e.id}"><img src="img/${e.img}" alt="Twelve reasons why friends are great" loading="lazy">
      ${Object.entries(e.zones).map(([n, z]) => `<button type="button" class="zone" data-n="${n}" aria-label="Reason ${n}"
        style="left:${z[0]}%;top:${z[1]}%;width:${z[2] - z[0]}%;height:${z[3] - z[1]}%"><span class="zk"></span></button>`).join('')}
    </div>
    <div class="best" id="best-${e.id}"></div>`;
}
function paintReasons(){
  exOf('reasons').forEach(e => {
    const lock = S.phase !== 'work';
    $$(`#pic-${e.id} .zone`).forEach(b => {
      const n = Number(b.dataset.n), on = S.pick.includes(n);
      b.classList.toggle('on', on); b.classList.toggle('star', S.best === n); b.disabled = lock;
      $('.zk', b).textContent = S.best === n ? '⭐' : on ? '✓' : '';
    });
    const box = $('#best-' + e.id);
    if (!S.pick.length){ box.innerHTML = '<p class="muted small">👆 Tap the pictures that are true for you.</p>'; return; }
    box.innerHTML = `<h3>⭐ Which is the best reason?</h3>
      ${S.pick.slice().sort((a, b) => a - b).map(n => `<div class="brow${S.best === n ? ' on' : ''}">
        <button type="button" class="bstar" data-n="${n}" ${lock ? 'disabled' : ''} aria-label="Best reason ${n}">${S.best === n ? '⭐' : '☆'}</button>
        <span class="bn">${n}</span><span class="bt">${vt(e.reasons[n])}</span></div>`).join('')}`;
  });
}

function exSpell(e){
  return `<div class="spell">${e.items.map((it, j) => {
    const k = e.id + '-' + (j + 1);
    const pat = it.key.split(' ').map(w => '_ '.repeat(w.length).trim()).join('   ');
    return `<div class="sp"><span class="cn">${j + 1}</span><div class="spb">
        <div class="pat">${esc(pat)}</div>
        <div class="sprow">${inp(k, 'Name ' + (j + 1))}<span class="cnt" id="cnt-${k}"></span></div>
        <div class="hint">(${vt(it.hint)})</div><div class="fix" id="fix-${k}"></div></div></div>`;
  }).join('')}</div>`;
}

function exInfo(e){
  let n = 0;
  return `<div class="people">${e.people.map(p => `<div class="person" style="--pc:${p.color}">
      <div class="ph"><img src="img/${p.img}" alt="${esc(p.name)}" loading="lazy"><span class="pn">${esc(p.name)}</span></div>
      <div class="pr">${p.rows.map(r => {
        if (r.ex) return `<div class="qrow ex0"><span class="ql">${vt(r.q)}</span><span class="exv">${esc(r.ex)}</span></div>`;
        n++; const k = e.id + '-' + n;
        return `<div class="qrow"><span class="ql">${vt(r.q)}</span><span class="qa">${inp(k, plain(r.q))}<span class="fix" id="fix-${k}"></span></span></div>`;
      }).join('')}</div></div>`).join('')}</div>`;
}

function exSpeak(e){
  return `${e.tip ? `<div class="tipbox"><b>💡 ${esc(e.tip.title)}:</b> ${e.tip.lines.map(l => `<span class="tl">${esc(l)}</span>`).join(' ')}</div>` : ''}
    <div class="sqs">${e.clips.map((c, j) => `<div class="sq" id="sq-${e.id}-${j + 1}"></div>`).join('')}</div>`;
}
function paintSpeak(){
  exOf('speak').forEach(e => e.clips.forEach((c, j) => {
    const qk = e.id + '-' + (j + 1), box = $('#sq-' + qk); if (!box) return;
    const r = S.rec[qk], recording = REC && REC.qk === qk, playing = QA && QA_K === qk && !QA.paused;
    const lock = S.phase !== 'work';
    const plays = S.plays[qk] || 0;
    box.className = 'sq' + (r ? ' done' : '') + (recording ? ' live' : '');
    box.innerHTML = `<div class="sqh"><span class="qn">Q${j + 1}</span>
        <button type="button" class="btn sm ${playing ? 'grey' : 'blue'}" data-play="${qk}" data-src="audio/${c.audio}.mp3" ${REC ? 'disabled' : ''}>${playing ? '⏹ Stop' : '▶ Listen'}</button>
        <span class="muted small" id="pc-${qk}">${plays ? 'listened ' + plays + '×' : ''}</span>
        <span class="sqs-st">${r ? '✅ Recorded ' + fmtSec(r.dur) : recording ? '' : '<span class="muted small">🎙 not recorded yet</span>'}</span></div>
      ${c.newWord ? `<div class="nw">🆕 New word in this question: ${vt('{{' + c.newWord + '}}')}</div>` : ''}
      <div class="sqr">
        ${recording ? `<span class="dot"></span><b id="rt-${qk}">0:00</b><button type="button" class="btn sm red" data-stop="1">⏹ Stop</button>`
          : lock ? '' : `<button type="button" class="btn sm ${r ? 'ghost' : 'orange'}" data-rec="${qk}" ${REC ? 'disabled' : ''}>🎙 ${r ? 'Record again' : 'Record'}</button>`}
        ${r && !recording ? `<audio controls preload="none" id="pb-${qk}"></audio>` : ''}
      </div>
      ${recMsg[qk] ? `<div class="err">${esc(recMsg[qk])}</div>` : ''}
      ${S.phase === 'done' ? `<div class="sol">Maria asked: <i>${esc(c.q)}</i></div>` : ''}`;
    if (r && !recording) loadRec(qk).then(b => {
      const a = $('#pb-' + qk);
      if (a && b){ a.src = URL.createObjectURL(b); }
      else if (a && !b){ a.replaceWith(Object.assign(document.createElement('span'), { className: 'err', textContent: '⚠️ Máy không còn bản ghi này, em ghi lại nhé.' })); if (S.phase === 'work'){ delete S.rec[qk]; save(); progress(); } }
    });
  }));
}

function buildLesson(){
  document.title = 'KET ' + LESSON.code + ' · ' + LESSON.title;
  $('#heroSub').textContent = `Week ${WEEK_NO} · ${LESSON.code} ${LESSON.title}`;
  const allWords = (LESSON.newWords || []).filter(k => VOCAB[k]);
  $('#app').innerHTML = `
    <section class="card start" id="start">
      <h2>👋 Hi! What’s your name?</h2>
      <p class="muted" style="margin:0">Điền tên và lớp rồi bấm <b>Start</b>. Nhớ đeo tai nghe hoặc bật loa nhé 🎧</p>
      <div class="field"><label for="inName">Full name</label><input id="inName" autocomplete="name" placeholder="e.g. Nguyễn Minh Anh"></div>
      <div class="field"><label for="inCls">Class</label><input id="inCls" placeholder="e.g. KET01"></div>
      <div class="field"><label>Choose your avatar</label><div id="avStart" class="avbox"></div></div>
      <div class="err" id="startErr"></div>
      <button class="btn" id="startBtn" type="button">Start →</button>
    </section>
    <div id="work" hidden>
      <div class="topbar" id="topbar" hidden></div>
      <div id="summaryBox"></div>
      <div class="card who" id="whoBar"></div>
      <section class="card guide">
        <h2>📒 New words</h2>
        <div class="note">✍️ Chép từ mới vào vở nha! Chạm vào từ màu vàng để xem nghĩa.</div>
        <div class="vgrid">${allWords.map(k => `<div class="vi">${vt('{{' + k + '}}')}<span class="vipa">${esc(VOCAB[k].ipa)}</span><span class="vmean">${esc(VOCAB[k].vi)}</span></div>`).join('')}</div>
      </section>
      ${LESSON.ex.map(e => `<section class="card ex" id="ex${e.id}">${exHead(e)}${
        e.type === 'reasons' ? exReasons(e) : e.type === 'spell' ? exSpell(e) : e.type === 'info' ? exInfo(e) : exSpeak(e)}</section>`).join('')}
    </div>`;

  // nhập chữ
  $$('input.txt').forEach(el => {
    el.value = S.t[el.dataset.k] || '';
    el.addEventListener('input', () => { if (el.disabled || S.phase === 'done') return; S.t[el.dataset.k] = el.value; if (S.phase === 'retry') el.classList.remove('bad'); save(); progress(); paintCounts(); });
  });
  // chạm tranh / chọn lý do hay nhất
  $('#app').addEventListener('click', ev => {
    const z = ev.target.closest('.zone');
    if (z && S.phase === 'work'){
      const n = Number(z.dataset.n);
      if (S.pick.includes(n)){ S.pick = S.pick.filter(x => x !== n); if (S.best === n) S.best = null; }
      else S.pick.push(n);
      save(); paintReasons(); progress(); return;
    }
    const st = ev.target.closest('.bstar');
    if (st && S.phase === 'work'){ const n = Number(st.dataset.n); S.best = S.best === n ? null : n; save(); paintReasons(); progress(); return; }
    const pl = ev.target.closest('[data-play]'); if (pl){ playQ(pl.dataset.play, pl.dataset.src); return; }
    const rc = ev.target.closest('[data-rec]'); if (rc){ recStart(rc.dataset.rec); return; }
    if (ev.target.closest('[data-stop]')) recStop();
  });
  paintReasons(); paintSpeak(); paintCounts();
  const me = lsGet(ME_KEY) || {};
  $('#inName').value = S.name || me.name || ''; $('#inCls').value = S.cls || me.cls || '';
  bindAvPicker($('#avStart'), () => { if ($('#startErr').textContent.includes('avatar')) $('#startErr').textContent = ''; });
  $('#startBtn').addEventListener('click', onStart);
  ['inName', 'inCls'].forEach(id => $('#' + id).addEventListener('keydown', e => { if (e.key === 'Enter') onStart(); }));
}
function paintCounts(){
  exOf('spell').forEach(e => e.items.forEach((it, j) => {
    const k = e.id + '-' + (j + 1), c = $('#cnt-' + k); if (!c) return;
    const need = letters(it.key).length, have = letters(S.t[k]).length;
    c.textContent = have ? have + '/' + need : '';
    c.className = 'cnt' + (have && have !== need ? ' off' : '');
  }));
}

/* ============ TÊN HỌC SINH ============ */
function onStart(){
  const n = $('#inName').value.trim(), c = $('#inCls').value.trim();
  if (n.length < 2){ $('#startErr').textContent = 'Em hãy nhập họ và tên.'; return; }
  if (!c){ $('#startErr').textContent = 'Em hãy nhập lớp.'; return; }
  if (!avGet()){ $('#startErr').textContent = 'Em hãy chọn avatar nhé.'; $('#avStart').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  $('#startErr').textContent = '';
  S.name = n.slice(0, 80); S.cls = c.slice(0, 30);
  if (!S.startedAt) S.startedAt = new Date().toISOString();
  save(); lsSet(ME_KEY, { name: S.name, cls: S.cls });
  showWork(); window.scrollTo({ top: 0 });
}
function renderWho(){
  const when = S.phase === 'done' ? (S.r2 || S.r1).at : null;
  $('#whoBar').innerHTML = `<span class="whoname">${avHTML()} <b>${esc(S.name)}</b> · Class <b>${esc(S.cls)}</b></span>` +
    (when ? `<span class="muted small">Submitted ${new Date(when).toLocaleString('vi-VN')}</span>`
      : S.phase === 'work' ? '<button class="linkbtn" type="button" id="editName">Sửa tên / lớp</button>' : '');
  const b = $('#editName'); if (b) b.onclick = () => { $('#work').hidden = true; $('#bar').hidden = true; $('#start').hidden = false; $('#inName').focus(); };
}
function showWork(){ $('#start').hidden = true; $('#work').hidden = false; $('#bar').hidden = false; renderWho(); progress(); }

/* ============ TIẾN ĐỘ ============ */
function tasks(){
  const a = [];
  exOf('reasons').forEach(() => a.push({ k: 'reasons', done: S.pick.length > 0 && S.best != null }));
  $$('input.txt').forEach(el => a.push({ k: el.dataset.k, done: !!(S.t[el.dataset.k] || '').trim() }));
  exOf('speak').forEach(e => e.clips.forEach((c, j) => a.push({ k: 'rec', q: 'Q' + (j + 1), done: !!S.rec[e.id + '-' + (j + 1)] })));
  return a;
}
function progress(){
  const bar = $('#bar'); if (!bar) return;
  bar.hidden = S.phase === 'review' || S.phase === 'retry' || $('#work').hidden; // sau lần 1: nút ở thanh ghim đầu màn hình
  if (S.phase === 'review' || S.phase === 'retry'){
    topProgress();
  } else if (S.phase === 'done'){
    const R = S.r2 || S.r1;
    $('#progT').textContent = `Done · ${R.score}/${R.total} correct`;
    $('#progF').style.width = (R.total ? R.score / R.total * 100 : 100) + '%';
    $('#submitBtn').hidden = true;
  } else {
    const t = tasks(), d = t.filter(x => x.done).length;
    $('#progT').textContent = `Done ${d}/${t.length}`;
    $('#progF').style.width = (t.length ? d / t.length * 100 : 0) + '%';
    $('#submitBtn').textContent = 'Submit ✔'; $('#submitBtn').hidden = false;
  }
}

/* ============ CHẤM ĐIỂM ============ */
function gradeNow(){
  const items = {};
  exOf('spell').forEach(e => e.items.forEach((it, j) => {
    const k = e.id + '-' + (j + 1), ans = (S.t[k] || '').trim();
    items[k] = { ans, ok: !!ans && letters(ans) === letters(it.key) };
  }));
  exOf('info').forEach(e => { let n = 0; e.people.forEach(p => p.rows.forEach(r => {
    if (r.ex) return; n++; const k = e.id + '-' + n, ans = (S.t[k] || '').trim();
    items[k] = { ans, ok: !!ans && alts(r.key).some(a => norm(a) === norm(ans)) };
  })); });
  const ks = Object.keys(items);
  return { items, score: ks.filter(k => items[k].ok).length, total: ks.length };
}
// danh sách câu (để hiển thị + gửi mail)
function itemList(){
  const L = [];
  exOf('spell').forEach(e => e.items.forEach((it, j) => L.push({ sec: String(exNo(e)), k: e.id + '-' + (j + 1), n: String(j + 1), q: 'Spell: ' + plain(it.hint), correct: it.key.toUpperCase() })));
  exOf('info').forEach(e => { let n = 0; e.people.forEach(p => p.rows.forEach(r => { if (r.ex) return; n++; L.push({ sec: String(exNo(e)), k: e.id + '-' + n, n: String(n), q: p.name + ' – ' + plain(r.q), correct: r.show || alts(r.key)[0] }); })); });
  return L;
}

/* ============ SAU LẦN 1: thanh ghim, chỉ hiện câu sai, gợi ý ============ */
const wrongKeys = () => S.r1 ? Object.keys(S.r1.items).filter(k => !S.r1.items[k].ok) : [];
function lev(a, b){
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
// Gợi ý ngắn, không lộ đáp án (chỉ hiện lúc làm lại)
function hintFor(k){
  const ans = (S.r1.items[k].ans || '').trim();
  if (!ans) return 'Em chưa làm câu này.';
  const e = LESSON.ex.find(x => k.startsWith(x.id + '-'));
  if (e.type === 'spell'){
    const key = letters(e.items[Number(k.split('-')[1]) - 1].key), y = letters(ans);
    if (key.length !== y.length) return 'Đếm lại số chữ cái nhé.';
    return lev(key, y) <= 2 ? 'Gần đúng rồi! Xem lại chính tả.' : 'Nghe lại phần đánh vần.';
  }
  let n = 0, who = '', keys = [];
  e.people.forEach(p => p.rows.forEach(r => { if (r.ex) return; n++; if (e.id + '-' + n === k){ who = p.name; keys = alts(r.key); } }));
  const y = norm(ans);
  if (keys.some(a => { const x = norm(a); return x.length >= 4 && lev(x, y) <= Math.max(1, Math.floor(x.length / 4)); })) return 'Gần đúng rồi! Xem lại chính tả.';
  return `Nghe lại đoạn ${who} nói.`;
}
const ITEM_SEL = '.sp, .person, .qrow';
function focusWrong(on){
  document.body.classList.toggle('retrying', !!on);
  $$('.rt-hide').forEach(x => x.classList.remove('rt-hide'));
  if (!on) return;
  const els = wrongKeys().map(k => $(`input.txt[data-k="${k}"]`)).filter(Boolean);
  $$('section.card.ex').forEach(sec => {
    if (!els.some(el => sec.contains(el))){ sec.classList.add('rt-hide'); return; }
    $$(ITEM_SEL, sec).forEach(c => { if (!els.some(el => c.contains(el))) c.classList.add('rt-hide'); });
  });
}
// Thanh audio dính đầu màn hình: nằm ngay dưới thanh ghim "Làm lại câu sai" (nếu có)
function setStick(){
  const tb = $('#topbar'), h = tb && !tb.hidden ? tb.offsetHeight + 16 : 0;
  document.documentElement.style.setProperty('--stick', (h || 8) + 'px');
}
window.addEventListener('resize', setStick);
function renderTop(){
  const tb = $('#topbar'); if (!tb) return;
  try { renderTopIn(tb); } finally { setStick(); }
}
function renderTopIn(tb){
  if (S.phase !== 'review' && S.phase !== 'retry'){ tb.hidden = true; return; }
  tb.hidden = false;
  if (S.phase === 'review'){
    tb.innerHTML = `<div class="tt">Lần 1: ${S.r1.score}/${S.r1.total} · ❌ Sai ${wrongKeys().length} câu</div><button class="btn orange" type="button" id="retryBtn">✏️ Làm lại câu sai</button>`;
    $('#retryBtn').onclick = startRetry;
  } else {
    tb.innerHTML = `<div class="tt" id="topT"></div><button class="btn orange" type="button" id="submit2Btn">Nộp lần 2 ✔</button>`;
    $('#submit2Btn').onclick = onSubmit;
    topProgress();
  }
}
function topProgress(){
  const el = $('#topT'); if (!el) return;
  const w = wrongKeys(), fixed = w.filter(k => (S.t[k] || '').trim() !== (S.r1.items[k].ans || '')).length;
  el.textContent = `✏️ Đã sửa ${fixed}/${w.length} câu`;
}
function startRetry(){
  S.phase = 'retry'; S.retryAt = new Date().toISOString(); save();
  paintAll(); window.scrollTo({ top: 0 });
}

/* ============ HIỂN THỊ KẾT QUẢ ============ */
function paintMarks(){
  const list = itemList();
  list.forEach(i => {
    const el = $(`input.txt[data-k="${i.k}"]`), fix = $('#fix-' + i.k); if (!el) return;
    el.classList.remove('ok', 'bad'); if (fix) fix.textContent = '';
    if (S.phase === 'work'){ el.disabled = false; return; }
    if (S.phase === 'review' || S.phase === 'retry'){
      const r1 = S.r1.items[i.k];
      el.disabled = r1.ok || S.phase === 'review';
      if (r1.ok || (S.t[i.k] || '').trim() === (r1.ans || '')) el.classList.add(r1.ok ? 'ok' : 'bad');
      if (fix && !r1.ok && S.phase === 'retry') fix.innerHTML = '<span class="again">💡 ' + esc(hintFor(i.k)) + '</span>';
      return;
    }
    const R = (S.r2 || S.r1).items[i.k];
    el.value = R.ans || ''; el.disabled = true; el.classList.add(R.ok ? 'ok' : 'bad');
    if (fix && !R.ok) fix.textContent = '→ ' + i.correct;
  });
}
// Meme cảm xúc của cô sau lần nộp 1: img/meme/<mức>-<số>.gif. MEMES = số ảnh mỗi mức (thêm ảnh thì tăng số).
// Chọn ngẫu nhiên, ưu tiên ảnh em chưa gặp ở các bài trước; giữ cố định khi mở lại trang.
const MEMES = { wow: 7, good: 8, ok: 8, oops: 6 };
const SEEN_KEY = 'ket-memes-seen';
function memeOf(R){
  const pct = R.total ? R.score / R.total : 1;
  const tier = pct === 1 ? 'wow' : pct >= .8 ? 'good' : pct >= .5 ? 'ok' : 'oops';
  if (!S.meme || !S.meme.startsWith(tier + '-')){
    const all = Array.from({ length: MEMES[tier] }, (_, i) => tier + '-' + (i + 1));
    let seen = lsGet(SEEN_KEY); if (!Array.isArray(seen)) seen = [];
    let pool = all.filter(m => !seen.includes(m));
    if (!pool.length){ seen = seen.filter(m => !m.startsWith(tier + '-')); pool = all; }
    S.meme = pool[Math.floor(Math.random() * pool.length)];
    seen.push(S.meme); lsSet(SEEN_KEY, seen); save();
  }
  return `<img class="meme" src="img/meme/${S.meme}.gif" alt="">`;
}
function renderSummary(){
  const box = $('#summaryBox');
  if (S.phase === 'work'){ box.innerHTML = ''; return; }
  if (S.phase === 'review' || S.phase === 'retry'){
    // sau lần 1: chỉ meme + điểm
    box.innerHTML = `<div class="card summary retry">${memeOf(S.r1)}
      <div class="sumr"><div class="score">${S.r1.score}<span>/${S.r1.total}</span></div>
      <div class="status" id="sendStatus"></div></div></div>`;
    updateStatus();
    return;
  }
  // xong: điểm + cô đã nhận bài + Let's review (đúng hết ngay lần 1 thì vẫn có meme)
  const R = S.r2 || S.r1;
  box.innerHTML = `<div class="card summary">${S.r2 ? '' : memeOf(S.r1)}
    <div class="sumr"><div class="score">${R.score}<span>/${R.total}</span></div>
    <div class="status" id="sendStatus"></div>
    ${R.score < R.total ? '<div class="big">Let’s review the answers below 👇</div>' : ''}</div></div>`;
  updateStatus();
}
function paintAll(){ paintMarks(); paintReasons(); paintSpeak(); focusWrong(S.phase === 'retry'); renderTop(); renderSummary(); renderWho(); progress(); }

/* ============ NỘP BÀI ============ */
async function onSubmit(){
  if (REC){ alert('Em đang ghi âm. Bấm ⏹ Stop trước nhé.'); return; }
  if (S.phase === 'work'){
    const t = tasks();
    const noRec = t.filter(x => x.k === 'rec' && !x.done).map(x => x.q);
    if (noRec.length){ alert('Em chưa ghi âm câu trả lời: ' + noRec.join(', ') + '.\nBài speaking phải ghi âm đủ mới nộp được nhé.'); const sp = $('#ex' + exOf('speak')[0].id); if (sp) sp.scrollIntoView({ behavior: 'smooth' }); return; }
    const left = t.filter(x => !x.done).length;
    muteAway = true;
    const go = confirm(left ? `Còn ${left} câu chưa làm. Nộp luôn?` : 'Nộp bài nhé?');
    releaseAway(); if (!go) return;
    stopAllAudio();
    const g = gradeNow(), at = new Date().toISOString();
    S.r1 = { at, leaves: S.leaves || 0, score: g.score, total: g.total, items: g.items };
    S.sid = makeSid();
    S.phase = g.score === g.total ? 'done' : 'review';
    save(); paintAll(); window.scrollTo({ top: 0, behavior: 'smooth' });
    send();
    return;
  }
  if (S.phase === 'retry'){
    muteAway = true;
    const go = confirm('Nộp lần 2? Nộp xong sẽ hiện đáp án.');
    releaseAway(); if (!go) return;
    stopAllAudio();
    const g = gradeNow();
    // câu đúng ở lần 1 giữ nguyên kết quả
    Object.keys(S.r1.items).forEach(k => { if (S.r1.items[k].ok) g.items[k] = S.r1.items[k]; });
    const ks = Object.keys(g.items);
    S.r2 = { at: new Date().toISOString(), leaves: S.leaves || 0, score: ks.filter(k => g.items[k].ok).length, total: ks.length, items: g.items };
    S.phase = 'done'; save(); paintAll(); window.scrollTo({ top: 0, behavior: 'smooth' });
    send();
  }
}

/* ============ GỬI BÀI ============ */
let sendState = null, sendErr = '';
function updateStatus(){
  const el = $('#sendStatus'); if (!el) return;
  const allSent = S.sent1 && (!S.r2 || S.sent2);
  const st = allSent && sendState !== 'sending' ? 'ok' : sendState;
  el.className = 'status ' + (st || '');
  if (st === 'ok') el.innerHTML = S.phase === 'retry' || S.phase === 'review' ? '' : '✅ Cô đã nhận được bài!';
  else if (!st) el.innerHTML = '';
  else if (st === 'sending') el.innerHTML = '⏳ Đang gửi bài…';
  else el.innerHTML = `⚠️ Chưa gửi được bài${sendErr ? ` (${esc(sendErr)})` : ''}. Em kiểm tra mạng rồi bấm: <button class="btn sm" type="button" id="resendBtn">Gửi lại</button>`;
  const rb = $('#resendBtn'); if (rb) rb.onclick = send;
}
const blobToB64 = b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] || ''); fr.onerror = () => rej(fr.error); fr.readAsDataURL(b); });
const secsBetween = (a, b) => a && b ? Math.max(0, Math.round((new Date(b) - new Date(a)) / 1000)) : null;

// Giống các trang BTVN khác: lần 1 gửi ngay (kèm file ghi âm + tự đánh giá); lần 2 gửi kèm kết quả lần 1 để mail so sánh 2 lần.
const makeSid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const base = () => ({ app: 'btvn', unit: 'KET', title: `KET ${LESSON.code} ${LESSON.title} – Week ${WEEK_NO}`, name: S.name, cls: S.cls, sid: S.sid || '' });
// speaking chỉ có ở mail lần 1 (kèm file ghi âm); mail lần 2 chỉ so sánh các câu chấm điểm
function sectionsOf(items, nAudio){
  const out = LESSON.ex.filter(e => e.type === 'spell' || e.type === 'info').map(e => {
    const id = String(exNo(e)), its = items.filter(x => x.sec === id);
    return { id, title: `Exercise ${id} · ${e.track ? 'Track ' + e.track + ' · ' : ''}${e.title}`, score: its.filter(x => x.ok).length, total: its.length, pending: false };
  });
  if (nAudio != null) exOf('speak').forEach(e => out.push({ id: String(exNo(e)), title: `Exercise ${exNo(e)} · ${e.title} (${nAudio} file ghi âm đính kèm)`, score: 0, total: 0, pending: true }));
  return out;
}
function itemsOf(R, withSpeak){
  const items = itemList().map(i => ({ sec: i.sec, n: i.n, q: i.q, ans: R.items[i.k].ans, correct: i.correct, ok: R.items[i.k].ok }));
  if (withSpeak) exOf('speak').forEach(e => e.clips.forEach((c, j) => {
    const qk = e.id + '-' + (j + 1), meta = S.rec[qk];
    items.push({ sec: String(exNo(e)), n: 'Q' + (j + 1), q: c.q + ' (học sinh chỉ nghe, không thấy chữ)',
      ans: meta ? `🎙 ${fmtSec(meta.dur)} · nghe câu hỏi ${S.plays[qk] || 0} lần` : '(chưa ghi âm)', correct: 'cô chấm', ok: null });
  }));
  return items;
}
async function payload1(){
  const items = itemsOf(S.r1, true), audios = [];
  for (const e of exOf('speak')) for (let j = 0; j < e.clips.length; j++){
    const qk = e.id + '-' + (j + 1), meta = S.rec[qk], blob = meta ? await loadRec(qk) : null;
    if (blob) audios.push({ code: 'Q' + (j + 1), label: 'Q' + (j + 1) + ' – ' + e.clips[j].q, mime: meta.mime, ext: meta.ext, dur: meta.dur, b64: await blobToB64(blob) });
  }
  const extras = exOf('reasons').map(e => ({
    label: `Exercise ${exNo(e)} – Tự đánh giá: ${e.title}`,
    text: 'Lý do đúng với em: ' + (S.pick.length ? S.pick.slice().sort((a, b) => a - b).map(n => n + '. ' + plain(e.reasons[n])).join(' | ') : '(không chọn)') +
      '\nLý do hay nhất ⭐: ' + (S.best ? S.best + '. ' + plain(e.reasons[S.best]) : '(không chọn)'),
  }));
  return Object.assign(base(), {
    attempt: 1, canRetry: S.r1.score < S.r1.total,
    startedAt: S.startedAt, submittedAt: S.r1.at, timeTakenSec: secsBetween(S.startedAt, S.r1.at), leaves: S.r1.leaves,
    score: S.r1.score, total: S.r1.total, sections: sectionsOf(items, audios.length), items, extras, audios, wantsAudio: true, audio: null,
  });
}
function payload2(){
  const items = itemsOf(S.r2), first = itemsOf(S.r1);
  return Object.assign(base(), {
    attempt: 2, startedAt: S.retryAt || S.r1.at, submittedAt: S.r2.at, timeTakenSec: secsBetween(S.retryAt || S.r1.at, S.r2.at), leaves: Math.max(0, S.r2.leaves - S.r1.leaves),
    score: S.r2.score, total: S.r2.total, sections: sectionsOf(items, null), items,
    first: { score: S.r1.score, total: S.r1.total, sections: sectionsOf(first, null), items: first,
      startedAt: S.startedAt, submittedAt: S.r1.at, timeTakenSec: secsBetween(S.startedAt, S.r1.at), leaves: S.r1.leaves },
  });
}
async function post(p){
  const r = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'máy chủ báo lỗi');
}
let sending = false;
async function send(){
  if (sending || !S.r1) return;
  sending = true; sendState = 'sending'; sendErr = ''; updateStatus();
  try {
    for (;;){
      if (!S.sent1){ await post(await payload1()); S.sent1 = true; save(); continue; }
      if (S.r2 && !S.sent2){ await post(payload2()); S.sent2 = true; save(); continue; }
      break;
    }
    sendState = 'ok';
  } catch (err){ sendState = 'err'; sendErr = err && err.message ? err.message : String(err); }
  sending = false; updateStatus();
}

/* ============ ĐẾM SỐ LẦN RỜI TRANG ============ */
let away = false, muteAway = false;
function releaseAway(){ setTimeout(() => { muteAway = false; away = false; }, 800); }
const tracking = () => S && !!S.startedAt && (S.phase === 'work' || S.phase === 'retry') && $('#work') && !$('#work').hidden;
function goAway(){ if (muteAway || away || REC || !tracking()) return; away = true; S.leaves = (S.leaves || 0) + 1; save(); }
function comeBack(){ if (!document.hidden && document.hasFocus()) away = false; }
document.addEventListener('visibilitychange', () => document.hidden ? goAway() : comeBack());
window.addEventListener('blur', goAway);
window.addEventListener('focus', comeBack);

/* ============ KHỞI ĐỘNG ============ */
(function boot(){
  if (!LESSON){
    $('#bar').hidden = true;
    if (WEEK_NO) { $('#app').innerHTML = '<div class="card">🔒 Bài này chưa mở. <a href="./">← Quay lại danh sách bài</a></div>'; return; }
    renderHome(); return;
  }
  $('#back').hidden = false;
  S = Object.assign(blank(), lsGet(storeKey(WEEK_NO)) || {});
  buildLesson();
  $('#submitBtn').addEventListener('click', onSubmit);
  if (S.startedAt && S.name) showWork();
  paintAll();
  if (S.r1 && (!S.sent1 || (S.r2 && !S.sent2))) send(); // lần trước chưa gửi được → gửi lại
})();
