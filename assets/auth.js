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
  form[id].addEventListener('blur', () => { if (form[id].value) show(c); });
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
