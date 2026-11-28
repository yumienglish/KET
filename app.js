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
// ?w=2&preview: cô xem trước bài chưa mở (học sinh không thấy link này trên trang chủ)
const PREVIEW = /[?&]preview\b/.test(location.search);
const LESSON = WEEK_NO && (WEEK_NO <= OPEN_WEEK || PREVIEW) ? LESSONS[WEEK_NO] || null : null;
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
// Avatar hình vẽ ChatGPT: img/ui/av-1..16.webp ứng với 16 emoji đầu của AVATARS (cùng thứ tự). AV_ART = false → dùng emoji.
const AV_ART = true, AV_PICS = 16;
const avPic = e => { const i = AVATARS.indexOf(e); return AV_ART && i >= 0 && i < AV_PICS ? `<img src="img/ui/av-${i + 1}.webp" alt="${e}">` : e; };
const avGet = () => { const a = lsGet(AV_KEY); return a && (a.e || (typeof a.img === 'string' && a.img.startsWith('data:image/'))) ? a : null; };
function avHTML(cls = ''){
  if (typeof yaChar === 'function' && yaChar() && window.YumiAvatar) return `<span class="av ${cls} avchar">${YumiAvatar.html(YA.me().avatar, { crop: 'head' })}</span>`; // nhân vật tủ đồ
  const a = avGet();
  return `<span class="av ${cls}">${a && a.img ? `<img src="${esc(a.img)}" alt="">` : a ? avPic(a.e) : '🙂'}</span>`;
}
function avPicker(){
  const a = avGet() || {};
  return `<div class="avpick">
      <label class="avopt photo${a.img ? ' on' : ''}" title="My photo">${a.img ? `<img src="${esc(a.img)}" alt="">` : '📷'}<small>My photo</small><input type="file" accept="image/*" hidden data-avfile></label>
      ${(AV_ART ? AVATARS.slice(0, AV_PICS) : AVATARS).map(e => `<button type="button" class="avopt${a.e === e ? ' on' : ''}" data-av="${e}">${avPic(e)}</button>`).join('')}
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

/* ============ TÀI KHOẢN YUMI (đăng nhập + bảng xếp hạng, script chung /yumi-auth.js) ============ */
// YA = null khi công tắc chung chưa bật (hoặc script chung không tải được) → trang chạy như cũ, gõ tên.
const YA = window.YumiAuth && YumiAuth.ready() ? YumiAuth : null;
const YA_OPTS = { mascot: 'img/ui/mascot-1.webp', title: 'KET Adventure 🚀', sub: 'Log in to start your space adventure 🪐',
  theme: { bg: 'linear-gradient(160deg,#ffe6d5,#efe4ff 55%,#d9f3ff)', text: '#22303c', acc: '#ff8a3d', acc2: '#8a5cff',
    font: 'Nunito,system-ui,sans-serif', head: '"Baloo 2",Nunito,system-ui,sans-serif' } };
const yaChar = () => { const m = YA && YA.me(); return !!(m && /^ket:\{/.test(m.avatar || '')); }; // đã có nhân vật tủ đồ KET
function yaSync(){ // tên + lớp lấy theo tài khoản
  const m = YA && YA.me(); if (!m) return;
  lsSet(ME_KEY, Object.assign(lsGet(ME_KEY) || {}, { name: m.fullName || m.name, cls: m.cls }));
}
function yaAvatar(){ // gửi avatar lên bảng xếp hạng (ảnh tự chụp thì không gửi)
  const a = avGet(); if (!YA || !a || !a.e || yaChar()) return;
  const i = AVATARS.indexOf(a.e);
  YA.setAvatar(AV_ART && i >= 0 && i < AV_PICS ? new URL(`img/ui/av-${i + 1}.webp`, location.href).pathname : a.e);
}
function yaHome(){
  if (!YA) return;
  const card = $('#app .hi'); if (!card) return;
  const row = document.createElement('div'); row.className = 'yarow';
  row.appendChild(YA.trophy({ theme: YA_OPTS.theme }));
  const out = document.createElement('button'); out.type = 'button'; out.className = 'linkbtn'; out.textContent = 'Log out';
  out.onclick = () => YA.logout();
  if (window.YumiAvatar) row.appendChild(YumiAvatar.button({ style: 'ket', theme: YA_OPTS.theme, onSave: () => renderHome() }));
  row.appendChild(out); card.appendChild(row);
  yaAvatar();
  // lần đầu: tạo nhân vật (+ hướng dẫn tân thủ) → vẽ lại trang chủ, rồi mới hiện bảng xếp hạng
  const done = () => YA.autoBoard({ theme: YA_OPTS.theme });
  if (window.YumiAvatar) YumiAvatar.ensure({ style: 'ket', theme: YA_OPTS.theme }).then(v => { if (v) renderHome(); else done(); }).catch(done);
  else done();
}

function renderHome(){
  document.title = 'KET Adventure 🚀';
  $('#heroSub').textContent = 'Explore · Listen · Speak · Shine ✨';
  const me = lsGet(ME_KEY) || {};
  const first = (typeof YA !== 'undefined' && YA && YA.me()) ? YA.me().name : String(me.name || '').trim().split(/\s+/).pop(); // đăng nhập → nguyên nickname
  const d = gameData(), { stars, words, done } = d; // fun.js
  const lv = 1 + Math.floor(stars / 6), xp = stars % 6;
  $('#app').innerHTML = `<section class="card hi">
      ${uimg('mascot-1', '🐶', 'hmas')}
      <button type="button" class="avbtn" id="avBtn" title="Change avatar">${avHTML('big')}<span class="avedit">✏️</span></button>
      <div id="avBox" class="avbox" hidden></div>
      <h2>Hi ${first ? esc(first) : 'superstar'}! 🌟</h2>
      <p class="hiline">${hiLine()}</p>
      <div class="lvl"><span class="lvn">🏆 Level ${lv}</span><div class="lvbar"><i style="width:${Math.round(xp / 6 * 100)}%"></i></div><span class="lvx">⭐ ${xp}/6</span></div>
      ${stars ? '' : '<p class="muted small" style="margin:10px 0 0">Your first stars are waiting for you! ⭐</p>'}
    </section>
    ${reviewCard(d)}
    ${mapHtml(d)}
    ${badgesHtml(d)}`;
  const box = $('#avBox');
  $('#avBtn').onclick = () => { box.hidden = !box.hidden; if (!box.hidden) bindAvPicker(box, () => { $('#avBtn .av').outerHTML = avHTML('big'); const m = $('#map .me'); if (m) m.innerHTML = avHTML(); yaAvatar(); }); };
  afterHome();
  yaHome();
}

/* ============ TRẠNG THÁI BÀI ============ */
let S = null;
// phase: work → (Submit) review: xem đúng/sai, khoá hết → (Làm lại câu sai) retry: chỉ hiện câu sai + gợi ý → (Nộp lần 2) done
const blank = () => ({ name: '', cls: '', startedAt: null, leaves: 0, t: {}, ch: {}, pick: [], best: null, rec: {}, plays: {}, phase: 'work', r1: null, r2: null, sid: '', sent1: false, sent2: false, retryAt: null });
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
// Câu cổ vũ của linh vật đầu mỗi Mission (tiếng Anh, ngắn). Bài nào có e.cheer thì dùng câu đó.
const CHEER = {
  reasons: 'There are no wrong answers here. Just be you! 😊',
  spell: 'Listen to every letter. You can pause and play again! 🎧',
  info: 'Names and numbers are the key. You’ve got this! 💪',
  speak: 'Speak loud and clear, like a real astronaut! 🎤',
  fixit: 'Be a mistake detective! 🔍',
  write: 'Remember the word order! 🧩',
  fill: 'Read the whole sentence first. 👀',
  pick: 'Listen, then tap the right answer! 🎧',
  choose: 'Countable or uncountable? Think first! 🤔',
  plural: 'One map, two maps… Watch the spelling! ✏️',
};
// Hình minh hoạ ChatGPT: img/ai/<tên>.jpg – chưa có file thì tự ẩn
const aiImg = n => `<img class="aiimg" src="img/ai/${n}.jpg" alt="" loading="lazy" onerror="this.remove()">`;
function exHead(e){
  const cheer = e.cheer || CHEER[e.type];
  return `<div class="ex-head"><span class="badge">Mission ${exNo(e)}</span><h2>${esc(e.title)}</h2></div>
    ${e.ai ? aiImg(e.ai) : ''}
    ${cheer ? `<div class="buddy">${typeof uimg === 'function' ? uimg('mascot-3', '🐶', 'bmas') : '<span class="bmas emo">🐶</span>'}<div class="bub">${cheer}</div></div>` : ''}
    ${e.track ? `<div class="listen"><audio controls preload="none" src="audio/${e.track}.mp3"></audio></div>` : ''}
    <p class="how">${vt(e.how)}</p>${e.vi ? `<p class="how-vi">${esc(e.vi)}</p>` : ''}`;
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
        ${c.audio ? `<button type="button" class="btn sm ${playing ? 'grey' : 'blue'}" data-play="${qk}" data-src="audio/${c.audio}.mp3" ${REC ? 'disabled' : ''}>${playing ? '⏹ Stop' : '▶ Listen'}</button>
        <span class="muted small" id="pc-${qk}">${plays ? 'listened ' + plays + '×' : ''}</span>` : `<span class="sqt">${vt(c.q)}</span>`}
        <span class="sqs-st">${r ? '✅ Recorded ' + fmtSec(r.dur) : recording ? '' : '<span class="muted small">🎙 not recorded yet</span>'}</span></div>
      ${c.newWord ? `<div class="nw">🆕 New word in this question: ${vt('{{' + c.newWord + '}}')}</div>` : ''}
      <div class="sqr">
        ${recording ? `<span class="dot"></span><b id="rt-${qk}">0:00</b><button type="button" class="btn sm red" data-stop="1">⏹ Stop</button>`
          : lock ? '' : `<button type="button" class="btn sm ${r ? 'ghost' : 'orange'}" data-rec="${qk}" ${REC ? 'disabled' : ''}>🎙 ${r ? 'Record again' : 'Record'}</button>`}
        ${r && !recording ? `<audio controls preload="none" id="pb-${qk}"></audio>` : ''}
      </div>
      ${recMsg[qk] ? `<div class="err">${esc(recMsg[qk])}</div>` : ''}
      ${S.phase === 'done' && c.audio ? `<div class="sol">Maria asked: <i>${esc(c.q)}</i></div>` : ''}`;
    if (r && !recording) loadRec(qk).then(b => {
      const a = $('#pb-' + qk);
      if (a && b){ a.src = URL.createObjectURL(b); }
      else if (a && !b){ a.replaceWith(Object.assign(document.createElement('span'), { className: 'err', textContent: '⚠️ Máy không còn bản ghi này, em ghi lại nhé.' })); if (S.phase === 'work'){ delete S.rec[qk]; save(); progress(); } }
    });
  }));
}

/* ---------- Dạng bài mới (1.2): fixit · write · fill (+ chạm tính từ) · pick ---------- */
// So câu: bỏ hoa/thường, dấu câu (giữ dấu '), khoảng trắng thừa
const sn = s => String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const itemOf = (e, k) => e.items[Number(k.slice(e.id.length + 1)) - 1];
// ô này còn được sửa không (lần 1: mọi câu; làm lại: chỉ câu sai)
const canEdit = k => S.phase === 'work' || (S.phase === 'retry' && !!S.r1 && !!S.r1.items[k] && !S.r1.items[k].ok);
const bankHtml = (e, words, title) => `<aside class="bank"><div class="bh">${title}</div>${words.map(w => {
  const used = w.startsWith('~'), x = used ? w.slice(1) : w;
  return `<button type="button" class="chip${used ? ' ex' : ''}" data-chip="${esc(x)}" data-bank="${e.id}"${used ? ' disabled' : ''}>${esc(x)}</button>`; }).join('')}</aside>`;
const txtIn = (k, label, cls = '') => `<input class="txt ${cls}" data-k="${k}" ${ia} aria-label="${esc(label)}">`;

function exFixit(e){
  return `<div class="wb2"><div class="wbl">${e.items.map((it, j) => { const k = e.id + '-' + (j + 1);
    return `<div class="qi fxi" data-qk="${k}"><div class="fxq"><span class="cn">${j + 1}</span><span class="fxs">${esc(it.t)}</span></div>
      <div class="tfs"><button type="button" class="tf" data-tf="${k}" data-val="ok">✅ Correct</button><button type="button" class="tf" data-tf="${k}" data-val="bad">❌ Wrong</button></div>
      <div class="fxw" id="fxw-${k}" hidden><span class="fxl">✏️</span><textarea class="txt fx" data-k="${k}w" rows="2" ${ia} aria-label="Correct question ${j + 1}"></textarea></div>
      <div class="fix" id="fix-${k}"></div></div>`; }).join('')}</div>
    ${bankHtml(e, e.bank, '🧩 Words to add')}</div>`;
}
function exWrite(e){
  return `${e.example ? `<div class="wex"><span class="cue">${esc(e.example.cue)}</span><span class="exv">${esc(e.example.a)}</span></div>` : ''}
    ${e.items.map((it, j) => { const k = e.id + '-' + (j + 1);
      return `<div class="qi wri" data-qk="${k}"><div class="cue"><span class="cn">${j + 1}</span>${esc(it.cue)}</div>${txtIn(k, it.cue)}<div class="fix" id="fix-${k}"></div></div>`; }).join('')}`;
}
// câu có [[đáp án]] → ô điền; ví dụ thì hiện sẵn đáp án
const fillLine = (t, k) => t.split(/\[\[([^\]]+)\]\]/).map((p, i) => i % 2 ? (k ? txtIn(k, 'Blank', 'fb') : `<span class="exv">${esc(p)}</span>`) : vt(p)).join('');
// các từ trong câu để chạm (phần tìm tính từ): bỏ chỗ trống, bỏ dấu
const tapWords = t => plain(t.replace(/\[\[[^\]]+\]\]/g, ' ____ ')).split(/(\s+)/).map(p => {
  const w = p.replace(/^[^A-Za-z’']+|[^A-Za-z’']+$/g, '');
  return w && /[a-z]/i.test(w) ? p.replace(w, `<button type="button" class="tw" data-w="${esc(w.toLowerCase().replace(/’/g, "'"))}">${esc(w)}</button>`) : esc(p);
}).join('');
// dòng hội thoại (không có chỗ trống)
const dlLine = l => `<div class="dl"><b class="spk">${esc(l[0])}</b><span>${vt(l[1])}</span></div>`;
function exFill(e){
  const rows = `${e.example ? `<div class="fli ex0"><span class="cn">0</span><span>${fillLine(e.example)}</span></div>` : ''}
      ${e.items.map((it, j) => { const k = e.id + '-' + (j + 1);
        if (it.who) return `<div class="qi dlg" data-qk="${k}">${(it.pre || []).map(dlLine).join('')}
          <div class="dl dlq"><b class="spk">${esc(it.who)}</b><span><span class="cn sm">${j + 1}</span> ${fillLine(it.t, k)}</span></div><div class="fix" id="fix-${k}"></div></div>`;
        return `<div class="qi fli" data-qk="${k}"><span class="cn">${j + 1}</span><span>${fillLine(it.t, k)}</span><div class="fix" id="fix-${k}"></div></div>`; }).join('')}
      ${e.after ? `<div class="dla">${e.after.map(dlLine).join('')}</div>` : ''}`;
  if (!e.box) return `<div class="dlbox">${rows}</div>`;
  return `<div class="wb2"><div class="wbl">${rows}
    </div>${bankHtml(e, e.box, '📦 Words')}</div>
    ${e.adj ? `<div class="qi adjb" data-qk="${e.id}-adj"><h3>🔎 ${esc(e.adj.how)}</h3><div class="adjc" id="adjc-${e.id}"></div>
      <div class="adjs">${[e.example].concat(e.items.map(x => x.t)).filter(Boolean).map((t, i) => `<p><span class="cn sm">${i}</span> ${tapWords(t)}</p>`).join('')}</div>
      <div class="fix" id="fix-${e.id}-adj"></div></div>` : ''}`;
}
// Chọn đáp án: 3 tranh / 3 chữ (Listening), tranh + tên cửa hàng (opts chung), hoặc chữ cái A–H với khung mẩu chữ (gallery)
const LET = 'ABCDEFGH';
const pickOpts = (e, it) => it.opts || e.opts || null;
const pickText = (e, it, L) => { const i = LET.indexOf(L), o = pickOpts(e, it); return it.desc ? it.desc[i] : o ? o[i] : ''; };
function exPick(e){
  const gal = e.gallery ? `<div class="gal">${e.gallery.map(g => `<div class="gi${g.L === e.cross ? ' gix' : ''}"><b class="gl">${g.L}</b>${g.img
      ? `<img src="img/${g.img}" alt="Text ${g.L}" loading="lazy">` : `<div class="nt ${g.cls || ''}">${vt(g.html)}</div>`}</div>`).join('')}</div>` : '';
  const ex = e.example ? `<div class="pkx"><span class="cn">0</span><span>${vt(e.example.q)}</span><span class="pkxa">Answer: <b>${e.example.key}</b></span></div>` : '';
  const rows = e.items.map((it, j) => { const k = e.id + '-' + (j + 1);
    const o = pickOpts(e, it), Ls = e.letters ? LET.slice(0, e.letters).split('') : LET.slice(0, it.img ? it.img.length : o.length).split('');
    const btns = e.letters
      ? `<div class="pko lt">${Ls.map(L => `<button type="button" class="pk lt${L === e.cross ? ' x' : ''}" data-pk="${k}" data-val="${L}"${L === e.cross ? ' disabled' : ''}><b class="pkl">${L}</b></button>`).join('')}</div>`
      : `<div class="pko${e.noLetter ? ' nl' : ''}">${Ls.map((L, i) => `<button type="button" class="pk${it.img ? '' : ' txto'}" data-pk="${k}" data-val="${L}">
        ${it.img ? `<img src="img/${it.img[i]}" alt="${esc(it.desc ? it.desc[i] : L)}" loading="lazy">` : `<span class="pkt">${esc(o[i])}</span>`}${e.noLetter ? '' : `<b class="pkl">${L}</b>`}</button>`).join('')}</div>`;
    return `<div class="qi pki" data-qk="${k}"><div class="pkq"><span class="cn">${j + 1}</span><span>${it.q ? vt(it.q) : ''}</span></div>
      ${it.pic ? `<img class="pkpic" src="img/${it.pic}" alt="Picture ${j + 1}" loading="lazy">` : ''}
      ${it.audio ? `<audio controls preload="none" src="audio/${it.audio}.mp3"></audio>` : ''}
      ${btns}<div class="fix" id="fix-${k}"></div></div>`; }).join('');
  // có khung A–H: 2 cột song song để nối (câu hỏi trái, khung chữ phải dính theo khi cuộn; chạm vào ô để phóng to)
  return gal ? `<div class="mt2"><div class="mtl">${ex}${rows}</div><aside class="mtg"><div class="mtgh">🔍 Tap to zoom</div>${gal}</aside></div>` : ex + rows;
}
// phóng to một ô A–H
function zoomGi(gi){
  const ov = document.createElement('div'); ov.className = 'zoomov';
  ov.innerHTML = `<div class="zoombox">${gi.innerHTML}<span class="zoomx">✕</span></div>`;
  ov.addEventListener('click', () => ov.remove());
  document.body.appendChild(ov);
}
// Chạm chọn từ trong câu (much / many, some / any): mỗi [[đáp án]] là một nhóm nút
const blanksOf = t => (t.match(/\[\[[^\]]+\]\]/g) || []).map(x => x.slice(2, -2));
function chooseLine(e, t, k){
  let i = 0;
  return t.split(/\[\[([^\]]+)\]\]/).map((p, n) => {
    if (!(n % 2)) return vt(p);
    if (!k) return `<span class="exv">${esc(p)}</span>`;
    const bi = i++;
    return `<span class="cbg">${e.choices.map(c => `<button type="button" class="cb" data-cb="${k}" data-i="${bi}" data-val="${esc(c)}">${esc(c)}</button>`).join('')}</span>`;
  }).join('');
}
function exChoose(e){
  return `${e.example ? `<div class="fli ex0 chi"><span class="cn">0</span><span>${chooseLine(e, e.example.t)}${e.example.a ? `<span class="rep">– ${vt(e.example.a)}</span>` : ''}</span></div>` : ''}
    ${e.items.map((it, j) => { const k = e.id + '-' + (j + 1);
      return `<div class="qi fli chi" data-qk="${k}"><span class="cn">${j + 1}</span><span>${chooseLine(e, it.t, k)}${it.a ? `<span class="rep">– ${vt(it.a)}</span>` : ''}</span><div class="fix" id="fix-${k}"></div></div>`; }).join('')}`;
}
// Số ít + số nhiều theo tranh, chữ cái cuối của từ số ít → ô chữ bí mật
const lastL = s => { const x = letters(s); return x ? x.slice(-1) : ''; };
function exPlural(e){
  const ex = e.example, pz = e.puzzle;
  const card = (img, n, a, b) => `<div class="plc"><img src="img/${img}" alt="Picture ${n}" loading="lazy"><div class="plf">${a}${b}</div>`;
  let n = 0;
  const boxes = pz ? pz.groups.map(g => `<span class="pzg">${Array.from({ length: g }, () => { n++; return `<span class="pzb" data-pz="${n}"><i>${n}</i><b></b></span>`; }).join('')}</span>`).join('') : '';
  return `<div class="plg">
      ${card(ex.img, 1, `<span class="pll">one</span><span class="exv">${esc(ex.s)}</span>`, `<span class="pll">two +</span><span class="exv">${esc(ex.p)}</span>`)}<span class="plx">Example</span></div>
      ${e.items.map((it, j) => { const k = e.id + '-' + (j + 1);
        return `<div class="qi pli" data-qk="${k}">${card(it.img, j + 2,
          `<label class="pll" for="pl-${k}s">one</label><input class="txt pl" id="pl-${k}s" data-k="${k}s" ${ia} aria-label="Picture ${j + 2} singular">`,
          `<label class="pll" for="pl-${k}p">two +</label><input class="txt pl" id="pl-${k}p" data-k="${k}p" ${ia} aria-label="Picture ${j + 2} plural">`)}<div class="fix" id="fix-${k}"></div></div></div>`; }).join('')}
    </div>
    ${pz ? `<div class="qi pzq" data-qk="${e.id}-w"><h3>🔐 ${vt(pz.how)}</h3><div class="pz" id="pz-${e.id}">${boxes}</div>
      <div class="pzw"><span>The words say:</span>${txtIn(e.id + '-w', 'Secret message')}</div><div class="fix" id="fix-${e.id}-w"></div></div>` : ''}`;
}
let PZ_WIN = null; // null = chưa vẽ lần nào (mở lại trang không bắn pháo giấy)
const adjKey = e => e.id + '-adj';
// tính từ em đã chạm: tính từ đúng xếp trước (để chấm theo ô 1, 2, 3)
const adjSlots = e => { const p = S.ch[adjKey(e)] || [], v = e.adj.valid; return p.filter(w => v.includes(w)).concat(p.filter(w => !v.includes(w))); };

// vẽ lại trạng thái các dạng bài mới theo giai đoạn (làm bài / xem đúng sai / làm lại / xong)
function paintNew(){
  const fin = S.phase === 'done', rev = S.phase === 'review' || S.phase === 'retry';
  const R = fin ? (S.r2 || S.r1) : rev ? S.r1 : null;
  const mark = (row, k) => { if (!row) return; row.classList.remove('ok', 'bad'); if (R && R.items[k] && (fin || R.items[k].ok || !canEdit(k))) row.classList.add(R.items[k].ok ? 'ok' : 'bad'); };
  const hint = (k, solve) => { const f = $('#fix-' + k); if (!f) return; f.innerHTML = '';
    if (S.phase === 'retry' && S.r1.items[k] && !S.r1.items[k].ok) f.innerHTML = '<span class="again">💡 ' + esc(hintFor(k)) + '</span>';
    else if (fin && R.items[k] && !R.items[k].ok) f.textContent = '→ ' + solve; };
  exOf('fixit').forEach(e => e.items.forEach((it, j) => {
    const k = e.id + '-' + (j + 1), ch = S.ch[k], ed = canEdit(k);
    $$(`[data-tf="${k}"]`).forEach(b => { b.classList.toggle('on', b.dataset.val === ch); b.disabled = !ed; });
    const w = $('#fxw-' + k), el = w && $('.txt', w);
    if (w) w.hidden = ch !== 'bad';
    if (el){ if (el.value !== (S.t[k + 'w'] || '')) el.value = S.t[k + 'w'] || ''; el.disabled = !ed; }
    mark($(`[data-qk="${k}"]`), k);
    hint(k, it.fix ? alts(it.fix)[0] : 'This question is correct ✓');
    if (fin && R.items[k] && R.items[k].ok && !it.fix){ const f = $('#fix-' + k); if (f) f.textContent = '✓ This question is correct.'; }
  }));
  exOf('write').forEach(e => e.items.forEach((it, j) => mark($(`[data-qk="${e.id}-${j + 1}"]`), e.id + '-' + (j + 1))));
  exOf('fill').forEach(e => {
    const used = e.items.map((it, j) => (S.t[e.id + '-' + (j + 1)] || '').trim().toLowerCase());
    $$(`.chip[data-bank="${e.id}"]:not(.ex)`).forEach(c => { c.classList.toggle('used', used.includes(c.dataset.chip)); c.disabled = !e.items.some((it, j) => canEdit(e.id + '-' + (j + 1))); });
    if (!e.adj) return;
    const picks = S.ch[adjKey(e)] || [], ks = [1, 2, 3].map(i => adjKey(e) + '-' + i), ed = ks.some(canEdit);
    // lúc làm lại: từ đã đúng ở lần 1 thì khoá; chỉ tô đỏ những từ đã chọn sai ở lần 1 (không lộ từ mới chọn đúng hay sai)
    const r1ok = rev ? ks.filter(k => S.r1.items[k].ok).map(k => S.r1.items[k].ans) : [];
    const r1bad = rev ? ks.filter(k => !S.r1.items[k].ok).map(k => S.r1.items[k].ans).filter(Boolean) : [];
    $$(`[data-qk="${adjKey(e)}"] .tw`).forEach(b => { const w = b.dataset.w, on = picks.includes(w), valid = e.adj.valid.includes(w);
      b.classList.toggle('on', on); b.disabled = !ed || r1ok.includes(w);
      b.classList.toggle('ok', on && ((fin && valid) || r1ok.includes(w)));
      b.classList.toggle('bad', on && ((fin && !valid) || r1bad.includes(w))); });
    const c = $('#adjc-' + e.id); if (c) c.textContent = `Your adjectives: ${picks.length ? picks.join(', ') : '–'} (${picks.length}/3)`;
    const row = $(`[data-qk="${adjKey(e)}"]`); row.classList.remove('ok', 'bad');
    if (R){ const okAll = ks.every(k => R.items[k] && R.items[k].ok); if (fin || okAll || !ed) row.classList.add(okAll ? 'ok' : 'bad'); }
    const f = $('#fix-' + adjKey(e)); f.innerHTML = '';
    if (S.phase === 'retry' && ks.some(k => !S.r1.items[k].ok)) f.innerHTML = '<span class="again">💡 ' + esc(hintFor(ks.find(k => !S.r1.items[k].ok))) + '</span>';
    else if (fin && !ks.every(k => R.items[k].ok)) f.textContent = '→ ' + e.adj.show;
  });
  exOf('pick').forEach(e => e.items.forEach((it, j) => {
    const k = e.id + '-' + (j + 1), ch = S.ch[k], ed = canEdit(k), it2 = R && R.items[k];
    $$(`[data-pk="${k}"]`).forEach(b => { const v = b.dataset.val; b.classList.toggle('on', v === ch); b.disabled = !ed || v === e.cross;
      b.classList.toggle('right', fin && v === it.key); b.classList.toggle('wrong', !!it2 && (fin || !ed) && v === ch && !it2.ok); });
    mark($(`[data-qk="${k}"]`), k);
    const tx = pickText(e, it, it.key); hint(k, e.noLetter ? tx : it.key + (tx ? ' (' + tx + ')' : ''));
  }));
  exOf('choose').forEach(e => e.items.forEach((it, j) => {
    const k = e.id + '-' + (j + 1), ch = S.ch[k] || [], ed = canEdit(k), keys = blanksOf(it.t), it2 = R && R.items[k];
    $$(`[data-cb="${k}"]`).forEach(b => { const i = +b.dataset.i, v = b.dataset.val, on = ch[i] === v; b.classList.toggle('on', on); b.disabled = !ed;
      b.classList.toggle('right', fin && v === keys[i]); b.classList.toggle('wrong', !!it2 && (fin || !ed) && on && v !== keys[i]); });
    mark($(`[data-qk="${k}"]`), k);
    hint(k, plain(it.t.replace(/\[\[([^\]]+)\]\]/g, '$1')));
  }));
  exOf('plural').forEach(e => {
    e.items.forEach((it, j) => {
      const k = e.id + '-' + (j + 1), ed = canEdit(k);
      ['s', 'p'].forEach(x => { const el = $(`input.txt[data-k="${k}${x}"]`); if (!el) return;
        if (el.value !== (S.t[k + x] || '')) el.value = S.t[k + x] || ''; el.disabled = !ed; });
      mark($(`[data-qk="${k}"]`), k);
      hint(k, alts(it.s)[0] + ' / ' + alts(it.p)[0]);
    });
    if (!e.puzzle) return;
    // ô chữ tự hiện chữ cái cuối của các từ số ít em đã gõ
    const want = letters(e.puzzle.key), got = [lastL(e.example.s)].concat(e.items.map((it, j) => lastL(S.t[e.id + '-' + (j + 1) + 's'])));
    $$(`#pz-${e.id} .pzb`).forEach((b, i) => { const L = got[i] || ''; $('b', b).textContent = L.toUpperCase(); b.classList.toggle('on', !!L); });
    const win = got.join('') === want, box = $('#pz-' + e.id);
    if (box) box.classList.toggle('win', win);
    if (win && PZ_WIN === false && S.phase !== 'done' && typeof confetti === 'function'){ confetti(60); if (typeof sfx === 'function') sfx('win'); }
    PZ_WIN = win;
  });
}
// chạm từ trong khung: bài fixit → chèn vào chỗ con trỏ; bài fill → điền vào ô đang chọn / ô trống đầu tiên
let LASTIN = null;
document.addEventListener('focusin', ev => { if (ev.target.matches && ev.target.matches('.txt')) LASTIN = ev.target; });
function useChip(c){
  const e = LESSON.ex.find(x => x.id === c.dataset.bank), sec = $('#ex' + e.id), word = c.dataset.chip;
  const open = $$('.txt', sec).filter(el => !el.disabled && el.offsetParent);
  let el = LASTIN && open.includes(LASTIN) ? LASTIN : null;
  if (e.type === 'fill'){
    el = el || open.find(x => !x.value.trim()) || open[0]; if (!el) return;
    el.value = word;
  } else {
    if (!el) el = open[0]; if (!el) return;
    const v = el.value, s = el.selectionStart != null && document.activeElement === el ? el.selectionStart : (el._caret != null ? el._caret : v.length);
    const a = v.slice(0, s), b = v.slice(s), ins = (a && !/\s$/.test(a) ? ' ' : '') + word + (b && !/^\s/.test(b) ? ' ' : '');
    el.value = a + ins + b; el._caret = (a + ins).length;
  }
  el.dispatchEvent(new Event('input')); el.focus();
  if (el._caret != null) try { el.setSelectionRange(el._caret, el._caret); } catch (err) {}
}
// nhớ vị trí con trỏ khi em chạm sang khung từ (ô mất focus)
document.addEventListener('focusout', ev => { const el = ev.target; if (el.matches && el.matches('.txt.fx')) el._caret = el.selectionStart; });

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
      ${LESSON.grammar ? `<section class="card gram"><h2>📘 Grammar</h2><div class="gbody">${LESSON.grammar}</div></section>` : ''}
      ${LESSON.ex.map(e => `<section class="card ex" id="ex${e.id}">${exHead(e)}${
        e.type === 'reasons' ? exReasons(e) : e.type === 'spell' ? exSpell(e) : e.type === 'info' ? exInfo(e)
          : e.type === 'fixit' ? exFixit(e) : e.type === 'write' ? exWrite(e) : e.type === 'fill' ? exFill(e) : e.type === 'pick' ? exPick(e)
          : e.type === 'choose' ? exChoose(e) : e.type === 'plural' ? exPlural(e) : exSpeak(e)}</section>`).join('')}
    </div>`;

  // nhập chữ
  $$('input.txt, textarea.txt').forEach(el => {
    el.value = S.t[el.dataset.k] || '';
    el.addEventListener('input', () => { if (el.disabled || S.phase === 'done') return; S.t[el.dataset.k] = el.value; if (S.phase === 'retry') el.classList.remove('bad'); save(); progress(); paintCounts(); if (el.matches('.fb, .pl')) paintNew(); });
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
    // ✅ Correct / ❌ Wrong (bài tìm lỗi): chọn ❌ lần đầu thì chép sẵn câu gốc vào ô để em sửa
    const tf = ev.target.closest('[data-tf]');
    if (tf && canEdit(tf.dataset.tf)){
      const k = tf.dataset.tf, e = LESSON.ex.find(x => k.startsWith(x.id + '-'));
      S.ch[k] = tf.dataset.val;
      if (tf.dataset.val === 'bad' && !(S.t[k + 'w'] || '').trim()) S.t[k + 'w'] = itemOf(e, k).t;
      save(); paintNew(); progress();
      if (tf.dataset.val === 'bad'){ const el = $(`input.txt[data-k="${k}w"]`); if (el){ el.focus(); el._caret = el.value.length; } }
      return;
    }
    const gi = ev.target.closest('.mtg .gi');
    if (gi && !ev.target.closest('.vw')){ zoomGi(gi); return; }
    const pk = ev.target.closest('[data-pk]');
    if (pk && canEdit(pk.dataset.pk)){ S.ch[pk.dataset.pk] = pk.dataset.val; save(); paintNew(); progress(); return; }
    // much / many, some / any: mỗi chỗ trống lưu 1 lựa chọn (S.ch[k] = mảng theo thứ tự chỗ trống)
    const cb = ev.target.closest('[data-cb]');
    if (cb && canEdit(cb.dataset.cb)){ const k = cb.dataset.cb, a = (S.ch[k] || []).slice(); a[+cb.dataset.i] = cb.dataset.val; S.ch[k] = a; save(); paintNew(); progress(); return; }
    const chip = ev.target.closest('.chip[data-chip]');
    if (chip && !chip.disabled){ useChip(chip); return; }
    const tw = ev.target.closest('.tw');
    if (tw && !tw.disabled){
      const e = LESSON.ex.find(x => x.adj && tw.closest(`[data-qk="${adjKey(x)}"]`)), key = adjKey(e), w = tw.dataset.w;
      const p = (S.ch[key] || []).slice(), i = p.indexOf(w);
      if (i >= 0) p.splice(i, 1);
      else if (p.length >= 3){ tw.classList.remove('shake'); void tw.offsetWidth; tw.classList.add('shake'); return; } // tối đa 3 từ
      else p.push(w);
      S.ch[key] = p; save(); paintNew(); progress(); return;
    }
    const pl = ev.target.closest('[data-play]'); if (pl){ playQ(pl.dataset.play, pl.dataset.src); return; }
    const rc = ev.target.closest('[data-rec]'); if (rc){ recStart(rc.dataset.rec); return; }
    if (ev.target.closest('[data-stop]')) recStop();
  });
  paintReasons(); paintSpeak(); paintCounts(); paintNew();
  const me = lsGet(ME_KEY) || {};
  $('#inName').value = S.name || me.name || ''; $('#inCls').value = S.cls || me.cls || '';
  bindAvPicker($('#avStart'), () => { if ($('#startErr').textContent.includes('avatar')) $('#startErr').textContent = ''; yaAvatar(); });
  if (YA && YA.me()){ // đã đăng nhập: tên + lớp theo tài khoản, ẩn 2 ô gõ
    const m = YA.me();
    $('#inName').value = m.fullName || m.name; $('#inCls').value = m.cls || '-';
    ['inName', 'inCls'].forEach(id => { $('#' + id).closest('.field').hidden = true; });
    $('#start h2').textContent = `👋 Hi ${m.name}!`;
    $('#start p.muted').innerHTML = 'Choose your avatar and tap <b>Start</b>. Put on headphones or turn the sound on 🎧';
    if (yaChar()){ const f = $('#avStart') && $('#avStart').closest('.field'); if (f) f.hidden = true; $('#start p.muted').innerHTML = 'Tap <b>Start</b> to begin. Put on headphones or turn the sound on 🎧'; }
  }
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
  if (!avGet() && !yaChar()){ $('#startErr').textContent = 'Em hãy chọn avatar nhé.'; $('#avStart').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
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
      : S.phase === 'work' && !YA ? '<button class="linkbtn" type="button" id="editName">Sửa tên / lớp</button>' : '');
  const b = $('#editName'); if (b) b.onclick = () => { $('#work').hidden = true; $('#bar').hidden = true; $('#start').hidden = false; $('#inName').focus(); };
}
function showWork(){ $('#start').hidden = true; $('#work').hidden = false; $('#bar').hidden = false; renderWho(); progress(); }

/* ============ TIẾN ĐỘ ============ */
function tasks(){
  const a = [];
  exOf('reasons').forEach(e => a.push({ k: 'reasons', ex: e.id, done: S.pick.length > 0 && S.best != null }));
  $$('input.txt:not(.fx)').forEach(el => { const sec = el.closest('section.ex'); a.push({ k: el.dataset.k, ex: sec ? sec.id.slice(2) : '', done: !!(S.t[el.dataset.k] || '').trim() }); });
  exOf('speak').forEach(e => e.clips.forEach((c, j) => a.push({ k: 'rec', ex: e.id, q: 'Q' + (j + 1), done: !!S.rec[e.id + '-' + (j + 1)] })));
  // tìm lỗi: chọn ✅, hoặc chọn ❌ và đã sửa câu
  exOf('fixit').forEach(e => e.items.forEach((it, j) => { const k = e.id + '-' + (j + 1), ch = S.ch[k], w = sn(S.t[k + 'w']);
    a.push({ k, ex: e.id, done: ch === 'ok' || (ch === 'bad' && !!w && w !== sn(it.t)) }); }));
  exOf('fill').forEach(e => { if (e.adj) a.push({ k: adjKey(e), ex: e.id, done: (S.ch[adjKey(e)] || []).length === 3 }); });
  exOf('pick').forEach(e => e.items.forEach((it, j) => { const k = e.id + '-' + (j + 1); a.push({ k, ex: e.id, done: !!S.ch[k] }); }));
  exOf('choose').forEach(e => e.items.forEach((it, j) => { const k = e.id + '-' + (j + 1), ch = S.ch[k] || [];
    a.push({ k, ex: e.id, done: blanksOf(it.t).every((x, i) => !!ch[i]) }); }));
  return a;
}
// Mission xong (đã làm đủ, chưa biết đúng sai) → huy hiệu ✅ trên đầu bài; lần đầu xong thì kêu "ting"
let MISSIONS_DONE = null;
function paintMissions(t){
  const now = LESSON.ex.filter(e => { const x = t.filter(y => y.ex === e.id); return x.length && x.every(y => y.done); }).map(e => e.id);
  LESSON.ex.forEach(e => {
    const sec = $('#ex' + e.id); if (!sec) return;
    const on = now.includes(e.id); sec.classList.toggle('mdone', on);
    const b = $('.badge', sec); if (b) b.textContent = `Mission ${exNo(e)}${on ? ' ✅' : ''}`;
    if (on && MISSIONS_DONE && !MISSIONS_DONE.includes(e.id) && typeof sfx === 'function'){ sfx('ok'); b && b.classList.remove('bump'); void (b && b.offsetWidth); b && b.classList.add('bump'); }
  });
  MISSIONS_DONE = now;
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
    // thanh nhiên liệu tên lửa: làm đủ hết → sẵn sàng cất cánh (nút Submit nhấp nháy)
    const t = tasks(), d = t.filter(x => x.done).length, pct = t.length ? Math.round(d / t.length * 100) : 0, full = t.length && d === t.length;
    $('#progT').innerHTML = full ? '🚀 <b>Ready for lift-off!</b>' : `⛽ Rocket fuel <b>${pct}%</b> · ${d}/${t.length}`;
    $('#progF').style.width = pct + '%';
    const rk = $('#progR'); if (rk) rk.style.left = pct + '%';
    bar.classList.toggle('ready', !!full);
    $('#submitBtn').textContent = full ? 'Lift off! 🚀' : 'Submit ✔'; $('#submitBtn').hidden = false;
    paintMissions(t);
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
  exOf('fixit').forEach(e => e.items.forEach((it, j) => {
    const k = e.id + '-' + (j + 1), ch = S.ch[k], w = (S.t[k + 'w'] || '').trim();
    items[k] = { ans: ch === 'ok' ? '✅ Correct' : ch === 'bad' ? '❌ → ' + w : '',
      ok: it.fix ? ch === 'bad' && alts(it.fix).some(a => sn(a) === sn(w)) : ch === 'ok' };
  }));
  exOf('write').forEach(e => e.items.forEach((it, j) => {
    const k = e.id + '-' + (j + 1), ans = (S.t[k] || '').trim();
    items[k] = { ans, ok: !!ans && (it.re ? new RegExp(it.re).test(sn(ans)) : alts(it.key).some(a => sn(a) === sn(ans))) };
  }));
  exOf('fill').forEach(e => {
    e.items.forEach((it, j) => { const k = e.id + '-' + (j + 1), ans = (S.t[k] || '').trim(), key = (it.t.match(/\[\[([^\]]+)\]\]/) || [])[1];
      items[k] = { ans, ok: !!ans && alts(key).some(a => sn(a) === sn(ans)) }; });
    if (e.adj){ const sl = adjSlots(e); [0, 1, 2].forEach(i => { const w = sl[i] || ''; items[adjKey(e) + '-' + (i + 1)] = { ans: w, ok: !!w && e.adj.valid.includes(w) }; }); }
  });
  exOf('pick').forEach(e => e.items.forEach((it, j) => { const k = e.id + '-' + (j + 1), ch = S.ch[k] || ''; items[k] = { ans: ch && e.noLetter ? pickText(e, it, ch) : ch, ok: ch === it.key }; }));
  exOf('choose').forEach(e => e.items.forEach((it, j) => { const k = e.id + '-' + (j + 1), ch = S.ch[k] || [], keys = blanksOf(it.t);
    items[k] = { ans: ch.some(Boolean) ? keys.map((x, i) => ch[i] || '…').join(' / ') : '', ok: keys.every((x, i) => ch[i] === x) }; }));
  exOf('plural').forEach(e => {
    e.items.forEach((it, j) => { const k = e.id + '-' + (j + 1), s = (S.t[k + 's'] || '').trim(), p = (S.t[k + 'p'] || '').trim();
      items[k] = { ans: s || p ? s + ' / ' + p : '', ok: alts(it.s).some(a => sn(a) === sn(s)) && alts(it.p).some(a => sn(a) === sn(p)) }; });
    if (e.puzzle){ const k = e.id + '-w', ans = (S.t[k] || '').trim(); items[k] = { ans, ok: !!ans && alts(e.puzzle.key).some(a => sn(a) === sn(ans)) }; }
  });
  const ks = Object.keys(items);
  return { items, score: ks.filter(k => items[k].ok).length, total: ks.length };
}
// danh sách câu (để hiển thị + gửi mail)
function itemList(){
  const L = [];
  exOf('spell').forEach(e => e.items.forEach((it, j) => L.push({ sec: String(exNo(e)), k: e.id + '-' + (j + 1), n: String(j + 1), q: 'Spell: ' + plain(it.hint), correct: it.key.toUpperCase() })));
  exOf('info').forEach(e => { let n = 0; e.people.forEach(p => p.rows.forEach(r => { if (r.ex) return; n++; L.push({ sec: String(exNo(e)), k: e.id + '-' + n, n: String(n), q: p.name + ' – ' + plain(r.q), correct: r.show || alts(r.key)[0] }); })); });
  exOf('fixit').forEach(e => e.items.forEach((it, j) => L.push({ sec: String(exNo(e)), k: e.id + '-' + (j + 1), n: String(j + 1), q: 'Câu gốc: ' + it.t, correct: it.fix ? '❌ → ' + alts(it.fix)[0] : '✅ Correct' })));
  exOf('write').forEach(e => e.items.forEach((it, j) => L.push({ sec: String(exNo(e)), k: e.id + '-' + (j + 1), n: String(j + 1), q: it.cue, correct: it.show || alts(it.key)[0] })));
  exOf('fill').forEach(e => {
    e.items.forEach((it, j) => L.push({ sec: String(exNo(e)), k: e.id + '-' + (j + 1), n: String(j + 1), q: (it.who ? it.who + ': ' : '') + plain(it.t.replace(/\[\[[^\]]+\]\]/, '____')), correct: alts((it.t.match(/\[\[([^\]]+)\]\]/) || [])[1])[0] }));
    if (e.adj) [1, 2, 3].forEach(i => L.push({ sec: String(exNo(e)), k: adjKey(e) + '-' + i, n: 'Tính từ ' + i, q: 'Tìm thêm 3 tính từ trong các câu', correct: e.adj.show }));
  });
  exOf('pick').forEach(e => e.items.forEach((it, j) => { const tx = pickText(e, it, it.key);
    L.push({ sec: String(exNo(e)), k: e.id + '-' + (j + 1), n: String(j + 1), q: it.q ? plain(it.q) : 'Tranh ' + (j + 1), correct: e.noLetter ? tx : it.key + (tx ? ' (' + tx + ')' : '') }); }));
  exOf('choose').forEach(e => e.items.forEach((it, j) => L.push({ sec: String(exNo(e)), k: e.id + '-' + (j + 1), n: String(j + 1),
    q: plain(it.t.replace(/\[\[[^\]]+\]\]/g, '____')), correct: blanksOf(it.t).join(' / ') })));
  exOf('plural').forEach(e => {
    e.items.forEach((it, j) => L.push({ sec: String(exNo(e)), k: e.id + '-' + (j + 1), n: String(j + 2), q: 'Hình ' + (j + 2) + ': số ít / số nhiều', correct: alts(it.s)[0] + ' / ' + alts(it.p)[0] }));
    if (e.puzzle) L.push({ sec: String(exNo(e)), k: e.id + '-w', n: 'Ô chữ', q: 'Chữ cái cuối ghép thành câu gì?', correct: e.puzzle.show });
  });
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
  if (e.type === 'fill' && e.adj && k.startsWith(adjKey(e) + '-')) return 'Có từ em chọn chưa phải tính từ. Tính từ là từ miêu tả người, vật (VD: happy, big). Đừng chọn từ trong khung.';
  if (e.type === 'fixit'){
    const it = itemOf(e, k), ch = S.r1 && S.ch[k];
    if (!it.fix) return 'Đọc lại thật kĩ: câu này có sai thật không? 🤔';
    if (S.r1.items[k].ans.startsWith('✅')) return 'Câu này có lỗi đó! ' + it.h;
    return it.h;
  }
  if (e.type === 'plural'){
    if (k === e.id + '-w') return 'Đọc các chữ cái trong ô theo từng nhóm. Nếu ô chữ chưa ra từ có nghĩa, xem lại các từ số ít ở trên.';
    const it = itemOf(e, k), s = ans.split(' / ')[0] || '';
    if (!alts(it.s).some(a => sn(a) === sn(s))) return 'Xem lại tên của đồ vật trong hình (số ít). Chữ cái cuối phải khớp với ô chữ bên dưới.';
    return it.h || 'Xem lại cách viết số nhiều.';
  }
  if (e.type === 'write' || e.type === 'fill' || e.type === 'pick' || e.type === 'choose') return itemOf(e, k).h || 'Xem lại câu này nhé.';
  let n = 0, who = '', keys = [];
  e.people.forEach(p => p.rows.forEach(r => { if (r.ex) return; n++; if (e.id + '-' + n === k){ who = p.name; keys = alts(r.key); } }));
  const y = norm(ans);
  if (keys.some(a => { const x = norm(a); return x.length >= 4 && lev(x, y) <= Math.max(1, Math.floor(x.length / 4)); })) return 'Gần đúng rồi! Xem lại chính tả.';
  return `Nghe lại đoạn ${who} nói.`;
}
const ITEM_SEL = '.sp, .person, .qrow, .qi, .fli.ex0, .wex, .dla, .pkx, .plg > .plc';
function focusWrong(on){
  document.body.classList.toggle('retrying', !!on);
  $$('.rt-hide').forEach(x => x.classList.remove('rt-hide'));
  if (!on) return;
  const els = wrongKeys().map(k => $(`input.txt[data-k="${k}"]`) || $(`[data-qk="${k}"]`) || $(`[data-qk="${k.replace(/-adj-\d+$/, '-adj')}"]`)).filter(Boolean);
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
    // nút nộp lần 2 đặt bên TRÁI (khác chỗ nút "Làm lại câu sai" vừa bấm bên phải)
    tb.innerHTML = `<button class="btn orange" type="button" id="submit2Btn">Nộp lần 2 ✔</button><div class="tt" id="topT"></div>`;
    $('#submit2Btn').onclick = onSubmit;
    topProgress();
  }
}
function topProgress(){
  const el = $('#topT'); if (!el) return;
  const w = wrongKeys(), fixed = fixedCount();
  el.textContent = `✏️ Đã sửa ${fixed}/${w.length} câu`;
  const b = $('#submit2Btn'); if (b) b.classList.toggle('dim', !fixed); // chưa sửa câu nào: nút mờ
}
// số câu sai em đã sửa (khác câu trả lời lần 1)
function fixedCount(){ const g = gradeNow(); return wrongKeys().filter(k => g.items[k] && g.items[k].ans !== (S.r1.items[k].ans || '')).length; }
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
      ${teaseLine1()}
      <div class="status" id="sendStatus"></div></div></div>`;
    updateStatus();
    return;
  }
  // xong: điểm + cô đã nhận bài + Let's review (đúng hết ngay lần 1 thì vẫn có meme)
  const R = S.r2 || S.r1;
  box.innerHTML = `<div class="card summary">${S.r2 ? '' : memeOf(S.r1)}
    <div class="sumr"><div class="score">${R.score}<span>/${R.total}</span></div>
    ${S.r2 ? praiseLine2() : ''}
    <div class="status" id="sendStatus"></div>
    ${R.score < R.total ? '<div class="big">Let’s review the answers below 👇</div>' : ''}</div></div>`;
  updateStatus();
}
function paintAll(){ paintMarks(); paintNew(); paintReasons(); paintSpeak(); focusWrong(S.phase === 'retry'); renderTop(); renderSummary(); renderWho(); progress(); }

/* ============ CHỐNG NỘP NHẦM + LINK LÀM LẠI CỦA CÔ ============ */
// Còn trống quá tỉ lệ này thì không cho nộp lần 1; làm chưa đủ số phút này thì chưa cho nộp.
const MAX_EMPTY = 0.25;
const MIN_MINUTES = 3;
// Link cho em làm lại 1 bài đã nộp: link bài đó + &lamlai=yumi-lamlai (mở trên đúng máy em đã làm).
// Mỗi mã chỉ dùng 1 lần trên mỗi máy; cần làm lại lần nữa thì thêm số: yumi-lamlai2, yumi-lamlai3…
const RESET_CODE = 'yumi-lamlai';
const modalOpen = () => { const m = $('#modal'); return !!m && !m.hidden; };
// Hộp xác nhận trên trang (thay confirm của trình duyệt). yes = nút phụ (Nộp), no = nút chính (Làm tiếp). Không có yes = chỉ thông báo.
function modal(msg, yes, no){
  if (!$('#modal')) document.body.insertAdjacentHTML('beforeend', '<div class="modal" id="modal" hidden><div class="mbox" role="dialog" aria-modal="true"><div class="mmsg" id="mMsg"></div><div class="mbtns"><button class="btn ghost" type="button" id="mYes"></button><button class="btn" type="button" id="mNo"></button></div></div></div>');
  return new Promise(res => {
    const m = $('#modal'), y = $('#mYes'), n = $('#mNo');
    $('#mMsg').innerHTML = msg;
    y.hidden = !yes; y.textContent = yes || ''; n.textContent = no;
    y.disabled = true; setTimeout(() => { y.disabled = false; }, 900); // chạm 2 lần liên tiếp không nộp được
    const done = v => { m.hidden = true; y.onclick = n.onclick = null; res(v); };
    y.onclick = () => done(true); n.onclick = () => done(false);
    m.hidden = false; n.focus();
  });
}
/* ============ CÂU CHỌC / KHEN CỦA CÔ (tiếng Việt, hợp tuổi 12, chọn ngẫu nhiên, không lặp câu vừa dùng) ============ */
const TEASE = {
  empty: [ // nộp khi còn trống > 25%
    'Mới làm có <b>{x}/{n}</b> câu mà đã muốn nộp rồi á? Tên lửa chưa đổ đủ xăng đâu em 🚀⛽',
    'Còn <b>{e} câu</b> trống kìa! Mấy câu đó đang buồn vì bị bỏ rơi đó 🥺',
    'Ơ, mới khởi động thôi mà! Còn <b>{e} câu</b> đang chờ em nè 👀',
    'Bỏ trống nhiều thế này cô chấm bằng… phép thuật à? 🪄 Làm tiếp nha!'],
  early: [ // nộp khi chưa đủ 3 phút
    'Mới <b>{m} phút</b> đã xong? Nhanh như tia chớp ⚡ Nhưng soát lại thêm <b>{r} phút</b> nữa nhé!',
    'Em là siêu nhân tốc độ à? 🦸 Kiểm tra lại thêm <b>{r} phút</b> rồi mới nộp được nha.',
    'Từ từ thôi phi hành gia ơi! 🧑‍🚀 Còn <b>{r} phút</b> nữa mới được nộp.',
    'Nhanh quá cô theo không kịp 😵 Nghe lại audio, xem lại bài thêm <b>{r} phút</b> nhé!'],
  away: [ // quay lại trang sau hơn 5 lần rời trang
    'Em đi đâu đó? Cô thấy hết nha 👀',
    'Bài ở đây nè, đừng chạy đi đâu nữa! 🏃',
    'Hỏi Google hoài là não không lớn đâu nha 🧠',
    'Cô đang đếm số lần em rời trang đó nha 🕵️',
    'Tập trung nào phi hành gia! Tên lửa sắp cất cánh rồi 🚀'],
  low1: [ // điểm lần 1 dưới 70%
    '{s}/{t}… Hơi “toang” một chút rồi 😬 Làm lại câu sai cho cô xem nào!',
    'Hmm, {s}/{t}. Cô biết em làm được tốt hơn mà! 💪',
    'Sai {w} câu rồi nè. Nghe lại thật kĩ rồi phục thù nha ⚔️',
    'Điểm này chưa phải sức của em đâu. Chứng minh cho cô xem đi! 😤'],
  fixAll: [ // lần 2: sửa đúng hết
    'Sửa đúng hết luôn! Đỉnh quá trời đỉnh 🚀',
    'Xuất sắc! Em đúng là ngôi sao sáng nhất dải ngân hà ⭐',
    'Wow, không sót câu nào! Cô tự hào về em lắm 🥹🏆',
    'Quá xịn! Cô tặng em 1000 like 👍🔥'],
  fixSome: [ // lần 2: sửa đúng một phần
    'Sửa đúng {f} câu rồi, giỏi lắm! Mấy câu còn lại cô giảng trên lớp nha 💪',
    'Có cố gắng là có tiến bộ: {f} câu đã lên xanh rồi đó 🌱',
    'Không bỏ cuộc là siêu anh hùng! {f} câu đã được giải cứu 🦸',
    'Đang lên level đó nha! Tuần sau cố thêm chút nữa 📈'],
  fixNone: [ // lần 2: chưa sửa đúng câu nào
    'Chưa sửa đúng câu nào nhưng em đã dám thử lại, tốt lắm! Xem đáp án bên dưới nha 👇',
    'Hơi khó một chút ha 😅 Đọc kĩ đáp án rồi tuần sau làm tốt hơn nhé!'],
  nofix: [ // bấm Nộp lần 2 khi chưa sửa câu nào
    'Em gửi cô 2 bài giống y chang nhau làm chi? 🙄',
    'Ủa, chưa sửa câu nào mà nộp lần 2 rồi á? 😏',
    'Bài này giống bài lúc nãy như 2 giọt nước luôn 👯'],
};
function tease(kind, vars = {}){
  const list = TEASE[kind], last = lsGet('ket-tease') || {};
  let i; do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === last[kind]);
  last[kind] = i; lsSet('ket-tease', last);
  return list[i].replace(/\{(\w)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : '');
}
// dòng nhắc nổi ở đầu màn hình, tự tắt
function toast(html, ms = 4000){
  let t = $('#toast');
  if (!t){ document.body.insertAdjacentHTML('beforeend', '<div class="toast" id="toast" role="status" hidden></div>'); t = $('#toast'); }
  t.innerHTML = html; t.hidden = false; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toast.tm); toast.tm = setTimeout(() => { t.hidden = true; }, ms);
}
// Lần 1 dưới 70% → câu chọc; lần 2 → câu khen theo số câu đã sửa đúng. Giữ cố định khi mở lại trang.
function teaseLine1(){
  const R = S.r1; if (!R || !R.total || R.score / R.total >= .7) return '';
  if (!S.tease1){ S.tease1 = tease('low1', { s: R.score, t: R.total, w: R.total - R.score }); save(); }
  return `<div class="tease">${S.tease1}</div>`;
}
function praiseLine2(){
  if (!S.tease2){
    const ks = Object.keys(S.r1.items).filter(k => !S.r1.items[k].ok);
    const f = ks.filter(k => S.r2.items[k] && S.r2.items[k].ok).length;
    S.tease2 = tease(f === ks.length ? 'fixAll' : f ? 'fixSome' : 'fixNone', { f }); save();
  }
  return `<div class="tease good">${S.tease2}</div>`;
}

// Lần 1: chặn khi làm quá ít / quá nhanh, rồi hỏi lại
async function guard1(left, total){
  if (modalOpen()) return false;
  if (left > total * MAX_EMPTY){
    await modal(`📝 ${tease('empty', { x: total - left, n: total, e: left })}`, '', 'Dạ, em làm tiếp 😅');
    return false;
  }
  const mins = S.startedAt ? (Date.now() - new Date(S.startedAt)) / 60000 : MIN_MINUTES;
  if (mins < MIN_MINUTES){
    await modal(`⏱️ ${tease('early', { m: Math.max(1, Math.floor(mins)), n: total, r: Math.ceil(MIN_MINUTES - mins) })}`, '', 'Dạ, em soát lại 🧐');
    return false;
  }
  const go = await modal(left ? `Em còn <b>${left} câu</b> chưa làm.<br>Em chắc chắn muốn nộp bài cho cô?` : 'Em đã kiểm tra kĩ chưa?<br>Nộp bài cho cô nhé?', 'Nộp bài', 'Làm tiếp ✏️');
  return go && S.phase === 'work';
}
// Lần 2: phải sửa ít nhất 1 câu sai
async function guard2(){
  if (modalOpen()) return false;
  const w = wrongKeys().length, c = fixedCount();
  if (!c){ await modal(`✏️ ${tease('nofix')}<br><small>Sửa các câu sai rồi mới nộp lần 2 nhé!</small>`, '', 'Dạ, em sửa bài 😅'); return false; }
  const go = await modal(`Em đã sửa <b>${c}/${w}</b> câu sai.<br>Nộp lần 2 cho cô nhé? Nộp xong sẽ hiện đáp án, không sửa được nữa.`, 'Nộp lần 2', 'Sửa tiếp ✏️');
  return go && S.phase === 'retry';
}
// ?lamlai=MÃ: xoá bài đã nộp (giữ tên, lớp) của bài đang mở. Trả về true nếu vừa xoá.
function applyRedo(key){
  let qp; try { qp = new URLSearchParams(location.search); } catch (e) { return false; }
  const tok = qp.get('lamlai'); if (tok === null) return false;
  qp.delete('lamlai');
  try { history.replaceState(null, '', location.pathname + (qp.toString() ? '?' + qp : '') + location.hash); } catch (e) {} // tải lại trang không xoá nữa
  if (!tok.startsWith(RESET_CODE) || !S.r1) return false;
  const UK = 'lamlai-used', id = key + ':' + tok, got = lsGet(UK), used = Array.isArray(got) ? got : [];
  if (used.includes(id)) return false;
  used.push(id); lsSet(UK, used);
  S = Object.assign(blank(), { name: S.name, cls: S.cls, redo: (S.redo || 0) + 1 });
  save(); return true;
}
const redoTitle = () => S.redo ? ' – LÀM LẠI' + (S.redo > 1 ? ' lần ' + S.redo : '') : '';
const REDO_MSG = '<div class="okmsg">✅ Cô đã cho em làm lại bài. Bấm <b>Start</b> để bắt đầu nhé!</div>';

/* ============ NỘP BÀI ============ */
async function onSubmit(){
  if (REC){ alert('Em đang ghi âm. Bấm ⏹ Stop trước nhé.'); return; }
  if (S.phase === 'work'){
    const t = tasks();
    const noRec = t.filter(x => x.k === 'rec' && !x.done).map(x => x.q);
    if (noRec.length){ alert('Em chưa ghi âm câu trả lời: ' + noRec.join(', ') + '.\nBài speaking phải ghi âm đủ mới nộp được nhé.'); const sp = $('#ex' + exOf('speak')[0].id); if (sp) sp.scrollIntoView({ behavior: 'smooth' }); return; }
    const left = t.filter(x => !x.done).length;
    if (!(await guard1(left, t.length))) return;
    stopAllAudio();
    const g = gradeNow(), at = new Date().toISOString();
    S.r1 = { at, leaves: S.leaves || 0, score: g.score, total: g.total, items: g.items };
    S.sid = makeSid();
    S.phase = g.score === g.total ? 'done' : 'review';
    save(); paintAll(); window.scrollTo({ top: 0, behavior: 'smooth' });
    send(); afterSubmit();
    return;
  }
  if (S.phase === 'retry'){
    if (!(await guard2())) return;
    stopAllAudio();
    const g = gradeNow();
    // câu đúng ở lần 1 giữ nguyên kết quả
    Object.keys(S.r1.items).forEach(k => { if (S.r1.items[k].ok) g.items[k] = S.r1.items[k]; });
    const ks = Object.keys(g.items);
    S.r2 = { at: new Date().toISOString(), leaves: S.leaves || 0, score: ks.filter(k => g.items[k].ok).length, total: ks.length, items: g.items };
    S.phase = 'done'; save(); paintAll(); window.scrollTo({ top: 0, behavior: 'smooth' });
    send(); afterSubmit();
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
const base = () => ({ app: 'btvn', unit: 'KET', title: `KET ${LESSON.code} ${LESSON.title} – Week ${WEEK_NO}` + redoTitle(), name: S.name, cls: S.cls, sid: S.sid || '', redo: S.redo || 0 });
// speaking chỉ có ở mail lần 1 (kèm file ghi âm); mail lần 2 chỉ so sánh các câu chấm điểm
function sectionsOf(items, nAudio){
  const out = LESSON.ex.filter(e => e.type !== 'speak' && e.type !== 'reasons').map(e => {
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
    items.push({ sec: String(exNo(e)), n: 'Q' + (j + 1), q: plain(c.q) + (c.audio ? ' (học sinh chỉ nghe, không thấy chữ)' : ''),
      ans: meta ? `🎙 ${fmtSec(meta.dur)}` + (c.audio ? ` · nghe câu hỏi ${S.plays[qk] || 0} lần` : '') : '(chưa ghi âm)', correct: 'cô chấm', ok: null });
  }));
  return items;
}
async function payload1(){
  const items = itemsOf(S.r1, true), audios = [];
  for (const e of exOf('speak')) for (let j = 0; j < e.clips.length; j++){
    const qk = e.id + '-' + (j + 1), meta = S.rec[qk], blob = meta ? await loadRec(qk) : null;
    if (blob) audios.push({ code: 'Q' + (j + 1), label: 'Q' + (j + 1) + ' – ' + plain(e.clips[j].q), mime: meta.mime, ext: meta.ext, dur: meta.dur, b64: await blobToB64(blob) });
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
  const tk = window.YumiAuth && YumiAuth.token(); if (tk) p.token = tk; // đã đăng nhập → máy chủ ghi đúng tên + tính XP
  const r = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(p) });
  const j = await r.json();
  if (!j.ok && j.auth && window.YumiAuth){ await YumiAuth.authFailed(YA_OPTS); return post(p); } // hết phiên → đăng nhập lại rồi gửi lại
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
function comeBack(){
  if (document.hidden || !document.hasFocus()) return;
  const was = away; away = false;
  if (was && tracking() && (S.leaves || 0) > 5) toast(`🕵️ ${tease('away')} <small>(rời trang ${S.leaves} lần)</small>`);
}
document.addEventListener('visibilitychange', () => document.hidden ? goAway() : comeBack());
window.addEventListener('blur', goAway);
window.addEventListener('focus', comeBack);

/* ============ KHỞI ĐỘNG ============ */
function boot(){
  if (YA && !YA.me()){ YA.require(YA_OPTS).then(() => { yaSync(); boot(); }); return; } // bắt đăng nhập trước
  yaSync();
  if (!LESSON){
    $('#bar').hidden = true;
    if (WEEK_NO) { $('#app').innerHTML = '<div class="card">🔒 This lesson isn’t open yet. <a href="./">← Back to all lessons</a></div>'; return; }
    renderHome(); return;
  }
  $('#back').hidden = false;
  S = Object.assign(blank(), lsGet(storeKey(WEEK_NO)) || {});
  const redone = applyRedo(storeKey(WEEK_NO)); // mở link làm lại của cô
  buildLesson();
  if (redone) $('#startErr').insertAdjacentHTML('beforebegin', REDO_MSG);
  $('#submitBtn').addEventListener('click', onSubmit);
  if (S.startedAt && S.name) showWork();
  paintAll();
  if (S.r1 && (!S.sent1 || (S.r2 && !S.sent2))) send(); // lần trước chưa gửi được → gửi lại
}
document.addEventListener('DOMContentLoaded', boot); // chờ fun.js nạp xong
// ô sửa câu (bài tìm lỗi) là ô nhiều dòng để thấy hết câu: không cho xuống dòng bằng Enter
document.addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.matches && ev.target.matches('textarea.txt.fx')) ev.preventDefault(); });
