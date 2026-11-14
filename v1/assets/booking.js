// Event booking: step 1 picks nights on the calendar and who stays each night, step 2 reviews the
// contribution and takes billing details. Payments aren't connected yet, so the last step ends with
// an honest note instead of a pretend charge. booking.html?event=… picks the event (details from omswami.org/events).
const $ = (id) => document.getElementById(id);

// ----- Events open for booking -----
// Nights are counted from the first night (0, 1, 2 …), so an event can run across months.
// Places left per night are samples until bookings are live ('WLT' = full, waitlist only).
const sample = (n, seed) => Array.from({ length: n }, (_, i) => { const v = (seed * 37 + i * 53) % 140; return v < 6 ? 'WLT' : v + 4; });
const GP_RULES = ['Book a minimum of 2 nights per person.', 'Children below 10 years of age are not permitted to stay.', 'Day visits are not permitted during the event.', 'Swamiji will be present only on the Discourse Date.'];
const gp = (n, first, nights, discourse, dates, windowText, talkText, seed) => ({
  name: `The Glorious Presence (Event ${n})`, page: `event-glorious-presence-${n}.html`, badge: 'Discourses with Swamiji',
  first, nights, discourse, seats: sample(nights, seed), perNight: 1800, minNights: 2,
  facts: [['Event dates', dates], ['Bookings window', windowText], ['Discourses', talkText], ['Daily contribution', '₹1,800 per person, per day']],
  rules: GP_RULES,
});
const EVENTS = {
  'divine-autumn': {
    name: 'Divine Autumn', page: 'event-divine-autumn.html', badge: 'A Journey into Grace and Stillness',
    first: '2026-10-07', nights: 18, discourse: [], seats: sample(18, 3).map(v => v === 'WLT' ? 12 : Math.min(v, 39)),
    perNight: 2000, minNights: 1,
    facts: [['Start date', '7 October 2026 (Wednesday)'], ['End date', '25 October 2026 (Sunday)'], ['Contribution', '₹2,000 per person, per night'], ['Includes', 'Accommodation, lunch and dinner']],
    rules: ['Swamiji will not be at the Ashram during this period.', 'Dormitory accommodation will not be available.', 'Stay upgrades may be requested at the Front Office on arrival, subject to availability.', 'Contributions are non-refundable.'],
  },
  'glorious-presence-1': gp(1, '2026-11-01', 9, ['2026-11-07', '2026-11-08', '2026-11-09'], '1 – 10 November 2026', '1 – 9 November', '7, 8 &amp; 9 November', 1),
  'glorious-presence-2': gp(2, '2026-11-19', 7, ['2026-11-20', '2026-11-21', '2026-11-22'], '19 – 26 November 2026', '19 – 25 November', '20, 21 &amp; 22 November', 2),
  'glorious-presence-3': gp(3, '2026-12-01', 10, ['2026-12-04', '2026-12-05', '2026-12-06'], '1 – 11 December 2026', '1 – 10 December', '4, 5 &amp; 6 December', 4),
  'glorious-presence-4': gp(4, '2026-12-15', 8, ['2026-12-18', '2026-12-19', '2026-12-20'], '15 – 23 December 2026', '15 – 22 December', '18, 19 &amp; 20 December', 5),
  'glorious-presence-5': gp(5, '2026-12-28', 8, ['2026-12-30', '2026-12-31', '2027-01-01'], '28 December 2026 – 5 January 2027', '28 December – 4 January', '30 &amp; 31 December, 1 January', 6),
  'glorious-presence-6': gp(6, '2027-04-01', 10, ['2027-04-02', '2027-04-03', '2027-04-04'], '1 – 11 April 2027', '1 – 10 April', '2, 3 &amp; 4 April', 7),
  'maha-rudra-sadhana': {
    name: 'Maha Rudra Sadhana: The Return of Rudra (English)', page: 'event-maha-rudra-sadhana.html', badge: 'Full-duration Sadhana',
    first: '2027-03-05', nights: 12, discourse: [], seats: Array(12).fill(41),
    perPerson: 21600, fullStay: true,
    facts: [['Check-in', '5 March 2027 (Friday)'], ['Check-out', '17 March 2027 (Wednesday)'], ['Maha Shivratri Abhishekam', '6 March 2027 (Saturday)'], ['Contribution', '₹21,600 per person, for the full Sadhana']],
    rules: ['Booking is only for the full duration; partial stays are not permitted.', 'The language of this Sadhana will be English.', 'Children below 10 years of age are not permitted.', 'Maha Rudra Sadhana 2026 (Hindi) participants are not eligible.'],
  },
};
EVENTS['glorious-presence'] = EVENTS['glorious-presence-1'];   // older links
const EVENT = EVENTS[new URLSearchParams(location.search).get('event')] || EVENTS['glorious-presence-1'];
const [Y0, M0, D0] = EVENT.first.split('-').map(Number);
const dateOf = (k) => new Date(Y0, M0 - 1, D0 + k);       // night k → its date
const keyOf = (date) => Math.round((date - dateOf(0)) / 864e5);
const NIGHTS = EVENT.nights;                               // nights 0 … NIGHTS-1; the morning after the last is check-out
const DISCOURSE = EVENT.discourse.map(s => { const [y, m, d] = s.split('-').map(Number); return keyOf(new Date(y, m - 1, d)); });
const SEATS = EVENT.seats;
const LOW = 20;                                      // at or under this, a night is "filling fast"
const PER_NIGHT = EVENT.perNight || 0;               // ₹ per person, per night
const MIN_NIGHTS = EVENT.fullStay ? NIGHTS : EVENT.minNights;
const rupees = (n) => '₹' + n.toLocaleString('en-IN');

const monthName = (dt, len = 'long') => dt.toLocaleString('en-GB', { month: len });
const dayLabel = (k) => { const dt = dateOf(k); return `${String(dt.getDate()).padStart(2, '0')} ${monthName(dt)}`; };
const shortLabel = (k) => { const dt = dateOf(k); return `${dt.getDate()} ${monthName(dt, 'short')}`; };
const isWaitlist = (k) => SEATS[k] === 'WLT';
// a person's nights as text: every night of a full-duration stay reads as one range
const datesText = (ds, wl) => EVENT.fullStay ? `${shortLabel(0)} – ${shortLabel(NIGHTS)} (full Sadhana)`
  : ds.map(d => shortLabel(d) + (isWaitlist(d) ? wl : '')).join(', ');

// ----- The chosen event's details on the page -----
document.title = `Book — ${EVENT.name} — Sri Badrika Ashram`;
$('bkTitle').textContent = EVENT.name;
$('bkBadge').textContent = EVENT.badge;
$('bkCrumb').href = $('bkBack').href = EVENT.page;
$('bkCrumb').querySelector('[data-name]').textContent = EVENT.name;
$('bkFacts').innerHTML = EVENT.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
$('bkRules').innerHTML = EVENT.rules.map(r => `<li>${r}</li>`).join('');
$('bkLegendTalk').hidden = !DISCOURSE.length;

// ----- State -----
const picked = new Set();                            // nights chosen on the calendar
let uid = 0;
const people = [{ id: ++uid, name: 'You', self: true, days: new Set() }];
// a full-duration event books every night for everyone, and they can't be unticked
if (EVENT.fullStay) for (let k = 0; k < NIGHTS; k++) { picked.add(k); people[0].days.add(k); }

// ----- Calendar: one month at a time, with arrows when the event runs into the next month -----
const daysEl = $('calDays');
const firstMonth = new Date(Y0, M0 - 1, 1), lastMonth = new Date(dateOf(NIGHTS).getFullYear(), dateOf(NIGHTS).getMonth(), 1);
let view = new Date(firstMonth);

const renderCalendar = () => {
  $('calMonth').textContent = `${monthName(view)} ${view.getFullYear()}`;
  $('calPrev').disabled = view <= firstMonth;
  $('calNext').disabled = view >= lastMonth;
  const y = view.getFullYear(), m = view.getMonth();
  const cells = [];
  for (let i = 0; i < new Date(y, m, 1).getDay(); i++) cells.push('<span class="bk-day out" aria-hidden="true"></span>');
  for (let d = 1, inMonth = new Date(y, m + 1, 0).getDate(); d <= inMonth; d++) {
    const k = keyOf(new Date(y, m, d));
    const talk = DISCOURSE.includes(k) ? ' talk' : '';
    const label = `${String(d).padStart(2, '0')} ${monthName(view)}`;
    if (k === NIGHTS) { cells.push(`<span class="bk-day off out-day${talk}" aria-label="${label}, check-out"><b>${d}</b><small>Out</small></span>`); continue; }
    if (k < 0 || k > NIGHTS) { cells.push(`<span class="bk-day off" aria-label="${label}, outside the event"><b>${d}</b></span>`); continue; }
    const s = SEATS[k];
    const kind = isWaitlist(k) ? 'wl' : s <= LOW ? 'low' : 'open';
    const note = (isWaitlist(k) ? 'full, join the waitlist' : `${s} places left`) + (talk ? ', discourse day' : '') + (EVENT.fullStay ? ', included in the full stay' : '');
    cells.push(`<button type="button" class="bk-day ${kind}${talk}" data-day="${k}" aria-pressed="${picked.has(k)}" ${EVENT.fullStay ? 'aria-disabled="true"' : ''} aria-label="Night of ${label}, ${note}"><b>${d}</b><small>${s}</small></button>`);
  }
  daysEl.innerHTML = cells.join('');
};
$('calPrev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); renderCalendar(); });
$('calNext').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); renderCalendar(); });
daysEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-day]');
  if (!btn || EVENT.fullStay) return;
  const k = +btn.dataset.day;
  // a newly picked night is ticked for everyone; dropping it clears it for everyone
  if (picked.has(k)) { picked.delete(k); people.forEach(p => p.days.delete(k)); }
  else { picked.add(k); people.forEach(p => p.days.add(k)); }
  btn.setAttribute('aria-pressed', picked.has(k));
  render();
});

// ----- Attendees -----
const peopleEl = $('attendees');
const sorted = () => [...picked].sort((a, b) => a - b);

const rangeText = (days) => {
  if (!days.length) return 'Select nights on the calendar';
  const run = days.every((d, i) => !i || d === days[i - 1] + 1);
  const n = `${days.length} ${days.length === 1 ? 'night' : 'nights'}`;
  if (run) return `${n}: ${shortLabel(days[0])} to ${shortLabel(days.at(-1) + 1)} ${dateOf(days.at(-1) + 1).getFullYear()}`;
  return `${n}: ${days.slice(0, -1).map(shortLabel).join(', ')} and ${shortLabel(days.at(-1))}`;
};
// days where more people are ticked than there are seats
const overBooked = () => sorted().filter(d => !isWaitlist(d) && people.filter(p => p.days.has(d)).length > SEATS[d]);

const renderPeople = () => {
  const days = sorted();
  const open = new Set([...peopleEl.querySelectorAll('details[open]')].map(el => +el.dataset.id));
  peopleEl.innerHTML = people.map((p, i) => {
    const boxes = days.length ? days.map(d => `
        <label class="check"><input type="checkbox" data-person="${p.id}" data-day="${d}" ${p.days.has(d) ? 'checked' : ''} ${EVENT.fullStay ? 'disabled' : ''}><span>${dayLabel(d)}${isWaitlist(d) ? ' <em class="bk-wl">Waitlist</em>' : ''}</span></label>`).join('')
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
const costOf = (p) => EVENT.fullStay ? (p.days.size ? EVENT.perPerson : 0) : paidNights(p) * PER_NIGHT;
const total = () => people.reduce((n, p) => n + costOf(p), 0);
// people who have some nights, but fewer than the minimum
const tooShort = () => people.filter(p => p.days.size && p.days.size < MIN_NIGHTS);
const nameOf = (p) => p.self ? 'You' : p.name;

const render = ({ keepPeople = false } = {}) => {
  const days = sorted();
  $('rangeLabel').textContent = rangeText(days);
  const open = days.filter(d => !isWaitlist(d));
  const over = overBooked();
  const short = tooShort();
  $('seatsLabel').textContent = EVENT.fullStay ? 'Every night is included: this Sadhana is booked for its full duration only.'
    : !days.length ? 'Tap the nights you would like to stay'
    : over.length ? `Only ${SEATS[over[0]]} ${SEATS[over[0]] === 1 ? 'place' : 'places'} left on ${shortLabel(over[0])}. Untick someone for that night.`
    : short.length ? `Each person needs at least ${MIN_NIGHTS} nights. ${short.length > 1 ? short.length + ' people have' : short[0].self ? 'You have' : short[0].name + ' has'} fewer.`
    : open.length ? `${Math.min(...open.map(d => SEATS[d]))} places left for these nights`
    : 'These nights are full. You can join the waitlist.';
  $('seatsLabel').classList.toggle('warn', over.length > 0 || short.length > 0);
  if (!keepPeople) renderPeople();

  const lines = people.filter(p => p.days.size).map(p =>
    `<li><strong>${escape(nameOf(p))}:</strong> ${datesText([...p.days].sort((a, b) => a - b), ' (waitlist)')}</li>`);
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
    return `<tr><td>${escape(nameOf(p))}</td><td>${datesText(ds, ' <em class="bk-wl">Waitlist</em>')}<span class="bk-calc">${EVENT.fullStay ? `Full Sadhana · ${rupees(EVENT.perPerson)}` : `${paidNights(p)} × ${rupees(PER_NIGHT)}`}</span></td><td class="num">${rupees(costOf(p))}</td></tr>`;
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
