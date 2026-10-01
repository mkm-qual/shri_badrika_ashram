// ---------- Scroll clouds + section reveal ----------
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Clouds: every band gets its own random set (shape, size, height, speed, mirror); no shape repeats
  // inside a band or in the band next to it. Each band drifts left -> right as it moves up the screen.
  const CLOUD_SCALE = 1.1;   // overall cloud size (1 = original)
  const SHAPES = Array.from({ length: 10 }, (_, i) => `assets/cloud-${i + 1}.webp`);
  const r = (a, b) => a + Math.random() * (b - a);
  const mobile = () => innerWidth <= 768;
  const imgs = [];
  let prev = [];
  document.querySelectorAll('.cloud-band').forEach((band) => {
    const pool = SHAPES.filter(src => !prev.includes(src)).sort(() => Math.random() - .5);
    const isLast = !band.nextElementSibling || band.nextElementSibling.matches('footer');
    const n = mobile() ? 2 : Math.round(r(2, 4));                        // main clouds per junction
    const used = pool.slice(0, n);
    used.forEach((src, i) => {
      const el = new Image();
      el.src = src; el.alt = ''; el.decoding = 'async';
      // natural sizes, scattered across the width; the last band stays clear of the footer's bottom edge
      const w = (mobile() ? r(50, 78) : r(16, 30)) * CLOUD_SCALE;  // vw
      const lane = 100 / n;                                        // spread clouds across the screen
      el.style.setProperty('--w', `${w.toFixed(1)}vw`);
      el.style.setProperty('--x', `${(i * lane + r(-.25, .35) * lane - w * .35 - 18).toFixed(1)}vw`);
      el.style.setProperty('--y', `${Math.round(isLast ? r(-420, -260) : r(-320, 40))}px`);
      el.style.setProperty('--o', r(.3, .45).toFixed(2));
      el.style.setProperty('--flip', Math.random() < .5 ? -1 : 1);
      band.appendChild(el);
      imgs.push({ el, band, dir: 1, speed: r(.55, 1.5), base: el.style.getPropertyValue('--x'), flip: el.style.getPropertyValue('--flip') });
    });
    // backdrop layer: a few small, blurred, fainter clouds that drift slowly behind the main ones
    const farCount = mobile() ? 1 : Math.round(r(2, 3));
    const farPool = SHAPES.filter(src => !used.includes(src)).sort(() => Math.random() - .5);
    for (let i = 0; i < farCount; i++) {
      const el = new Image();
      el.src = farPool[i % farPool.length]; el.alt = ''; el.decoding = 'async';
      el.className = 'far';
      const w = (mobile() ? r(22, 34) : r(7, 13)) * CLOUD_SCALE;   // vw
      const lane = 100 / farCount;
      el.style.setProperty('--w', `${w.toFixed(1)}vw`);
      el.style.setProperty('--x', `${(i * lane + r(0, .7) * lane - w * .5 - 8).toFixed(1)}vw`);
      el.style.setProperty('--y', `${Math.round(isLast ? r(-440, -300) : r(-360, -40))}px`);
      el.style.setProperty('--o', r(.17, .28).toFixed(2));
      el.style.setProperty('--blur', `${r(2.5, 4.5).toFixed(1)}px`);
      el.style.setProperty('--flip', Math.random() < .5 ? -1 : 1);
      band.insertBefore(el, band.firstChild);
      imgs.push({ el, band, dir: 1, speed: r(.2, .4), base: el.style.getPropertyValue('--x'), flip: el.style.getPropertyValue('--flip') });
    }
    // counter-drift layer: a few clouds that cross the other way (right -> left) as you scroll down
    const backCount = mobile() ? (Math.random() < .5 ? 1 : 0) : 1;
    const backPool = SHAPES.filter(src => !used.includes(src)).sort(() => Math.random() - .5);
    for (let i = 0; i < backCount; i++) {
      const el = new Image();
      el.src = backPool[i % backPool.length]; el.alt = ''; el.decoding = 'async';
      el.className = 'counter';
      const w = (mobile() ? r(44, 64) : r(14, 22)) * CLOUD_SCALE;  // vw — a touch smaller than the main clouds
      el.style.setProperty('--w', `${w.toFixed(1)}vw`);
      el.style.setProperty('--x', `${(r(38, 72) + i * 18).toFixed(1)}vw`);   // start on the right half
      el.style.setProperty('--y', `${Math.round(isLast ? r(-430, -280) : r(-340, 0))}px`);
      el.style.setProperty('--o', r(.25, .38).toFixed(2));
      el.style.setProperty('--flip', Math.random() < .5 ? -1 : 1);
      band.appendChild(el);
      imgs.push({ el, band, dir: -1, speed: r(.5, 1), base: el.style.getPropertyValue('--x'), flip: el.style.getPropertyValue('--flip') });
    }
    prev = used;
  });

  let ticking = false, idle;
  const update = () => {
    ticking = false;
    const vh = innerHeight, travel = innerWidth * .55;
    for (const c of imgs) {
      const top = c.band.getBoundingClientRect().top;
      if (top < -vh * .7 || top > vh * 1.7) continue;          // off-screen: skip work
      const p = 1 - top / vh;                                   // 0 entering at bottom -> 1 at top
      const dx = (p - .5) * travel * c.speed * c.dir;             // dir -1 = counter layer, right -> left
      c.el.style.transform = `translate3d(calc(${c.base} + ${dx.toFixed(1)}px), 0, 0) scaleX(${c.flip})`;
    }
  };
  // clouds fade in while the page is moving and melt away shortly after scrolling stops
  const root = document.documentElement;
  const onScroll = () => {
    if (root.classList.contains('no-clouds')) return;   // switched off in the season menu
    root.classList.add('clouds-on');
    clearTimeout(idle); idle = setTimeout(() => root.classList.remove('clouds-on'), 700);
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => requestAnimationFrame(update));
  update();

  // Sections: fade and rise into place as they enter the viewport
  document.documentElement.classList.add('js-reveal');
  const targets = [
    ['.events-head'], ['.event-card', 100], ['.deity'], ['.divine-copy', 0, 120],
    ['.grounds .section-heading'], ['.grounds-map', 0, 120],   // footer is always shown (it can sit below the trigger zone)
  ];
  const io = new IntersectionObserver((entries) => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
  targets.forEach(([sel, stagger = 0, delay = 0]) =>
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--d', `${delay + i * stagger}ms`);
      io.observe(el);
    }));
})();
