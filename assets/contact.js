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
  name: () => val('first') && val('last') ? '' : 'Please enter your first and last name.',
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
  if (k === 'name') ['first', 'last'].forEach(id => $(id).setAttribute('aria-invalid', !!msg && !val(id)));
  else $(k).setAttribute('aria-invalid', !!msg);
  el.closest('.field').classList.toggle('invalid', !!msg);
  return !msg;
};

// Re-check a field once the person leaves it, and live after it has shown an error
Object.keys(checks).forEach(k => {
  (k === 'name' ? ['first', 'middle', 'last'] : [k]).forEach(id => {
    $(id).addEventListener('blur', (e) => {
      if (k === 'name') { if (!e.relatedTarget?.closest('.input.name') && (val('first') || val('last'))) show(k); return; }
      if ($(id).value) show(k);
    });
    $(id).addEventListener(k === 'type' ? 'change' : 'input', () => {
      if (k === 'name' ? !$('name-error').hidden : $(k).getAttribute('aria-invalid') === 'true') show(k);
      status.hidden = true;
    });
  });
});
// Full name as one box (as on sign up): a space at the end of First or Middle moves on, Backspace goes back
{
  const boxes = ['first', 'middle', 'last'].map($);
  const moveTo = (el) => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); };
  boxes.slice(0, 2).forEach((el, i) => el.addEventListener('input', () => {
    if (!el.value.endsWith(' ') || el.selectionStart !== el.value.length) return;
    el.value = el.value.trimEnd(); if (el.value) moveTo(boxes[i + 1]);
  }));
  boxes.slice(1).forEach((el, i) => el.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !el.value) { e.preventDefault(); moveTo(boxes[i]); }
  }));
}
// The message type follows where you came from (?type=booking from "Ask about this booking", …)
const TYPES = { booking: 'Ashram Event Booking', feedback: 'General Feedback', travel: 'Travel and Stay at Ashram', donation: 'Donations', invitation: 'Publishing and Speaking Invitation' };
const pre = TYPES[new URLSearchParams(location.search).get('type')];
if (pre) $('type').value = pre;
// Signed in: your name and email come from your account
const acct = window.sbaAccount && window.sbaAccount.user ? window.sbaAccount.load() : null;
if (acct) [['first', acct.profile.first], ['middle', acct.profile.middle], ['last', acct.profile.last], ['email', acct.profile.email]].forEach(([id, v]) => { if (v) $(id).value = v; });

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const ok = Object.keys(checks).map(show).every(Boolean);
  if (!ok) {
    status.hidden = true;
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  const mail = `mailto:${TO}?subject=${encodeURIComponent(`[${$('type').value}] ${val('subject')}`)}`
    + `&body=${encodeURIComponent(`${val('message')}\n\n— ${['first', 'middle', 'last'].map(val).filter(Boolean).join(' ')} (${val('email')})`)}`;
  status.replaceChildren(
    'Sending from the website isn’t connected yet, so nothing has been sent. ',
    Object.assign(document.createElement('a'), { href: mail, textContent: 'Open it in your email app' }),
    ` to send it to ${TO}.`,
  );
  status.hidden = false;
});
