// Make an offering: choose rituals, a date and a time, then who it is for. Payments aren't connected yet,
// so a valid form ends with an honest "coming soon" note instead of a pretend payment.
const $ = (id) => document.getElementById(id);
const form = $('offerForm');

// Times and amounts per offering. The amounts are placeholders until the Ashram confirms its fees.
const OFFERINGS = {
  abhishekam:  { name: 'Abhishekam',  fee: 2100, slots: [['morning', 'Morning', '7:00 AM']] },
  aarti:       { name: 'Aarti',       fee: 501,  slots: [['morning', 'Morning', '6:30 AM'], ['evening', 'Evening', '7:00 PM']] },
  sahasranama: { name: 'Sahasranama', fee: 1100, slots: [['morning', 'Morning', '6:00 AM'], ['evening', 'Evening', '6:00 PM']] },
  sringar:     { name: 'Sringar',     fee: 5100, slots: [['morning', 'Morning', '9:00 AM']] },
};
const rupees = (n) => `₹${n.toLocaleString('en-IN')}`;
document.querySelectorAll('[data-fee]').forEach(el => { el.textContent = rupees(OFFERINGS[el.dataset.fee].fee); });

const today = new Date(); today.setHours(0, 0, 0, 0);
const lastDay = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());   // bookable a year ahead
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d) => d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = (d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
// chosen days, kept as timestamps so the same day is never added twice
const state = { dates: new Set(), view: new Date(today.getFullYear(), today.getMonth(), 1), slots: {} };
const datesOf = () => [...state.dates].sort((a, b) => a - b).map(t => new Date(t));
// "View all special days": Abhishekam and Sringar can then be booked on any Purnima, Amavasya or Ekadashi of the
// year, each on its own days (picked from its own list); every other offering keeps the calendar's dates
const SPECIAL_OFFERINGS = ['abhishekam', 'sringar'];
state.special = false;
state.spec = { abhishekam: new Set(), sringar: new Set() };
const usesSpecial = (k) => state.special && SPECIAL_OFFERINGS.includes(k);
const datesFor = (k) => usesSpecial(k) ? [...state.spec[k]].sort((a, b) => a - b).map(t => new Date(t)) : datesOf();
const allDates = () => [...new Set(chosen().flatMap(k => datesFor(k).map(Number)))].sort((a, b) => a - b).map(t => new Date(t));
const dayCount = () => Math.max(1, state.dates.size);
const chosen = () => [...form.querySelectorAll('input[name="offering"]:checked')].map(i => i.value);

// ----- Which offerings are performed on which day -----
// A placeholder schedule until the Ashram publishes its own: Aarti and Sahasranama every day,
// Abhishekam on selected days (October follows the Ashram's published days), Sringar on Sundays.
const ABHISHEKAM_OCT_2026 = [6, 10, 11, 12, 14, 15, 16, 17, 18, 19, 22, 25];
const hash = (d) => { let x = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); x = (x ^ 61) ^ (x >>> 16); x *= 9; x ^= x >>> 4; x *= 0x27d4eb2d; return ((x ^ (x >>> 15)) >>> 0) % 100; };
const ORDER = ['aarti', 'abhishekam', 'sahasranama', 'sringar'];

// ----- Special days: Purnima, Amavasya and Ekadashi, worked out from the moon -----
// The lunar day (tithi) at sunrise in India decides the day. Sun and moon longitudes use the standard
// low-precision series (good to a fraction of a degree), so a day may differ from the printed panchang
// when a tithi changes right around sunrise; the Ashram's own calendar should replace this when it's ready.
const R = Math.PI / 180, norm = (x) => ((x % 360) + 360) % 360, sin = (x) => Math.sin(x * R);
const elongation = (ms) => {
  const T = (ms / 86400000 + 2440587.5 - 2451545) / 36525;
  const M = norm(357.52911 + 35999.05029 * T);
  const sun = norm(280.46646 + 36000.76983 * T) + 1.914602 * sin(M) + 0.019993 * sin(2 * M);
  const Lm = norm(218.3164477 + 481267.88123421 * T), D = norm(297.8501921 + 445267.1114034 * T);
  const Mm = norm(134.9633964 + 477198.8675055 * T), F = norm(93.272095 + 483202.0175233 * T);
  const moon = Lm + 6.288774 * sin(Mm) + 1.274027 * sin(2 * D - Mm) + 0.658314 * sin(2 * D) + 0.213618 * sin(2 * Mm)
    - 0.185116 * sin(M) - 0.114332 * sin(2 * F) + 0.058793 * sin(2 * D - 2 * Mm) + 0.057066 * sin(2 * D - M - Mm)
    + 0.053322 * sin(2 * D + Mm) + 0.045758 * sin(2 * D - M) - 0.040923 * sin(M - Mm) - 0.03472 * sin(D) - 0.030383 * sin(M + Mm);
  return norm(moon - sun);
};
const tithiAt = (date, h, m) => Math.floor(elongation(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), h, m)) / 12) + 1;
const atSunrise = (d) => tithiAt(d, 0, 45);    // ~6:15 AM IST: Amavasya and Ekadashi are kept by the tithi at sunrise
const atEvening = (d) => tithiAt(d, 12, 30);   // ~6:00 PM IST: Purnima is kept on the evening the full moon holds
const dayAfter = (d, n = 1) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
// is lunar day `target` "kept" on date d? It holds at the moment that matters, and didn't already hold then the day before;
// or (rarely) it begins and ends between two such moments, and is kept on the first day
const kept = (d, target, at) => {
  const t0 = at(d), prev = at(dayAfter(d, -1)), t1 = at(dayAfter(d));
  if (t0 === target) return prev !== target;
  const span = (t1 - t0 + 30) % 30;                       // lunar days passed by the next moment (usually 1)
  for (let i = 1; i < span; i++) if ((t0 + i - 1) % 30 + 1 === target) return true;
  return false;
};
const SPECIAL = new Map();   // day (timestamp) → 'Purnima' | 'Amavasya' | 'Ekadashi'
for (let d = new Date(today); d <= lastDay; d = dayAfter(d)) {
  const kind = kept(d, 15, atEvening) ? 'Purnima' : kept(d, 30, atSunrise) ? 'Amavasya'
    : (kept(d, 11, atSunrise) || kept(d, 26, atSunrise)) ? 'Ekadashi' : '';
  if (kind) SPECIAL.set(+new Date(d.getFullYear(), d.getMonth(), d.getDate()), kind);
}
const specialOf = (date) => SPECIAL.get(+date);
// which special days each offering is performed on. Abhishekam follows the Ashram's practice (every Ekadashi,
// Purnima and Amavasya); Sringar's days are a placeholder until the Ashram confirms them.
const SPECIAL_DAYS = { abhishekam: ['Ekadashi', 'Purnima', 'Amavasya'], sringar: ['Purnima', 'Ekadashi'] };
const offeredOn = (k, t) => SPECIAL_DAYS[k].includes(SPECIAL.get(t));

const heldOn = (date) => ORDER.filter(k => {
  if (k === 'aarti' || k === 'sahasranama') return true;
  if (SPECIAL_DAYS[k] && SPECIAL_DAYS[k].includes(specialOf(date))) return true;   // its special days of the year
  if (k === 'sringar') return date.getDay() === 0;
  if (date.getFullYear() === 2026 && date.getMonth() === 9) return ABHISHEKAM_OCT_2026.includes(date.getDate());
  return hash(date) < 40;
});
// a day can be picked when it is ahead of today and holds every offering chosen
const pickable = (date) => date >= today && date <= lastDay && chosen().filter(k => !usesSpecial(k)).every(k => heldOn(date).includes(k));

// ----- Calendar: a full month, with the offerings of each day -----
const renderCal = () => {
  const y = state.view.getFullYear(), m = state.view.getMonth();
  $('calMonth').textContent = `${MONTHS[m]} ${y}`;
  $('calPrev').disabled = y === today.getFullYear() && m === today.getMonth();
  $('calNext').disabled = y === lastDay.getFullYear() && m === lastDay.getMonth();
  const start = new Date(y, m, 1 - new Date(y, m, 1).getDay());   // the Sunday on or before the 1st
  const weeks = Math.ceil((new Date(y, m, 1).getDay() + new Date(y, m + 1, 0).getDate()) / 7);
  const picked = chosen(), cells = [];
  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const inMonth = date.getMonth() === m, held = heldOn(date);
    const list = held.map(k => `<li class="${picked.length && !picked.includes(k) ? 'dim' : ''}"><i class="mo-dot" style="--c: var(--c-${k})"></i><span>${OFFERINGS[k].name}</span></li>`).join('');
    const cls = ['mo-cell', inMonth ? '' : 'other', +date === +today ? 'today' : '', inMonth && state.dates.has(+date) ? 'sel' : ''].filter(Boolean).join(' ');
    const label = `${longDate(date)}: ${held.map(k => OFFERINGS[k].name).join(', ')}`;
    const inner = `<b>${date.getDate()}</b><ul>${list}</ul>`;
    cells.push(inMonth && pickable(date)
      ? `<button type="button" class="${cls}" data-d="${date.getDate()}" aria-pressed="${cls.includes('sel')}" aria-label="${label}">${inner}</button>`
      : `<div class="${cls} off" aria-label="${label}, unavailable">${inner}</div>`);
  }
  $('calDays').innerHTML = cells.join('');
  renderPicked();
};
// the chosen days under the calendar, each removable, plus a way to clear them all
const renderPicked = () => {
  const el = $('calPicked'), list = datesOf();
  el.hidden = !list.length;
  el.innerHTML = list.length ? `<span>${list.length} ${list.length === 1 ? 'date' : 'dates'} chosen:</span>${list.map(d => `<button type="button" class="mo-chip" data-t="${+d}" aria-label="Remove ${longDate(d)}">${shortDate(d)}<span aria-hidden="true">×</span></button>`).join('')}${list.length > 1 ? '<button type="button" class="mo-clear" data-t="all">Clear all</button>' : ''}` : '';
};
$('calPicked').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-t]'); if (!b) return;
  if (b.dataset.t === 'all') state.dates.clear(); else state.dates.delete(Number(b.dataset.t));
  renderCal(); renderAll();
  ($('calPicked').querySelector('button') || $('calDays').querySelector('button[data-d]'))?.focus();
});
$('calPrev').addEventListener('click', () => { state.view.setMonth(state.view.getMonth() - 1); renderCal(); });
$('calNext').addEventListener('click', () => { state.view.setMonth(state.view.getMonth() + 1); renderCal(); });
$('calDays').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-d]'); if (!b) return;   // greyed days are not buttons
  const t = +new Date(state.view.getFullYear(), state.view.getMonth(), Number(b.dataset.d));
  state.dates[state.dates.has(t) ? 'delete' : 'add'](t);   // a second click removes the day
  renderCal();
  $(`calDays`).querySelector(`[data-d="${b.dataset.d}"]`)?.focus();
  if (!$('date-error').hidden) show('date');
  renderAll();
});

// ----- "View all special days": one section per offering, a month at a time (no scrolling box) -----
// every special day left in this year, all at once: one row per day, a column (tick + charge) per offering
const SP_YEAR = today.getFullYear();
const renderSpecial = () => {
  const box = $('specialList'); if (!box || $('special').hidden) return;
  const rows = [...SPECIAL].filter(([t]) => new Date(t).getFullYear() === SP_YEAR);
  const cols = SPECIAL_OFFERINGS;
  const head = cols.map(k => {
    const avail = rows.filter(([t]) => offeredOn(k, t)), all = avail.length && avail.every(([t]) => state.spec[k].has(t));
    return `<th scope="col" class="mo-sp-col"><label class="check"><input type="checkbox" data-k="${k}" data-all ${all ? 'checked' : ''} ${avail.length ? '' : 'disabled'} aria-label="${OFFERINGS[k].name} on every day it is offered"><span></span></label><i class="mo-dot" style="--c: var(--c-${k})" aria-hidden="true"></i>${OFFERINGS[k].name} <small>${rupees(OFFERINGS[k].fee)}</small></th>`;
  }).join('');
  // each cell: a tick where the offering is performed that day; a quiet, disabled box where it isn't.
  // On phones the cell shows the offering's name too, so a row reads on its own without the heading.
  const cell = (k, t, kind) => {
    const ok = offeredOn(k, t), on = state.spec[k].has(t);
    return `<td class="mo-sp-col${ok ? '' : ' na'}"><label class="check mo-sp-pick"${ok ? '' : ` title="${OFFERINGS[k].name} is not offered on ${kind}"`}><input type="checkbox" data-k="${k}" data-t="${t}" ${on ? 'checked' : ''} ${ok ? '' : 'disabled'} aria-label="${OFFERINGS[k].name} on ${kind}, ${longDate(new Date(t))}${ok ? '' : ' (not offered)'}"><span class="mo-sp-name"><i class="mo-dot" style="--c: var(--c-${k})" aria-hidden="true"></i>${OFFERINGS[k].name}</span></label></td>`;
  };
  box.innerHTML = rows.length ? `<table class="mo-sp-table">
      <thead><tr><th scope="col">Event</th><th scope="col">Date</th>${head}</tr></thead>
      <tbody>${rows.map(([t, kind]) => `<tr class="${cols.some(k => state.spec[k].has(t)) ? 'on' : ''}"><td class="mo-sp-kind">${kind}</td><td class="mo-sp-date">${new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</td>${cols.map(k => cell(k, t, kind)).join('')}</tr>`).join('')}</tbody>
    </table>` : `<p class="mo-empty">No special days are left in ${SP_YEAR}.</p>`;
};
const setSpecial = (on) => {
  state.special = on;
  $('special').hidden = !on;
  $('spCard').classList.toggle('open', on);
  // the calendar stays only while an offering that uses it (Aarti, Sahasranama) is chosen
  const calNeeded = !on || chosen().some(k => !usesSpecial(k));
  document.querySelector('.mo-cal').hidden = !calNeeded;
  document.querySelector('.mo-legend').hidden = !calNeeded;
  renderCal(); renderSpecial(); renderAll();
  if (!calNeeded) $('calPicked').hidden = true;
};
$('specialToggle')?.addEventListener('change', (e) => setSpecial(e.target.checked));
// a quick second click on the switch would otherwise select the words nearby
document.querySelector('.mo-sp-toggle')?.addEventListener('mousedown', (e) => { if (e.detail > 1) e.preventDefault(); });
$('specialList')?.addEventListener('change', (e) => {
  const c = e.target.closest('input[data-k]'); if (!c) return;
  const k = c.dataset.k, set = state.spec[k];
  if (c.hasAttribute('data-all')) $('specialList').querySelectorAll(`input[data-k="${k}"][data-t]:not(:disabled)`).forEach(x => set[c.checked ? 'add' : 'delete'](Number(x.dataset.t)));
  else set[c.checked ? 'add' : 'delete'](Number(c.dataset.t));
  // ticking a day for an offering not yet chosen above chooses it
  const box = form.querySelector(`input[name="offering"][value="${k}"]`);
  if (set.size && box && !box.checked) { box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true })); }
  renderSpecial(); renderAll();
  $('specialList').querySelector(c.hasAttribute('data-all') ? `input[data-k="${k}"][data-all]` : `input[data-k="${k}"][data-t="${c.dataset.t}"]`)?.focus();
  if (!$('date-error').hidden) show('date');
});
if ($('spTitle')) $('spTitle').textContent = `View All ${SP_YEAR} Special Offerings`;

// ----- Times: tick one or more per offering (an offering with a single time is ticked automatically) -----
const slotsOf = (k) => (state.slots[k] ||= new Set());
const renderSlots = () => {
  const list = chosen();
  if (!list.length) { $('slots').innerHTML = '<p class="mo-empty">Choose an offering first.</p>'; return; }
  if (!allDates().length) { $('slots').innerHTML = '<p class="mo-empty">Choose a date to see the times.</p>'; return; }
  $('slots').innerHTML = list.map(k => {
    const o = OFFERINGS[k], picked = slotsOf(k);
    if (o.slots.length === 1) picked.add(o.slots[0][0]);
    return `<fieldset class="mo-slot-row">
      <legend><i class="mo-dot" style="--c: var(--c-${k})" aria-hidden="true"></i>${o.name}</legend>
      <div class="mo-times">${o.slots.map(([id, label, time]) => `<label class="check mo-time"><input type="checkbox" data-k="${k}" value="${id}" ${picked.has(id) ? 'checked' : ''}><span><b>${label}</b> ${time}</span></label>`).join('')}</div>
    </fieldset>`;
  }).join('');
};
$('slots').addEventListener('change', (e) => {
  const c = e.target.closest('input[type="checkbox"][data-k]'); if (!c) return;
  slotsOf(c.dataset.k)[c.checked ? 'add' : 'delete'](c.value);
  if (!$('slot-error').hidden) show('slot');
  renderSummary();
});

// ----- Summary -----
const renderSummary = () => {
  const list = chosen();
  const days = allDates();
  $('sumDate').textContent = !days.length ? 'No dates chosen yet' : days.length === 1 ? longDate(days[0]) : `${days.length} dates: ${days.map(shortDate).join(' · ')}`;
  $('sumEmpty').hidden = list.length > 0;
  // one line per chosen time, charged once for every day chosen for that offering; no days yet counts once
  $('sumList').innerHTML = list.map(k => {
    const o = OFFERINGS[k], own = datesFor(k), n = Math.max(1, own.length), fee = rupees(o.fee * n);
    const times = own.length > 1 ? ` × ${own.length} days` : '';
    const when = usesSpecial(k) && own.length ? `<small class="mo-sum-days">${own.map(d => `${SPECIAL.get(+d) || ''} ${shortDate(d)}`.trim()).join(' · ')}</small>` : '';
    const picked = o.slots.filter(x => slotsOf(k).has(x[0]));
    if (!picked.length) return `<li><span><b>${o.name}</b><small>Time to be chosen${times}</small>${when}</span><span>${fee}</span></li>`;
    return picked.map(t => `<li><span><b>${o.name}</b><small>${t[1]} · ${t[2]}${times}</small>${when}</span><span>${fee}</span></li>`).join('');
  }).join('');
  $('sumTotal').textContent = rupees(total());
};
const total = () => chosen().reduce((t, k) => t + OFFERINGS[k].fee * Math.max(1, slotsOf(k).size) * Math.max(1, datesFor(k).length), 0);
const renderAll = () => { renderSlots(); renderSummary(); };
form.querySelectorAll('input[name="offering"]').forEach(i => i.addEventListener('change', () => {
  if (!$('offering-error').hidden) show('offering');
  datesOf().forEach(d => { if (!pickable(d)) state.dates.delete(+d); });   // drop days that no longer hold every offering
  if (state.special) setSpecial(true); else renderCal();
  renderAll();
}));

// Arriving from an offering's "Make Offerings" button preselects it (make-offering.html?offering=aarti)
const pre = new URLSearchParams(location.search).get('offering');
form.querySelector(`input[name="offering"][value="${CSS.escape(pre || '')}"]`)?.click();

// ----- Checks: each returns an error message, or '' when the value is fine -----
const pan = $('pan');
pan.addEventListener('input', () => { pan.value = pan.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
const checks = {
  offering: () => chosen().length ? '' : 'Please choose at least one offering.',
  date: () => chosen().every(k => datesFor(k).length) ? '' : (state.special ? 'Please choose at least one day for each offering.' : 'Please choose at least one date that holds every offering you chose.'),
  slot: () => !allDates().length || chosen().every(k => slotsOf(k).size) ? '' : 'Please tick at least one time for each offering.',
  behalf: () => $('behalf').value.trim() ? '' : 'Please enter the name the offering is made in.',
  pan: () => !pan.value ? 'Please enter your PAN number.' : /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.value) ? '' : 'PAN numbers look like ABCDE1234F.',
  terms: () => $('terms').checked ? '' : 'Please agree to the terms and conditions.',
};
const target = { offering: () => form.querySelector('input[name="offering"]'), date: () => (state.special && $('specialList').querySelector('input[data-t]')) || $('calDays').querySelector('button[data-d]') || $('calNext'),
  slot: () => $('slots').querySelector('input:not(:checked)'), behalf: () => $('behalf'), pan: () => pan, terms: () => $('terms') };
function show(k) {
  const msg = checks[k](), el = $(`${k}-error`);
  el.textContent = msg; el.hidden = !msg;
  el.closest('.field, .donate-consent, .mo-step')?.classList.toggle('invalid', !!msg);
  if (['behalf', 'pan', 'terms'].includes(k)) target[k]().setAttribute('aria-invalid', !!msg);
  return !msg;
}
['behalf', 'pan'].forEach(k => {
  target[k]().addEventListener('blur', () => { if (target[k]().value) show(k); });
  target[k]().addEventListener('input', () => { if (target[k]().getAttribute('aria-invalid') === 'true') show(k); });
});
$('terms').addEventListener('change', () => show('terms'));

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const results = Object.keys(checks).map(k => [k, show(k)]);
  const bad = results.find(([, ok]) => !ok);
  if (bad) { $('moStatus').hidden = true; target[bad[0]]()?.focus(); return; }
  const amount = rupees(total());
  const days = allDates(), when = days.length === 1 ? longDate(days[0]) : `${days.length} dates (${days.map(shortDate).join('; ')})`;
  $('moStatus').textContent = `Thank you. Your offering for ${$('behalf').value.trim()} on ${when} (${amount}) is ready, but online payments are not connected yet. Nothing has been charged and your details have not been stored.`;
  $('moStatus').hidden = false;
});

renderCal();
renderAll();
