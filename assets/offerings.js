// Offerings: "Read more ..." expands the description in place; "Read less" collapses it again
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('.read-toggle').forEach(btn => {
  const text = document.getElementById(btn.getAttribute('aria-controls'));
  const isOpen = () => btn.getAttribute('aria-expanded') === 'true';

  // Only offer the toggle when the collapsed text actually hides something
  const sync = () => {
    if (isOpen()) return;
    btn.hidden = text.scrollHeight <= text.clientHeight + 1;
  };

  const setOpen = (open) => {
    const from = text.getBoundingClientRect().height;
    text.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    btn.textContent = open ? 'Read less' : 'Read more ...';
    if (reduceMotion.matches) return;

    // Animate between the measured heights, then hand control back to CSS
    const to = open ? text.scrollHeight : collapsedHeight();
    text.style.maxHeight = from + 'px';
    text.offsetHeight; // commit the start height
    text.style.maxHeight = to + 'px';
    clearTimeout(text._settle);
    text._settle = setTimeout(() => { text.style.maxHeight = ''; }, 460); // just after the 420ms transition
  };

  // The collapsed height comes from CSS (--lines × line-height)
  const collapsedHeight = () => parseFloat(getComputedStyle(text).lineHeight) * parseFloat(getComputedStyle(text).getPropertyValue('--lines'));

  btn.addEventListener('click', () => {
    const open = !isOpen();
    setOpen(open);
    // When collapsing from far down, bring the offering back into view
    if (!open) {
      const top = text.closest('.offering').getBoundingClientRect().top;
      if (top < 0) text.closest('.offering').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }
  });

  sync();
  addEventListener('resize', sync);
  document.fonts && document.fonts.ready.then(sync);
});
