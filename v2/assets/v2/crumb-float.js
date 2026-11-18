// Once the page's breadcrumb scrolls up under the header, a copy of it joins the header line beside the
// logo (after a thin divider), so you always know where you are and can step back.
(() => {
  const crumbs = document.querySelector('nav.crumbs');
  const header = document.querySelector('.nav');
  const logo = header && header.querySelector('.nav-brand a');
  if (!crumbs || !header || !logo) return;
  let shown = null;
  const float = document.createElement('div');
  float.className = 'crumb-float';
  float.setAttribute('aria-hidden', 'true');
  header.querySelector('.nav-brand').after(float);
  const copy = () => {
    float.innerHTML = crumbs.innerHTML;
    float.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', shown ? '0' : '-1'));
  };
  const place = () => {};
  // the breadcrumb is filled in after load (it follows your journey), so copy it once it settles
  const ready = () => { copy(); place(); };
  if (document.readyState === 'complete') ready(); else addEventListener('load', ready);
  new MutationObserver(ready).observe(crumbs, { childList: true, subtree: true });
  addEventListener('resize', place);
  // shown once the page's own breadcrumb has gone up under the header (checked on scroll; cheap: one rect read)
  let ticking = false;
  const check = () => {
    ticking = false;
    const past = crumbs.getBoundingClientRect().bottom < header.offsetHeight;
    if (past === shown) return;
    shown = past;
    float.classList.toggle('show', past);
    header.classList.toggle('crumb-on', past);   // phones fold the logo to its lotus to make room
    float.setAttribute('aria-hidden', !past);
    float.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', past ? '0' : '-1'));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
  addEventListener('resize', check);
  check();
})();
