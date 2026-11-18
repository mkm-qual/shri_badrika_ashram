// About Swamiji: the poem fills in with your scroll. Every letter starts as a faint whisper; as you scroll
// down, ink flows through the poem letter by letter, with a soft feathered edge a few letters wide,
// so it reads like being written in time with your hand. Scroll back up and it recedes. Opacity only,
// on letters that already hold their place, so nothing moves and it stays smooth.
// Screen readers get the whole poem at once; visitors who prefer less motion see it whole.
(() => {
  const verse = document.querySelector('.ab-verse');
  if (!verse || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const lines = [...verse.querySelectorAll(':scope > span')];
  const spoken = document.createElement('span');
  spoken.className = 'visually-hidden';
  spoken.textContent = lines.map(l => l.textContent.trim()).join(' ');
  verse.append(spoken);   // last, so the lines keep their places (and their styling by position)
  const chars = [];
  lines.forEach((line) => {
    const text = line.textContent.trim();
    line.setAttribute('aria-hidden', 'true');
    line.textContent = '';
    [...text].forEach((ch) => {
      const c = document.createElement('i');
      c.textContent = ch;
      line.append(c);
      chars.push(c);
    });
  });
  document.documentElement.classList.add('verse-ink');

  const N = chars.length, EDGE = 14;                       // letters in the soft, feathered front
  const FAINT = 0.07;   // the whisper the unread letters rest at
  const shown = new Float32Array(N).fill(-1);
  let ticking = false;
  const draw = () => {
    ticking = false;
    const r = verse.getBoundingClientRect(), vh = innerHeight;
    // starts as the poem's top reaches 85% down the screen, complete as its end reaches the middle
    const start = vh * 0.85, end = vh * 0.5;
    const p = Math.min(1, Math.max(0, (start - r.top) / ((start - end) + r.height)));
    const front = p * (N + EDGE);
    for (let i = 0; i < N; i++) {
      const t = Math.min(1, Math.max(0, (front - i) / EDGE));
      const o = FAINT + (1 - FAINT) * t * t * (3 - 2 * t);
      if (Math.abs(o - shown[i]) > 0.004) { chars[i].style.opacity = o.toFixed(3); shown[i] = o; }
    }
  };
  const ask = () => { if (!ticking) { ticking = true; requestAnimationFrame(draw); } };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  draw();
})();
