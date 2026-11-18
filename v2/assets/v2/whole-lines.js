// Clamped text (the "Read more" previews, the About Swamiji preview) ends on the last line that fits
// whole: no fade, and never a line cut through the middle. Each box keeps its line budget (--lines),
// and its height is snapped to the bottom of the last complete line inside that budget, so paragraph
// gaps and odd line heights can't leave half a line showing.
(() => {
  const boxes = [...document.querySelectorAll('.off-text.clamp, .swamiji-body')];
  if (!boxes.length) return;
  const snap = (el) => {
    if (el.classList.contains('open')) return;
    const top = el.getBoundingClientRect().top;
    const first = el.querySelector('p') || el;
    const lh = parseFloat(getComputedStyle(first).lineHeight) || 28;
    const lines = parseFloat(getComputedStyle(el).getPropertyValue('--lines')) || 5;
    const limit = top + lines * lh + 1;
    let best = 0;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.height && r.bottom <= limit && r.bottom > best) best = r.bottom;
    }
    if (!best) return;
    // settle to the new height at once (the Read more slide is for opening and closing, not for this)
    el.style.transition = 'none';
    el.style.setProperty('--clamp-h', `${Math.ceil(best - top + 2)}px`);
    el.offsetHeight;
    el.style.transition = '';
  };
  let busy = false;
  const all = () => {
    if (busy) return;
    busy = true;
    boxes.forEach(snap);
    dispatchEvent(new Event('resize'));   // let "Read more" re-check what is hidden
    busy = false;
  };
  all();
  addEventListener('resize', all);
  addEventListener('load', all);
  document.fonts && document.fonts.ready.then(all);
})();
