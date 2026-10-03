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
    $(id).addEventListener(id === 'terms' || $(id).tagName === 'SELECT' ? 'change' : 'input', () => {
      if (inputFor(k).getAttribute('aria-invalid') === 'true' || id === 'terms') show(k);
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
  const amount = Number(val('amount').replace(/\D/g, '')).toLocaleString('en-IN');
  const program = $('cause').selectedOptions[0].textContent;
  const gateway = india() ? 'Razorpay' : 'Stripe';
  status.textContent = `Thank you, ${val('first')}. Your offering of ₹${amount} to ${program} is ready, but online payments through ${gateway} are not connected yet. Nothing has been charged and your details have not been stored.`;
  status.hidden = false;
  status.scrollIntoView({ block: 'nearest' });
});
