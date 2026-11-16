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
  facts: [['Event dates', dates], ['Stay nights you can book', windowText], ['Discourse days', talkText], ['Daily contribution', '₹1,800 per person, per day']],
  rules: GP_RULES,
});
const EVENTS = {
  'divine-autumn': {
    name: 'Divine Autumn', page: 'event-divine-autumn.html', badge: 'A Journey into Grace and Stillness',
    first: '2026-10-07', nights: 18, discourse: [], seats: sample(18, 3).map(v => v === 'WLT' ? 12 : Math.min(v, 39)),
    perNight: 2000, minNights: 1,
    facts: [['Event dates', '7 – 25 October 2026'], ['Stay dates', 'Check-in 7 October (Wednesday), check-out 25 October (Sunday)'], ['Contribution', '₹2,000 per person, per night'], ['Includes', 'Accommodation, lunch and dinner']],
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
    facts: [['Event dates', '7 – 17 March 2027'], ['Stay dates', 'Check-in 5 March (Friday), check-out 17 March (Wednesday)'], ['Maha Shivratri Abhishekam', '6 March 2027 (Saturday)'], ['Contribution', '₹21,600 per person, for the full Sadhana']],
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
$('bkCrumb').href = EVENT.page;
$('bkCrumb').querySelector('[data-name]').textContent = EVENT.name;
// under the title: what it costs and what's included, as one line (dates are on the calendar)
$('bkSub').textContent = EVENT.facts.filter(([k]) => /contribution|includes/i.test(k))
  .map(([k, v]) => /includes/i.test(k) ? `Inclusive of ${v.charAt(0).toLowerCase()}${v.slice(1)}` : v).join(' · ');
$('bkRules').innerHTML = EVENT.rules.map(r => `<li>${r}</li>`).join('');
$('bkLegendTalk').hidden = !DISCOURSE.length;

// ----- State -----
const picked = new Set();                            // nights chosen on the calendar
let uid = 0;
const acct = window.sbaAccount && window.sbaAccount.user ? window.sbaAccount.load() : null;
const people = [{ id: ++uid, name: 'You', self: true, days: new Set() }];
// a full-duration event books every night for everyone, and they can't be unticked
if (EVENT.fullStay) for (let k = 0; k < NIGHTS; k++) { picked.add(k); people[0].days.add(k); }
// arriving from an event page's stay planner: ?in=YYYY-MM-DD&out=YYYY-MM-DD preselects those nights for you
(() => {
  const q = new URLSearchParams(location.search), inS = q.get('in'), outS = q.get('out');
  if (EVENT.fullStay || !inS || !outS) return;
  const toK = (s) => { const [y, m, d] = s.split('-').map(Number); return keyOf(new Date(y, m - 1, d)); };
  for (let k = Math.max(0, toK(inS)); k < Math.min(NIGHTS, toK(outS)); k++) { picked.add(k); people[0].days.add(k); }
})();

// unbroken runs of nights: [[first, last], …]
const stays = (days) => days.reduce((r, d) => { const cur = r.at(-1); if (cur && d === cur[1] + 1) cur[1] = d; else r.push([d, d]); return r; }, []);
const longLabel = (k) => dateOf(k).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const icon = (name, s = 14) => `<span class="ic" style="--i:url('icons/${name}.svg?v=3');--s:${s}px" aria-hidden="true"></span>`;
// the discourse mark on a day, with its details on hover or focus (edge columns open inwards)
const talkTip = (k, dow) => {
  const n = DISCOURSE.indexOf(k) + 1;
  return `<span class="bk-talk" aria-hidden="true">${icon('discourse', 16)}</span>
    <span class="bk-tip${dow === 0 ? ' tip-l' : dow === 6 ? ' tip-r' : ''}" role="tooltip">
      <strong>Discourse ${n} of ${DISCOURSE.length} with Swamiji</strong>
      <span>${longLabel(k)}</span>
      <span>Swamiji is at the Ashram on discourse days only. Personal meetings are held on these days, chosen by draw.</span>
      ${k === NIGHTS ? '<span>This is the check-out morning: attend, then leave.</span>' : isWaitlist(k) ? '<span>This night is full; you can join the waitlist.</span>' : `<span>${SEATS[k]} places left to stay this night.</span>`}
    </span>`;
};

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
  // each unbroken run of nights reads as a stay: its first night is "Arrive", the morning after its last is "Leave"
  const runs = stays(sorted());
  const ins = new Set(runs.map(r => r[0])), outs = new Set(runs.map(r => r[1] + 1));
  const tag = (k) => (ins.has(k) ? ' is-in' : '') + (outs.has(k) ? ' is-out' : '')
    + wash(k);
  // a soft wash behind each stay, from Arrive to Leave; it closes at the ends of the stay and where a week wraps
  const wash = (k) => {
    const r = runs.find(r => k >= r[0] && k <= r[1] + 1);
    if (!r) return '';
    const dow = dateOf(k).getDay();
    return ' wash' + (k === r[0] || dow === 0 ? ' wash-s' : '') + (k === r[1] + 1 || dow === 6 ? ' wash-e' : '');
  };
  for (let i = 0; i < new Date(y, m, 1).getDay(); i++) cells.push('<span class="bk-day out" aria-hidden="true"></span>');
  for (let d = 1, inMonth = new Date(y, m + 1, 0).getDate(); d <= inMonth; d++) {
    const k = keyOf(new Date(y, m, d));
    const talk = DISCOURSE.includes(k) ? ' talk' : '';
    const label = `${String(d).padStart(2, '0')} ${monthName(view)}`;
    const dow = new Date(y, m, d).getDay();
    const tip = talk ? talkTip(k, dow) : '';
    const role = (ins.has(k) ? ', you arrive' : '') + (outs.has(k) ? ', you leave' : '');
    if (k === NIGHTS) { cells.push(`<span class="bk-day off out-day${talk}${tag(k)}" ${talk ? 'tabindex="0"' : ''} aria-label="${label}, check-out${talk ? ', discourse day' : ''}${role}"><b>${d}</b><small>${outs.has(k) ? 'Leave' : 'Out'}</small>${tip}</span>`); continue; }
    if (k < 0 || k > NIGHTS) { cells.push(`<span class="bk-day off" aria-label="${label}, outside the event"><b>${d}</b></span>`); continue; }
    const s = SEATS[k];
    const kind = isWaitlist(k) ? 'wl' : s <= LOW ? 'low' : 'open';
    const note = (isWaitlist(k) ? 'full, join the waitlist' : `${s} places left`) + (talk ? ', discourse day' : '') + (EVENT.fullStay ? ', included in the full stay' : '');
    cells.push(`<button type="button" class="bk-day ${kind}${talk}${tag(k)}" data-day="${k}" aria-pressed="${picked.has(k)}" ${EVENT.fullStay ? 'aria-disabled="true"' : ''} aria-label="Night of ${label}, ${note}${role}"><b>${d}</b><small>${ins.has(k) ? 'Arrive' : outs.has(k) ? 'Leave' : s}</small>${tip}</button>`);
  }
  // show only the weeks the event touches, not the whole month of greyed-out days
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const inEvent = (w) => w.some(c => /data-day=|check-out/.test(c));
  const first = weeks.findIndex(inEvent), last = weeks.length - 1 - [...weeks].reverse().findIndex(inEvent);
  daysEl.innerHTML = (first < 0 ? weeks : weeks.slice(first, last + 1)).flat().join('');
};
$('calPrev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); renderCalendar(); });
$('calNext').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); renderCalendar(); });
// Click a night to add or drop it. Shift-click another night and every night between the two follows
// the first click (all added, or all dropped), for a continuous stay in two clicks. Shift+Enter works too.
let anchor = null;                                     // { k, add }: the last plain click and what it did
const setNight = (k, add) => {
  if (add) { picked.add(k); people.forEach(p => p.days.add(k)); }
  else { picked.delete(k); people.forEach(p => p.days.delete(k)); }
};
daysEl.addEventListener('mousedown', (e) => { if (e.shiftKey && e.target.closest('button[data-day]')) e.preventDefault(); });   // no text selection
daysEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-day]');
  if (!btn || EVENT.fullStay) return;
  const k = +btn.dataset.day;
  if (e.shiftKey && anchor) {
    const [a, b] = anchor.k < k ? [anchor.k, k] : [k, anchor.k];
    for (let d = a; d <= b; d++) setNight(d, anchor.add);
  } else {
    // a newly picked night is ticked for everyone; dropping it clears it for everyone
    const add = !picked.has(k);
    setNight(k, add);
    anchor = { k, add };
  }
  render();
  renderCalendar();                                   // redraw so the Arrive / Leave tags follow the stay
  daysEl.querySelector(`[data-day="${k}"]`)?.focus();
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
        <summary><span class="bk-person-name">${p.self ? (acct ? `You <small>${escape([acct.profile.first, acct.profile.last].join(' '))}</small>` : 'You') : escape(p.name)}</span><span class="bk-person-n">${nightsText(p.days.size)}</span><span class="ic" style="--i:url('icons/chevron-up.svg');--s:14px" aria-hidden="true"></span></summary>
        <div class="bk-person-days">${boxes}
          ${p.self ? '' : `<button type="button" class="bk-remove" data-remove="${p.id}">Remove ${escape(p.name)}</button>`}
        </div>
      </details>`;
  }).join('');
};
// Signed in: your dependants are one tap away (their age is checked against the event's rules)
const renderQuick = () => {
  if (!acct) return;
  const added = new Set(people.map(p => p.name));
  const left = acct.dependants.filter(d => !added.has(d.name));
  $('quickAdd').hidden = !left.length;
  $('quickList').innerHTML = left.map(d => `<button type="button" class="bk-chip" data-dep="${escape(d.id)}"><span class="ic" style="--i:url('icons/plus.svg');--s:12px" aria-hidden="true"></span>${escape(d.name)} <small>${escape(d.relation)}</small></button>`).join('');
};
$('quickList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-dep]'); if (!b) return;
  const d = acct.dependants.find(x => x.id === b.dataset.dep);
  people.push({ id: ++uid, name: d.name, days: new Set(picked) });
  render(); renderQuick();
  peopleEl.querySelector(`details[data-id="${uid}"]`)?.setAttribute('open', '');
});
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
    : !days.length ? 'Tap the nights you would like to stay, or tap the first and Shift-click the last'
    : over.length ? `Only ${SEATS[over[0]]} ${SEATS[over[0]] === 1 ? 'place' : 'places'} left on ${shortLabel(over[0])}. Untick someone for that night.`
    : short.length ? `Each person needs at least ${MIN_NIGHTS} nights. ${short.length > 1 ? short.length + ' people have' : short[0].self ? 'You have' : short[0].name + ' has'} fewer.`
    : open.length ? `${Math.min(...open.map(d => SEATS[d]))} places left for these nights`
    : 'These nights are full. You can join the waitlist.';
  $('seatsLabel').classList.toggle('warn', over.length > 0 || short.length > 0);
  if (!keepPeople) { renderPeople(); renderQuick(); }


  const n = slots();
  $('slotCount').textContent = nightsText(n);
  $('slotTotal').textContent = n ? ` · ${rupees(total())}` : '';
  $('toBilling').disabled = !n || over.length > 0 || short.length > 0;
};

// ----- Steps -----
const setStep = (n) => {
  $('step1').hidden = n !== 1;
  $('step2').hidden = n !== 2;
  $('toBilling').hidden = n !== 1;
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
  renderStay();
  $('billTotalLabel').textContent = `Total · ${nightsText(slots())}`;
  $('billTotal').textContent = rupees(total());
  $('wlNote').hidden = !people.some(p => [...p.days].some(isWaitlist));
  $('billStatus').hidden = true;
  setStep(2);
  history.pushState({ bkStep: 2 }, '');                 // so Back (browser or breadcrumb) returns to the dates
  $('step2-title').focus({ preventScroll: true });
});
// "Your stay" above the bill: when you arrive and leave, nights, the contribution and which discourses you'll be here for
const renderStay = () => {
  const days = sorted(), runs = stays(days), going = people.filter(p => p.days.size);
  const range = (r) => `${shortLabel(r[0])} – ${shortLabel(r[1] + 1)}`;
  const day = (k) => dateOf(k).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const calc = EVENT.fullStay ? `${rupees(EVENT.perPerson)} × ${going.length} ${going.length === 1 ? 'person' : 'people'}`
    : going.length === 1 ? `${rupees(PER_NIGHT)} × ${nightsText(paidNights(going[0]))}`
    : `${rupees(PER_NIGHT)} × ${nightsText(going.reduce((n, p) => n + paidNights(p), 0))} across ${going.length} people`;
  const facts = (runs.length === 1
    ? [['Arrive', day(runs[0][0])], ['Leave', day(runs[0][1] + 1)]]
    : [['Stays', runs.map(range).join(', ')], ['People', String(going.length)]])
    .concat([['Nights', String(days.length)], ['Contribution', `${rupees(total())}<small>${calc}</small>`]]);
  const wl = going.reduce((n, p) => n + p.days.size - paidNights(p), 0);
  if (wl && !EVENT.fullStay) facts[facts.length - 1][1] = facts.at(-1)[1].replace('</small>', ` · ${nightsText(wl)} on the waitlist, not charged</small>`);
  let attend = '';
  if (DISCOURSE.length) {
    const here = (k) => runs.find(r => k >= r[0] && k <= r[1] + 1);
    attend = `<p class="sp-sub">Discourses with Swamiji</p><ul class="sp-attend">${DISCOURSE.map(k => {
      const r = here(k);
      return `<li class="${r ? 'yes' : 'no'}">${icon(r ? 'check' : 'x')}<span>${day(k)}</span><em>${r ? (k === r[1] + 1 ? 'Attend, then check out' : 'You’re here') : 'Not at the Ashram'}</em></li>`;
    }).join('')}</ul>`;
    if (!DISCOURSE.some(here)) attend += '<p class="sp-warn">Swamiji is present only on discourse days. This stay has none.</p>';
  }
  $('billStay').innerHTML = `<h3 class="sp-sum-title">Your stay</h3>
    <dl class="sp-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>${attend}`;
};
// Back from billing goes back to the dates, not off the page: the browser's back button and the
// breadcrumb's back arrow both step the wizard back first
addEventListener('popstate', () => { if (!$('step2').hidden) { setStep(1); $('toBilling').focus({ preventScroll: true }); } });
document.addEventListener('click', (e) => {
  if (!e.target.closest('.crumb-back') || $('step2').hidden) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (history.state && history.state.bkStep === 2) history.back(); else { setStep(1); $('toBilling').focus({ preventScroll: true }); }
}, true);
$('backBtn').addEventListener('click', () => {
  if (history.state && history.state.bkStep === 2) history.back();
  else { setStep(1); $('toBilling').focus({ preventScroll: true }); }
});

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
  name: () => val('first') && val('last') ? '' : 'Please enter your first and last name.',
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
  if (k === 'name') ['first', 'last'].forEach(id => $(id).setAttribute('aria-invalid', !!msg && !val(id)));
  else $(k).setAttribute('aria-invalid', !!msg);
  el.closest('.field, .donate-consent').classList.toggle('invalid', !!msg);
  return !msg;
};
Object.keys(checks).forEach(k => {
  (k === 'name' ? ['first', 'middle', 'last'] : [k]).forEach(id => {
    $(id).addEventListener('blur', (e) => {
      if (k === 'name') { if (!e.relatedTarget?.closest('.input.name') && (val('first') || val('last'))) show(k); return; }
      if ($(id).value && k !== 'terms') show(k);
    });
    $(id).addEventListener(k === 'terms' ? 'change' : 'input', () => {
      if (k === 'terms' || (k === 'name' ? !$('name-error').hidden : $(k).getAttribute('aria-invalid') === 'true')) show(k);
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
// Signed in: billing details come from the account (a verified PAN comes from KYC and is locked)
if (acct) {
  const p = acct.profile;
  [['first', p.first], ['middle', p.middle], ['last', p.last], ['email', p.email]].forEach(([id, v]) => { if (v) $(id).value = v; });
  const iso = /^[A-Z]{2}$/.test(p.cc || '') ? p.cc : ({ '+91': 'IN', '+1': 'US', '+44': 'GB' }[p.cc] || 'IN');
  if (code.querySelector(`option[value="${iso}"]`)) { code.value = iso; code.dispatchEvent(new Event('change', { bubbles: true })); }
  mobile.value = (p.mobile || '').replace(/\D/g, ''); mobile.dispatchEvent(new Event('input', { bubbles: true }));
  if (acct.kyc && acct.kyc.verifiedAt && acct.kyc.type === 'pan') { $('pan').value = acct.kyc.number; $('pan').readOnly = true; $('pan-hint').textContent = 'Verified PAN from your account.'; }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const ok = Object.keys(checks).map(show).every(Boolean);
  const status = $('billStatus');
  if (!ok) { status.hidden = true; form.querySelector('[aria-invalid="true"]')?.focus(); return; }
  const gateway = (phone ? phone.country() === 'IN' : code.value === '+91') ? 'Razorpay' : 'Stripe';
  const n = slots();
  status.textContent = `Thank you, ${val('first')}. Your booking for ${nightsText(n)} (${rupees(total())}) is ready, but online payments through ${gateway} are not connected yet. Nothing has been charged and no places have been held.`;
  status.hidden = false;
  status.scrollIntoView({ block: 'nearest' });
});

renderCalendar();
render();
