// Ashram page: video tour cover and the map type switch

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

// Ashram activity: "Read more" opens the space's full story in a pop-up card (the grid stays as it is)
const stories = document.getElementById('stories');
let storyDialog;
const openStory = (card, opener) => {
  if (!storyDialog) {
    storyDialog = document.createElement('dialog');
    storyDialog.className = 'doc-dialog as-story-dialog';
    storyDialog.setAttribute('aria-labelledby', 'storyTitle');
    storyDialog.innerHTML = `
      <div class="doc-head">
        <h2 id="storyTitle"></h2>
        <button class="doc-close" type="button" aria-label="Close"><span class="ic" style="--i:url('icons/x.svg');--s:18px" aria-hidden="true"></span></button>
      </div>
      <div class="doc-body" tabindex="0"></div>`;
    document.body.append(storyDialog);
    storyDialog.querySelector('.doc-close').addEventListener('click', () => storyDialog.close());
    storyDialog.addEventListener('click', (e) => { if (e.target === storyDialog) storyDialog.close(); });
    storyDialog.addEventListener('close', () => { document.documentElement.classList.remove('doc-open'); storyDialog.opener?.focus(); });
    // the fade under the title shows only once the story has scrolled beneath it
    const sb = storyDialog.querySelector('.doc-body');
    sb.addEventListener('scroll', () => storyDialog.classList.toggle('scrolled', sb.scrollTop > 2), { passive: true });
  }
  storyDialog.querySelector('#storyTitle').textContent = card.querySelector('h3').textContent;
  const body = storyDialog.querySelector('.doc-body');
  const img = card.querySelector('.as-story-media img').cloneNode();
  img.removeAttribute('loading');
  const text = card.querySelector('.off-text').cloneNode(true);
  text.removeAttribute('id'); text.removeAttribute('style'); text.className = 'as-story-full';
  const cta = card.querySelector('.as-story-cta');
  body.replaceChildren(img, text, ...(cta ? [cta.cloneNode(true)] : []));
  storyDialog.opener = opener;
  document.documentElement.classList.add('doc-open');
  storyDialog.showModal();
  body.scrollTop = 0;
  storyDialog.classList.remove('scrolled');
};
if (stories) stories.addEventListener('click', (e) => {
  const btn = e.target.closest('.read-toggle');
  if (!btn) return;
  e.stopPropagation();   // keep the card closed in the grid; the story opens in the pop-up instead
  e.preventDefault();
  openStory(btn.closest('.as-story'), btn);
}, true);

// Map: switch between the road map and satellite view
const mapFrame = document.getElementById('mapFrame');
document.querySelectorAll('[data-maptype]').forEach(btn => btn.addEventListener('click', () => {
  const url = new URL(mapFrame.src);
  url.searchParams.set('t', btn.dataset.maptype);
  mapFrame.src = url.toString();
  document.querySelectorAll('[data-maptype]').forEach(b => b.setAttribute('aria-pressed', b === btn));
}));
