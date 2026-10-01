// Gallery helpers shared by the album gallery, album detail and Download Pics pages
// (icon paths are relative to assets/site.css, where the mask is applied)
const icon = (name, size) =>
  `<span class="ic" style="--i:url('icons/${name}.svg')${size ? `;--s:${size}px` : ''}" aria-hidden="true"></span>`;
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const photoSrc = (album, i) => `assets/gallery/${album.id}/${String(i + 1).padStart(2, '0')}.jpg`;
const thumbSrc = (album, i) => `assets/gallery/${album.id}/thumb/${String(i + 1).padStart(2, '0')}.jpg`;
const coverSrc = (album) => `assets/gallery/${album.id}/cover.jpg`;
const albumURL = (album) => `album.html?id=${encodeURIComponent(album.id)}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Album photos are view-only. Right-clicking, dragging or long-pressing a photo shows how to request images.
const CONTACT_EMAIL = 'Contact.omswami@gmail.com';
let imgToast, imgToastTimer;
const imageNotice = () => {
  if (!imgToast) {
    imgToast = document.createElement('div');
    imgToast.className = 'img-notice';
    imgToast.setAttribute('role', 'status');
    imgToast.innerHTML = `<p>For images please contact us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>` +
      `<button type="button" aria-label="Dismiss">${icon('x', 15)}</button>`;
    imgToast.querySelector('button').addEventListener('click', () => imgToast.classList.remove('show'));
    document.body.appendChild(imgToast);
  }
  imgToast.classList.add('show');
  clearTimeout(imgToastTimer);
  imgToastTimer = setTimeout(() => imgToast.classList.remove('show'), 6000);
};
function protectImages(root) {
  const onImage = (e) => e.target.closest && e.target.closest('img, .ph-open, .album-cover, .v-stage, .v-thumb');
  root.addEventListener('contextmenu', (e) => { if (onImage(e)) { e.preventDefault(); imageNotice(); } });
  root.addEventListener('dragstart', (e) => { if (onImage(e)) { e.preventDefault(); imageNotice(); } });
  document.documentElement.classList.add('protect-images');
}

// Downloads (Download Pics page only): one file is a plain link; several are bundled into a zip in the browser
let zipLib;
const loadZip = () => zipLib || (zipLib = new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  s.onload = () => resolve(window.JSZip);
  s.onerror = () => { zipLib = null; reject(new Error('Could not load the zip library')); };
  document.head.appendChild(s);
}));
const saveBlob = (blob, filename) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
// files: [{ url, name }]; onProgress(done, total) lets the caller update its button
async function downloadFiles(files, zipName, onProgress) {
  const JSZip = await loadZip();
  const zip = new JSZip();
  let done = 0;
  onProgress && onProgress(0, files.length);
  for (const f of files) {
    const res = await fetch(f.url);
    if (!res.ok) throw new Error(`Could not fetch ${f.name}`);
    zip.file(f.name, await res.blob());
    onProgress && onProgress(++done, files.length);
  }
  saveBlob(await zip.generateAsync({ type: 'blob' }), `${zipName}.zip`);
}

// Runs an async download behind a button, showing progress and blocking double clicks
async function withProgress(btn, label, task) {
  if (btn.dataset.busy) return;
  btn.dataset.busy = '1';
  const original = btn.innerHTML;
  const setText = (t) => { const span = btn.querySelector('span:not(.ic)'); span ? (span.textContent = t) : (btn.title = t); };
  try {
    await task((done, total) => setText(`${label} ${done}/${total}`));
  } catch (e) {
    alert('Sorry, the download could not be completed. Please try again.');
  } finally {
    btn.innerHTML = original;
    delete btn.dataset.busy;
  }
}

/* ---------- Album gallery page ---------- */
const galleryRoot = document.getElementById('albumGrid');
if (galleryRoot) {
  const state = { category: 'all', newestFirst: true, query: '' };
  const countEl = document.getElementById('albumCount');
  const searchEl = document.getElementById('albumSearch');
  const sortBtn = document.getElementById('albumSort');
  countEl.textContent = GALLERY.length;

  const columnsFor = () => (innerWidth <= 768 ? 1 : innerWidth <= 1100 ? 2 : 3);
  // Cover proportions come from the design (cards are 426px wide at 1440)
  const cardHTML = (a) => `
    <article class="album-card">
      <a href="${albumURL(a)}">
        <div class="album-cover" style="--ar: 426 / ${a.coverHeight}">
          <img src="${coverSrc(a)}" alt="" loading="lazy" draggable="false">
        </div>
        <div class="album-info">
          <div>
            <h2>${escapeHTML(a.title)}</h2>
            <p>Sri Badrika Ashram · Event album</p>
          </div>
          ${icon('arrow-up-right', 18)}
        </div>
      </a>
    </article>`;

  const render = () => {
    const q = state.query.trim().toLowerCase();
    const list = GALLERY
      .filter(a => state.category === 'all' || a.category === state.category)
      .filter(a => !q || a.title.toLowerCase().includes(q))
      .sort((a, b) => state.newestFirst ? b.sort - a.sort : a.sort - b.sort);
    if (!list.length) {
      galleryRoot.innerHTML = `<p class="gl-empty">No albums match${q ? ` “${escapeHTML(state.query.trim())}”` : ''}.</p>`;
      return;
    }
    // Masonry: deal cards across the columns in order, row by row
    const n = columnsFor();
    const cols = Array.from({ length: n }, () => []);
    list.forEach((a, i) => cols[i % n].push(cardHTML(a)));
    galleryRoot.innerHTML = cols.map(c => `<div class="album-col">${c.join('')}</div>`).join('');
  };

  document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
    state.category = btn.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', b === btn));
    render();
  }));
  sortBtn.addEventListener('click', () => {
    state.newestFirst = !state.newestFirst;
    sortBtn.querySelector('span:not(.ic)').textContent = state.newestFirst ? 'Latest first' : 'Oldest first';
    render();
  });
  searchEl.addEventListener('input', () => { state.query = searchEl.value; render(); });
  // ⌘K / Ctrl+K focuses search
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchEl.focus(); searchEl.select(); }
  });
  protectImages(galleryRoot);
  let lastCols = columnsFor();
  addEventListener('resize', () => { const n = columnsFor(); if (n !== lastCols) { lastCols = n; render(); } });
  render();
}
