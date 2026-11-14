// Your account: profile settings, dependants and bookings. Accounts aren't connected yet, so this is a
// preview: the signed-in name lives for the visit (sessionStorage 'sba-user'), and edits to the profile
// and dependants are kept in this browser only (localStorage), starting from sample details.
const $ = (id) => document.getElementById(id);
const page = document.body.dataset.account;            // profile | dependants | bookings

let userName = null;
try { userName = sessionStorage.getItem('sba-user'); } catch (e) {}

// ----- Signed out: show the sign-in prompt instead of the account -----
if (!userName) {
  $('acctGate').hidden = false;
  $('acctMain').hidden = true;
  $('acctSignin').href = `signin.html?next=${encodeURIComponent(location.pathname.split('/').pop())}`;
}

// ----- The account: sample details merged with anything saved in this browser (site.js) -----
const { SAMPLE, load, save } = window.sbaAccount;
let data = load();
const fullName = (p) => [p.first, p.middle, p.last].filter(Boolean).join(' ');
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// header of the account area
if (userName) {
  $('acctName').textContent = fullName(data.profile);
  $('acctInitial').textContent = data.profile.first.charAt(0).toUpperCase();
}

// ----- Sign out (side menu here; the header menu does the same in site.js) -----
document.querySelectorAll('[data-signout]').forEach(b => b.addEventListener('click', () => {
  try { sessionStorage.removeItem('sba-user'); } catch (e) {}
  location.href = 'index.html';
}));

// Full name as one box with First · Middle · Last (as on sign up): a space at the end of First or Middle
// moves on, a full name pasted into First is split, and Backspace in an empty part goes back
const nameBoxes = (boxes) => {
  const moveTo = (el) => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); };
  boxes.slice(0, 2).forEach((el, i) => el.addEventListener('input', () => {
    if (!el.value.endsWith(' ') || el.selectionStart !== el.value.length) return;
    el.value = el.value.trimEnd(); if (el.value) moveTo(boxes[i + 1]);
  }));
  boxes[0].addEventListener('paste', (e) => {
    const words = (e.clipboardData?.getData('text') || '').trim().split(/\s+/).filter(Boolean);
    if (words.length < 2 || boxes.some(b => b.value)) return;
    e.preventDefault();
    const [a, ...rest] = words, z = rest.pop();
    boxes[0].value = a; boxes[1].value = rest.join(' '); boxes[2].value = z; moveTo(boxes[2]);
  });
  boxes.slice(1).forEach((el, i) => el.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !el.value) { e.preventDefault(); moveTo(boxes[i]); }
  }));
};
// "Sunita Devi Sharma" → first, middle, last
const splitName = (n) => { const w = (n || '').trim().split(/\s+/).filter(Boolean); return w.length < 2 ? [w[0] || '', '', ''] : [w[0], w.slice(1, -1).join(' '), w[w.length - 1]]; };

const age = (dob) => {
  if (!dob) return null;
  const d = new Date(dob), t = new Date();
  return t.getFullYear() - d.getFullYear() - (t < new Date(t.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};
const longDate = (s) => new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
const flash = (el, msg) => { el.textContent = msg; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, 4000); };

// ===================== Profile settings =====================
if (page === 'profile' && userName) {
  const f = $('profileForm'), p = data.profile;
  // Mobile, country and state behave exactly as on Donate and Sign up: every country's dial code and number
  // format (assets/phone.js), the full country list, and a state list for India / free text elsewhere
  const code = $('country-code');
  const phone = window.Phone && Phone.setup(code, f.elements.mobile, 'IN');
  const country = $('country');
  Places.fillCountries(country, 'IN'); Places.fillStates($('state'));
  const india = () => country.value === 'IN';
  const syncCountry = () => {
    $('stateSelectWrap').hidden = !india(); $('stateTextWrap').hidden = india();
    f.elements.pincode.placeholder = india() ? 'Enter 6-digit pincode' : 'Enter postal code';
  };
  country.addEventListener('change', syncCountry);
  f.elements.pincode.addEventListener('input', (e) => { if (india()) e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });
  const SPECIAL = ['cc', 'mobile', 'country', 'state'];
  Object.entries(p).forEach(([k, v]) => { const el = f.elements[k]; if (!el || SPECIAL.includes(k)) return; if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? ''; });
  const ccIso = /^[A-Z]{2}$/.test(p.cc || '') ? p.cc : ({ '+91': 'IN', '+1': 'US', '+44': 'GB', '+61': 'AU', '+65': 'SG', '+971': 'AE' }[p.cc] || 'IN');
  code.value = ccIso; code.dispatchEvent(new Event('change', { bubbles: true }));
  f.elements.mobile.value = (p.mobile || '').replace(/\D/g, ''); f.elements.mobile.dispatchEvent(new Event('input', { bubbles: true }));
  country.value = Places.toCode(p.country) || 'IN'; syncCountry();
  if (india() && Places.IN_STATES.includes(p.state)) $('state').value = p.state; else $('state-text').value = p.state || '';
  const checks = {
    name: () => f.elements.first.value.trim() && f.elements.last.value.trim() ? '' : 'Please enter your first and last name.',
    email: () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.elements.email.value.trim()) ? '' : 'Please enter a valid email address.',
    mobile: () => phone ? phone.error() : (f.elements.mobile.value.replace(/\D/g, '').length >= 8 ? '' : 'Please enter your mobile number.'),
    pincode: () => !f.elements.pincode.value || !india() || /^[1-9]\d{5}$/.test(f.elements.pincode.value) ? '' : 'Indian pincodes have 6 digits.',
  };
  const inputs = (k) => k === 'name' ? [f.elements.first, f.elements.last] : [f.elements[k]];
  const show = (k) => {
    const msg = checks[k](), el = $(`${k}-error`);
    el.textContent = msg; el.hidden = !msg;
    inputs(k).forEach(i => i.setAttribute('aria-invalid', !!msg));
    el.closest('.field').classList.toggle('invalid', !!msg);
    return !msg;
  };
  ['email', 'mobile', 'pincode'].forEach(k => f.elements[k].addEventListener('blur', () => { if (f.elements[k].value) show(k); }));
  // the name check waits until you leave the name box altogether
  [f.elements.first, f.elements.middle, f.elements.last].forEach(i => i.addEventListener('blur', (e) => {
    if (!e.relatedTarget?.closest('.input.name')) show('name');
  }));
  nameBoxes([f.elements.first, f.elements.middle, f.elements.last]);
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = Object.keys(checks).filter(k => !show(k));
    if (bad.length) { (inputs(bad[0]).find(i => !i.value.trim()) || inputs(bad[0])[0]).focus(); return; }
    const next = {};
    Object.keys({ ...SAMPLE.profile, address: '', pincode: '' }).forEach(k => { const el = f.elements[k]; if (el && !SPECIAL.includes(k)) next[k] = el.type === 'checkbox' ? el.checked : el.value.trim(); });
    next.cc = code.value; next.mobile = f.elements.mobile.value.trim(); next.country = country.value;
    next.state = india() ? $('state').value : $('state-text').value.trim();
    data.profile = next; save(data);
    try { sessionStorage.setItem('sba-user', fullName(next)); } catch (err) {}
    $('acctName').textContent = fullName(next);
    $('acctInitial').textContent = next.first.charAt(0).toUpperCase();
    document.querySelectorAll('.pill-initial').forEach(s => { s.textContent = next.first.charAt(0).toUpperCase(); });
    flash($('profileStatus'), 'Your details are saved (in this browser, until accounts are connected).');
  });
}

// ===================== KYC: PAN or Aadhaar, verified once and then locked =====================
// One of the two must be verified before booking a stay or receiving 80G receipts. After verification the
// number can't be changed here (only by writing to the Ashram). Preview: verification is simulated.
const kycVerified = () => !!(data.kyc && data.kyc.verifiedAt);
const maskKyc = (k) => k.type === 'aadhaar' ? `•••• •••• ${k.number.slice(-4)}` : `•••••${k.number.slice(5, 9)}${k.number.slice(-1)}`;
// Aadhaar numbers carry a Verhoeff check digit, so a mistyped number is caught before sending
const verhoeff = (num) => {
  const d = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
  const p = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
  let c = 0; [...num].reverse().forEach((ch, i) => { c = d[c][p[i % 8][+ch]]; }); return c === 0;
};
// account pages: a reminder until KYC is verified
if (userName && !kycVerified() && page !== 'profile') {
  const n = document.createElement('p');
  n.className = 'kyc-nudge';
  n.innerHTML = '<span class="ic" style="--i:url(\'icons/info.svg\');--s:16px" aria-hidden="true"></span><span>Verify your PAN or Aadhaar to book stays and receive 80G receipts. <a href="profile.html#kyc">Verify now</a></span>';
  document.querySelector('.acct-body').prepend(n);
}
if (page === 'profile' && userName) {
  const body = $('kycBody'), badge = $('kycBadge');
  let type = 'pan', step = 'enter', pending = '';
  const render = () => {
    const k = data.kyc;
    badge.className = 'kyc-badge ' + (kycVerified() ? 'is-ok' : 'is-due');
    badge.textContent = kycVerified() ? 'Verified' : 'Required';
    if (kycVerified()) {
      body.innerHTML = `<dl class="kyc-done">
          <div><dt>${k.type === 'aadhaar' ? 'Aadhaar number' : 'PAN'}</dt><dd>${maskKyc(k)}</dd></div>
          <div><dt>Name as verified</dt><dd>${esc(k.name)}</dd></div>
          <div><dt>Verified on</dt><dd>${longDate(k.verifiedAt)}</dd></div>
        </dl>
        <p class="kyc-lock"><span class="ic" style="--i:url('icons/info.svg');--s:16px" aria-hidden="true"></span><span>Verified details can’t be changed. If something is wrong, please <a href="contact.html">contact the Ashram</a>.</span></p>`;
      return;
    }
    if (step === 'otp') {
      body.innerHTML = `<p class="acct-intro">We sent a one-time code to the mobile number linked with Aadhaar ${maskKyc({ type: 'aadhaar', number: pending })}. Enter it to finish.</p>
        <div class="kyc-row">
          <div class="field"><label for="kycOtp">One-time code</label>
            <div class="input"><input id="kycOtp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" aria-describedby="kycOtp-error"></div>
            <p class="field-error" id="kycOtp-error" hidden></p></div>
          <div class="kyc-actions"><button class="btn btn-primary" type="button" data-kyc="confirm"><span>Verify</span></button><button class="link-btn" type="button" data-kyc="back">Use a different number</button></div>
        </div>
        <p class="field-hint">Preview: any six digits will do.</p>`;
      $('kycOtp').focus();
      return;
    }
    body.innerHTML = `<p class="acct-intro">Verify one of these to book stays and receive 80G receipts for donations. Once verified, it can’t be changed.</p>
      <div class="seg" role="radiogroup" aria-label="Document">
        <label><input type="radio" name="kycType" value="pan" ${type === 'pan' ? 'checked' : ''}><span>PAN</span></label>
        <label><input type="radio" name="kycType" value="aadhaar" ${type === 'aadhaar' ? 'checked' : ''}><span>Aadhaar</span></label>
      </div>
      <div class="kyc-row">
        <div class="field"><label for="kycNum">${type === 'pan' ? 'PAN' : 'Aadhaar number'}</label>
          <div class="input"><input id="kycNum" ${type === 'pan' ? 'maxlength="10" autocapitalize="characters" placeholder="ABCDE1234F"' : 'inputmode="numeric" maxlength="14" placeholder="1234 5678 9012"'} autocomplete="off" aria-describedby="kycNum-error"></div>
          <p class="field-error" id="kycNum-error" hidden></p></div>
        <div class="kyc-actions"><button class="btn btn-primary" type="button" data-kyc="verify"><span>${type === 'pan' ? 'Verify PAN' : 'Send code'}</span></button></div>
      </div>
      <p class="field-hint">${type === 'pan' ? 'The name on your PAN should match your name above.' : 'A one-time code goes to the mobile number linked with your Aadhaar.'}</p>`;
  };
  const err = (id, msg) => { const e = $(`${id}-error`); e.textContent = msg; e.hidden = !msg; $(id).setAttribute('aria-invalid', !!msg); $(id).closest('.field').classList.toggle('invalid', !!msg); if (msg) $(id).focus(); return !msg; };
  const done = (t, number) => {
    data.kyc = { type: t, number, name: fullName(data.profile), verifiedAt: new Date().toISOString() };
    save(data); step = 'enter'; render();
    flash($('profileStatus'), `${t === 'pan' ? 'PAN' : 'Aadhaar'} verified.`);
    badge.focus?.();
  };
  body.addEventListener('change', (e) => { if (e.target.name === 'kycType') { type = e.target.value; render(); } });
  body.addEventListener('input', (e) => {
    if (e.target.id === 'kycNum') {
      const v = e.target.value;
      e.target.value = type === 'pan' ? v.toUpperCase().replace(/[^A-Z0-9]/g, '') : v.replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ');
    }
    if (e.target.id === 'kycOtp') e.target.value = e.target.value.replace(/\D/g, '');
  });
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-kyc]'); if (!b) return;
    if (b.dataset.kyc === 'verify') {
      const v = $('kycNum').value.replace(/\s/g, '');
      if (type === 'pan') {
        if (!err('kycNum', /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v) ? '' : 'PAN numbers look like ABCDE1234F.')) return;
        b.disabled = true; b.querySelector('span').textContent = 'Verifying…';
        setTimeout(() => done('pan', v), 900);
      } else {
        if (!err('kycNum', /^[2-9]\d{11}$/.test(v) && verhoeff(v) ? '' : (v.length === 12 ? 'This doesn’t look like a valid Aadhaar number. Please check the digits.' : 'Aadhaar numbers have 12 digits.'))) return;
        pending = v; step = 'otp'; render();
      }
    }
    if (b.dataset.kyc === 'back') { step = 'enter'; render(); }
    if (b.dataset.kyc === 'confirm') {
      if (!err('kycOtp', /^\d{6}$/.test($('kycOtp').value) ? '' : 'Please enter the six-digit code.')) return;
      done('aadhaar', pending);
    }
  });
  body.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('#kycNum, #kycOtp')) { e.preventDefault(); body.querySelector(e.target.id === 'kycNum' ? '[data-kyc="verify"]' : '[data-kyc="confirm"]').click(); } });
  render();
}

// ===================== Dependants =====================
if (page === 'dependants' && userName) {
  const list = $('depList'), form = $('depForm'), status = $('depStatus');
  let editing = null;
  const render = () => {
    $('depCount').textContent = data.dependants.length;
    list.innerHTML = data.dependants.length ? data.dependants.map(d => {
      const a = age(d.dob);
      return `<li class="dep-item">
        <span class="dep-initial" aria-hidden="true">${esc(d.name.charAt(0).toUpperCase())}</span>
        <div class="dep-copy"><strong>${esc(d.name)}</strong><span>${esc(d.relation)}${a !== null ? ` · ${a} years` : ''}${d.gender ? ` · ${esc(d.gender)}` : ''}</span>
          ${a !== null && a < 10 ? '<small>Below 10 years: not permitted to stay at most events</small>' : ''}</div>
        <div class="dep-actions">
          <button type="button" class="link-btn" data-edit="${d.id}">Edit<span class="visually-hidden"> ${esc(d.name)}</span></button>
          <button type="button" class="link-btn danger" data-remove="${d.id}">Remove<span class="visually-hidden"> ${esc(d.name)}</span></button>
        </div>
      </li>`;
    }).join('') : '<li class="dep-empty">No dependants yet. Add family members you book for, so you can pick them when booking.</li>';
  };
  const openForm = (d) => {
    editing = d ? d.id : null;
    form.hidden = false; $('depAdd').hidden = true;
    $('depFormTitle').textContent = d ? `Edit ${d.name}` : 'Add a dependant';
    const [fi, mi, la] = splitName(d ? d.name : '');
    form.elements.first.value = fi; form.elements.middle.value = mi; form.elements.last.value = la;
    form.elements.relation.value = d ? d.relation : '';
    form.elements.dob.value = d ? d.dob : ''; form.elements.gender.value = d ? d.gender : '';
    form.elements.dob.max = new Date().toISOString().slice(0, 10);
    form.elements.first.focus();
  };
  nameBoxes([form.elements.first, form.elements.middle, form.elements.last]);
  const depInputs = { name: () => [form.elements.first, form.elements.last], relation: () => [form.elements.relation], dob: () => [form.elements.dob] };
  const closeForm = () => { form.hidden = true; $('depAdd').hidden = false; editing = null; Object.keys(depInputs).forEach(k => { $(`dep-${k}-error`).hidden = true; depInputs[k]().forEach(i => i.removeAttribute('aria-invalid')); $(`dep-${k}-error`).closest('.field').classList.remove('invalid'); }); $('depAdd').focus(); };
  $('depAdd').addEventListener('click', () => openForm(null));
  $('depCancel').addEventListener('click', closeForm);
  list.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]'), rm = e.target.closest('[data-remove]');
    if (ed) openForm(data.dependants.find(d => d.id === ed.dataset.edit));
    if (rm) {
      const d = data.dependants.find(x => x.id === rm.dataset.remove);
      if (!confirm(`Remove ${d.name} from your dependants?`)) return;
      data.dependants = data.dependants.filter(x => x !== d); save(data); render();
      flash(status, `${d.name} was removed.`);
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const parts = ['first', 'middle', 'last'].map(k => form.elements[k].value.trim());
    const v = { name: parts.filter(Boolean).join(' '), relation: form.elements.relation.value, dob: form.elements.dob.value, gender: form.elements.gender.value };
    const errs = { name: parts[0] && parts[2] ? '' : 'Please enter their first and last name.', relation: v.relation ? '' : 'Please choose how they are related to you.', dob: v.dob ? '' : 'Please enter their date of birth.' };
    let first = null;
    Object.entries(errs).forEach(([k, msg]) => {
      const el = $(`dep-${k}-error`); el.textContent = msg; el.hidden = !msg;
      depInputs[k]().forEach(i => i.setAttribute('aria-invalid', !!msg)); el.closest('.field').classList.toggle('invalid', !!msg);
      if (msg && !first) first = depInputs[k]().find(i => !i.value.trim()) || depInputs[k]()[0];
    });
    if (first) { first.focus(); return; }
    if (editing) Object.assign(data.dependants.find(d => d.id === editing), v);
    else data.dependants.push({ id: `d${Date.now()}`, ...v });
    save(data); render();
    flash(status, editing ? `${v.name}’s details were updated.` : `${v.name} was added to your dependants.`);
    closeForm();
  });
  render();
}

// ===================== My bookings =====================
if (page === 'bookings' && userName) {
  const me = fullName(data.profile);
  const fam = data.dependants.map(d => d.name);
  // Sample bookings until the booking system is connected
  const BOOKINGS = [
    { ref: 'SBA-26-48213', event: 'The Glorious Presence (Event 2)', href: 'event-glorious-presence-2.html', from: '2026-11-20', to: '2026-11-22', nights: 2,
      people: [me, fam[0]].filter(Boolean), status: 'confirmed', amount: 7200, note: 'Discourses with Swamiji on 20, 21 and 22 November.' },
    { ref: 'SBA-26-48590', event: 'The Glorious Presence (Event 4)', href: 'event-glorious-presence-4.html', from: '2026-12-18', to: '2026-12-19', nights: 1,
      people: [me], status: 'waitlist', amount: 0, note: 'You are on the waitlist. Nothing has been charged; we will write to you if a place opens.' },
    { ref: 'SBA-27-10077', event: 'Maha Rudra Sadhana', href: 'event-maha-rudra-sadhana.html', from: '2027-03-05', to: '2027-03-17', nights: 12,
      people: [me], status: 'confirmed', amount: 21600, note: 'Full 11-day sadhana. Check-in on 5 March.' },
    { ref: 'SBA-26-47120', event: 'The Glorious Presence (Event 1)', href: 'event-glorious-presence-1.html', from: '2026-11-07', to: '2026-11-09', nights: 2,
      people: [me, fam[0]].filter(Boolean), status: 'completed', amount: 7200 },
    { ref: 'SBA-26-45318', event: 'Divine Autumn', href: 'event-divine-autumn.html', from: '2026-10-10', to: '2026-10-14', nights: 4,
      people: [me, ...fam], status: 'completed', amount: 2000 * 4 * (1 + fam.length) },
  ];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = BOOKINGS.filter(b => new Date(b.to) >= today), past = BOOKINGS.filter(b => new Date(b.to) < today);
  const LABEL = { confirmed: 'Confirmed', waitlist: 'Waitlisted', completed: 'Completed', cancelled: 'Cancelled' };
  const range = (a, b) => { const x = new Date(a), y = new Date(b), o = { day: 'numeric', month: 'short' };
    return `${x.toLocaleDateString('en-IN', o)} – ${y.toLocaleDateString('en-IN', { ...o, year: 'numeric' })}`; };
  const card = (b) => `<article class="bkg">
      <div class="bkg-head">
        <div><h3><a href="${b.href}">${esc(b.event)}</a></h3><p class="bkg-when">${range(b.from, b.to)} · ${b.nights} ${b.nights === 1 ? 'night' : 'nights'}</p></div>
        <span class="bkg-status is-${b.status}">${LABEL[b.status]}</span>
      </div>
      <dl class="bkg-facts">
        <div><dt>Attendees</dt><dd>${b.people.map(esc).join(', ')}</dd></div>
        <div><dt>Contribution</dt><dd>${b.amount ? `₹${b.amount.toLocaleString('en-IN')}${b.status === 'completed' || b.status === 'confirmed' ? ' paid' : ''}` : '—'}</dd></div>
        <div><dt>Booking reference</dt><dd>${b.ref}</dd></div>
      </dl>
      ${b.note ? `<p class="bkg-note">${esc(b.note)}</p>` : ''}
      <div class="bkg-actions"><a class="text-link" href="${b.href}"><span>View event</span></a><a class="text-link" href="contact.html"><span>Ask about this booking</span></a></div>
    </article>`;
  const show = (which) => {
    const items = which === 'past' ? past : upcoming;
    $('bkgList').innerHTML = items.length ? items.map(card).join('') :
      `<p class="dep-empty">${which === 'past' ? 'No past bookings yet.' : 'No upcoming bookings. <a href="events.html">See upcoming events</a>.'}</p>`;
    document.querySelectorAll('[data-bkg-tab]').forEach(t => t.setAttribute('aria-selected', t.dataset.bkgTab === which));
  };
  $('bkgUpcomingCount').textContent = upcoming.length; $('bkgPastCount').textContent = past.length;
  document.querySelectorAll('[data-bkg-tab]').forEach(t => t.addEventListener('click', () => show(t.dataset.bkgTab)));
  show('upcoming');
}
