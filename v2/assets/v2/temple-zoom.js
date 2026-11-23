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
    const frameW = sticky.clientWidth || innerWidth;   // the site's width (it stops growing at 1600px)
    const room = stage.clientHeight - 12;
    const SKY = 0.17, GROUND = 0.86;
    const w = Math.max(240, Math.min(narrow ? frameW * 1.5 : Math.min(2000, frameW * 1.2), (room / (GROUND - SKY)) * RATIO));
    const h = w / RATIO;
    const spare = Math.max(0, room - (GROUND - SKY) * h);
    scene.style.width = `${w}px`;
    scene.style.marginTop = `${-SKY * h + spare * 0.3}px`;
    fitLeaves(w, h);
    // positions relative to the pinned frame, with nothing transformed
    scene.style.transform = 'none';
    const st = sticky.getBoundingClientRect(), sc = scene.getBoundingClientRect(), db = deityBox.getBoundingClientRect();
    const vh = sticky.clientHeight, vw = frameW;   // the frame's steady height, not the window's (a phone's bar comes and goes)
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

  // ----- Each frame: arithmetic, transforms and opacity only -----
  let last = -1;
  const draw = () => {
    ticking = false;
    if (!M) return;
    const p = clamp((scrollY - M.top) / M.run);
    if (p === last) return;
    last = p;
    const { w, h } = M;

    // 1 · walk up to the doors · 2 · they swing open · 3 · step through until the niche fills the window
    // One continuous zoom from the welcome to the niche, at an even pace: it grows on a logarithmic scale
    // (each moment magnifies by the same factor) and has no phase boundary where it could slow and pause.
    // The glide that carries the scroll already eases in and out, so the zoom itself stays linear in p.
    const near = clamp(p / 0.56);
    const s = Math.exp(Math.log(M.atNiche) * near);
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
    // second step (0.56 → 1): everything starts moving the moment it begins, at a steady pace (the glide
    // that carries the scroll does the easing), so there is no still moment at its start
    const lin = (a, b) => clamp((p - a) / (b - a));
    const hand = lin(0.56, 0.86);
    scene.style.opacity = 1 - lin(0.56, 0.74);
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
    const halo = lin(0.7, 0.9);
    halos.forEach(el => { el.style.opacity = halo; });
    const words = lin(0.78, 0.97);
    copy.style.opacity = words;
    copy.style.transform = `translate3d(0, ${(1 - words) * 16}px, 0)`;
    if (divine.classList.contains('is-on') !== words > 0.5) divine.classList.toggle('is-on', words > 0.5);
    hint.style.opacity = p > 0.03 ? 0 : 1;
    // once the walk-in begins, the frame's bottom edge melts into the paper instead of cutting the painting
    const deep = p > 0.03 && p < 0.71;   // off again once the painting has dissolved, so Sri Hari's section is never dimmed
    if (sticky.classList.contains('tz-deep') !== deep) sticky.classList.toggle('tz-deep', deep);
  };

  let ticking = false;
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(draw); } };
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

  // ----- Two scrolls, two stops -----
  // The first scroll carries you all the way in, through the opened doors to Sri Hari in his lamp-lit niche;
  // the second carries you on to the Sri Hari section. Each gesture plays the whole move as one glide,
  // whatever its size; scrolling up steps back the same way. Past the last stop the page scrolls as usual.
  const STOPS = [0, 0.56, 1];                       // the welcome · Sri Hari in the niche · the Sri Hari section
  const at = (p) => M.top + p * M.run;
  const progress = () => (scrollY - M.top) / M.run;
  const inside = () => M && scrollY >= M.top - 2 && scrollY <= M.top + M.run + 2;
  const target = (dir) => {
    const p = progress();
    if (dir > 0) return STOPS.find(s => s > p + 0.01);
    for (let i = STOPS.length - 1; i >= 0; i--) if (STOPS[i] < p - 0.01) return STOPS[i];
  };
  const easeInOut = (t) => (1 - Math.cos(Math.PI * t)) / 2;     // a sine ease: no sudden start, no sudden stop
  // A glide plays one step. Input never gets "stuck":
  //  · a fresh gesture made while a glide plays is remembered and played straight after it (one step queued);
  //  · after a glide, only the tail of the same gesture (a trackpad's fading momentum) is swallowed, and only
  //    briefly: a stronger push, a change of direction, or a moment's pause counts as a new gesture at once.
  let gliding = false, glideDir = 0, glideStart = 0, glideEnd = 0, queued = 0;
  let lastAbs = 0, lastTime = 0;
  // The glide's pace follows the hand: a gentle scroll gets an unhurried glide, a quick flick a brisk one.
  // speed = how far the gesture pushed in its first moments (px per 150 ms); it maps to 0.65 s … 1.9 s.
  const durFor = (speed) => 650 + 1250 * Math.exp(-speed / 450);
  const G = { t0: 0, ms: 1300 };
  let gestStart = 0, gestSum = 0, lastSpeed = 300, tailOpen = false;
  const retime = (ms) => {                                       // change the pace mid-glide without a jump in position
    const now = performance.now(), t = Math.min(1, (now - G.t0) / G.ms);
    G.ms = ms; G.t0 = now - t * ms;
  };
  const glide = (to, ms = durFor(lastSpeed)) => {
    const from = scrollY, dest = at(to);
    G.t0 = performance.now(); G.ms = ms;
    gliding = true; glideDir = Math.sign(dest - from); glideStart = G.t0;
    const step = (now) => {
      const t = Math.min(1, (now - G.t0) / G.ms);
      scrollTo({ top: from + (dest - from) * easeInOut(t), behavior: 'instant' });
      draw();                      // paint this frame now, in step with the scroll (no frame of lag)
      if (t < 1) { requestAnimationFrame(step); return; }
      gliding = false; glideEnd = performance.now();
      if (queued) { const d = queued; queued = 0; const next = inside() && target(d); if (next !== undefined && next !== false) glide(next); }
    };
    requestAnimationFrame(step);
  };
  // is this event the start of a new gesture, or the tail of the one already played?
  const fresh = (abs, dir, now) => {
    const gap = now - lastTime;
    if (gap > 140) return true;                                  // a pause between strokes
    if (dir !== glideDir) return true;                           // a change of direction
    if (gliding && now - glideStart < 400) return false;         // a swipe speeds up as it begins: still the same one
    return abs > Math.max(12, lastAbs * 1.8);                    // momentum only fades; a new push grows
  };
  const step = (dir, e) => {
    if (!inside()) return false;
    const to = target(dir);
    if (to === undefined) return false;                          // past the last stop (or above the first): ordinary scrolling
    e && e.preventDefault();
    if (gliding) { if (dir === glideDir || !queued) queued = dir; }  // play it next, don't drop it
    else glide(to);
    return true;
  };
  addEventListener('wheel', (e) => {
    if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    const now = performance.now(), abs = Math.abs(e.deltaY), dir = Math.sign(e.deltaY);
    const isFresh = fresh(abs, dir, now);
    // a trackpad's momentum only shrinks (its small values may repeat); steady mouse-wheel clicks are large and even
    const fading = abs < lastAbs || (abs === lastAbs && abs < 40) || abs <= 4;
    lastAbs = abs; lastTime = now;
    if (gliding) {                                               // during a glide: swallow, but remember a new push
      tailOpen = true;                                           // this gesture's momentum belongs to the glide
      if (inside()) e.preventDefault();
      if (isFresh && dir) { const to = target(dir); if (to !== undefined) queued = dir; }
      else if (dir === glideDir && now - gestStart < 260) {      // the opening of the same gesture: read its speed
        gestSum += abs;
        lastSpeed = gestSum * 150 / Math.max(now - gestStart, 60);
        retime(durFor(lastSpeed));
      }
      return;
    }
    // The fading tail of the gesture just played is swallowed for as long as it lasts, even past the last
    // stop, so a flick's momentum can't fling the page on past the next sections. Steady wheel ticks or a
    // finger still moving don't fade, so they count as fresh scrolling and move the page as usual.
    if (isFresh) tailOpen = false;                               // a new gesture: the old tail is over
    if (tailOpen && dir === glideDir && (fading || now - glideEnd < 200)) { e.preventDefault(); return; }
    tailOpen = false;
    gestStart = now; gestSum = abs;
    lastSpeed = abs * 1.5;                                       // a first guess from one event; refined as more arrive
    if (step(dir, e)) tailOpen = true;
  }, { passive: false });
  // touch: one swipe, one stop
  let touchY = null, touchT = 0;
  addEventListener('touchstart', (e) => { touchY = e.touches[0].clientY; touchT = performance.now(); }, { passive: true });
  addEventListener('touchmove', (e) => {
    if (touchY === null || !inside()) return;
    const dy = touchY - e.touches[0].clientY;
    if (Math.abs(dy) < 6) return;
    if (gliding || target(Math.sign(dy)) !== undefined) e.preventDefault();
  }, { passive: false });
  addEventListener('touchend', (e) => {
    if (touchY === null) return;
    const dy = touchY - (e.changedTouches[0] ? e.changedTouches[0].clientY : touchY);
    touchY = null;
    if (Math.abs(dy) < 24) return;
    lastSpeed = Math.abs(dy) / Math.max(performance.now() - touchT, 40) * 300;   // a quick flick glides briskly
    step(Math.sign(dy));
  }, { passive: true });
  // keyboard: arrows, Page Up/Down and space step between the stops too
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    const dir = { ArrowDown: 1, PageDown: 1, ' ': e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (dir) { lastSpeed = 300; step(dir, e); }
  });
  // dragged the scrollbar or jumped to the middle of the walk: settle on the nearest stop
  addEventListener('scrollend', () => {
    if (gliding || !inside()) return;
    const p = progress();
    const near = STOPS.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a));
    if (Math.abs(near - p) > 0.01) glide(near);
  });
})();
