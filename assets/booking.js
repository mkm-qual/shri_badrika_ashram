// Event booking (The Children of Tomorrow): step 1 picks nights on the calendar and who stays
// each night, step 2 reviews the contribution and takes billing details. Payments aren't connected yet,
// so the last step ends with an honest note instead of a pretend charge.
const $ = (id) => document.getElementById(id);

// ----- Event dates and places left per night ('WLT' = full, waitlist only) -----
// Matches event-children-of-tomorrow.html: check-in Thu 12 Nov, check-out Sun 15 Nov after the discourse.
const YEAR = 2026, MONTH = 10;                      // November 2026 (months count from 0)
const TERM = { from: 12, to: 14 };                   // nights that can be booked
const CHECKOUT = 15;
const DISCOURSE = [13, 14, 15];
const SEATS = { 12: 120, 13: 18, 14: 7 };            // sample availability until bookings are live
const LOW = 20;                                      // at or under this, a night is "filling fast"
const PER_NIGHT = 1800;                              // ₹ per person, per day (covers lunch, dinner and dormitory)
const MIN_NIGHTS = 2;
const rupees = (n) => '₹' + n.toLocaleString('en-IN');

const MONTH_NAME = new Date(YEAR, MONTH, 1).toLocaleString('en-GB', { month: 'long' });
const dayLabel = (d) => `${String(d).padStart(2, '0')} ${MONTH_NAME}`;
const shortLabel = (d) => `${d} ${MONTH_NAME.slice(0, 3)}`;
const isWaitlist = (d) => SEATS[d] === 'WLT';

// ----- State -----
const picked = new Set();                            // days chosen on the calendar
let uid = 0;
const people = [{ id: ++uid, name: 'You', self: true, days: new Set() }];

// ----- Calendar -----
const daysEl = $('calDays');
$('calMonth').textContent = `${MONTH_NAME} ${YEAR}`;
// The whole event sits in one month, so there is nowhere else to go
$('calPrev').disabled = $('calNext').disabled = true;

const renderCalendar = () => {
  const first = new Date(YEAR, MONTH, 1).getDay();
  const inMonth = new Date(YEAR, MONTH + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push('<span class="bk-day out" aria-hidden="true"></span>');
  for (let d = 1; d <= inMonth; d++) {
    const open = d >= TERM.from && d <= TERM.to;
    const talk = DISCOURSE.includes(d) ? ' talk' : '';
    if (d === CHECKOUT) { cells.push(`<span class="bk-day off out-day${talk}" aria-label="${dayLabel(d)}, check-out after the discourse"><b>${d}</b><small>Out</small></span>`); continue; }
    if (!open) { cells.push(`<span class="bk-day off" aria-label="${dayLabel(d)}, outside the event"><b>${d}</b></span>`); continue; }
    const s = SEATS[d];
    const kind = isWaitlist(d) ? 'wl' : s <= LOW ? 'low' : 'open';
    const note = (isWaitlist(d) ? 'full, join the waitlist' : `${s} places left`) + (talk ? ', discourse day' : '');
    cells.push(`<button type="button" class="bk-day ${kind}${talk}" data-day="${d}" aria-pressed="${picked.has(d)}" aria-label="Night of ${dayLabel(d)}, ${note}"><b>${d}</b><small>${s}</small></button>`);
  }
  daysEl.innerHTML = cells.join('');
};
daysEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-day]');
  if (!btn) return;
  const d = +btn.dataset.day;
  // a newly picked day is ticked for everyone; dropping it clears it for everyone
  if (picked.has(d)) { picked.delete(d); people.forEach(p => p.days.delete(d)); }
  else { picked.add(d); people.forEach(p => p.days.add(d)); }
  btn.setAttribute('aria-pressed', picked.has(d));
  render();
});

// ----- Attendees -----
const peopleEl = $('attendees');
const sorted = () => [...picked].sort((a, b) => a - b);

const rangeText = (days) => {
  if (!days.length) return 'Select nights on the calendar';
  const run = days.every((d, i) => !i || d === days[i - 1] + 1);
  const n = `${days.length} ${days.length === 1 ? 'night' : 'nights'}`;
  if (run) return `${n}: ${days[0]} to ${days.at(-1) + 1} ${MONTH_NAME} ${YEAR}`;
  return `${n}: ${days.slice(0, -1).join(', ')} and ${days.at(-1)} ${MONTH_NAME}`;
};
// days where more people are ticked than there are seats
const overBooked = () => sorted().filter(d => !isWaitlist(d) && people.filter(p => p.days.has(d)).length > SEATS[d]);

const renderPeople = () => {
  const days = sorted();
  const open = new Set([...peopleEl.querySelectorAll('details[open]')].map(el => +el.dataset.id));
  peopleEl.innerHTML = people.map((p, i) => {
    const boxes = days.length ? days.map(d => `
        <label class="check"><input type="checkbox" data-person="${p.id}" data-day="${d}" ${p.days.has(d) ? 'checked' : ''}><span>${dayLabel(d)}${isWaitlist(d) ? ' <em class="bk-wl">Waitlist</em>' : ''}</span></label>`).join('')
      : '<p class="bk-empty">Pick nights on the calendar first.</p>';
    const isOpen = open.has(p.id) || (!open.size && i === 0);
    return `
      <details class="bk-person" data-id="${p.id}" ${isOpen ? 'open' : ''}>
        <summary><span class="bk-person-name">${p.self ? 'You' : escape(p.name)}</span><span class="bk-person-n">${nightsText(p.days.size)}</span><span class="ic" style="--i:url('icons/chevron-up.svg');--s:14px" aria-hidden="true"></span></summary>
        <div class="bk-person-days">${boxes}
          ${p.self ? '' : `<button type="button" class="bk-remove" data-remove="${p.id}">Remove ${escape(p.name)}</button>`}
        </div>
      </details>`;
  }).join('');
};
const nightsText = (n) => `${n} ${n === 1 ? 'night' : 'nights'}`;
const escape = (s) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

peopleEl.addEventListener('change', (e) => {
  const box = e.target.closest('input[data-person]');
  if (!box) return;
  const p = people.find(x => x.id === +box.dataset.person);
  box.checked ? p.days.add(+box.dataset.day) : p.days.delete(+box.dataset.day);
  render({ keepPeople: true });
  peopleEl.querySelector(`details[data-id="${p.id}"] .bk-person-n`).textContent = nightsText(p.days.size);
});
peopleEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-remove]');
  if (!btn) return;
  people.splice(people.findIndex(p => p.id === +btn.dataset.remove), 1);
  render();
  $('newName').focus();
});

$('addForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('newName');
  const name = input.value.trim().replace(/\s+/g, ' ');
  const err = $('newName-error');
  const msg = !name ? 'Please enter the attendee’s full name.'
    : people.some(p => p.name.toLowerCase() === name.toLowerCase()) ? `${name} is already on the list.`
    : people.length >= 6 ? 'You can book for up to 6 people at a time.' : '';
  err.textContent = msg; err.hidden = !msg;
  input.setAttribute('aria-invalid', !!msg);
  if (msg) return;
  people.push({ id: ++uid, name, days: new Set(picked) });
  input.value = '';
  render();
  // open only the person just added
  peopleEl.querySelectorAll('details').forEach(d => { d.open = +d.dataset.id === uid; });
});
$('newName').addEventListener('input', () => { $('newName-error').hidden = true; $('newName').removeAttribute('aria-invalid'); });

// ----- Summary, count and the step-1 button -----
const slots = () => people.reduce((n, p) => n + p.days.size, 0);
const paidNights = (p) => [...p.days].filter(d => !isWaitlist(d)).length;
const total = () => people.reduce((n, p) => n + paidNights(p) * PER_NIGHT, 0);
// people who have some nights, but fewer than the minimum
const tooShort = () => people.filter(p => p.days.size && p.days.size < MIN_NIGHTS);
const nameOf = (p) => p.self ? 'You' : p.name;

const render = ({ keepPeople = false } = {}) => {
  const days = sorted();
  $('rangeLabel').textContent = rangeText(days);
  const open = days.filter(d => !isWaitlist(d));
  const over = overBooked();
  const short = tooShort();
  $('seatsLabel').textContent = !days.length ? 'Tap the nights you would like to stay'
    : over.length ? `Only ${SEATS[over[0]]} ${SEATS[over[0]] === 1 ? 'place' : 'places'} left on ${shortLabel(over[0])}. Untick someone for that night.`
    : short.length ? `Each person needs at least ${MIN_NIGHTS} nights. ${short.length > 1 ? short.length + ' people have' : short[0].self ? 'You have' : short[0].name + ' has'} fewer.`
    : open.length ? `${Math.min(...open.map(d => SEATS[d]))} places left for these nights`
    : 'These nights are full. You can join the waitlist.';
  $('seatsLabel').classList.toggle('warn', over.length > 0 || short.length > 0);
  if (!keepPeople) renderPeople();

  const lines = people.filter(p => p.days.size).map(p =>
    `<li><strong>${escape(nameOf(p))}:</strong> ${[...p.days].sort((a, b) => a - b).map(d => shortLabel(d) + (isWaitlist(d) ? ' (waitlist)' : '')).join(', ')}</li>`);
  $('selections').innerHTML = lines.join('') || '<li class="bk-empty">No dates selected yet.</li>';

  const n = slots();
  $('slotCount').textContent = `${nightsText(n)} allocated`;
  $('slotTotal').textContent = n ? ` · ${rupees(total())}` : '';
  $('toBilling').disabled = !n || over.length > 0 || short.length > 0;
};

// ----- Steps -----
const setStep = (n) => {
  $('step1').hidden = n !== 1;
  $('step2').hidden = n !== 2;
  const shown = $('step' + n);
  shown.classList.remove('entering'); shown.offsetWidth; shown.classList.add('entering');   // restart the ease-in
  const states = n === 1 ? ['current', 'pending'] : ['done', 'current'];
  [['step1Tab', states[0]], ['step2Tab', states[1]]].forEach(([id, s]) => {
    const tab = $(id);
    tab.dataset.state = s;
    tab.querySelector('[data-chip]').textContent = { current: 'In progress', pending: 'Pending', done: 'Done' }[s];
    if (s === 'current') tab.setAttribute('aria-current', 'step'); else tab.removeAttribute('aria-current');
  });
  document.querySelector('.bk-steps').scrollIntoView({ block: 'nearest' });
};

$('toBilling').addEventListener('click', () => {
  const rows = people.filter(p => p.days.size).map(p => {
    const ds = [...p.days].sort((a, b) => a - b);
    return `<tr><td>${escape(nameOf(p))}</td><td>${ds.map(d => shortLabel(d) + (isWaitlist(d) ? ' <em class="bk-wl">Waitlist</em>' : '')).join(', ')}<span class="bk-calc">${paidNights(p)} × ${rupees(PER_NIGHT)}</span></td><td class="num">${rupees(paidNights(p) * PER_NIGHT)}</td></tr>`;
  });
  $('billRows').innerHTML = rows.join('');
  $('billTotalLabel').textContent = `Total · ${nightsText(slots())}`;
  $('billTotal').textContent = rupees(total());
  $('wlNote').hidden = !people.some(p => [...p.days].some(isWaitlist));
  $('billStatus').hidden = true;
  setStep(2);
  $('step2-title').focus({ preventScroll: true });
});
$('backBtn').addEventListener('click', () => { setStep(1); $('toBilling').focus({ preventScroll: true }); });

// ----- Billing details -----
const form = $('billForm');
const code = $('country-code');
const mobile = $('mobile');
// every country, with its own number format, length and checks (assets/phone.js)
const phone = window.Phone && Phone.setup(code, mobile);
$('pan').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });

const val = (id) => $(id).value.trim();
// Each check returns an error message, or '' when the value is fine
const checks = {
  bname: () => val('bname') ? '' : 'Please enter your full name.',
  email: () => !val('email') ? 'Please enter your email address.'
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email')) ? '' : 'Please enter a valid email address.',
  mobile: () => phone ? phone.error() : (mobile.value.trim() ? '' : 'Please enter your mobile number.'),
  pan: () => !val('pan') || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val('pan')) ? '' : 'PAN numbers look like ABCDE1234F.',
  terms: () => $('terms').checked ? '' : 'Please agree to the terms and guidelines.',
};
const show = (k) => {
  const msg = checks[k]();
  const el = $(`${k}-error`);
  el.textContent = msg;
  el.hidden = !msg;
  $(k).setAttribute('aria-invalid', !!msg);
  el.closest('.field, .donate-consent').classList.toggle('invalid', !!msg);
  return !msg;
};
Object.keys(checks).forEach(k => {
  $(k).addEventListener('blur', () => { if ($(k).value && k !== 'terms') show(k); });
  $(k).addEventListener(k === 'terms' ? 'change' : 'input', () => {
    if (k === 'terms' || $(k).getAttribute('aria-invalid') === 'true') show(k);
  });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const ok = Object.keys(checks).map(show).every(Boolean);
  const status = $('billStatus');
  if (!ok) { status.hidden = true; form.querySelector('[aria-invalid="true"]')?.focus(); return; }
  const gateway = (phone ? phone.country() === 'IN' : code.value === '+91') ? 'Razorpay' : 'Stripe';
  const n = slots();
  status.textContent = `Thank you, ${val('bname').split(' ')[0]}. Your booking for ${nightsText(n)} (${rupees(total())}) is ready, but online payments through ${gateway} are not connected yet. Nothing has been charged and no places have been held.`;
  status.hidden = false;
  status.scrollIntoView({ block: 'nearest' });
});

renderCalendar();
render();
