// ---------- Seasonal ambience ----------
// One canvas, <=40 particles, 30fps, paused when hidden, off for prefers-reduced-motion.
(() => {
  const SEASONS = {
    vasant:  { label: 'Vasant',  hint: 'Spring · petals',   months: [1, 2, 3] },
    grishma: { label: 'Grishma', hint: 'Summer · light',    months: [4, 5] },
    varsha:  { label: 'Varsha',  hint: 'Monsoon · rain',    months: [6, 7, 8] },
    sharad:  { label: 'Sharad',  hint: 'Autumn · leaves',   months: [9, 10] },
    shishir: { label: 'Shishir', hint: 'Winter · snow',     months: [11, 0] },
  };
  const bySeason = () => Object.keys(SEASONS).find(k => SEASONS[k].months.includes(new Date().getMonth()));
  const canvas = document.getElementById('seasonLayer');
  const ctx = canvas.getContext('2d');
  const picker = document.getElementById('seasonPicker');
  const btn = document.getElementById('seasonBtn');
  const menu = picker.querySelector('.season-menu');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Tuning: SPEED scales all motion, DENSITY the particle count, SIZE and ALPHA their presence
  const SPEED = 1.6, DENSITY = 1.5, SIZE = 1.2, ALPHA = 1.25;

  // Default: seasonal animation off. A visitor's own choice in the picker (incl. Auto) is remembered.
  let pref = 'off';
  try { pref = localStorage.getItem('sba-season') || 'off'; } catch (e) {}
  // Default: clouds off. A visitor who switches them on in the season popup keeps that choice.
  let cloudsOn = false;
  try { cloudsOn = localStorage.getItem('sba-clouds') === 'on'; } catch (e) {}
  const setClouds = (on) => {
    cloudsOn = on;
    document.documentElement.classList.toggle('no-clouds', !on);
    if (!on) document.documentElement.classList.remove('clouds-on');
    try { localStorage.setItem('sba-clouds', on ? 'on' : 'off'); } catch (e) {}
  };
  document.documentElement.classList.toggle('no-clouds', !cloudsOn);
  const active = () => pref === 'auto' ? bySeason() : pref;   // may be 'off'
  const dark = () => document.documentElement.getAttribute('data-theme') === 'dark';

  // ----- particles -----
  let W = 0, H = 0, dpr = 1, parts = [];
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function spawn(kind, initial) {
    const p = { x: rand(0, W), y: initial ? rand(0, H) : -20, t: rand(0, 6.28), a: rand(0, 6.28) };
    switch (kind) {
      case 'vasant':
        Object.assign(p, { r: rand(4, 7), vy: rand(.25, .55), vx: rand(-.15, .25), va: rand(-.02, .02),
          c: pick(['#f2bccb', '#eeaabd', '#f7d3dc', '#e9a0b4']), o: rand(.45, .75) }); break;
      case 'grishma':
        Object.assign(p, { y: initial ? rand(0, H) : H + 10, r: rand(1.6, 3), vy: -rand(.08, .22), vx: rand(-.1, .1),
          c: pick(['#e0a646', '#e9bb5f', '#d4953c']), o: rand(.4, .75) }); break;
      case 'varsha':
        Object.assign(p, { len: rand(12, 20), vy: rand(5, 7.5), vx: -1.2, o: rand(.18, .34) }); break;
      case 'sharad':
        Object.assign(p, { r: rand(7, 11), vy: rand(.35, .7), vx: rand(-.3, .3), va: rand(-.03, .03),
          c: pick(['#c9803f', '#b8612f', '#d49a45', '#a8542b']), o: rand(.5, .8) }); break;
      case 'shishir': {
        // ~70% six-armed crystals, ~30% tiny soft flakes far away for depth
        const crystal = Math.random() < .7;
        const r = crystal ? rand(4, 8) : rand(1.2, 2.2);
        Object.assign(p, { crystal, r, vy: rand(.25, .5) + r * .04, vx: rand(-.15, .15),
          va: rand(-.012, .012), o: crystal ? rand(.55, .9) : rand(.35, .6) });
        break;
      }
    }
    if (p.r) p.r *= SIZE;
    if (p.len) p.len *= SIZE;
    p.o = Math.min(1, p.o * ALPHA);
    return p;
  }
  function count(kind) {
    const area = W * H;
    const per = { vasant: 45000, grishma: 38000, varsha: 16000, sharad: 60000, shishir: 20000 }[kind];
    const cap = { vasant: 28, grishma: 30, varsha: 40, sharad: 18, shishir: 40 }[kind];
    return Math.round(Math.min(cap, Math.max(8, area / per)) * DENSITY);
  }
  function reset() {
    const kind = active();
    parts = kind && kind !== 'off' ? Array.from({ length: count(kind) }, () => spawn(kind, true)) : [];
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    reset();
  }

  function drawPetal(p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.globalAlpha = p.o; ctx.fillStyle = p.c;
    ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawFlake(p, color) {
    const r = p.r;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
    ctx.globalAlpha = p.o; ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineWidth = Math.max(.9, r / 6.5); ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
      ctx.moveTo(0, 0); ctx.lineTo(ca * r, sa * r);                      // arm
      for (const [at, len] of [[.45, .32], [.72, .22]]) {              // two pairs of barbs per arm
        const bx = ca * r * at, by = sa * r * at;
        for (const s of [-1, 1]) {
          const b = a + s * Math.PI / 3;
          ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(b) * r * len, by + Math.sin(b) * r * len);
        }
      }
    }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, Math.max(.8, r * .12), 0, Math.PI * 2); ctx.fill();   // tiny centre
    ctx.restore();
  }
  function drawLeaf(p) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.scale(1, Math.cos(p.t) * .6 + .4);
    ctx.globalAlpha = p.o; ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.moveTo(0, -p.r); ctx.quadraticCurveTo(p.r * .9, 0, 0, p.r); ctx.quadraticCurveTo(-p.r * .9, 0, 0, -p.r);
    ctx.fill(); ctx.restore();
  }
  function step() {
    const kind = active();
    ctx.clearRect(0, 0, W, H);
    if (!kind || kind === 'off') return;
    const isDark = dark();
    for (const p of parts) {
      p.t += .02 * SPEED;
      if (kind === 'vasant' || kind === 'sharad') {
        p.x += (p.vx + Math.sin(p.t) * .35) * SPEED; p.y += p.vy * SPEED; p.a += p.va * SPEED;
        kind === 'vasant' ? drawPetal(p) : drawLeaf(p);
      } else if (kind === 'grishma') {
        p.x += (p.vx + Math.sin(p.t) * .15) * SPEED; p.y += p.vy * SPEED;
        const tw = (Math.sin(p.t * 2) + 1) / 2;
        ctx.globalAlpha = p.o * (.4 + .6 * tw) * (isDark ? 1.3 : 1);
        const R = p.r * (isDark ? 3.2 : 2.6), col = isDark ? '243,210,122' : '224,166,70';
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
        glow.addColorStop(0, `rgba(${col},1)`); glow.addColorStop(.35, `rgba(${col},.55)`); glow.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
      } else if (kind === 'varsha') {
        p.x += p.vx * SPEED; p.y += p.vy * SPEED;
        ctx.globalAlpha = p.o; ctx.strokeStyle = isDark ? '#b9c6cf' : '#7f93a1'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 2.4, p.y + p.len * 1.15); ctx.stroke();
      } else if (kind === 'shishir') {
        p.x += (p.vx + Math.sin(p.t) * .3) * SPEED; p.y += p.vy * SPEED; p.a += p.va * SPEED;
        const col = isDark ? '#f4f1ea' : '#8ea5b5';
        if (p.crystal) drawFlake(p, col);
        else { ctx.globalAlpha = p.o; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
      }
      // recycle
      if (p.y > H + 24 || p.y < -24 || p.x < -30 || p.x > W + 30) Object.assign(p, spawn(kind, false), kind === 'grishma' ? {} : { x: rand(0, W) });
    }
    ctx.globalAlpha = 1;
  }

  // ----- loop: 30fps, paused when hidden or reduced motion -----
  let raf = 0, last = 0;
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (now - last < 33) return;
    last = now; step();
  };
  const start = () => { if (!raf && !reduced.matches && !document.hidden && active() !== 'off') raf = requestAnimationFrame(loop); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; ctx.clearRect(0, 0, W, H); };
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  reduced.addEventListener?.('change', () => reduced.matches ? stop() : start());
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });

  // ----- picker -----
  function renderPicker() {
    const cur = active();
    btn.textContent = cur === 'off' ? 'Season: off' : `Season: ${SEASONS[cur].label}`;
    const opts = [['auto', 'Auto', `by month · ${SEASONS[bySeason()].label}`],
      ...Object.entries(SEASONS).map(([k, v]) => [k, v.label, v.hint]), ['off', 'Off', 'no animation']];
    menu.innerHTML = opts.map(([k, l, h]) =>
      `<button type="button" role="menuitemradio" aria-checked="${pref === k}" data-season="${k}"><span>${l} <small>${h}</small></span></button>`).join('') +
      `<div class="season-sep" role="separator"></div>` +
      `<button type="button" class="clouds-toggle" role="menuitemcheckbox" aria-checked="${cloudsOn}" data-clouds><span>Clouds <small>while scrolling</small></span><i class="switch" aria-hidden="true"></i></button>`;
  }
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = picker.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('[data-clouds]')) {          // clouds switch: keep the menu open so the state change is visible
      e.stopPropagation();
      setClouds(!cloudsOn); renderPicker();
      return;
    }
    const b = e.target.closest('[data-season]'); if (!b) return;
    pref = b.dataset.season;
    try { localStorage.setItem('sba-season', pref); } catch (err) {}
    picker.classList.remove('open'); btn.setAttribute('aria-expanded', false);
    renderPicker(); stop(); reset(); start();
  });
  document.addEventListener('click', (e) => { if (!picker.contains(e.target)) { picker.classList.remove('open'); btn.setAttribute('aria-expanded', false); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') picker.classList.remove('open'); });

  // ?season=vasant etc. for quick previews
  const q = new URLSearchParams(location.search).get('season');
  if (q && (q === 'off' || q === 'auto' || SEASONS[q])) pref = q;
  const qt = new URLSearchParams(location.search).get('theme');
  if (qt === 'dark' || qt === 'light') document.documentElement.setAttribute('data-theme', qt);

  resize(); renderPicker(); start();
})();
