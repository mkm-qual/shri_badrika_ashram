// ---------- Site options: the floating theme button ----------
// Switches between the two versions of the site.
// Original is the main branch (site root); Version 1 is the redesign branch, published under /v1/.
(() => {
  const SITE_VERSION = 'v2';   // this copy of the site: 'original' on main, 'v1' and 'v2' under their folders
  const LIVE = 'https://mkm-qual.github.io/shri_badrika_ashram/';
  const VERSIONS = [['original', 'Original', 'current site'], ['v1', 'Version 1', 'redesign'], ['v2', 'Version 2', 'omswami.org look']];

  const picker = document.getElementById('sitePicker');
  const btn = document.getElementById('siteBtn');
  const menu = picker.querySelector('.site-menu');

  // Scroll clouds are always on, on the pages that have them (home, Offerings, Ashram); there is no switch.
  try { localStorage.removeItem('sba-clouds'); } catch (e) {}

  // The same page in the other version. On the published site both live side by side (root and /v1/);
  // in the local previews Original runs on port 4179 and Version 1 on port 4177.
  // Local previews: port 4180 serves all three side by side (root, /v1/, /v2/); otherwise each runs on its own port
  const LOCAL = location.port === '4180'
    ? { original: '/', v1: '/v1/', v2: '/v2/' }
    : { original: 'http://localhost:4179/', v1: 'http://localhost:4177/', v2: 'http://localhost:4180/v2/' };
  const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const page = location.pathname.split('/').pop() || 'index.html';
  const urlFor = (v) => v === SITE_VERSION ? null : (local ? LOCAL[v] : LIVE + (v === 'original' ? '' : v + '/')) + page + location.hash;

  const render = () => {
    menu.innerHTML = VERSIONS.map(([k, l, h]) =>
      `<button type="button" role="menuitemradio" aria-checked="${k === SITE_VERSION}" data-version="${k}"><span>${l}</span></button>`).join('') +
'';
  };
  const close = () => { picker.classList.remove('open'); btn.setAttribute('aria-expanded', false); };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    btn.setAttribute('aria-expanded', picker.classList.toggle('open'));
  });
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-version]'); if (!b) return;
    const url = urlFor(b.dataset.version);
    close();
    if (url) location.href = url;
  });
  document.addEventListener('click', (e) => { if (!picker.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // ?theme=dark|light for quick previews
  const qt = new URLSearchParams(location.search).get('theme');
  if (qt === 'dark' || qt === 'light') document.documentElement.setAttribute('data-theme', qt);

  render();
})();
