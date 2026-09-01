/** All 34 provinces of Afghanistan with EN / PS / FA names and capital coords. */
export interface Province {
  value: string; // stored in the listing.location field
  en: string;
  ps: string;
  fa: string;
  lat: number; // provincial capital latitude — attached to listings for map search
  lng: number; // provincial capital longitude
}

export const AFGHAN_PROVINCES: Province[] = [
  { value: "Kabul",       en: "Kabul",       ps: "کابل",      fa: "کابل",      lat: 34.5553, lng: 69.2075 },
  { value: "Kandahar",    en: "Kandahar",    ps: "کندهار",    fa: "قندهار",    lat: 31.6133, lng: 65.7101 },
  { value: "Herat",       en: "Herat",       ps: "هرات",      fa: "هرات",      lat: 34.3529, lng: 62.2040 },
  { value: "Nangarhar",   en: "Nangarhar",   ps: "ننگرهار",   fa: "ننگرهار",   lat: 34.4265, lng: 70.4515 },
  { value: "Balkh",       en: "Balkh",       ps: "بلخ",       fa: "بلخ",       lat: 36.7090, lng: 67.1109 },
  { value: "Kunduz",      en: "Kunduz",      ps: "کندز",      fa: "کندز",      lat: 36.7286, lng: 68.8681 },
  { value: "Ghazni",      en: "Ghazni",      ps: "غزني",      fa: "غزنی",      lat: 33.5492, lng: 68.4173 },
  { value: "Parwan",      en: "Parwan",      ps: "پروان",     fa: "پروان",     lat: 35.0136, lng: 69.1683 },
  { value: "Logar",       en: "Logar",       ps: "لوگر",      fa: "لوگر",      lat: 34.0015, lng: 69.0466 },
  { value: "Khost",       en: "Khost",       ps: "خوست",      fa: "خوست",      lat: 33.3395, lng: 69.9205 },
  { value: "Paktia",      en: "Paktia",      ps: "پکتیا",     fa: "پکتیا",     lat: 33.5970, lng: 69.2257 },
  { value: "Paktika",     en: "Paktika",     ps: "پکتیکا",    fa: "پکتیکا",    lat: 33.1761, lng: 68.7178 },
  { value: "Laghman",     en: "Laghman",     ps: "لغمان",     fa: "لغمان",     lat: 34.6680, lng: 70.2089 },
  { value: "Kunar",       en: "Kunar",       ps: "کنر",       fa: "کنر",       lat: 34.8742, lng: 71.1462 },
  { value: "Nuristan",    en: "Nuristan",    ps: "نورستان",   fa: "نورستان",   lat: 35.4264, lng: 70.9181 },
  { value: "Badakhshan",  en: "Badakhshan",  ps: "بدخشان",    fa: "بدخشان",    lat: 37.1166, lng: 70.5800 },
  { value: "Takhar",      en: "Takhar",      ps: "تخار",      fa: "تخار",      lat: 36.7361, lng: 69.5345 },
  { value: "Baghlan",     en: "Baghlan",     ps: "بغلان",     fa: "بغلان",     lat: 35.9482, lng: 68.7150 },
  { value: "Samangan",    en: "Samangan",    ps: "سمنگان",    fa: "سمنگان",    lat: 36.2659, lng: 68.0150 },
  { value: "Sar-e Pol",   en: "Sar-e Pol",   ps: "سرپل",      fa: "سرپل",      lat: 36.2159, lng: 65.9333 },
  { value: "Jawzjan",     en: "Jawzjan",     ps: "جوزجان",    fa: "جوزجان",    lat: 36.6657, lng: 65.7529 },
  { value: "Faryab",      en: "Faryab",      ps: "فاریاب",    fa: "فاریاب",    lat: 35.9211, lng: 64.7842 },
  { value: "Badghis",     en: "Badghis",     ps: "بادغیس",    fa: "بادغیس",    lat: 34.9853, lng: 63.1287 },
  { value: "Ghor",        en: "Ghor",        ps: "غور",       fa: "غور",       lat: 34.5267, lng: 65.2680 },
  { value: "Daykundi",    en: "Daykundi",    ps: "دایکندی",   fa: "دایکندی",   lat: 33.7220, lng: 66.1300 },
  { value: "Bamyan",      en: "Bamyan",      ps: "بامیان",    fa: "بامیان",    lat: 34.8210, lng: 67.8270 },
  { value: "Wardak",      en: "Wardak",      ps: "وردک",      fa: "وردک",      lat: 34.3961, lng: 68.8669 },
  { value: "Zabul",       en: "Zabul",       ps: "زابل",      fa: "زابل",      lat: 32.1058, lng: 66.9070 },
  { value: "Uruzgan",     en: "Uruzgan",     ps: "ارزگان",    fa: "ارزگان",    lat: 32.6266, lng: 65.8694 },
  { value: "Helmand",     en: "Helmand",     ps: "هلمند",     fa: "هلمند",     lat: 31.5938, lng: 64.3715 },
  { value: "Nimroz",      en: "Nimroz",      ps: "نیمروز",    fa: "نیمروز",    lat: 31.0125, lng: 61.8628 },
  { value: "Farah",       en: "Farah",       ps: "فراه",      fa: "فراه",      lat: 32.3742, lng: 62.1135 },
  { value: "Kapisa",      en: "Kapisa",      ps: "کاپیسا",    fa: "کاپیسا",    lat: 34.9810, lng: 69.3220 },
  { value: "Panjshir",    en: "Panjshir",    ps: "پنجشیر",    fa: "پنجشیر",    lat: 35.3105, lng: 69.5400 },
];

export function getProvinceName(
  province: Province,
  lang: string
): string {
  if (lang === "ps") return province.ps;
  if (lang === "fa") return province.fa;
  return province.en;
}

export function getProvinceByValue(value?: string | null): Province | undefined {
  if (!value) return undefined;
  return AFGHAN_PROVINCES.find((p) => p.value === value);
}

/**
 * The province whose capital is closest to a point.
 *
 * Exists so a dropped map pin can NAME its own province instead of leaving the
 * profile self-contradictory: before this, confirming a pin in Herat while the
 * province field still said "Kabul" saved both, and nothing reconciled them —
 * the coarse field and the precise one disagreed with no way to tell which the
 * seller meant.
 *
 * Capital-distance, not polygons: the dataset has capitals and this app only
 * needs "which province is this roughly in", which capitals answer correctly for
 * anywhere near a populated place. Real boundaries would be a shapefile and a
 * point-in-polygon test for a question nobody asks that precisely.
 *
 * Equirectangular distance with a cos(lat) correction — Afghanistan spans ~9° of
 * latitude, so ignoring the correction would skew east-west comparisons in the
 * north. No need for haversine to rank 34 candidates.
 */
export function nearestProvince(lat: number, lng: number): Province | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const rad = (d: number) => (d * Math.PI) / 180;
  let best: Province | null = null;
  let bestD = Infinity;
  for (const p of AFGHAN_PROVINCES) {
    const dLat = lat - p.lat;
    const dLng = (lng - p.lng) * Math.cos(rad((lat + p.lat) / 2));
    const d = dLat * dLat + dLng * dLng;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}
