// Album detail: photo grid / list and the immersive viewer (view only; downloads live on the Download Pics page)
const params = new URLSearchParams(location.search);
const album = GALLERY.find(a => a.id === params.get('id')) || GALLERY.find(a => a.id === 'vaag-beej-sadhana');
const PAGE = 28, MORE = 24;

const state = {
  order: album.photos.map((_, i) => i),   // captured order
  byName: false,
  shown: Math.min(PAGE, album.photos.length),
  layout: 'grid',
};
const $ = (id) => document.getElementById(id);
const grid = $('photoGrid');
const total = album.photos.length;

// ----- Header -----
document.title = `${album.heading} — Gallery — Sri Badrika Ashram`;
$('crumbTitle').textContent = album.heading;
$('albumTitle').textContent = album.heading;
$('albumLede').textContent = album.subtitle
  ? `${album.subtitle} — a visual chronicle from Sri Badrika Ashram.`
  : 'A visual chronicle from Sri Badrika Ashram.';
$('albumMeta').textContent = `${album.date} · Sri Badrika Ashram`;
$('footTotal').textContent = plural(total, 'image');

// ----- Grid -----
const sorted = () => state.byName
  ? [...state.order].sort((a, b) => album.photos[a][0].localeCompare(album.photos[b][0], undefined, { numeric: true }))
  : state.order;

const photoHTML = (i) => {
  const [name, w, h] = album.photos[i];
  return `<div class="ph" data-i="${i}">
    <button class="ph-open" type="button" aria-label="Open ${escapeHTML(name)}">
      <img src="${thumbSrc(album, i)}" alt="" loading="lazy" draggable="false" width="${Math.round(w / 2.5)}" height="${Math.round(h / 2.5)}">
    </button>
    <span class="ph-name">${escapeHTML(name)}</span>
    <span class="ph-dims">${w} × ${h}</span>
  </div>`;
};

const renderGrid = () => {
  grid.className = state.layout === 'grid' ? 'ph-grid' : 'ph-list';
  grid.innerHTML = sorted().slice(0, state.shown).map(photoHTML).join('');
  $('showing').textContent = `Showing ${state.shown} of ${total} images`;
  $('loadMore').hidden = state.shown >= total;
  $('loadMore').textContent = `Load ${Math.min(MORE, total - state.shown)} more`;
};

grid.addEventListener('click', (e) => {
  const tile = e.target.closest('.ph');
  if (!tile) return;
  if (e.target.closest('.ph-open')) openViewer(sorted().indexOf(+tile.dataset.i));
});
$('sortBtn').addEventListener('click', () => {
  state.byName = !state.byName;
  $('sortBtn').querySelector('span:not(.ic)').textContent = state.byName ? 'File name' : 'Captured order';
  renderGrid();
});
document.querySelectorAll('[data-layout]').forEach(btn => btn.addEventListener('click', () => {
  state.layout = btn.dataset.layout;
  document.querySelectorAll('[data-layout]').forEach(b => b.setAttribute('aria-pressed', b === btn));
  renderGrid();
}));
$('loadMore').addEventListener('click', () => {
  const first = state.shown;
  state.shown = Math.min(total, state.shown + MORE);
  renderGrid();
  grid.children[first]?.querySelector('button').focus({ preventScroll: true });
});

renderGrid();
protectImages(grid);

/* ---------- Immersive viewer ---------- */
const viewer = $('viewer');
const vImg = $('vImg');
protectImages(viewer);
const strip = $('vThumbs');
let pos = 0;              // position within sorted()
let lastFocus = null;

const buildStrip = () => {
  strip.innerHTML = sorted().map((i, p) =>
    `<button class="v-thumb" type="button" data-p="${p}" aria-label="Show ${escapeHTML(album.photos[i][0])}"><img src="${thumbSrc(album, i)}" alt="" loading="lazy" draggable="false"></button>`).join('');
};
const show = (p, jump) => {
  const list = sorted();
  pos = Math.max(0, Math.min(list.length - 1, p));
  const i = list[pos];
  const [name, w, h] = album.photos[i];
  vImg.classList.add('loading');
  vImg.onload = () => vImg.classList.remove('loading');
  vImg.src = photoSrc(album, i);
  vImg.alt = `${album.heading}, photo ${pos + 1} of ${list.length}`;
  $('vCount').textContent = `${pos + 1} of ${list.length}`;
  $('vName').textContent = name;
  $('vPrev').disabled = pos === 0;
  $('vNext').disabled = pos === list.length - 1;
  $('vInfoName').textContent = name;
  $('vInfoSize').textContent = `${w} × ${h} px`;
  $('vInfoPos').textContent = `${pos + 1} of ${list.length}`;
  strip.querySelectorAll('.v-thumb').forEach(t => t.setAttribute('aria-current', +t.dataset.p === pos));
  const cur = strip.querySelector(`[data-p="${pos}"]`);
  // centre the current thumbnail; jump straight there when the viewer first opens
  if (cur) strip.scrollTo({ left: cur.offsetLeft - strip.offsetLeft - (strip.clientWidth - cur.offsetWidth) / 2, behavior: jump ? 'instant' : 'smooth' });
  // warm the neighbours so next / previous feel instant
  [list[pos - 1], list[pos + 1]].forEach(n => { if (n != null) new Image().src = photoSrc(album, n); });
  const url = new URL(location);
  url.searchParams.set('photo', pos + 1);
  history.replaceState(history.state, '', url);
};
function openViewer(p) {
  lastFocus = document.activeElement;
  buildStrip();
  viewer.classList.add('open');
  viewer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('viewer-open');
  if (!history.state?.viewer) history.pushState({ viewer: true }, '');
  show(p, true);
  $('vClose').focus();
}
// Opening the viewer adds a history entry, so closing it is always "go back one step"
const closeViewer = () => { if (history.state?.viewer) history.back(); else hideViewer(); };
const hideViewer = () => {
  if (!viewer.classList.contains('open')) return;
  viewer.classList.remove('open');
  viewer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('viewer-open');
  if (document.fullscreenElement) document.exitFullscreen();
  lastFocus?.focus({ preventScroll: true });
};
// the browser Back button closes the viewer instead of leaving the album
addEventListener('popstate', () => {
  hideViewer();
  const url = new URL(location);
  if (url.searchParams.has('photo')) { url.searchParams.delete('photo'); history.replaceState(null, '', url); }
});

$('vClose').addEventListener('click', () => closeViewer());
$('vPrev').addEventListener('click', () => show(pos - 1));
$('vNext').addEventListener('click', () => show(pos + 1));
$('vSetPrev').addEventListener('click', () => strip.scrollBy({ left: -strip.clientWidth * .8 }));
$('vSetNext').addEventListener('click', () => strip.scrollBy({ left: strip.clientWidth * .8 }));
strip.addEventListener('click', (e) => { const t = e.target.closest('.v-thumb'); if (t) show(+t.dataset.p); });
$('vInfo').addEventListener('click', () => {
  const open = $('vInfoPanel').hidden;
  $('vInfoPanel').hidden = !open;
  $('vInfo').setAttribute('aria-pressed', open);
});
$('vFull').addEventListener('click', () => {
  document.fullscreenElement ? document.exitFullscreen() : viewer.requestFullscreen?.();
});
document.addEventListener('fullscreenchange', () => $('vFull').setAttribute('aria-pressed', !!document.fullscreenElement));
document.addEventListener('keydown', (e) => {
  if (!viewer.classList.contains('open')) return;
  if (e.key === 'ArrowLeft') show(pos - 1);
  else if (e.key === 'ArrowRight') show(pos + 1);
  else if (e.key === 'Escape' && !document.fullscreenElement) closeViewer();
  else if (e.key.toLowerCase() === 'i' && !e.metaKey && !e.ctrlKey) $('vInfo').click();
  else if (e.key === 'Tab') {
    // keep keyboard focus inside the viewer
    const f = [...viewer.querySelectorAll('button:not(:disabled), a[href]')].filter(el => el.offsetParent);
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }
});
// swipe left / right on touch screens
let touchX = null;
$('vStage').addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
$('vStage').addEventListener('touchend', (e) => {
  if (touchX == null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) show(pos + (dx < 0 ? 1 : -1));
  touchX = null;
});
$('vContext').textContent = album.heading;
$('vInfoAlbum').textContent = album.heading;
$('vInfoDate').textContent = album.date;

// Deep link: album.html?id=…&photo=N opens straight into the viewer
const deep = parseInt(params.get('photo'), 10);
if (deep >= 1 && deep <= total) {
  history.replaceState(null, '', location.href);
  openViewer(deep - 1);
}
