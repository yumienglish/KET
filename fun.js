/* =====================================================================
   KET Adventure – GAME (chủ đề vũ trụ, cho học sinh ~12 tuổi)
   âm thanh, pháo giấy, huy hiệu, bản đồ vũ trụ, Quick review
   (nạp sau app.js – dùng chung $, $$, lsGet, lsSet, LESSONS, VOCAB, say, starsOf, starRow…)
   ===================================================================== */
const SND_KEY = 'ket-sound', BADGE_KEY = 'ket-badges', REV_KEY = 'ket-review';

/* ---------- Hình vẽ ChatGPT (img/ui/*.webp) ----------
   ART = false: chưa có hình → dùng emoji. Khi đã cắt hình xong vào img/ui/ thì đổi thành true. */
const ART = true;
function uimg(name, emo, cls){
  if (!ART) return `<span class="${cls} emo">${emo}</span>`;
  return `<img class="${cls}" src="img/ui/${name}.webp" alt="" onerror="this.outerHTML='<span class=&quot;${cls} emo&quot;>${emo}</span>'">`;
}

/* ---------- Âm thanh (tự tạo bằng WebAudio, không cần file) ---------- */
let AC = null;
const soundOn = () => lsGet(SND_KEY) !== false;
const TUNES = {
  pop: [[660, .05], [990, .07]], tick: [[880, .05]], ok: [[660, .08], [880, .08], [1320, .14]],
  bad: [[200, .2]], win: [[523, .1], [659, .1], [784, .1], [1047, .34]], badge: [[784, .1], [988, .1], [1175, .1], [1568, .36]],
};
function sfx(kind){
  if (!soundOn() || !TUNES[kind]) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    let t = AC.currentTime + .01;
    TUNES[kind].forEach(([f, d]) => {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = kind === 'bad' ? 'square' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'bad' ? .05 : .16, t + .012);
      g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(AC.destination); o.start(t); o.stop(t + d + .03); t += d * .9;
    });
  } catch (e) {}
}
function paintSnd(){
  const b = document.getElementById('sndBtn'); if (!b) return;
  b.textContent = soundOn() ? '🔊' : '🔇';
  b.title = soundOn() ? 'Tắt âm thanh' : 'Bật âm thanh';
}
(function(){
  const b = document.getElementById('sndBtn'); if (!b) return;
  b.addEventListener('click', () => { lsSet(SND_KEY, !soundOn()); paintSnd(); sfx('tick'); });
  paintSnd();
})();

/* ---------- Pháo giấy ---------- */
function confetti(n){
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  n = reduce ? 30 : (n || 150);
  const box = document.createElement('div'); box.className = 'confetti';
  const C = ['#ff5fa8', '#ffd23f', '#2bd47d', '#3a8bff', '#7b5cff', '#ff8a3d'];
  for (let i = 0; i < n; i++){
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw'; p.style.background = C[i % C.length];
    p.style.animationDelay = Math.random() * .7 + 's'; p.style.animationDuration = 2.2 + Math.random() * 1.8 + 's';
    p.style.setProperty('--dx', Math.round(Math.random() * 200 - 100) + 'px'); p.style.setProperty('--r', Math.round(Math.random() * 900) + 'deg');
    if (i % 3 === 0) p.style.borderRadius = '50%';
    box.appendChild(p);
  }
  document.body.appendChild(box); setTimeout(() => box.remove(), 5000);
}
// gọi sau khi nộp bài (app.js)
function afterSubmit(){
  const r = S.r2 || S.r1;
  if (S.phase === 'done' && r && r.score === r.total){ confetti(); sfx('win'); }
  else sfx('ok');
  if (S.phase === 'done') setTimeout(checkBadges, 2200);
}

/* ---------- Số liệu tổng (sao, từ, chuỗi tuần, ôn từ) ---------- */
function gameData(){
  const weeks = Object.keys(LESSONS).map(Number).filter(w => w <= OPEN_WEEK).sort((a, b) => a - b);
  const states = weeks.map(w => ({ w, L: LESSONS[w], s: lsGet(storeKey(w)) || {} }));
  const rev = Object.assign({ plays: 0, best: 0, stars: 0, days: {} }, lsGet(REV_KEY) || {});
  let lessonStars = 0, done = 0, run = 0, maxStreak = 0;
  const pool = [];
  states.forEach(x => {
    const n = starsOf(x.s); lessonStars += n;
    if (n){ done++; (x.L.newWords || []).forEach(k => { if (VOCAB[k] && !pool.includes(k)) pool.push(k); }); }
    run = x.s.phase === 'done' ? run + 1 : 0; maxStreak = Math.max(maxStreak, run);
  });
  const stars = lessonStars + rev.stars;
  return { weeks, states, rev, lessonStars, stars, words: pool.length, done, maxStreak, pool };
}

/* ---------- Huy hiệu (dễ đạt hơn B2, hợp tuổi 12) ---------- */
const BADGES = [
  { id: 'first', img: 1, icon: '🚀', name: 'Lift-off!', vi: 'Làm xong bài đầu tiên', test: d => d.done >= 1 },
  { id: 'focus', img: 2, icon: '🎯', name: 'Super Focus', vi: 'Làm xong 1 bài mà không rời trang lần nào',
    test: d => d.states.some(x => x.s.phase === 'done' && x.s.r1 && !x.s.r1.leaves && (!x.s.r2 || x.s.r2.leaves === x.s.r1.leaves)) },
  { id: 'perfect', img: 3, icon: '💯', name: 'Perfect!', vi: 'Đúng hết ngay lần nộp đầu', test: d => d.states.some(x => x.s.r1 && x.s.r1.total && x.s.r1.score === x.s.r1.total) },
  { id: 'never', img: 4, icon: '💪', name: 'Never Give Up', vi: 'Làm lại câu sai và sửa đúng hết', test: d => d.states.some(x => x.s.r2 && x.s.r2.score === x.s.r2.total) },
  { id: 'quick', img: 5, icon: '⚡', name: 'Quick Thinker', vi: 'Đạt 8/10 trong Quick review', test: d => d.rev.best >= 8 },
  { id: 'streak', img: 6, icon: '🔥', name: '2-Week Streak', vi: 'Làm xong bài 2 tuần liền', test: d => d.maxStreak >= 2 },
  { id: 'stars', img: 7, icon: '🌟', name: 'Star Collector', vi: 'Có 10 sao', test: d => d.stars >= 10 },
  { id: 'words', img: 8, icon: '📚', name: 'Word Explorer', vi: 'Học được 30 từ mới', test: d => d.words >= 30 },
];
const badgeImg = b => uimg('badge-' + b.img, b.icon, 'bi');
const earnedBadges = d => BADGES.filter(b => b.test(d)).map(b => b.id);
function badgesHtml(d){
  const got = earnedBadges(d);
  return `<section class="card badges"><h2>🏅 My badges <span class="bcount">${got.length}/${BADGES.length}</span></h2>
    <div class="bgrid">${BADGES.map(b => { const on = got.includes(b.id);
      return `<div class="bdg${on ? ' on' : ''}"><span class="bwrap">${badgeImg(b)}${on ? '' : '<i class="block">🔒</i>'}</span><b>${b.name}</b><small>${b.vi}</small></div>`; }).join('')}</div></section>`;
}
// huy hiệu mới → màn chúc mừng
function checkBadges(){
  const d = gameData(), got = earnedBadges(d), seen = lsGet(BADGE_KEY) || [];
  const fresh = got.filter(id => !seen.includes(id));
  if (!fresh.length) return;
  lsSet(BADGE_KEY, seen.concat(fresh));
  const ov = document.createElement('div'); ov.className = 'fxov';
  ov.innerHTML = `<div class="fxcard">${uimg('mascot-2', '🐶', 'fxmas')}<div class="fxt">🏅 New badge${fresh.length > 1 ? 's' : ''}!</div>
    ${fresh.map(id => { const b = BADGES.find(x => x.id === id); return `<div class="fxb">${badgeImg(b)}<div><b>${b.name}</b><small>${b.vi}</small></div></div>`; }).join('')}
    <button class="btn orange" type="button">Yay! 🎉</button></div>`;
  ov.addEventListener('click', ev => { if (ev.target === ov || ev.target.closest('button')) ov.remove(); });
  document.body.appendChild(ov); confetti(110); sfx('badge');
}

/* ---------- Bản đồ vũ trụ: mỗi tuần 1 hành tinh ---------- */
const SPACE = ['🪐', '🌙', '☄️', '🛰️', '👽', '🌍', '🔭', '🌞'];
const XS = [50, 76, 50, 24];
function mapHtml(d){
  const cur = d.states.find(x => x.s.phase !== 'done') || null;
  const here = cur || d.states[d.states.length - 1];
  const rows = d.states.map(x => ({ x }));
  if (LESSONS[OPEN_WEEK + 1]) rows.push({ lock: OPEN_WEEK + 1 });
  rows.push({ exam: true });
  return `<section class="map" id="map"><h2 class="maph">🌌 Your space map</h2><svg class="mpath" id="mpath" aria-hidden="true"></svg>
    ${rows.map((r, i) => {
      const X = XS[i % XS.length], dx = X === 50 ? (i % 4 === 0 ? 82 : 18) : 100 - X;
      const deco = `<span class="decowrap" style="left:${dx}%">${uimg('isle-' + ((i % 8) + 1), SPACE[i % SPACE.length], 'deco')}</span>`;
      if (r.exam) return `<div class="mrow">${deco}<div class="st lock exam" style="left:${X}%"><span class="node n4">${uimg('node-4', '🏆', 'ni')}</span><span class="slab"><b>Final stop</b><span>KET exam ⭐</span></span></div></div>`;
      if (r.lock) return `<div class="mrow">${deco}<div class="st lock" style="left:${X}%"><span class="node n3">${uimg('node-3', '🔒', 'ni')}</span><span class="slab"><b>Week ${r.lock}</b><span>Unlocks soon!</span></span></div></div>`;
      const { w, L, s } = r.x, res = s.r2 || s.r1;
      const tag = s.phase === 'done' ? `<span class="sst">${starRow(starsOf(s))}${res ? ' ' + res.score + '/' + res.total : ''}</span>`
        : s.phase === 'retry' || s.phase === 'review' ? '<span class="sst warn">✏️ Làm lại câu sai</span>'
        : s.startedAt ? '<span class="sst">⏳ In progress</span>' : '<span class="sst new">🆕 New</span>';
      return `<div class="mrow">${deco}<a class="st${s.phase === 'done' ? ' done' : ''}${cur === r.x ? ' cur' : ''}" style="left:${X}%" href="?w=${w}">
        ${here === r.x ? `<span class="me">${avHTML()}</span>` : ''}
        <span class="node c${w % 4}">${uimg('node-' + (w % 2 ? 1 : 2), w % 2 ? '🪐' : '🌍', 'ni')}${cur === r.x ? '<em class="go">▶ Play</em>' : ''}</span>
        <span class="slab"><b>Week ${w} · ${esc(L.code)}</b><span>${esc(L.title)}</span>${tag}</span></a></div>`;
    }).join('')}</section>`;
}
// vẽ đường bay nối các hành tinh (sau khi trang đã hiện)
function drawMap(){
  const m = $('#map'), svg = $('#mpath'); if (!m || !svg) return;
  const mr = m.getBoundingClientRect();
  const pts = $$('#map .node').map(n => { const r = n.getBoundingClientRect(); return [r.left - mr.left + r.width / 2, r.top - mr.top + r.height / 2]; });
  svg.setAttribute('width', mr.width); svg.setAttribute('height', mr.height); svg.setAttribute('viewBox', `0 0 ${mr.width} ${mr.height}`);
  const path = ps => ps.map((p, i) => { if (!i) return `M${p[0]},${p[1]}`; const q = ps[i - 1], my = (q[1] + p[1]) / 2; return ` C${q[0]},${my} ${p[0]},${my} ${p[0]},${p[1]}`; }).join('');
  const doneN = $$('#map .st.done').length;
  svg.innerHTML = `<path d="${path(pts)}" class="pth"/>${doneN ? `<path d="${path(pts.slice(0, doneN + 1))}" class="pth done"/>` : ''}`;
}
window.addEventListener('resize', () => { if (!LESSON) drawMap(); });

/* ---------- Quick review: 10 từ / 90 giây ---------- */
const QR_SECS = 90;
function reviewCard(d){
  const ok = d.pool.length >= 4;
  return `<section class="card qr${ok ? '' : ' off'}">${uimg('qr-1', '⚡', 'qri')}
    <div class="qrt"><b>Quick review</b><span>${ok ? `${Math.min(10, d.pool.length)} words · ${QR_SECS} seconds · win up to ⭐⭐⭐` : 'Làm xong 1 bài để mở khoá trò chơi ôn từ!'}</span>
    ${d.rev.plays ? `<small>Best: ${d.rev.best}/10 · Played ${d.rev.plays}×</small>` : ''}</div>
    <button class="btn orange" id="qrBtn" type="button"${ok ? '' : ' disabled'}>Play ▶</button></section>`;
}
const today = () => new Date().toLocaleDateString('en-CA');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const viShort = v => (v.vi.replace(/\s*\([^)]*\)/g, '').trim() || v.vi);
function startReview(){
  const d = gameData(); if (d.pool.length < 4) return;
  const keys = shuffle(d.pool).slice(0, 10);
  const others = shuffle(Object.keys(VOCAB).filter(k => !keys.includes(k)));
  const Q = keys.map((k, i) => {
    const mode = i % 2 ? 'vi' : 'en';
    const wrong = shuffle(d.pool.filter(x => x !== k)).concat(others).filter(x => viShort(VOCAB[x]) !== viShort(VOCAB[k]) && VOCAB[x].w !== VOCAB[k].w);
    return { k, mode, opts: shuffle([k].concat(wrong.slice(0, 3))) };
  });
  const G = { i: 0, score: 0, left: QR_SECS, lock: false, timer: null, over: false };
  const ov = document.createElement('div'); ov.className = 'fxov game';
  ov.innerHTML = `<div class="gcard"><div class="ghead"><b>⚡ Quick review</b><span class="gsc" id="gSc">0</span><button class="gx" type="button" aria-label="Close">✕</button></div>
    <div class="gtime"><i id="gT"></i></div><div id="gBody"></div></div>`;
  document.body.appendChild(ov);
  const body = ov.querySelector('#gBody');
  const close = () => { clearInterval(G.timer); ov.remove(); document.removeEventListener('keydown', onKey); renderHome(); };
  const onKey = ev => { if (ev.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  ov.querySelector('.gx').onclick = close;
  function show(){
    const q = Q[G.i], v = VOCAB[q.k];
    body.innerHTML = `<div class="gno">${G.i + 1} / ${Q.length}</div>
      ${q.mode === 'en' ? `<div class="gq"><button class="gsay" type="button" aria-label="Listen">🔊</button> ${esc(v.w)}</div><div class="gh">What does it mean?</div>`
        : `<div class="gq vi">${esc(viShort(v))}</div><div class="gh">Which English word?</div>`}
      <div class="gopts">${q.opts.map(o => `<button class="gopt" type="button" data-k="${esc(o)}">${esc(q.mode === 'en' ? viShort(VOCAB[o]) : VOCAB[o].w)}</button>`).join('')}</div>`;
    if (q.mode === 'en') say(v.w);
    const s = body.querySelector('.gsay'); if (s) s.onclick = () => say(v.w);
    G.lock = false;
  }
  body.addEventListener('click', ev => {
    const b = ev.target.closest('.gopt'); if (!b || G.lock) return;
    G.lock = true;
    const q = Q[G.i], right = b.dataset.k === q.k;
    body.querySelectorAll('.gopt').forEach(x => { if (x.dataset.k === q.k) x.classList.add('ok'); });
    if (right){ G.score++; sfx('ok'); ov.querySelector('#gSc').textContent = G.score; }
    else { b.classList.add('bad'); sfx('bad'); }
    if (q.mode === 'vi') say(VOCAB[q.k].w);
    setTimeout(() => { if (G.over) return; G.i++; G.i < Q.length ? show() : end(); }, right ? 750 : 1500);
  });
  function end(){
    if (G.over) return; G.over = true;
    clearInterval(G.timer);
    if (window.YumiAvatar && G.score >= 5) YumiAvatar.gamePlayed('quick-review'); // +5 xu (≥5 câu đúng, máy chủ giới hạn 3 lượt/ngày)
    const st = G.score >= Q.length ? 3 : G.score >= Q.length * .7 ? 2 : G.score >= Q.length * .4 ? 1 : 0;
    const r = Object.assign({ plays: 0, best: 0, stars: 0, days: {} }, lsGet(REV_KEY) || {});
    const t = today(), n = r.days[t] || 0, gain = n < 3 ? st : 0; // mỗi ngày tính sao 3 lượt đầu
    r.plays++; r.best = Math.max(r.best, Q.length >= 10 ? G.score : 0); r.stars += gain; r.days = { [t]: n + 1 };
    lsSet(REV_KEY, r);
    body.innerHTML = `<div class="gend">${uimg('mascot-' + (st >= 2 ? 2 : 3), st >= 2 ? '🐶🏆' : '🐶👍', 'gmas')}<div class="gbig">${G.score} / ${Q.length}</div>
      <div class="gst">${[1, 2, 3].map(i => `<span class="${i <= st ? '' : 'off'}">⭐</span>`).join('')}</div>
      <p>${G.score === Q.length ? 'Amazing! You know them all! 🏆' : G.score >= Q.length * .7 ? 'Great job! Keep it up! 💪' : 'Good try! Play again to remember more. 🌱'}</p>
      <p class="muted small">${gain ? `+${gain} ⭐ added to your stars` : st ? 'Hôm nay em đã nhận đủ sao ôn từ (3 lượt). Vẫn chơi tiếp để nhớ từ nhé!' : ''}</p>
      <div class="gbtns"><button class="btn" type="button" id="gAgain">Play again 🔁</button><button class="btn lite" type="button" id="gClose">Close</button></div></div>`;
    if (st === 3){ confetti(); sfx('win'); } else sfx('ok');
    body.querySelector('#gAgain').onclick = () => { clearInterval(G.timer); ov.remove(); document.removeEventListener('keydown', onKey); startReview(); };
    body.querySelector('#gClose').onclick = close;
  }
  const bar = ov.querySelector('#gT');
  G.timer = setInterval(() => {
    G.left -= .25; bar.style.width = Math.max(0, G.left / QR_SECS * 100) + '%';
    bar.classList.toggle('low', G.left <= 15);
    if (G.left <= 0){ G.lock = true; end(); }
  }, 250);
  show();
}

/* ---------- Trang làm bài: "ting" + nảy nhẹ khi điền xong / chạm chọn (không lộ đúng sai) ---------- */
const canPlay = () => typeof S !== 'undefined' && S && (S.phase === 'work' || S.phase === 'retry');
function bounce(el){ if (!el) return; el.classList.remove('popin'); void el.offsetWidth; el.classList.add('popin'); }
document.addEventListener('change', ev => {
  const el = ev.target; if (!el.matches || !el.matches('input.txt') || el.disabled || !canPlay()) return;
  if (el.value.trim()){ sfx('pop'); bounce(el); }
});
document.addEventListener('click', ev => {
  if (!canPlay() || !ev.target.closest) return;
  const z = ev.target.closest('.zone, .bstar, .pk, .cb, .tf'); if (z && !z.disabled){ sfx('pop'); bounce(z.closest('.bstar') || z); }
});

/* ---------- Gắn vào trang chủ ---------- */
function afterHome(){
  drawMap(); setTimeout(drawMap, 300); // vẽ lại khi font/ảnh tải xong
  const b = $('#qrBtn'); if (b) b.onclick = () => { sfx('tick'); startReview(); };
  const cur = $('#map .st.cur');
  if (cur && $$('#map .st').indexOf(cur) >= 3) cur.scrollIntoView({ block: 'center' });
  setTimeout(checkBadges, 600);
}
