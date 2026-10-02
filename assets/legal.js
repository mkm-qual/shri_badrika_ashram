// Privacy / Terms: the side index marks the section being read
const links = new Map([...document.querySelectorAll('.gd-index a')].map(a => [a.hash.slice(1), a]));
const mark = (id) => links.forEach((a, key) => a.toggleAttribute('aria-current', key === id));
const seen = new Set();
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => e.isIntersecting ? seen.add(e.target.id) : seen.delete(e.target.id));
  // the first section on screen, in page order
  const first = [...links.keys()].find(id => seen.has(id));
  if (first) mark(first);
}, { rootMargin: '-96px 0px -55% 0px' });
document.querySelectorAll('.lg-sec').forEach(s => io.observe(s));
