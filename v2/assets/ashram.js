// Ashram page: video tour cover, the spaces carousel and the map type switch

// Video: swap the cover for the YouTube player on play (no YouTube requests until then)
const video = document.querySelector('.as-video');
video.querySelector('.as-video-play').addEventListener('click', () => {
  const frame = document.createElement('iframe');
  frame.src = `https://www.youtube-nocookie.com/embed/${video.dataset.video}?autoplay=1&rel=0&modestbranding=1`;
  frame.title = 'Sri Badrika Ashram — Take a Tour';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.allowFullscreen = true;
  video.classList.add('playing');
  video.replaceChildren(frame);
  frame.focus();
});

// Spaces carousel: previous / next move by one card; buttons fade out at either end
const track = document.getElementById('stories');
const prev = document.getElementById('storyPrev');
const next = document.getElementById('storyNext');
const section = document.getElementById('activities');
const stage = section.querySelector('.as-pin-stage');
// glide between cards unless the visitor has asked for less motion
const glide = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
const step = () => {
  const card = track.querySelector('.as-story');
  return card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
};
const syncNav = () => {
  prev.disabled = track.scrollLeft < 4;
  next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
};

// Desktop: as the page scrolls down into the section, it holds still and the same scroll slides the
// tiles across; once the last tile is in view the page carries on down. Phones, and visitors who
// prefer less motion, keep the plain swipeable row. An opened "Read more" lets go of the hold so the
// full text can be read, and closing it takes the hold back up.
const pinQuery = matchMedia('(min-width: 1101px) and (prefers-reduced-motion: no-preference)');
let pinned = false;
const navH = () => document.querySelector('.nav').offsetHeight;
const pinStart = () => scrollY + section.getBoundingClientRect().top + parseFloat(getComputedStyle(section).paddingTop) - navH();
const drive = () => {
  if (!pinned) return;
  const dist = track.scrollWidth - track.clientWidth;
  track.scrollLeft = Math.min(dist, Math.max(0, scrollY - pinStart()));
};
const layout = () => {
  const want = pinQuery.matches && !track.querySelector('.off-text.open');
  if (want !== pinned) {
    pinned = want;
    section.classList.toggle('pinned', pinned);
    dispatchEvent(new Event('resize'));   // re-measure the "Read more" buttons for the new card height
  }
  section.style.setProperty('--nav-h', navH() + 'px');
  section.style.setProperty('--pin-dist', pinned ? (track.scrollWidth - track.clientWidth) + 'px' : '0px');
  drive();
  syncNav();
};
// in the hold, the arrows and any sideways swipe move the page, which moves the tiles
const toCard = (left) => scrollTo({ top: pinStart() + left, behavior: glide() });
prev.addEventListener('click', () => pinned ? toCard(track.scrollLeft - step()) : track.scrollBy({ left: -step(), behavior: glide() }));
next.addEventListener('click', () => pinned ? toCard(track.scrollLeft + step()) : track.scrollBy({ left: step(), behavior: glide() }));
track.addEventListener('scroll', syncNav, { passive: true });
addEventListener('scroll', drive, { passive: true });
addEventListener('resize', layout);
pinQuery.addEventListener('change', layout);
// Over the row, a mostly-vertical wheel or trackpad swipe always scrolls the page; in the hold a
// sideways swipe does too, so the tiles follow one scroll position
track.addEventListener('wheel', (e) => {
  if (e.ctrlKey) return;
  const vertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);
  if (!vertical && !pinned) return;
  e.preventDefault();
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
  scrollBy({ top: (vertical ? e.deltaY : e.deltaX) * unit, behavior: 'instant' });
}, { passive: false });
// Read more / Read less: let go of the hold (or take it back) and keep the same tile in front
track.addEventListener('click', (e) => {
  if (!e.target.closest('.read-toggle')) return;
  const left = track.scrollLeft;
  requestAnimationFrame(() => {
    const was = pinned;
    layout();
    if (was && !pinned) { track.scrollLeft = left; scrollTo({ top: pinStart(), behavior: 'instant' }); }
    if (!was && pinned) scrollTo({ top: pinStart() + left, behavior: 'instant' });
  });
});
layout();
// Arriving at #sri-hari-mandir etc. from the menu brings that card into the row's view
const fromHash = () => {
  const card = location.hash && track.querySelector(`.as-story${CSS.escape(location.hash)}`);
  if (!card) return;
  const left = card.offsetLeft - track.firstElementChild.offsetLeft;
  if (pinned) scrollTo({ top: pinStart() + left, behavior: 'instant' });
  else track.scrollTo({ left, behavior: 'instant' });
};
addEventListener('hashchange', fromHash);
fromHash();

// Map: switch between the road map and satellite view
const mapFrame = document.getElementById('mapFrame');
document.querySelectorAll('[data-maptype]').forEach(btn => btn.addEventListener('click', () => {
  const url = new URL(mapFrame.src);
  url.searchParams.set('t', btn.dataset.maptype);
  mapFrame.src = url.toString();
  document.querySelectorAll('[data-maptype]').forEach(b => b.setAttribute('aria-pressed', b === btn));
}));
