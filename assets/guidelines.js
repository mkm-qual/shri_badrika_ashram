// Guidelines: the side index opens the section it points to, and one button opens or closes them all
const items = [...document.querySelectorAll('.gd-item')];
const toggle = document.getElementById('gdToggle');
const links = [...document.querySelectorAll('.gd-index a')];

const syncToggle = () => {
  const allOpen = items.every(d => d.open);
  toggle.textContent = allOpen ? 'Collapse all' : 'Expand all';
  toggle.setAttribute('aria-pressed', allOpen);
};
toggle.addEventListener('click', () => {
  const open = !items.every(d => d.open);
  items.forEach(d => { d.open = open; });
});
items.forEach(d => d.addEventListener('toggle', syncToggle));

// Arriving at #temple etc. (from the index or a shared link) opens that section
const openFromHash = (e) => {
  const item = location.hash && items.find(d => '#' + d.id === location.hash);
  if (!item) return;
  item.open = true;
  item.scrollIntoView({ block: 'start', behavior: e ? 'auto' : 'instant' });   // glides from the index (CSS smooth scroll); lands straight there on arrival
  links.forEach(a => a.toggleAttribute('aria-current', a.hash === location.hash));
};
addEventListener('hashchange', openFromHash);
openFromHash();
syncToggle();
