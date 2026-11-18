// Once the page's breadcrumb scrolls up under the header, a copy of it rides along just below the logo,
// lined up with the logo's left edge, so you always know where you are and can step back.
(() => {
  const crumbs = document.querySelector('nav.crumbs');
  const header = document.querySelector('.nav');
  const logo = header && header.querySelector('.nav-brand a');
  if (!crumbs || !header || !logo) return;
  const float = document.createElement('div');
  float.className = 'crumb-float';
  float.setAttribute('aria-hidden', 'true');
  header.append(float);
  const copy = () => {
    float.innerHTML = crumbs.innerHTML;
    float.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', '-1'));
  };
  const place = () => {
    const h = header.getBoundingClientRect(), l = logo.getBoundingClientRect();
    float.style.left = `${l.left - h.left}px`;
    document.documentElement.style.setProperty('--crumb-float-h', `${float.offsetHeight + 4}px`);
  };
  // the breadcrumb is filled in after load (it follows your journey), so copy it once it settles
  const ready = () => { copy(); place(); };
  if (document.readyState === 'complete') ready(); else addEventListener('load', ready);
  new MutationObserver(ready).observe(crumbs, { childList: true, subtree: true });
  addEventListener('resize', place);
  new IntersectionObserver(([e]) => {
    const past = !e.isIntersecting && e.boundingClientRect.top < header.offsetHeight;
    float.classList.toggle('show', past);
    document.documentElement.classList.toggle('crumb-floating', past);
    float.setAttribute('aria-hidden', !past);
    float.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', past ? '0' : '-1'));
  }, { rootMargin: `-${header.offsetHeight}px 0px 0px 0px` }).observe(crumbs);
})();
