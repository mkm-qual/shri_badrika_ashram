// Donate: country / state lists, field formatting and checks. Payments aren't connected yet,
// so a valid form ends with an honest "coming soon" note instead of a pretend payment.
const form = document.getElementById('donateForm');
const $ = (id) => document.getElementById(id);
const status = $('donateStatus');

// ----- Country list (names come from the browser, so they read naturally in any locale) -----
const REGIONS = 'AF AX AL DZ AS AD AO AI AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BA BW BR BN BG BF BI KH CM CA CV KY CF TD CL CN CO KM CG CD CK CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RE RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TC TV UG UA AE GB US UY UZ VU VA VE VN VG VI YE ZM ZW'.split(' ');
const regionName = (() => {
  try { const dn = new Intl.DisplayNames(['en'], { type: 'region' }); return (c) => dn.of(c); }
  catch (e) { return (c) => c; }
})();
const country = $('country');
country.innerHTML = '<option value="">Select country</option>' + REGIONS
  .map(c => [c, regionName(c)]).sort((a, b) => a[1].localeCompare(b[1]))
  .map(([c, n]) => `<option value="${c}">${n}</option>`).join('');
country.value = 'IN';

// ----- State: a list for India, free text elsewhere -----
const IN_STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand',
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
$('state').innerHTML += IN_STATES.map(s => `<option>${s}</option>`).join('');
const india = () => country.value === 'IN';
const syncCountry = () => {
  $('stateSelectWrap').hidden = !india();
  $('stateTextWrap').hidden = india();
  // PAN is only asked of donors in India (it's needed for their tax receipt)
  $('panField').hidden = !india();
  $('pincode').placeholder = india() ? 'Enter 6-digit pincode' : 'Enter postal code';
};
country.addEventListener('change', () => { syncCountry(); clear('state'); clear('pan'); clear('pincode'); });
syncCountry();

// ----- Formatting as people type -----
const code = $('country-code');
const mobile = $('mobile');
// every country, with its own number format, length and checks (assets/phone.js)
const phone = window.Phone && Phone.setup(code, mobile);
$('pan').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
$('amount').addEventListener('input', (e) => {
  const n = e.target.value.replace(/\D/g, '').slice(0, 9);
  e.target.value = n ? Number(n).toLocaleString('en-IN') : '';
});
$('pincode').addEventListener('input', (e) => { if (india()) e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });

// Arriving from a "Support" button preselects that program
const cause = new URLSearchParams(location.search).get('cause');
if (cause && $('cause').querySelector(`option[value="${CSS.escape(cause)}"]`)) $('cause').value = cause;

// ----- Recurring donation (optional): the Recurring switch in the amount field shows its options just below -----
const recurBox = $('recur'), recurSwitch = $('recurSwitch');
const startInput = $('recurStart'), daySel = $('recurDay'), monthSel = $('recurMonth');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ord = (n) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromIso = (v) => { const [y, m, d] = v.split('-').map(Number); return new Date(y, m - 1, d); };
const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();
const longDate = (d) => d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = (d) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const today = new Date(); today.setHours(0, 0, 0, 0);

monthSel.innerHTML = MONTHS.map((m, i) => `<option value="${i}">${m}</option>`).join('');
startInput.min = iso(today);
startInput.value = iso(today);
const fillDays = () => {   // monthly: 1st–31st; yearly: only the days the chosen month has (29 Feb included)
  const keep = Number(daySel.value) || today.getDate();
  const max = freq() === 'yearly' ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][monthSel.value] : 31;
  daySel.innerHTML = Array.from({ length: max }, (_, i) => `<option value="${i + 1}">${ord(i + 1)}</option>`).join('');
  daySel.value = Math.min(keep, max);
};
const freq = () => form.querySelector('input[name="freq"]:checked').value;
const weekday = () => Number(form.querySelector('input[name="weekday"]:checked').value);
const recurOn = () => recurSwitch.getAttribute('aria-checked') === 'true';

// the first few payment dates on or after the start date
const upcoming = (count) => {
  const s = startInput.value ? fromIso(startInput.value) : today, out = [];
  const f = freq(), day = Number(daySel.value);
  if (f === 'daily') for (let i = 0; i < count; i++) out.push(new Date(s.getFullYear(), s.getMonth(), s.getDate() + i));
  if (f === 'weekly') {
    const first = new Date(s); first.setDate(s.getDate() + (weekday() - s.getDay() + 7) % 7);
    for (let i = 0; i < count; i++) out.push(new Date(first.getFullYear(), first.getMonth(), first.getDate() + 7 * i));
  }
  if (f === 'monthly') for (let i = 0; out.length < count; i++) {
    const y = s.getFullYear(), m = s.getMonth() + i, d = new Date(y, m, 1);
    d.setDate(Math.min(day, daysIn(d.getFullYear(), d.getMonth())));
    if (d >= s) out.push(d);
  }
  if (f === 'yearly') for (let i = 0; out.length < count; i++) {
    const y = s.getFullYear() + i, m = Number(monthSel.value);
    const d = new Date(y, m, Math.min(day, daysIn(y, m)));
    if (d >= s) out.push(d);
  }
  return out;
};
const schedule = () => ({
  daily: 'every day',
  weekly: `every ${DAYS[weekday()]}`,
  monthly: `on the ${ord(Number(daySel.value))} of every month`,
  yearly: `every year on ${daySel.value} ${MONTHS[monthSel.value]}`,
})[freq()];
const amountText = () => { const n = Number($('amount').value.replace(/\D/g, '')); return n ? `₹${n.toLocaleString('en-IN')}` : 'Your donation'; };
const programText = () => $('cause').value ? ` to ${$('cause').selectedOptions[0].textContent}` : '';

const renderRecur = () => {
  const f = freq();
  $('weekdayField').hidden = f !== 'weekly';
  $('dayField').hidden = !(f === 'monthly' || f === 'yearly');
  $('monthField').hidden = f !== 'yearly';
  $('recurDayLabel').textContent = f === 'yearly' ? 'Date' : 'Date each month';
  $('shortMonthHint').hidden = !((f === 'monthly' && daySel.value > 28) || (f === 'yearly' && monthSel.value === '1' && daySel.value === '29'));
  $('shortMonthHint').textContent = f === 'yearly' ? 'In years without 29 February, the payment is taken on 28 February.'
    : 'In shorter months, the payment is taken on the last day of the month.';
  const dates = startInput.value ? upcoming(4) : [];
  $('recurSummary').textContent = `${amountText()}${programText()}, ${schedule()}.`;
  $('recurNext').textContent = dates.length
    ? `First payment ${longDate(dates[0])}, then ${dates.slice(1).map(d => f === 'yearly' ? `${shortDate(d)} ${d.getFullYear()}` : shortDate(d)).join(', ')} and so on.` : '';
  const gateway = india() ? 'Razorpay' : 'Stripe';
  const what = amountText() === 'Your donation' ? 'this donation' : amountText();
  $('recurConsentText').textContent = `I authorise Sri Badrika Ashram to collect ${what} ${schedule()}${dates.length ? `, starting ${longDate(dates[0])},` : ''} through ${gateway} until I pause or cancel it. I will be notified before each payment.`;
};
const setRecur = (on) => {
  recurBox.hidden = !on;
  recurSwitch.setAttribute('aria-checked', on);
  $('donateLabel').textContent = on ? 'Set up recurring donation' : 'Donate Now';
  if (!on) { ['recurStart', 'recurConsent'].forEach(clear); $('recurCard').hidden = true; }
  renderRecur();
};
recurSwitch.addEventListener('click', () => setRecur(!recurOn()));
monthSel.addEventListener('change', () => { fillDays(); renderRecur(); });
form.querySelectorAll('input[name="freq"]').forEach(r => r.addEventListener('change', () => { fillDays(); renderRecur(); }));
form.querySelectorAll('input[name="weekday"]').forEach(r => r.addEventListener('change', renderRecur));
[daySel, startInput, $('amount'), $('cause')].forEach(el => el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', renderRecur));
country.addEventListener('change', renderRecur);
// start with the pattern of today's date: today's weekday and date
form.querySelector(`input[name="weekday"][value="${today.getDay()}"]`).checked = true;
monthSel.value = today.getMonth();
fillDays();
renderRecur();

// ----- Checks: each returns an error message, or '' when the value is fine -----
const val = (id) => $(id).value.trim();
const checks = {
  first: () => val('first') ? '' : 'Please enter your first name.',
  last: () => val('last') ? '' : 'Please enter your last name.',
  mobile: () => phone ? phone.error() : (mobile.value.trim() ? '' : 'Please enter your mobile number.'),
  email: () => !val('email') ? 'Please enter your email address.'
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email')) ? '' : 'Please enter a valid email address.',
  address: () => val('address') ? '' : 'Please enter your address.',
  pincode: () => !val('pincode') ? 'Please enter your pincode.'
    : india() && !/^[1-9]\d{5}$/.test(val('pincode')) ? 'Indian pincodes have 6 digits.' : '',
  country: () => country.value ? '' : 'Please select your country.',
  state: () => (india() ? $('state').value : val('state-text')) ? '' : 'Please enter your state.',
  city: () => val('city') ? '' : 'Please enter your city.',
  amount: () => {
    const n = Number(val('amount').replace(/\D/g, ''));
    if (!n) return 'Please enter an amount.';
    return n < 100 ? 'The minimum donation is ₹100.' : '';
  },
  cause: () => $('cause').value ? '' : 'Please choose a program to support.',
  pan: () => !india() ? '' : !val('pan') ? 'Please enter your PAN number.'
    : /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val('pan')) ? '' : 'PAN numbers look like ABCDE1234F.',
  terms: () => $('terms').checked ? '' : 'Please agree to the terms and conditions.',
  recurStart: () => !recurOn() ? '' : !startInput.value ? 'Please choose a start date.'
    : fromIso(startInput.value) < today ? 'Please choose today or a later date.' : '',
  recurConsent: () => !recurOn() || $('recurConsent').checked ? '' : 'Please authorise the automatic payments to set up a recurring donation.',
};
// the input that carries aria-invalid for each check
const inputFor = (k) => k === 'state' ? (india() ? $('state') : $('state-text')) : $(k);
const show = (k) => {
  const msg = checks[k]();
  const el = $(`${k}-error`);
  el.textContent = msg;
  el.hidden = !msg;
  inputFor(k).setAttribute('aria-invalid', !!msg);
  el.closest('.field, .donate-consent')?.classList.toggle('invalid', !!msg);
  return !msg;
};
const clear = (k) => { const el = $(`${k}-error`); el.hidden = true; inputFor(k).removeAttribute('aria-invalid'); el.closest('.field')?.classList.remove('invalid'); };

// Re-check a field once the person leaves it, and live after it has shown an error
Object.keys(checks).forEach(k => {
  const ids = k === 'state' ? ['state', 'state-text'] : [k];
  ids.forEach(id => {
    $(id).addEventListener('blur', () => { if ($(id).value) show(k); });
    $(id).addEventListener($(id).type === 'checkbox' || $(id).tagName === 'SELECT' ? 'change' : 'input', () => {
      if (inputFor(k).getAttribute('aria-invalid') === 'true' || $(id).type === 'checkbox') show(k);
    });
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
  if (recurOn()) { showRecurCard(); return; }
  $('recurCard').hidden = true;
  const amount = Number(val('amount').replace(/\D/g, '')).toLocaleString('en-IN');
  const program = $('cause').selectedOptions[0].textContent;
  const gateway = india() ? 'Razorpay' : 'Stripe';
  status.textContent = `Thank you, ${val('first')}. Your offering of ₹${amount} to ${program} is ready, but online payments through ${gateway} are not connected yet. Nothing has been charged and your details have not been stored.`;
  status.hidden = false;
  status.scrollIntoView({ block: 'nearest' });
});

// ----- After setting up: the recurring donation, with Pause / Resume and Cancel -----
// (Payments aren't connected yet, so this is a preview of how it will be managed.)
let paused = false;
const card = $('recurCard');
const setStatus = (label, cls) => { const el = $('recurStatus'); el.textContent = label; el.className = `recur-status ${cls}`; };
const showRecurCard = () => {
  paused = false;
  status.hidden = true;
  $('recurCardTitle').textContent = `${amountText()}, ${schedule()}`;
  $('rcProgram').textContent = $('cause').selectedOptions[0].textContent;
  $('rcNext').textContent = longDate(upcoming(1)[0]);
  $('rcGateway').textContent = india() ? 'Razorpay' : 'Stripe';
  $('rcPause').querySelector('span:last-child').textContent = 'Pause';
  $('recurActions').hidden = false; $('recurConfirm').hidden = true;
  setStatus('Active', 'is-active');
  card.hidden = false;
  card.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
};
$('rcPause').addEventListener('click', () => {
  paused = !paused;
  $('rcPause').querySelector('span:last-child').textContent = paused ? 'Resume' : 'Pause';
  $('rcPause').querySelector('.ic').style.setProperty('--i', `url('icons/${paused ? 'play' : 'pause'}.svg')`);
  $('rcNext').textContent = paused ? 'None while paused' : longDate(upcoming(1)[0]);
  setStatus(paused ? 'Paused' : 'Active', paused ? 'is-paused' : 'is-active');
});
$('rcCancel').addEventListener('click', () => { $('recurActions').hidden = true; $('recurConfirm').hidden = false; $('rcKeep').focus(); });
$('rcKeep').addEventListener('click', () => { $('recurConfirm').hidden = true; $('recurActions').hidden = false; $('rcCancel').focus(); });
$('rcCancelYes').addEventListener('click', () => {
  $('recurConfirm').hidden = true;
  $('rcNext').textContent = 'None, cancelled';
  setStatus('Cancelled', 'is-cancelled');
});

