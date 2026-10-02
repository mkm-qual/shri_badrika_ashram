// Form 10BE: pick a financial year and PAN. Certificates aren't connected yet,
// so a valid request ends with an honest note instead of a pretend download.
const form = document.getElementById('tbeForm');
const $ = (id) => document.getElementById(id);
const status = $('tbeStatus');

$('pan').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });

// Each check returns an error message, or '' when the value is fine
const checks = {
  year: () => $('year').value ? '' : 'Please select a financial year.',
  pan: () => !$('pan').value ? 'Please enter your PAN number.'
    : /^[A-Z]{5}[0-9]{4}[A-Z]$/.test($('pan').value) ? '' : 'PAN numbers look like ABCDE1234F.',
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
  $(k).addEventListener(k === 'year' ? 'change' : 'input', () => {
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
  status.textContent = `Online Form 10BE downloads are coming soon. For ${$('year').value}, please write to Contact.omswami@gmail.com and we will send your certificate.`;
  status.hidden = false;
});
