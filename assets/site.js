// Single source for the site's navigation links (header Menu panel and the mobile drawer accordion)
const SITE_MENU = {
  events: { title: 'Events', href: '#events', links: [
    ['Upcoming Events', 'events.html'], ['Gallery', 'gallery.html'], ['Download Pics', 'downloads.html'] ] },
  offerings: { title: 'Offerings', href: 'offerings.html', links: [
    ['Sri Hari Abhishekam', 'offerings.html#abhishekam'], ['Sri Hari Aarti', 'offerings.html#aarti'],
    ['Sri Hari Sahasranama', 'offerings.html#sahasranama'], ['Sri Hari Sringar', 'offerings.html#sringar'] ] },
  ashram: { title: 'Ashram', href: '#ashram', links: [
    ['Virtual Tour', '#ashram'], ['Temple', '#ashram'], ['Direction', '#'], ['Contact us', '#'],
    ['Important Guidelines', '#'], ['Career', '#'] ] },
  involved: { title: 'Get Involved', href: '#', links: [
    ['Donate', '#'], ['Form 10BE', '#'] ] },
};
// Section links (#events…) point at the home page when used on another page
const onHome = document.body.dataset.page === 'home';
const link = (href) => (!onHome && href.length > 1 && href[0] === '#' ? './' + href : href);
const groupHTML = (key, extraClass = '') => {
  const g = SITE_MENU[key];
  return `<div class="menu-group ${extraClass}"><p class="menu-heading">${g.title}</p>` +
    g.links.map(([label, href]) => `<a href="${link(href)}">${label}</a>`).join('') + `</div>`;
};
document.querySelectorAll('[data-menu]').forEach(el => {
  // Drawer (phones): one accordion per group
  if (el.dataset.mode === 'accordion') {
    el.innerHTML = el.dataset.order.split(',').map(k => {
      const g = SITE_MENU[k];
      return `<details class="acc"><summary>${g.title}<img src="assets/arrow-down.svg" width="20" height="20" alt=""></summary>` +
        `<div class="acc-links">${g.links.map(([label, href]) => `<a href="${link(href)}">${label}</a>`).join('')}</div></details>`;
    }).join('');
    // keep one group open at a time
    el.querySelectorAll('.acc').forEach(d => d.addEventListener('toggle', () => {
      if (d.open) el.querySelectorAll('.acc[open]').forEach(o => o !== d && (o.open = false));
    }));
    return;
  }
  // Menu panel: every group with its links; "a+b" stacks groups in one column
  el.innerHTML = el.dataset.order.split(',').map(col => {
    const keys = col.split('+');
    const html = keys.map((k, i) => groupHTML(k, i ? 'stacked' : '')).join('');
    return keys.length > 1 ? `<div class="col">${html}</div>` : html;
  }).join('');
});

// Desktop menu dropdown
const navMenu = document.getElementById('navMenu');
const navMenuBtn = document.getElementById('navMenuBtn');
navMenuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const open = navMenu.classList.toggle('open');
  navMenuBtn.setAttribute('aria-expanded', open);
});
document.addEventListener('click', (e) => {
  if (!navMenu.contains(e.target)) { navMenu.classList.remove('open'); navMenuBtn.setAttribute('aria-expanded', false); }
  document.querySelectorAll('.disclosure[open]').forEach(d => { if (!d.contains(e.target)) d.open = false; });
});
navMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navMenu.classList.remove('open')));

// Mobile drawer
const drawer = document.getElementById('drawer');
const setDrawer = (open) => {
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', !open);
  document.body.style.overflow = open ? 'hidden' : '';
};
document.getElementById('drawerOpen').addEventListener('click', () => setDrawer(true));
document.getElementById('drawerClose').addEventListener('click', () => setDrawer(false));
drawer.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => setDrawer(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setDrawer(false); navMenu.classList.remove('open'); } });

// Light / dark theme
const themeToggle = document.getElementById('themeToggle');
const syncThemeLabel = () => {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  themeToggle.setAttribute('aria-pressed', dark);
};
syncThemeLabel();
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('sba-theme', next); } catch (e) {}
  syncThemeLabel();
});
