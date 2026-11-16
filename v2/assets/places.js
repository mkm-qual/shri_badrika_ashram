// Countries and Indian states, shared by every address form (donate, profile): one list, one behaviour.
// Country names come from the browser, so they read naturally; India has a state list, other countries free text.
window.Places = (() => {
  const REGIONS = 'AF AX AL DZ AS AD AO AI AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BA BW BR BN BG BF BI KH CM CA CV KY CF TD CL CN CO KM CG CD CK CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT PR QA RE RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TC TV UG UA AE GB US UY UZ VU VA VE VN VG VI YE ZM ZW'.split(' ');
  const regionName = (() => {
    try { const dn = new Intl.DisplayNames(['en'], { type: 'region' }); return (c) => dn.of(c); }
    catch (e) { return (c) => c; }
  })();
  const IN_STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand',
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
  const fillCountries = (select, value = 'IN') => {
    select.innerHTML = '<option value="">Select country</option>' + REGIONS
      .map(c => [c, regionName(c)]).sort((a, b) => a[1].localeCompare(b[1]))
      .map(([c, n]) => `<option value="${c}">${n}</option>`).join('');
    select.value = value;
  };
  const fillStates = (select) => { select.innerHTML = '<option value="">Select state</option>' + IN_STATES.map(s => `<option>${s}</option>`).join(''); };
  // a stored country may be a code ("IN") or, from older saves, a name ("India")
  const toCode = (v) => !v ? '' : REGIONS.includes(v) ? v : (REGIONS.find(c => regionName(c) === v) || '');
  return { REGIONS, IN_STATES, regionName, fillCountries, fillStates, toCode };
})();
