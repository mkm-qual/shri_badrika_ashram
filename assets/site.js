// Single source for the site's navigation links (header Menu panel and the mobile drawer accordion)
const SITE_MENU = {
  events: { title: 'Events', href: 'events.html', links: [
    ['Upcoming Events', 'events.html'], ['Gallery', 'gallery.html'], ['Download Pics', 'downloads.html'] ] },
  offerings: { title: 'Offerings', href: 'offerings.html', links: [
    ['Sri Hari Abhishekam', 'offerings.html#abhishekam'], ['Sri Hari Aarti', 'offerings.html#aarti'],
    ['Sri Hari Sahasranama', 'offerings.html#sahasranama'], ['Sri Hari Sringar', 'offerings.html#sringar'],
    ['Make an offering', 'make-offering.html'] ] },
  ashram: { title: 'Ashram', href: 'ashram.html', links: [
    ['Virtual Tour', 'ashram.html#tour'], ['Temple', 'ashram.html#sri-hari-mandir'], ['Direction', 'ashram.html#directions'], ['Contact us', 'contact.html'], ['FAQs', 'faq.html'],
    ['Important Guidelines', 'guidelines.html'], ['Career', 'career.html'] ] },
  involved: { title: 'Get Involved', href: 'get-involved.html', links: [
    ['Ways to support', 'get-involved.html'], ['Donate', 'donate.html'], ['Form 10BE', 'form-10be.html'] ] },
};
// Section links (#events…) point at the home page when used on another page
const onHome = document.body.dataset.page === 'home';
const link = (href) => (!onHome && href.length > 1 && href[0] === '#' ? './' + href : href);
const groupHTML = (key, extraClass = '') => {
  const g = SITE_MENU[key];
  // the group title is itself a link to that section's main page
  return `<div class="menu-group ${extraClass}"><a class="menu-heading" href="${link(g.href)}">${g.title}</a>` +
    g.links.map(([label, href]) => `<a href="${link(href)}">${label}</a>`).join('') + `</div>`;
};
document.querySelectorAll('[data-menu]').forEach(el => {
  // Drawer (phones): one accordion per group
  if (el.dataset.mode === 'accordion') {
    el.innerHTML = el.dataset.order.split(',').map(k => {
      const g = SITE_MENU[k];
      return `<details class="acc"><summary>${g.title}<img src="assets/arrow-down.svg" width="20" height="20" alt=""></summary>` +
        // the summary opens the list, so the section's main page is the first link inside it
        `<div class="acc-links"><a class="acc-overview" href="${link(g.href)}">Overview</a>${g.links.map(([label, href]) => `<a href="${link(href)}">${label}</a>`).join('')}</div></details>`;
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
// The computer's setting leads. The toggle overrides it for this visit only; choosing the same as the
// computer drops the override, and changing the computer's setting is always followed straight away.
const systemDark = matchMedia('(prefers-color-scheme: dark)');
// Every colour swaps in the same instant (no element lags behind and shows its corners), and where the
// browser can, the whole page crossfades from the old look to the new one.
const setTheme = (t) => {
  const root = document.documentElement;
  const apply = () => {
    root.classList.add('theme-switching');
    root.setAttribute('data-theme', t);
    syncThemeLabel();
    root.offsetWidth;   // commit the new colours with transitions off
    root.classList.remove('theme-switching');
  };
  if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(apply);
  else apply();
};
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  setTheme(next);
  try {
    if (next === (systemDark.matches ? 'dark' : 'light')) sessionStorage.removeItem('sba-theme');
    else sessionStorage.setItem('sba-theme', next);
  } catch (e) {}
});
systemDark.addEventListener('change', (e) => {
  try { sessionStorage.removeItem('sba-theme'); } catch (err) {}
  setTheme(e.matches ? 'dark' : 'light');
});

// Terms of Service and the Ashram guidelines open in a pop-up when linked from a page's content
// (header menu and footer links still go to the full pages)
const DOCS = {
  'terms.html': { title: 'Terms of Service', body: '.lg-body' },
  'guidelines.html': { title: 'Important Guidelines', body: '.gd-list' },
};
let docDialog;
const docCache = {};
const openDoc = async (file, opener) => {
  if (!docDialog) {
    docDialog = document.createElement('dialog');
    docDialog.className = 'doc-dialog';
    docDialog.setAttribute('aria-labelledby', 'docTitle');
    docDialog.innerHTML = `
      <div class="doc-head">
        <h2 id="docTitle"></h2>
        <button class="doc-close" type="button" aria-label="Close"><span class="ic" style="--i:url('icons/x.svg');--s:18px" aria-hidden="true"></span></button>
      </div>
      <div class="doc-body" tabindex="0"></div>
      <div class="doc-foot"><a class="text-link" target="_blank" rel="noopener">Open full page<span class="ic" style="--i:url('icons/external.svg');--s:14px" aria-hidden="true"></span></a></div>`;
    document.body.append(docDialog);
    docDialog.querySelector('.doc-close').addEventListener('click', () => docDialog.close());
    // a click on the backdrop (outside the panel) closes it
    docDialog.addEventListener('click', (e) => { if (e.target === docDialog) docDialog.close(); });
    docDialog.addEventListener('close', () => { document.documentElement.classList.remove('doc-open'); docDialog.opener?.focus(); });
  }
  const doc = DOCS[file];
  const body = docDialog.querySelector('.doc-body');
  docDialog.querySelector('#docTitle').textContent = doc.title;
  docDialog.querySelector('.doc-foot a').href = file;
  docDialog.opener = opener;
  body.innerHTML = '<p class="doc-loading">Loading…</p>';
  document.documentElement.classList.add('doc-open');
  docDialog.showModal();
  try {
    if (!docCache[file]) {
      const html = await (await fetch(file)).text();
      const part = new DOMParser().parseFromString(html, 'text/html').querySelector(doc.body);
      if (!part) throw new Error('missing');
      part.querySelectorAll('[id]').forEach(el => el.id = 'doc-' + el.id);   // keep ids unique on this page
      docCache[file] = part.outerHTML;
    }
    body.innerHTML = docCache[file];
  } catch (e) {
    body.innerHTML = `<p class="doc-loading">This couldn’t load here. <a href="${file}" target="_blank" rel="noopener">Open ${doc.title}</a> in a new tab.</p>`;
  }
  body.scrollTop = 0;
};
document.addEventListener('click', (e) => {
  const a = e.target.closest('main a[href]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;   // let cmd/ctrl-click open a tab
  const file = a.getAttribute('href').split('#')[0];
  if (!DOCS[file] || location.pathname.endsWith('/' + file)) return;
  e.preventDefault();
  openDoc(file, a);
});

// Signed in: the sign-in circle shows the first letter of the visitor's name and opens the account menu
// (bookings, dependants, profile, donations, sign out). Accounts aren't live yet, so this is a preview:
// signing in on signin.html, or ?signed-in (or ?signed-in=Name), turns it on for this visit; ?signed-out ends it.
(() => {
  const q = new URLSearchParams(location.search);
  try {
    if (q.has('signed-out')) sessionStorage.removeItem('sba-user');
    else if (q.has('signed-in')) sessionStorage.setItem('sba-user', q.get('signed-in') || 'Ravi Sharma');
  } catch (e) {}
  let name = null;
  try { name = sessionStorage.getItem('sba-user'); } catch (e) {}
  if (!name) return;
  const initial = name.trim().charAt(0).toUpperCase();
  const here = location.pathname.split('/').pop();
  const item = (href, label) => `<a href="${href}"${here === href ? ' aria-current="page"' : ''}>${label}</a>`;
  document.querySelectorAll('.pill-user').forEach(a => {
    const wrap = document.createElement('div');
    wrap.className = 'acct-menu';
    wrap.innerHTML = `<button type="button" class="pill-user signed-in" aria-haspopup="true" aria-expanded="false" aria-label="Your account: ${name.replace(/"/g, '')}" title="${name.replace(/"/g, '')}"><span class="pill-initial" aria-hidden="true">${initial}</span></button>
      <div class="dropdown acct-drop">
        <p class="acct-drop-who"><strong></strong><span>Signed in</span></p>
        ${item('my-bookings.html', 'My bookings')}${item('dependants.html', 'Dependants')}${item('profile.html', 'Profile settings')}
        <a href="donate.html?signed-in#my-recurring" data-crumb-label="My donations">My donations</a>
        <button type="button" class="acct-drop-out" data-signout>Sign out</button>
      </div>`;
    wrap.querySelector('.acct-drop-who strong').textContent = name;
    a.replaceWith(wrap);
    const btn = wrap.querySelector('.pill-user');
    const setOpen = (open) => { wrap.classList.toggle('open', open); btn.setAttribute('aria-expanded', open); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!wrap.classList.contains('open')); });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && wrap.classList.contains('open')) { setOpen(false); btn.focus(); } });
    wrap.querySelector('[data-signout]').addEventListener('click', () => {
      try { sessionStorage.removeItem('sba-user'); } catch (e) {}
      location.href = 'index.html';
    });
  });
})();

// Breadcrumbs follow the visitor's journey. Each page's breadcrumb in the HTML is its default place in the
// site. When you arrive by following a link, the trail you were on is carried over instead:
// Get Involved → Donate shows "Home / Get Involved / Donate", while the account menu's My donations shows
// "Home / Your account / My donations". The main navigation (header, menu, footer) starts a fresh trail at
// the page's default; account links always sit under "Your account"; going back up a trail trims it.
(() => {
  const nav = document.querySelector('nav.crumbs');
  const keyOf = (url) => { const u = new URL(url, location.href); return (u.pathname.split('/').pop() || 'index.html') + u.search; };
  const here = keyOf(location.href);
  const HOME = { label: 'Home', href: './' };
  const ACCOUNT = [HOME, { label: 'Your account', href: 'my-bookings.html' }];
  const same = (a, b) => keyOf(a.href) === keyOf(b.href);
  let store = {};
  try { store = JSON.parse(sessionStorage.getItem('sba-trails') || '{}'); } catch (e) {}
  const keep = () => { try { sessionStorage.setItem('sba-trails', JSON.stringify(store)); } catch (e) {} };

  // remember where each link click leads, so the next page can continue the trail
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || e.defaultPrevented) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || (keyOf(u) === here && u.hash)) return;
    const mode = a.closest('.acct-drop, .acct-side') ? 'account' : a.closest('.nav, .drawer, .footer, .site-picker') ? 'reset' : 'follow';
    try { sessionStorage.setItem('sba-crumb-next', JSON.stringify({ to: keyOf(u), mode, label: a.dataset.crumbLabel || null, from: store[here] || null })); } catch (err) {}
  }, true);

  const page = () => nav ? [...nav.children].filter(el => !el.classList.contains('sep')).map(el => ({ label: el.textContent.trim(), href: el.getAttribute('href') || keyOf(location.href) })) : [HOME];
  const build = () => {
    const def = here.split('?')[0] === 'index.html' ? [HOME] : page();
    const cur = def[def.length - 1];
    let next = null;
    try { next = JSON.parse(sessionStorage.getItem('sba-crumb-next') || 'null'); sessionStorage.removeItem('sba-crumb-next'); } catch (e) {}
    let trail;
    if (next && next.to === here) {
      const me = { label: next.label || cur.label, href: here };
      if (next.mode === 'reset' || !next.from) trail = def;
      else if (next.mode === 'account') trail = [...ACCOUNT, me];
      else {
        const from = next.from, at = from.findIndex(c => same(c, me));
        if (at >= 0) trail = from.slice(0, at + 1);                                    // back up the trail
        else if (from.length > 1 && def.length > 1 && same(from[from.length - 2], def[def.length - 2])) trail = [...from.slice(0, -1), me];   // a sibling page
        else trail = [...from, me];
        if (trail.length > 5) trail = [trail[0], ...trail.slice(-4)];                  // keep it short
      }
    } else trail = store[here] || def;                                                 // refresh or back: the trail you had
    store[here] = trail; keep();
    if (!nav || trail === def) return;
    const esc = (s) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const arrow = '<span class="ic" style="--i:url(\'icons/arrow-left.svg\');--s:15px" aria-hidden="true"></span>';
    nav.innerHTML = trail.map((c, i) => i === trail.length - 1
      ? `<span aria-current="page">${esc(c.label)}</span>`
      : `<a href="${esc(c.href)}">${i === 0 ? arrow : ''}${esc(c.label)}</a>`).join('<span class="sep" aria-hidden="true">/</span>');
  };
  // after every page script has run (booking and album pages fill in their own breadcrumb first)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
