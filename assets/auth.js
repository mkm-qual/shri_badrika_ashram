// Sign up / sign in: field checks and mobile formatting. Online accounts aren't live yet,
// so a valid form ends with an honest "coming soon" message instead of a fake sign-in.
const form = document.getElementById('authForm');
const signup = form.dataset.mode === 'signup';
const country = document.getElementById('country');
const mobile = document.getElementById('mobile');
const status = document.getElementById('authStatus');

// every country, with its own number format, length and checks (assets/phone.js)
const phone = window.Phone && Phone.setup(country, mobile);

const pan = document.getElementById('pan');
pan?.addEventListener('input', () => { pan.value = pan.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });

// Full name: a space at the end of First or Middle moves on to the next box, a full name pasted
// into First is split across the three, and Backspace in an empty box goes back. Last keeps its spaces.
const nameBoxes = signup ? ['first', 'middle', 'last'].map(id => form[id]) : [];
const moveTo = (el) => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); };
nameBoxes.slice(0, 2).forEach((el, i) => {
  // the input event (not keydown) so phone keyboards, which don't report the space key, behave the same
  el.addEventListener('input', () => {
    if (!el.value.endsWith(' ') || el.selectionStart !== el.value.length) return;
    el.value = el.value.trimEnd();
    if (el.value) moveTo(nameBoxes[i + 1]);
  });
});
nameBoxes[0]?.addEventListener('paste', (e) => {
  const words = (e.clipboardData?.getData('text') || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2 || nameBoxes.some(el => el.value)) return;
  e.preventDefault();
  const [first, ...rest] = words, last = rest.pop();
  nameBoxes[0].value = first; nameBoxes[1].value = rest.join(' '); nameBoxes[2].value = last;
  moveTo(nameBoxes[2]);
});
nameBoxes.slice(1).forEach((el, i) => el.addEventListener('keydown', (e) => {
  if (e.key === 'Backspace' && !el.value) { e.preventDefault(); moveTo(nameBoxes[i]); }
}));

// Each check returns an error message, or '' when the value is fine
const checks = [
  ['name', () => signup && (!form.first.value.trim() || !form.last.value.trim()) ? 'Please enter your first and last name.' : '', ['first', 'last']],
  ['mobile', () => phone ? phone.error() : (mobile.value.trim() ? '' : 'Please enter your mobile number.'), ['mobile']],
  ['pan', () => {
    if (!signup) return '';
    if (!pan.value) return 'Please enter your PAN number.';
    return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.value) ? '' : 'PAN numbers look like ABCDE1234F.';
  }, ['pan']],
  ['email', () => {
    if (!signup) return '';
    const v = form.email.value.trim();
    if (!v) return 'Please enter your email address.';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Please enter a valid email address.';
  }, ['email']],
];

const show = ([key, check, inputs]) => {
  const msg = check();
  const el = document.getElementById(`${key}-error`);
  if (!el) return true;
  el.textContent = msg;
  el.hidden = !msg;
  inputs.forEach(id => form[id].setAttribute('aria-invalid', !!msg));
  el.closest('.field').classList.toggle('invalid', !!msg);
  return !msg;
};

// Re-check a field once the person leaves it, and live after it has shown an error
checks.forEach(c => c[2].filter(id => form[id]).forEach(id => {
  form[id].addEventListener('blur', (e) => {
    if (c[0] === 'name' && e.relatedTarget?.closest('.input.name')) return;   // still filling in the name
    if (form[id].value) show(c);
  });
  form[id].addEventListener('input', () => { if (form[id].getAttribute('aria-invalid') === 'true') show(c); });
}));

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const results = checks.map(show);
  if (results.includes(false)) {
    status.hidden = true;
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  status.textContent = signup
    ? `Thank you, ${form.first.value.trim()}. Online accounts are coming soon. Your details have not been stored yet.`
    : 'Online sign-in is coming soon. Please check back shortly.';
  status.hidden = false;
});
