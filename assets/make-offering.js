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
const state = { date: null, view: new Date(today.getFullYear(), today.getMonth(), 1), slots: {} };
const chosen = () => [...form.querySelectorAll('input[name="offering"]:checked')].map(i => i.value);

// ----- Which offerings are performed on which day -----
// A placeholder schedule until the Ashram publishes its own: Aarti and Sahasranama every day,
// Abhishekam on selected days (October follows the Ashram's published days), Sringar on Sundays.
const ABHISHEKAM_OCT_2026 = [6, 10, 11, 12, 14, 15, 16, 17, 18, 19, 22, 25];
const hash = (d) => { let x = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); x = (x ^ 61) ^ (x >>> 16); x *= 9; x ^= x >>> 4; x *= 0x27d4eb2d; return ((x ^ (x >>> 15)) >>> 0) % 100; };
const ORDER = ['aarti', 'abhishekam', 'sahasranama', 'sringar'];
const heldOn = (date) => ORDER.filter(k => {
  if (k === 'aarti' || k === 'sahasranama') return true;
  if (k === 'sringar') return date.getDay() === 0;
  if (date.getFullYear() === 2026 && date.getMonth() === 9) return ABHISHEKAM_OCT_2026.includes(date.getDate());
  return hash(date) < 40;
});
// a day can be picked when it is ahead of today and holds every offering chosen
const pickable = (date) => date >= today && date <= lastDay && chosen().every(k => heldOn(date).includes(k));

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
    const cls = ['mo-cell', inMonth ? '' : 'other', +date === +today ? 'today' : '', state.date && +state.date === +date ? 'sel' : ''].filter(Boolean).join(' ');
    const label = `${longDate(date)}: ${held.map(k => OFFERINGS[k].name).join(', ')}`;
    const inner = `<b>${date.getDate()}</b><ul>${list}</ul>`;
    cells.push(inMonth && pickable(date)
      ? `<button type="button" class="${cls}" data-d="${date.getDate()}" aria-pressed="${cls.includes('sel')}" aria-label="${label}">${inner}</button>`
      : `<div class="${cls} off" aria-label="${label}, unavailable">${inner}</div>`);
  }
  $('calDays').innerHTML = cells.join('');
};
$('calPrev').addEventListener('click', () => { state.view.setMonth(state.view.getMonth() - 1); renderCal(); });
$('calNext').addEventListener('click', () => { state.view.setMonth(state.view.getMonth() + 1); renderCal(); });
$('calDays').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-d]'); if (!b) return;   // greyed days are not buttons
  state.date = new Date(state.view.getFullYear(), state.view.getMonth(), Number(b.dataset.d));
  renderCal();
  $(`calDays`).querySelector(`[data-d="${b.dataset.d}"]`)?.focus();
  if (!$('date-error').hidden) show('date');
  renderAll();
});

// ----- Times: tick one or more per offering (an offering with a single time is ticked automatically) -----
const slotsOf = (k) => (state.slots[k] ||= new Set());
const renderSlots = () => {
  const list = chosen();
  if (!list.length) { $('slots').innerHTML = '<p class="mo-empty">Choose an offering first.</p>'; return; }
  if (!state.date) { $('slots').innerHTML = '<p class="mo-empty">Choose a date to see the times.</p>'; return; }
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
  $('sumDate').textContent = state.date ? longDate(state.date) : 'No date chosen yet';
  $('sumEmpty').hidden = list.length > 0;
  // one line (and one charge) per chosen time; an offering without a time yet is counted once
  $('sumList').innerHTML = list.map(k => {
    const o = OFFERINGS[k], times = o.slots.filter(x => slotsOf(k).has(x[0]));
    if (!times.length) return `<li><span><b>${o.name}</b><small>Time to be chosen</small></span><span>${rupees(o.fee)}</span></li>`;
    return times.map(t => `<li><span><b>${o.name}</b><small>${t[1]} · ${t[2]}</small></span><span>${rupees(o.fee)}</span></li>`).join('');
  }).join('');
  $('sumTotal').textContent = rupees(total());
};
const total = () => chosen().reduce((t, k) => t + OFFERINGS[k].fee * Math.max(1, slotsOf(k).size), 0);
const renderAll = () => { renderSlots(); renderSummary(); };
form.querySelectorAll('input[name="offering"]').forEach(i => i.addEventListener('change', () => {
  if (!$('offering-error').hidden) show('offering');
  if (state.date && !pickable(state.date)) state.date = null;   // the chosen day no longer holds every offering
  renderCal();
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
  date: () => state.date ? '' : 'Please choose a date that holds every offering you chose.',
  slot: () => !state.date || chosen().every(k => slotsOf(k).size) ? '' : 'Please tick at least one time for each offering.',
  behalf: () => $('behalf').value.trim() ? '' : 'Please enter the name the offering is made in.',
  pan: () => !pan.value ? 'Please enter your PAN number.' : /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.value) ? '' : 'PAN numbers look like ABCDE1234F.',
  terms: () => $('terms').checked ? '' : 'Please agree to the terms and conditions.',
};
const target = { offering: () => form.querySelector('input[name="offering"]'), date: () => $('calDays').querySelector('button[data-d]') || $('calNext'),
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
  $('moStatus').textContent = `Thank you. Your offering for ${$('behalf').value.trim()} on ${longDate(state.date)} (${amount}) is ready, but online payments are not connected yet. Nothing has been charged and your details have not been stored.`;
  $('moStatus').hidden = false;
});

renderCal();
renderAll();
