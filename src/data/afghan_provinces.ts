/** All 34 provinces of Afghanistan with EN / PS / FA names. */
export interface Province {
  value: string; // stored in the listing.location field
  en: string;
  ps: string;
  fa: string;
}

export const AFGHAN_PROVINCES: Province[] = [
  { value: "Kabul",       en: "Kabul",       ps: "کابل",      fa: "کابل" },
  { value: "Kandahar",    en: "Kandahar",    ps: "کندهار",    fa: "قندهار" },
  { value: "Herat",       en: "Herat",       ps: "هرات",      fa: "هرات" },
  { value: "Nangarhar",   en: "Nangarhar",   ps: "ننگرهار",   fa: "ننگرهار" },
  { value: "Balkh",       en: "Balkh",       ps: "بلخ",       fa: "بلخ" },
  { value: "Kunduz",      en: "Kunduz",      ps: "کندز",      fa: "کندز" },
  { value: "Ghazni",      en: "Ghazni",      ps: "غزني",      fa: "غزنی" },
  { value: "Parwan",      en: "Parwan",      ps: "پروان",     fa: "پروان" },
  { value: "Logar",       en: "Logar",       ps: "لوگر",      fa: "لوگر" },
  { value: "Khost",       en: "Khost",       ps: "خوست",      fa: "خوست" },
  { value: "Paktia",      en: "Paktia",      ps: "پکتیا",     fa: "پکتیا" },
  { value: "Paktika",     en: "Paktika",     ps: "پکتیکا",    fa: "پکتیکا" },
  { value: "Laghman",     en: "Laghman",     ps: "لغمان",     fa: "لغمان" },
  { value: "Kunar",       en: "Kunar",       ps: "کنر",       fa: "کنر" },
  { value: "Nuristan",    en: "Nuristan",    ps: "نورستان",   fa: "نورستان" },
  { value: "Badakhshan",  en: "Badakhshan",  ps: "بدخشان",    fa: "بدخشان" },
  { value: "Takhar",      en: "Takhar",      ps: "تخار",      fa: "تخار" },
  { value: "Baghlan",     en: "Baghlan",     ps: "بغلان",     fa: "بغلان" },
  { value: "Samangan",    en: "Samangan",    ps: "سمنگان",    fa: "سمنگان" },
  { value: "Sar-e Pol",   en: "Sar-e Pol",   ps: "سرپل",      fa: "سرپل" },
  { value: "Jawzjan",     en: "Jawzjan",     ps: "جوزجان",    fa: "جوزجان" },
  { value: "Faryab",      en: "Faryab",      ps: "فاریاب",    fa: "فاریاب" },
  { value: "Badghis",     en: "Badghis",     ps: "بادغیس",    fa: "بادغیس" },
  { value: "Ghor",        en: "Ghor",        ps: "غور",       fa: "غور" },
  { value: "Daykundi",    en: "Daykundi",    ps: "دایکندی",   fa: "دایکندی" },
  { value: "Bamyan",      en: "Bamyan",      ps: "بامیان",    fa: "بامیان" },
  { value: "Wardak",      en: "Wardak",      ps: "وردک",      fa: "وردک" },
  { value: "Zabul",       en: "Zabul",       ps: "زابل",      fa: "زابل" },
  { value: "Uruzgan",     en: "Uruzgan",     ps: "ارزگان",    fa: "ارزگان" },
  { value: "Helmand",     en: "Helmand",     ps: "هلمند",     fa: "هلمند" },
  { value: "Nimroz",      en: "Nimroz",      ps: "نیمروز",    fa: "نیمروز" },
  { value: "Farah",       en: "Farah",       ps: "فراه",      fa: "فراه" },
  { value: "Kapisa",      en: "Kapisa",      ps: "کاپیسا",    fa: "کاپیسا" },
  { value: "Panjshir",    en: "Panjshir",    ps: "پنجشیر",    fa: "پنجشیر" },
];

export function getProvinceName(
  province: Province,
  lang: string
): string {
  if (lang === "ps") return province.ps;
  if (lang === "fa") return province.fa;
  return province.en;
}
