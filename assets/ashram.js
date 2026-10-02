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
const step = () => {
  const card = track.querySelector('.as-story');
  return card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0);
};
const syncNav = () => {
  prev.disabled = track.scrollLeft < 4;
  next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
};
prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
track.addEventListener('scroll', syncNav, { passive: true });
addEventListener('resize', syncNav);
syncNav();
// Arriving at #sri-hari-mandir etc. from the menu brings that card into the row's view
const fromHash = () => {
  const card = location.hash && track.querySelector(`.as-story${CSS.escape(location.hash)}`);
  if (card) track.scrollTo({ left: card.offsetLeft - track.firstElementChild.offsetLeft, behavior: 'instant' });
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
