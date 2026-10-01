// Gallery helpers shared by the album gallery and album detail pages
// (icon paths are relative to assets/site.css, where the mask is applied)
const icon = (name, size) =>
  `<span class="ic" style="--i:url('icons/${name}.svg')${size ? `;--s:${size}px` : ''}" aria-hidden="true"></span>`;
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const photoSrc = (album, i) => `assets/gallery/${album.id}/${String(i + 1).padStart(2, '0')}.jpg`;
const thumbSrc = (album, i) => `assets/gallery/${album.id}/thumb/${String(i + 1).padStart(2, '0')}.jpg`;
const coverSrc = (album) => `assets/gallery/${album.id}/cover.jpg`;
const albumURL = (album) => `album.html?id=${encodeURIComponent(album.id)}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Downloads: one photo is a plain link; several photos are bundled into a zip in the browser
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
const downloadPhoto = (album, i) => {
  const a = document.createElement('a');
  a.href = photoSrc(album, i);
  a.download = album.photos[i][0];
  document.body.appendChild(a);
  a.click();
  a.remove();
};
// indexes: which photos to include; onProgress(done, total) lets the caller update its button
async function downloadPhotos(album, indexes, zipName, onProgress) {
  if (indexes.length === 1) return downloadPhoto(album, indexes[0]);
  const JSZip = await loadZip();
  const zip = new JSZip();
  const used = new Set();
  let done = 0;
  onProgress && onProgress(0, indexes.length);
  for (const i of indexes) {
    const res = await fetch(photoSrc(album, i));
    let name = album.photos[i][0];
    while (used.has(name)) name = name.replace(/(\.[^.]+)?$/, '-copy$1');
    used.add(name);
    zip.file(name, await res.blob());
    onProgress && onProgress(++done, indexes.length);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  saveBlob(blob, `${zipName}.zip`);
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
          <img src="${coverSrc(a)}" alt="" loading="lazy">
        </div>
        <div class="album-info">
          <div>
            <h2>${escapeHTML(a.title)}</h2>
            <p>Sri Badrika Ashram · Event album</p>
          </div>
          ${icon('arrow-up-right', 18)}
        </div>
      </a>
      <button class="round-btn album-dl" type="button" data-album="${a.id}" aria-label="Download ${escapeHTML(a.title)} (${plural(a.photos.length, 'photo')})">${icon('download', 17)}</button>
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
  galleryRoot.addEventListener('click', (e) => {
    const btn = e.target.closest('.album-dl');
    if (!btn) return;
    const album = GALLERY.find(a => a.id === btn.dataset.album);
    btn.classList.add('busy');
    // The round button is too small for a label, so it shows a bare counter while zipping
    withProgress(btn, '', () => downloadPhotos(album, album.photos.map((_, i) => i), album.id, (d, t) => {
      btn.textContent = `${d}/${t}`;
    })).finally(() => btn.classList.remove('busy'));
  });
  let lastCols = columnsFor();
  addEventListener('resize', () => { const n = columnsFor(); if (n !== lastCols) { lastCols = n; render(); } });
  render();
}
