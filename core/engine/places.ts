// Name tables for reading a free-text home city ("Cambridge, Massachusetts, USA"). Keys are
// normalised (see normalizeCity). Extend as users appear; the structured fields in issues #35
// and #36 replace this.

export const US_STATES: Record<string, string> = {
  alabama: "al",
  alaska: "ak",
  arizona: "az",
  arkansas: "ar",
  california: "ca",
  colorado: "co",
  connecticut: "ct",
  delaware: "de",
  "district of columbia": "dc",
  florida: "fl",
  georgia: "ga",
  hawaii: "hi",
  idaho: "id",
  illinois: "il",
  indiana: "in",
  iowa: "ia",
  kansas: "ks",
  kentucky: "ky",
  louisiana: "la",
  maine: "me",
  maryland: "md",
  massachusetts: "ma",
  michigan: "mi",
  minnesota: "mn",
  mississippi: "ms",
  missouri: "mo",
  montana: "mt",
  nebraska: "ne",
  nevada: "nv",
  "new hampshire": "nh",
  "new jersey": "nj",
  "new mexico": "nm",
  "new york": "ny",
  "north carolina": "nc",
  "north dakota": "nd",
  ohio: "oh",
  oklahoma: "ok",
  oregon: "or",
  pennsylvania: "pa",
  "rhode island": "ri",
  "south carolina": "sc",
  "south dakota": "sd",
  tennessee: "tn",
  texas: "tx",
  utah: "ut",
  vermont: "vt",
  virginia: "va",
  washington: "wa",
  "west virginia": "wv",
  wisconsin: "wi",
  wyoming: "wy",
};

export const US_STATE_CODES: ReadonlySet<string> = new Set(Object.values(US_STATES));

// A state written as a name or a code, as the lower-case code; null when it isn't a state.
// "washington" alone is a city here, so only the code "wa" and the full "washington state"
// read as that state.
export function stateCode(normalized: string): string | null {
  if (US_STATE_CODES.has(normalized)) return normalized;
  if (normalized === "washington state") return "wa";
  if (normalized === "washington") return null;
  return US_STATES[normalized] ?? null;
}

// Country names and common spellings to the two-letter ISO code the program records use.
export const COUNTRIES: Record<string, string> = {
  us: "US",
  usa: "US",
  "u s": "US",
  "u s a": "US",
  "united states": "US",
  "united states of america": "US",
  america: "US",
  uk: "GB",
  "u k": "GB",
  gb: "GB",
  "united kingdom": "GB",
  "great britain": "GB",
  britain: "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  canada: "CA",
  mexico: "MX",
  argentina: "AR",
  brazil: "BR",
  chile: "CL",
  colombia: "CO",
  peru: "PE",
  uruguay: "UY",
  "costa rica": "CR",
  panama: "PA",
  spain: "ES",
  france: "FR",
  germany: "DE",
  italy: "IT",
  portugal: "PT",
  netherlands: "NL",
  switzerland: "CH",
  ireland: "IE",
  sweden: "SE",
  norway: "NO",
  denmark: "DK",
  india: "IN",
  china: "CN",
  japan: "JP",
  singapore: "SG",
  australia: "AU",
  "new zealand": "NZ",
  "south africa": "ZA",
  israel: "IL",
  "united arab emirates": "AE",
  uae: "AE",
};

// Unknown country text stays as written (lower case), so it never equals an ISO code.
export const countryCode = (normalized: string): string => COUNTRIES[normalized] ?? normalized;
