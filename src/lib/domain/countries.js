const REGIONS =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
    ' ',
  );
const names = new Intl.DisplayNames(['en'], { type: 'region' });
const overrides = { US: 'USA', GB: 'UK', AE: 'UAE' };
export const COUNTRIES = REGIONS.map((code) => ({
  code,
  name: overrides[code] || names.of(code),
  aliases: [
    code,
    names.of(code),
    ...(code === 'GB' ? ['Britain', 'Great Britain', 'England'] : []),
  ],
})).sort((a, b) => a.name.localeCompare(b.name));
export const countryKey = (value) =>
  value.trim().normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export function countryMatches(query, selected) {
  const term = countryKey(query);
  const chosen = new Set(selected.map(countryKey));
  return COUNTRIES.filter(
    (country) =>
      !chosen.has(countryKey(country.name)) &&
      [country.name, ...country.aliases].some((value) => countryKey(value).includes(term)),
  );
}
export function customCountry(query, selected) {
  const value = query.trim().replace(/\s+/g, ' ');
  if (!/^[\p{L}][\p{L}\s.'’-]{1,59}$/u.test(value)) return null;
  const key = countryKey(value);
  if (
    selected.some((name) => countryKey(name) === key) ||
    COUNTRIES.some((country) =>
      [country.name, ...country.aliases].some((name) => countryKey(name) === key),
    )
  )
    return null;
  return value;
}
