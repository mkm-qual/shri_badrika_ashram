// Home: scrolling through the temple walks up to its doors, they swing inward onto a lamp-lit niche,
// the view steps through to Sri Hari, then the painting dissolves and Sri Hari glides to his place
// beside the "Sri Hari Bhagwan" words — one continuous scene instead of a jump to a new section.
(() => {
  const section = document.getElementById('templeZoom');
  if (!section) return;
  const scene = document.getElementById('tzScene');
  const stage = document.getElementById('tzStage');
  const heroBox = document.getElementById('tzHero');
  const nav = document.querySelector('.nav');
  const RATIO = 3168 / 1344;
  const hint = document.getElementById('tzHint');
  const divine = document.getElementById('tzDivine');
  const idol = document.getElementById('tzIdol');
  const copy = document.getElementById('tzCopy');
  const halos = divine.querySelectorAll('.halo');
  const sceneDeity = scene.querySelector('.tz-deity');
  const frame = scene.querySelector('.tz-frame');
  const [leafL, leafR] = scene.querySelectorAll('.tz-leaf');

  // the doors, as fractions of the painting (3168 × 1344): left, top, width, height
  const DOOR = { l: 0.4744, t: 0.5952, w: 0.0505, h: 0.1525 };
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (t) => t * t * (3 - 2 * t);   // smoothstep: a slow start, a gentle arrival
  const span = (p, a, b) => ease(clamp((p - a) / (b - a)));
  const lerp = (a, b, t) => a + (b - a) * t;

  // each leaf shows the exact slice of the painting it covers, so the closed doors look untouched
  // the header floats over the first fold; the painting takes whatever room is left under the words
  const fit = () => {
    document.documentElement.style.setProperty('--nav-h', `${nav ? nav.offsetHeight : 72}px`);
    const narrow = innerWidth <= 768;
    // wide: the painting's top fifth is empty sky, so it tucks up under the words; the building and lawn
    // (from 17% to 86% of its height) stay inside the window
    const room = stage.clientHeight - 12;
    const SKY = 0.17, GROUND = 0.86;   // the flag starts at 21%; the doors end at 75%, with lawn below for the mouse
    // its outer sides are already faded to paper, so it may run a little past the window's edges
    const w = Math.max(240, Math.min(narrow ? innerWidth * 1.5 : Math.min(2000, innerWidth * 1.2), (room / (GROUND - SKY)) * RATIO));
    const h = w / RATIO;
    const spare = Math.max(0, room - (GROUND - SKY) * h);   // when the width is what limits it, share the spare room
    scene.style.width = `${w}px`;
    scene.style.marginTop = `${-SKY * h + spare * 0.3}px`;
    fitLeaves();
  };
  const fitLeaves = () => {
    const w = scene.offsetWidth, h = scene.offsetHeight;
    [leafL, leafR].forEach((leaf, i) => {
      leaf.style.backgroundSize = `${w}px ${h}px`;
      leaf.style.backgroundPosition = `${-(DOOR.l + i * DOOR.w / 2) * w}px ${-DOOR.t * h}px`;
    });
  };
  const setDoors = (open) => {   // 0 closed … 1 open; inward, so the free edges recede and the faces darken
    const deg = 80 * open;
    leafL.style.transform = `rotateY(${deg}deg)`;
    leafR.style.transform = `rotateY(${-deg}deg)`;
    [leafL, leafR].forEach(l => l.style.setProperty('--shade', open.toFixed(3)));
    frame.style.setProperty('--frame', open.toFixed(3));
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {   // no zoom: the doors stand open, the section follows as usual
    document.documentElement.style.setProperty('--nav-h', `${nav ? nav.offsetHeight : 72}px`);
    fitLeaves(); setDoors(1);
    addEventListener('resize', fitLeaves);
    return;
  }
  document.documentElement.classList.add('tz-motion');

  let ticking = false;
  const draw = () => {
    ticking = false;
    const r = section.getBoundingClientRect(), vh = innerHeight;
    const p = clamp(-r.top / (r.height - vh));
    const w = scene.offsetWidth, h = scene.offsetHeight;

    // 1 · walk up to the doors · 2 · they swing open · 3 · step through until the niche fills the window
    const near = span(p, 0, 0.36);
    const through = span(p, 0.34, 0.56);
    const atDoor = Math.max(1, (vh * 0.62) / (h * DOOR.h));
    const atNiche = Math.max(atDoor, (vh * 0.98) / (h * DOOR.h));
    const s = 1 + (atDoor - 1) * near + (atNiche - atDoor) * through;
    // bring the doors to the middle of the window (below the header) as we walk up
    const top = section.getBoundingClientRect().top < 0 ? 0 : r.top;   // the pinned frame's top
    const doorX = scene.offsetLeft + (DOOR.l + DOOR.w / 2) * w;
    const doorY = top + scene.offsetTop + (DOOR.t + DOOR.h / 2) * h;
    const navH = nav ? nav.offsetHeight : 0;
    scene.style.transform = `translate3d(${(innerWidth / 2 - doorX) * near}px, ${((vh + navH) / 2 - doorY) * near}px, 0) scale(${s})`;
    // the welcome lifts away as the walk begins
    const away = span(p, 0, 0.12);
    heroBox.style.opacity = (1 - away).toFixed(3);
    heroBox.style.transform = `translateY(${-24 * away}px)`;
    heroBox.style.visibility = away >= 1 ? 'hidden' : 'visible';
    setDoors(span(p, 0.2, 0.44));

    // 4 · hand-off: the painting dissolves while Sri Hari glides from the niche to his place by the words
    const hand = span(p, 0.58, 0.82);
    const handing = p >= 0.58;
    scene.style.opacity = (1 - span(p, 0.58, 0.72)).toFixed(3);
    sceneDeity.style.visibility = handing ? 'hidden' : 'visible';
    idol.style.opacity = handing ? 1 : 0;
    if (handing) {
      const from = sceneDeity.getBoundingClientRect();
      idol.style.transform = 'none';
      const to = idol.getBoundingClientRect();
      const x = lerp(from.left, to.left, hand), y = lerp(from.top, to.top, hand), k = lerp(from.width, to.width, hand) / to.width;
      idol.style.transform = `translate(${x - to.left}px, ${y - to.top}px) scale(${k})`;
    }
    // 5 · the halo warms in behind him, then the words arrive
    const halo = span(p, 0.74, 0.88);
    halos.forEach(el => { el.style.opacity = halo; });
    const words = span(p, 0.8, 0.94);
    copy.style.opacity = words;
    copy.style.transform = `translateY(${(1 - words) * 16}px)`;
    divine.classList.toggle('is-on', words > 0.5);
    hint.style.opacity = p > 0.03 ? 0 : 1;
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(draw); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { fit(); onScroll(); });
  addEventListener('load', () => { fit(); draw(); });
  fit();
  draw();
})();
