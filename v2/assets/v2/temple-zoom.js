// Home: scrolling through the temple walks up to its doors, they swing inward onto a lamp-lit niche,
// the view steps through to Sri Hari, then the painting dissolves and Sri Hari glides to his place
// beside the "Sri Hari Bhagwan" words — one continuous scene instead of a jump to a new section.
//
// Built to stay smooth: everything is measured once (on load and resize); each frame is arithmetic plus
// transforms and opacity only, so scrolling never makes the browser re-measure or re-lay out the page.
(() => {
  const section = document.getElementById('templeZoom');
  if (!section) return;
  const sticky = section.querySelector('.tz-sticky');
  const scene = document.getElementById('tzScene');
  const stage = document.getElementById('tzStage');
  const heroBox = document.getElementById('tzHero');
  const nav = document.querySelector('.nav');
  const hint = document.getElementById('tzHint');
  const divine = document.getElementById('tzDivine');
  const idol = document.getElementById('tzIdol');
  const deityBox = idol.parentElement;                 // his place in the Sri Hari layout
  const copy = document.getElementById('tzCopy');
  const halos = divine.querySelectorAll('.halo');
  const sceneDeity = scene.querySelector('.tz-deity');
  const frame = scene.querySelector('.tz-frame');
  const [leafL, leafR] = scene.querySelectorAll('.tz-leaf');

  const RATIO = 3168 / 1344;
  const IDOL = 886 / 1136;                             // Sri Hari's width / height
  // the doors, as fractions of the painting (3168 × 1344): left, top, width, height
  const DOOR = { l: 0.4744, t: 0.5952, w: 0.0505, h: 0.1525 };
  const PERSPECTIVE = 260;                             // the doors' perspective (CSS), in the painting's own pixels
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => t * t * (3 - 2 * t);             // smoothstep: a slow start, a gentle arrival
  const span = (p, a, b) => ease(clamp((p - a) / (b - a)));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Warm the images up front, so the first scroll never waits on a download or a decode
  [scene.querySelector('.tz-painting.day'), sceneDeity, idol].forEach(img => img && img.decode && img.decode().catch(() => {}));
  const shrine = new Image(); shrine.src = 'assets/v2/shrine.webp?v=2';

  // ----- Layout: measured once, on load and on resize -----
  let M = null;
  const fitLeaves = (w, h) => {
    // each leaf shows the exact slice of the painting it covers, so the closed doors look untouched
    [leafL, leafR].forEach((leaf, i) => {
      leaf.style.backgroundSize = `${w}px ${h}px`;
      leaf.style.backgroundPosition = `${-(DOOR.l + i * DOOR.w / 2) * w}px ${-DOOR.t * h}px`;
    });
  };
  const fit = () => {
    const navH = nav ? nav.offsetHeight : 72;
    document.documentElement.style.setProperty('--nav-h', `${navH}px`);
    // the painting takes the room left under the words; its top fifth is empty sky, so it tucks up under them
    const narrow = innerWidth <= 768;
    const room = stage.clientHeight - 12;
    const SKY = 0.17, GROUND = 0.86;
    const w = Math.max(240, Math.min(narrow ? innerWidth * 1.5 : Math.min(2000, innerWidth * 1.2), (room / (GROUND - SKY)) * RATIO));
    const h = w / RATIO;
    const spare = Math.max(0, room - (GROUND - SKY) * h);
    scene.style.width = `${w}px`;
    scene.style.marginTop = `${-SKY * h + spare * 0.3}px`;
    fitLeaves(w, h);
    // positions relative to the pinned frame, with nothing transformed
    scene.style.transform = 'none';
    const st = sticky.getBoundingClientRect(), sc = scene.getBoundingClientRect(), db = deityBox.getBoundingClientRect();
    const vh = sticky.clientHeight, vw = innerWidth;   // the frame's steady height, not the window's (a phone's bar comes and goes)
    const atDoor = Math.max(1, (vh * 0.62) / (h * DOOR.h));
    const atNiche = Math.max(atDoor, (vh * 0.98) / (h * DOOR.h));
    // Sri Hari's final place, and the size he is drawn at: his largest on screen, so he is only ever scaled down (sharp)
    const toH = db.height, toW = toH * IDOL;
    const to = { x: db.left - st.left + (db.width - toW) / 2, y: db.top - st.top, w: toW, h: toH };
    const bigH = Math.max(toH, 0.8 * DOOR.h * h * atNiche), bigW = bigH * IDOL;
    idol.style.width = `${bigW}px`;
    idol.style.height = `${bigH}px`;
    M = {
      w, h, vw, vh, navH, atDoor, atNiche, to, bigW,
      sx: sc.left - st.left, sy: sc.top - st.top,                  // the scene's resting corner
      box: { x: db.left - st.left, y: db.top - st.top },           // Sri Hari's positioned box
      top: section.getBoundingClientRect().top + scrollY,           // where the section starts on the page
      run: section.offsetHeight - vh,
    };
  };
  const setDoors = (open) => {   // 0 closed … 1 open; inward, so the free edges recede and the faces darken
    const deg = 80 * open;
    leafL.style.transform = `rotateY(${deg}deg)`;
    leafR.style.transform = `rotateY(${-deg}deg)`;
    leafL.style.setProperty('--shade', open.toFixed(3));
    leafR.style.setProperty('--shade', open.toFixed(3));
    frame.style.setProperty('--frame', open.toFixed(3));
    return deg;
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {   // no zoom: the doors stand open, the section follows as usual
    const still = () => {
      document.documentElement.style.setProperty('--nav-h', `${nav ? nav.offsetHeight : 72}px`);
      fitLeaves(scene.offsetWidth, scene.offsetHeight); setDoors(1);
    };
    still(); addEventListener('resize', still);
    return;
  }
  document.documentElement.classList.add('tz-motion');

  // ----- Temple chant, played with Web Audio so it is dependable on phones too -----
  // The chant is fetched and decoded as the page loads and then loops quietly under a volume control that
  // follows the scroll. Browsers allow sound only after the visitor taps, clicks or presses a key, so the
  // first such touch unlocks it (inside that same touch, which iPhones require); a scroll alone cannot.
  // It is on by default; the switch turns it off (remembered for the visit) and on again.
  const soundBtn = document.getElementById('tzSound');
  const soundLabel = soundBtn && soundBtn.querySelector('.tz-sound-label');
  const CHANT_SRC = 'assets/v2/vishnu-chant.m4a';
  const MAX = 0.55;                                    // the chant sits under the page, never loud
  const AC = window.AudioContext || window.webkitAudioContext;
  let actx = null, gain = null, buffer = null, voice = null, wanted = 0, unlocked = false, idleT;
  let soundOn = (() => { try { return sessionStorage.getItem('sba-chant') !== 'off'; } catch (e) { return true; } })();
  const context = () => {
    if (!actx && AC) {
      actx = new AC();
      gain = actx.createGain();
      gain.gain.value = 0;
      gain.connect(actx.destination);
    }
    return actx;
  };
  // fetch and decode up front, so nothing waits once the doors open
  const loading = AC ? fetch(CHANT_SRC).then(r => r.arrayBuffer())
    .then(data => new Promise((ok, fail) => context().decodeAudioData(data, ok, fail)))
    .then(b => { buffer = b; begin(); }).catch(() => {}) : null;
  const begin = () => {                                 // one looping voice, started once and never stopped
    if (voice || !buffer || !unlocked) return;
    voice = actx.createBufferSource();
    voice.buffer = buffer;
    voice.loop = true;
    voice.connect(gain);
    voice.start(0);
    setLevel(wanted);
  };
  const showState = () => {
    if (!soundBtn) return;
    soundBtn.setAttribute('aria-pressed', soundOn);
    const waiting = soundOn && !unlocked;               // on, but the browser still needs that first tap
    soundBtn.classList.toggle('is-waiting', waiting);
    // the label stays "Chant"; while it waits for the first tap, a soft pulse is the only cue
  };
  const setLevel = (v) => {
    wanted = v;
    if (!gain || !unlocked) return;
    const target = soundOn ? v * MAX : 0;
    gain.gain.setTargetAtTime(target, actx.currentTime, 0.35);   // eased, so scrolling never jolts the volume
    if (soundBtn) { soundBtn.dataset.level = target.toFixed(2); soundBtn.dataset.audio = actx.state; }   // readable state, for checks
    clearTimeout(idleT);
    if (target > 0.001) { if (actx.state !== 'running') actx.resume(); }
    else idleT = setTimeout(() => { if (wanted * (soundOn ? 1 : 0) <= 0.001 && actx.state === 'running') actx.suspend(); }, 2500);   // rest the audio when silent
  };
  const unlock = () => {
    if (!context()) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}   // newer iPhones: play even in silent mode
    actx.resume();
    const tick = actx.createBufferSource();             // a silent sound inside the touch: what iPhones need to allow audio
    tick.buffer = actx.createBuffer(1, 1, 22050);
    tick.connect(actx.destination);
    tick.start(0);
    unlocked = true;
    begin();
    setLevel(wanted);
    showState();
  };
  // Start with the scroll: as soon as the visitor scrolls, try to let the sound out. Browsers that allow it
  // (for example Chrome for returning visitors) play straight away; the rest refuse until the first tap,
  // click or key, which unlocks it below without any button.
  let trying = false;
  const tryAutostart = () => {
    if (unlocked || trying || !soundOn || !context()) return;
    trying = true;
    actx.resume().then(() => {
      trying = false;
      if (actx.state !== 'running' || unlocked) return;
      unlocked = true;
      begin();
      setLevel(wanted);
      showState();
    }, () => { trying = false; });
  };
  const onTouch = (e) => {
    if (soundBtn && soundBtn.contains(e.target)) return;   // the switch handles its own taps
    if (soundOn) unlock();
    if (unlocked) ['pointerdown', 'touchend', 'click', 'keydown'].forEach(t => removeEventListener(t, onTouch, true));
  };
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(t => addEventListener(t, onTouch, true));
  soundBtn && soundBtn.addEventListener('click', () => {
    if (soundOn && !unlocked) { unlock(); return; }    // "Tap for chant": the tap turns it on, not off
    soundOn = !soundOn;
    try { sessionStorage.setItem('sba-chant', soundOn ? 'on' : 'off'); } catch (e) {}
    if (soundOn) unlock(); else setLevel(wanted);
    showState();
  });
  showState();
  // how loud, for where the visitor is: rises as the scroll begins, fades through the Sri Hari section and a little beyond
  const chantLevel = () => {
    const p = (scrollY - M.top) / M.run;
    const rise = span(p, 0, 0.1);                       // rises as soon as the scroll begins
    const fade = ease(clamp((scrollY - (M.top + M.run * 0.8)) / (M.run * 0.2 + M.vh * 0.7)));
    return rise * (1 - fade);
  };

  // ----- Each frame: arithmetic, transforms and opacity only -----
  let last = -1;
  const draw = () => {
    ticking = false;
    if (!M) return;
    setLevel(chantLevel());
    const p = clamp((scrollY - M.top) / M.run);
    if (p === last) return;
    last = p;
    const { w, h } = M;

    // 1 · walk up to the doors · 2 · they swing open · 3 · step through until the niche fills the window
    const near = span(p, 0, 0.36), through = span(p, 0.34, 0.56);
    const s = 1 + (M.atDoor - 1) * near + (M.atNiche - M.atDoor) * through;
    const ox = (DOOR.l + DOOR.w / 2) * w, oy = (DOOR.t + DOOR.h / 2) * h;           // the zoom turns about the doors
    const dx = (M.vw / 2 - (M.sx + ox)) * near, dy = ((M.vh + M.navH) / 2 - (M.sy + oy)) * near;
    scene.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${s})`;
    const at = (x, y) => [M.sx + ox + dx + (x - ox) * s, M.sy + oy + dy + (y - oy) * s];   // painting → frame

    // the welcome lifts away as the walk begins
    const away = span(p, 0, 0.12);
    heroBox.style.opacity = 1 - away;
    heroBox.style.transform = `translate3d(0, ${-24 * away}px, 0)`;
    const heroVis = away >= 1 ? 'hidden' : 'visible';
    if (heroBox.style.visibility !== heroVis) heroBox.style.visibility = heroVis;
    const open = span(p, 0.2, 0.44);
    const deg = setDoors(open);

    // 4 · as the doors open, the full-resolution Sri Hari takes over from the one in the painting (which is
    //     magnified many times on a phone), exactly in its place; then the painting dissolves and he glides
    //     to his place by the words. He is drawn large once and only ever scaled down, so he stays sharp.
    const handing = p >= 0.2;
    const hand = span(p, 0.58, 0.82);
    scene.style.opacity = 1 - span(p, 0.58, 0.72);
    const deityVis = handing ? 'hidden' : 'visible';
    if (sceneDeity.style.visibility !== deityVis) sceneDeity.style.visibility = deityVis;
    idol.style.opacity = handing ? 1 : 0;
    if (handing) {
      const dh = 0.8 * DOOR.h * h, dw = dh * IDOL;                                    // Sri Hari in the doorway
      const [fx, fy] = at(DOOR.l * w + (DOOR.w * w - dw) / 2, (DOOR.t + DOOR.h * 0.91) * h - dh);
      const X = lerp(fx, M.to.x, hand), Y = lerp(fy, M.to.y, hand), W = lerp(dw * s, M.to.w, hand);
      const k = W / M.bigW;
      idol.style.transform = `translate3d(${X - M.box.x}px, ${Y - M.box.y}px, 0) scale(${k})`;
      // while the doors are still swinging, he shows only through the gap between them, so they stay in front
      if (p < 0.46) {
        const half = DOOR.w * w / 2, rad = deg * Math.PI / 180;
        const gap = half * (1 - Math.cos(rad)) * PERSPECTIVE / (PERSPECTIVE + half * Math.sin(rad));   // the leaves' inner edges, seen in perspective
        const [gl] = at(ox - gap, 0), [gr] = at(ox + gap, 0);
        const [, dTop] = at(0, DOOR.t * h), [, dBot] = at(0, (DOOR.t + DOOR.h) * h);
        const H = W / IDOL, cut = (v) => `${(Math.max(0, v) / k).toFixed(1)}px`;
        idol.style.clipPath = gap <= 0.01 ? 'inset(50%)' : `inset(${cut(dTop - Y)} ${cut(X + W - gr)} ${cut(Y + H - dBot)} ${cut(gl - X)})`;
      } else idol.style.clipPath = 'none';
    }
    // 5 · the halo warms in behind him, then the words arrive
    const halo = span(p, 0.74, 0.88);
    halos.forEach(el => { el.style.opacity = halo; });
    const words = span(p, 0.8, 0.94);
    copy.style.opacity = words;
    copy.style.transform = `translate3d(0, ${(1 - words) * 16}px, 0)`;
    if (divine.classList.contains('is-on') !== words > 0.5) divine.classList.toggle('is-on', words > 0.5);
    hint.style.opacity = p > 0.03 ? 0 : 1;
  };

  let ticking = false;
  const onScroll = () => {
    tryAutostart();
    if (!ticking) { ticking = true; requestAnimationFrame(draw); }
  };
  const refit = () => { fit(); last = -1; draw(); seen = [innerWidth, innerHeight]; };
  // A phone's address bar sliding in and out (when the scroll changes direction) is reported as a resize;
  // re-fitting then would shrink the painting mid-scroll, so only a real change of size re-fits.
  let seen = [innerWidth, innerHeight];
  const onResize = () => {
    if (innerWidth === seen[0] && Math.abs(innerHeight - seen[1]) < 160) { last = -1; onScroll(); return; }
    refit();
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onResize);
  addEventListener('load', refit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);   // the words above settle the painting's room
  refit();
})();
