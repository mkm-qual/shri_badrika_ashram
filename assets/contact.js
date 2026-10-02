// Contact: field checks and a subject counter. Messages aren't sent from the site yet,
// so a valid form offers to open the visitor's own email app with the message filled in.
const form = document.getElementById('contactForm');
const $ = (id) => document.getElementById(id);
const status = $('contactStatus');
const TO = 'contact.omswami@gmail.com';

const subject = $('subject');
const count = () => { $('subject-count').textContent = `${subject.value.length} / 70`; };
subject.addEventListener('input', count);
count();

const val = (id) => $(id).value.trim();
// Each check returns an error message, or '' when the value is fine
const checks = {
  name: () => val('name') ? '' : 'Please enter your name.',
  email: () => !val('email') ? 'Please enter your email address.'
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email')) ? '' : 'Please enter a valid email address.',
  type: () => $('type').value ? '' : 'Please choose a message type.',
  subject: () => val('subject') ? '' : 'Please enter a subject.',
  message: () => val('message') ? '' : 'Please write your message.',
};
const show = (k) => {
  const msg = checks[k]();
  const el = $(`${k}-error`);
  el.textContent = msg;
  el.hidden = !msg;
  $(k).setAttribute('aria-invalid', !!msg);
  el.closest('.field').classList.toggle('invalid', !!msg);
  return !msg;
};

// Re-check a field once the person leaves it, and live after it has shown an error
Object.keys(checks).forEach(k => {
  $(k).addEventListener('blur', () => { if ($(k).value) show(k); });
  $(k).addEventListener(k === 'type' ? 'change' : 'input', () => {
    if ($(k).getAttribute('aria-invalid') === 'true') show(k);
    status.hidden = true;
  });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const ok = Object.keys(checks).map(show).every(Boolean);
  if (!ok) {
    status.hidden = true;
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  const mail = `mailto:${TO}?subject=${encodeURIComponent(`[${$('type').value}] ${val('subject')}`)}`
    + `&body=${encodeURIComponent(`${val('message')}\n\n— ${val('name')} (${val('email')})`)}`;
  status.replaceChildren(
    'Sending from the website isn’t connected yet, so nothing has been sent. ',
    Object.assign(document.createElement('a'), { href: mail, textContent: 'Open it in your email app' }),
    ` to send it to ${TO}.`,
  );
  status.hidden = false;
});
