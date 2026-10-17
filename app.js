const KEY = "shop-reports-v4";
const OLD_KEY = "shop-reports-v3";

const VENUES = {
  tangiers: "Tangiers",
  shishka: "Shishka Premium",
};

const DEFAULT_GRAMS_PER_HOOKAH = 25;
const DEFAULT_COALS_PER_HOOKAH = 5;
const FRUIT_GRAMS = 40;
const FRUIT_COALS = 7;
const DEFAULT_COALS_PER_PACK = 72;
const DEFAULT_STAFF_PER_DAY = 2;
const OPENING_DATE = "2026-08-28";

const SALE_GROUPS = [
  { id: "classic", num: "1", title: "Классик", note: "Smoke break" },
  { id: "premium", num: "2", title: "Премиум", note: "Bonche, Jent Cigar, Troffimoff's" },
  { id: "tangiers", num: "3", title: "Tangiers", note: "Tangiers-акция" },
];

const PREMIUM_BRANDS = [
  "bonche",
  "jent cigar",
  "jentcigar",
  "troffimoff",
  "trofimoff",
  "troffimofs",
];

const DEFAULT_BRANDS = [
  "Blackburn/banger/bliss/chabacco",
  "Overdose",
  "Sarma",
  "Severniy/Oven",
  "Spectrum",
  "Nash",
  "Palitra",
  "Deus",
  "Sebero",
  "Starline",
  "Hell",
  "Darkside",
  "Musthave",
  "Everest",
  "Serbetli",
  "Satyr",
  "Jent",
  "Hooligan",
  "Troffimoff's",
  "Jent Cigar",
  "Bonche",
];

const DEFAULT_EMPLOYEES = [
  "Сайдуллаев Махсад",
  "Абдулсатторов Камрон",
  "Романенко Марго",
  "Зайниддинов Султан",
  "Абдулхакимов Бехруз",
  "Азиз Арсланов",
];

const SHIFT_ORDER = ["", "morning", "evening", "eveningWe", "intern"];
const SHIFT_LABEL = {
  "": "/",
  morning: "Утро",
  evening: "Вечер",
  eveningWe: "Вечер",
  intern: "Стаж",
};

const DEFAULT_RATES = {
  morning: 300000,
  eveningWeekday: 200000,
  eveningWeekend: 250000,
  intern: 100000,
};

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

const INCOME = {
  tobacco: {
    title: "Приход табака",
    hint: "Жмите Классик, Премиум или Tangiers — граммы уйдут в ту же группу, что и продажи",
    name: "Марка",
    placeholder: "Например Starline",
    qty: "Граммы",
    unit: "г",
    qtyStat: "Граммы",
    empty: "Прихода табака пока нет",
  },
  inventory: {
    title: "Приход инвентаря",
    hint: "Чаши — отдельным списком: добавь название вида, потом дозакупку",
    name: "Наименование",
    placeholder: "Колба, шланг",
    qty: "Количество, шт",
    unit: "шт",
    qtyStat: "Штук",
    empty: "Прихода инвентаря пока нет",
  },
  coal: {
    title: "Приход угля",
    hint: "Сначала добавь название угля, потом пачки. В пачке 72 шт",
    name: "Название угля",
    placeholder: "CocoNara, Tom Coco...",
    qty: "Пачек",
    unit: "шт",
    qtyStat: "Штук",
    empty: "Прихода угля пока нет",
  },
};

const db = loadDb();
let state = db.venues[db.current];
let shownRevDate = OPENING_DATE;
let pendingSale = null;
let viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let half = new Date().getDate() > 15 ? 1 : 0;
let incomingKind = "tobacco";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isMouthpiece(name) {
  return /мундштук/i.test(String(name || ""));
}

function defaultInventory() {
  return [
    { id: uid(), name: "Колба", start: 0, kind: "item" },
    { id: uid(), name: "Мундштуки одноразовые", start: 0, kind: "item" },
  ];
}

function stockKind(item) {
  if (item?.kind === "bowl" || item?.kind === "item") return item.kind;
  return /чаш/i.test(item?.name || "") ? "bowl" : "item";
}

function defaultChecklist(venueId) {
  const items = venueId === "shishka"
    ? ["Classic", "Premium", "Smoke break", "Smoke break"]
    : ["Classic", "Premium", "Tangiers", "Smoke break", "Smoke break", "Tangiers-Aroma"];
  return {
    tableNo: "20",
    copies: 60,
    items,
  };
}

function emptyState(venueId = "tangiers") {
  return {
    employees: DEFAULT_EMPLOYEES.map((name) => ({ id: uid(), name })),
    schedule: {},
    extras: {},
    rates: { ...DEFAULT_RATES },
    tobacco: [],
    revisions: [],
    checklist: defaultChecklist(venueId),
    inventoryStock: defaultInventory(),
    coalStock: [],
    fines: [],
    hookahSales: [],
    gramsPerHookah: DEFAULT_GRAMS_PER_HOOKAH,
    coalsPerHookah: DEFAULT_COALS_PER_HOOKAH,
    coalsPerPack: DEFAULT_COALS_PER_PACK,
    staffPerDay: DEFAULT_STAFF_PER_DAY,
    consumptionV1: true,
  };
}

function applyConsumption(data) {
  if (!data) return data;
  if (!data.consumptionV1) {
    data.gramsPerHookah = DEFAULT_GRAMS_PER_HOOKAH;
    data.coalsPerHookah = DEFAULT_COALS_PER_HOOKAH;
    data.coalsPerPack = DEFAULT_COALS_PER_PACK;
    data.staffPerDay = DEFAULT_STAFF_PER_DAY;
    data.consumptionV1 = true;
  } else {
    data.gramsPerHookah = Math.max(1, Number(data.gramsPerHookah) || DEFAULT_GRAMS_PER_HOOKAH);
    data.coalsPerHookah = Math.max(0, Number(data.coalsPerHookah) || DEFAULT_COALS_PER_HOOKAH);
    data.coalsPerPack = Math.max(1, Number(data.coalsPerPack) || DEFAULT_COALS_PER_PACK);
    data.staffPerDay = Math.max(0, Number(data.staffPerDay ?? DEFAULT_STAFF_PER_DAY));
  }
  return data;
}

function emptyOpening(venueId) {
  return {
    date: OPENING_DATE,
    coals: 0,
    items: SALE_GROUPS
      .filter((group) => venueId !== "shishka" || group.id !== "tangiers")
      .map((group) => ({ name: group.title, grams: 0 })),
  };
}

function seedStockItem(data, name, kind = "item") {
  if (!Array.isArray(data.inventoryStock)) data.inventoryStock = defaultInventory();
  const found = data.inventoryStock.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (found) {
    if (!found.kind) found.kind = kind;
    return found.name;
  }
  data.inventoryStock.push({ id: uid(), name, start: 0, kind });
  return name;
}

function seedCoalItem(data, name) {
  if (!Array.isArray(data.coalStock)) data.coalStock = [];
  const found = data.coalStock.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (found) return found.name;
  data.coalStock.push({ id: uid(), name, start: 0 });
  return name;
}

function applyStartInvoices(data, venueId) {
  if (!data || venueId !== "tangiers" || data.invoicesFromStartV1) return data;
  if (!Array.isArray(data.tobacco)) data.tobacco = [];
  const supplier = "Rotana";
  const add = (row) => data.tobacco.push({ id: uid(), supplier, ...row });
  const tobacco = (date, check, group, product, qty, sum) => add({
    kind: "tobacco",
    group,
    date,
    product,
    qty,
    sum,
    note: `чек ${check}`,
  });
  const inventory = (date, check, name, qty, sum, kind = "item") => add({
    kind: "inventory",
    date,
    product: seedStockItem(data, name, kind),
    qty,
    sum,
    note: check ? `чек ${check}` : "скрин без номера чека",
  });
  const coal = (date, check, name, packs, sum) => {
    const product = seedCoalItem(data, name);
    add({
      kind: "coal",
      date,
      product,
      packs,
      perPack: DEFAULT_COALS_PER_PACK,
      qty: packs * DEFAULT_COALS_PER_PACK,
      sum,
      note: `чек ${check} · ${packs} пач. × ${DEFAULT_COALS_PER_PACK} шт`,
    });
  };

  // 72389 — 28.08, только инвентарь/чаши
  inventory("2026-08-28", "72389", "Чаша D-Shot", 15, 3375000, "bowl");
  inventory("2026-08-28", "72389", "Чаша HYPE", 7, 1015000, "bowl");
  inventory("2026-08-28", "72389", "Чаша Облако SOLO", 3, 405000, "bowl");
  inventory("2026-08-28", "72389", "Чаша Облако M/L/BLACK", 5, 725000, "bowl");
  inventory("2026-08-28", "72389", "Кадиллак Black", 4, 400000, "bowl");
  inventory("2026-08-28", "72389", "Чаша Alpha Bowl", 3, 390000, "bowl");
  inventory("2026-08-28", "72389", "Калауд Lotus без упаковки", 60, 1800000);
  inventory("2026-08-28", "72389", "Колба Craft", 40, 6000000);

  // 72416 — 29.08, один чек на несколько скринов
  tobacco("2026-08-29", "72416", "classic", "Must have 125g", 500, 540000);
  tobacco("2026-08-29", "72416", "classic", "Must have 250g", 4500, 4590000);
  tobacco("2026-08-29", "72416", "premium", "Bonche 120g", 600, 1875000);
  tobacco("2026-08-29", "72416", "premium", "Jent Cigar 100g", 200, 390000);
  tobacco("2026-08-29", "72416", "classic", "Everest 100g", 800, 1320000);
  tobacco("2026-08-29", "72416", "classic", "Spectrum 200g Hard", 400, 420000);
  tobacco("2026-08-29", "72416", "classic", "Spectrum 200g Prime", 600, 975000);
  tobacco("2026-08-29", "72416", "classic", "NASH R 200g", 800, 960000);
  tobacco("2026-08-29", "72416", "classic", "Palitra 200g", 1600, 1600000);
  tobacco("2026-08-29", "72416", "classic", "Darkside Sabotage 250g", 500, 630000);
  tobacco("2026-08-29", "72416", "classic", "Satyr 100g", 600, 990000);
  tobacco("2026-08-29", "72416", "classic", "Hell 200g", 600, 420000);
  tobacco("2026-08-29", "72416", "classic", "Banger 200g", 1000, 1075000);
  tobacco("2026-08-29", "72416", "classic", "Sarma 200g", 2800, 3150000);
  tobacco("2026-08-29", "72416", "classic", "Deus 250g", 1250, 1250000);
  tobacco("2026-08-29", "72416", "classic", "Северный 200g", 1400, 1610000);
  tobacco("2026-08-29", "72416", "classic", "Darkside 250g", 1250, 1500000);
  tobacco("2026-08-29", "72416", "classic", "Starline 250g", 2000, 1720000);
  tobacco("2026-08-29", "72416", "classic", "Black Burn 200g", 600, 651000);
  tobacco("2026-08-29", "72416", "classic", "Jent 200g", 800, 880000);
  tobacco("2026-08-29", "72416", "classic", "Overdose 200g", 1600, 1904000);
  tobacco("2026-08-29", "72416", "classic", "Sebero Black 200g", 1400, 1540000);
  tobacco("2026-08-29", "72416", "classic", "Sebero classic 200g", 1600, 1640000);
  tobacco("2026-08-29", "72416", "classic", "Sebero ГИД 200g", 400, 440000);
  tobacco("2026-08-29", "72416", "classic", "Sebero Arctic Mix 200g", 200, 205000);
  tobacco("2026-08-29", "72416", "classic", "Oven 200g", 1000, 950000);
  tobacco("2026-08-29", "72416", "classic", "Hooligan POP/Classic 200g", 1800, 1710000);
  tobacco("2026-08-29", "72416", "classic", "Hooligan Hard 200g", 1200, 1200000);
  inventory("2026-08-29", "72416", "Калауд Alpha SILVER", 1, 450000);
  inventory("2026-08-29", "72416", "Калауд Alpha Gold", 1, 500000);
  coal("2026-08-29", "72416", "BigMaks GO 25mm", 15, 975000);
  inventory("2026-08-29", "72416", "Мундштуки одноразовые", 30, 270000);
  inventory("2026-08-29", "72416", "Ершик для шахты тонкий", 2, 70000);
  inventory("2026-08-29", "72416", "Щипцы Blade R", 3, 105000);
  inventory("2026-08-29", "72416", "Щипцы Alpha R", 2, 100000);
  inventory("2026-08-29", "72416", "Ершик для колбы", 3, 105000);
  inventory("2026-08-29", "72416", "Колпак Black", 1, 120000);
  inventory("2026-08-29", "72416", "Колпак хром", 1, 95000);
  inventory("2026-08-29", "72416", "Шило Пластик", 5, 75000);
  inventory("2026-08-29", "72416", "Доска Darkside", 1, 280000);
  inventory("2026-08-29", "72416", "Коврик Darkside", 1, 280000);

  // 72418 — 29.08
  tobacco("2026-08-29", "72418", "premium", "Bonche 80g", 80, 245000);
  tobacco("2026-08-29", "72418", "premium", "Trofimoff's Burley / No Aroma 125g", 125, 230000);

  // 72675 — 05.09
  coal("2026-09-05", "72675", "Cocoloco 25 mm", 60, 4380000);

  // 73015 — 12.09, один чек на несколько скринов
  tobacco("2026-09-12", "73015", "classic", "Darkside Xperince 250g", 1500, 1800000);
  tobacco("2026-09-12", "73015", "classic", "Overdose 200g", 2200, 2618000);
  inventory("2026-09-12", "73015", "Коврик Darkside", 1, 280000);
  tobacco("2026-09-12", "73015", "classic", "Sebero classic 200g", 200, 205000);
  tobacco("2026-09-12", "73015", "classic", "Deus 250g", 1250, 1250000);
  inventory("2026-09-12", "73015", "Фольга Small", 1, 35000);
  tobacco("2026-09-12", "73015", "premium", "Jent Cigar 100g", 400, 780000);
  tobacco("2026-09-12", "73015", "classic", "Darkside Sabotage 250g", 500, 630000);
  tobacco("2026-09-12", "73015", "classic", "Darkside 250g", 3750, 4500000);
  tobacco("2026-09-12", "73015", "classic", "Starline 250g", 4500, 3870000);
  tobacco("2026-09-12", "73015", "classic", "Sarma 200g", 1800, 2025000);
  tobacco("2026-09-12", "73015", "classic", "Северный 200g", 1600, 1840000);
  tobacco("2026-09-12", "73015", "premium", "Trofimoff's Burley / No Aroma 125g", 250, 460000);
  tobacco("2026-09-12", "73015", "classic", "Everest 100g", 200, 330000);
  tobacco("2026-09-12", "73015", "classic", "Palitra 200g", 200, 200000);
  tobacco("2026-09-12", "73015", "classic", "NASH R 200g", 800, 960000);
  tobacco("2026-09-12", "73015", "classic", "Must have 125g", 625, 675000);
  tobacco("2026-09-12", "73015", "classic", "Black Burn 200g", 2200, 2387000);
  tobacco("2026-09-12", "73015", "classic", "Jent 200g", 200, 220000);
  inventory("2026-09-12", "73015", "Чаша Облако M/L/BLACK", 8, 1200000, "bowl");
  inventory("2026-09-12", "73015", "Колба Craft", 1, 160000);

  // Tangiers AST — 12.09
  add({
    kind: "tobacco",
    group: "tangiers",
    date: "2026-09-12",
    product: "TANGIERS 250g",
    qty: 2500,
    sum: 135000,
    supplier: "Склад Мангилик Rotana",
    note: "док 4493705665 · 135000 тг",
  });

  // 73366 — 22.09
  tobacco("2026-09-22", "73366", "classic", "Darkside 250g", 1750, 2100000);
  tobacco("2026-09-22", "73366", "classic", "Must have 125g", 500, 540000);
  tobacco("2026-09-22", "73366", "classic", "Must have 250g", 1750, 1785000);
  tobacco("2026-09-22", "73366", "classic", "Overdose 200g", 1000, 1190000);
  tobacco("2026-09-22", "73366", "classic", "NASH R 200g", 600, 720000);
  tobacco("2026-09-22", "73366", "classic", "Black Burn 200g", 1000, 1085000);
  tobacco("2026-09-22", "73366", "classic", "Starline 250g", 2000, 1720000);
  tobacco("2026-09-22", "73366", "classic", "Sebero ГИД 200g", 800, 880000);
  tobacco("2026-09-22", "73366", "classic", "Sebero Black 200g", 800, 880000);
  tobacco("2026-09-22", "73366", "classic", "Sebero classic 200g", 200, 205000);

  // 73442 — 23.09
  inventory("2026-09-23", "73442", "Мундштуки одноразовые", 30, 270000);

  // 73738 — 02.10
  coal("2026-10-02", "73738", "Cocoloco 25 mm", 80, 5840000);

  // 740047 — 10.10, один чек на несколько скринов
  tobacco("2026-10-10", "740047", "classic", "Spectrum 200g Hard", 200, 210000);
  tobacco("2026-10-10", "740047", "classic", "Must have 250g", 2250, 2295000);
  tobacco("2026-10-10", "740047", "classic", "Must have 125g", 500, 540000);
  tobacco("2026-10-10", "740047", "classic", "Palitra 200g", 1200, 1200000);
  tobacco("2026-10-10", "740047", "classic", "Sarma 200g", 2400, 2700000);
  tobacco("2026-10-10", "740047", "classic", "Darkside 250g", 3250, 3900000);
  tobacco("2026-10-10", "740047", "classic", "Overdose 200g", 600, 714000);
  tobacco("2026-10-10", "740047", "classic", "Северный 200g", 2400, 2760000);
  tobacco("2026-10-10", "740047", "classic", "Deus 250g", 1250, 1250000);
  tobacco("2026-10-10", "740047", "premium", "Bonche 80g", 80, 245000);
  tobacco("2026-10-10", "740047", "classic", "Sebero Black 200g", 1000, 1100000);
  tobacco("2026-10-10", "740047", "classic", "Sebero classic 200g", 2200, 2255000);
  tobacco("2026-10-10", "740047", "classic", "Sebero ГИД 200g", 200, 220000);
  tobacco("2026-10-10", "740047", "classic", "Starline 250g", 1750, 1505000);
  tobacco("2026-10-10", "740047", "classic", "Black Burn 200g", 600, 651000);
  tobacco("2026-10-10", "740047", "classic", "Jent 200g", 400, 440000);
  tobacco("2026-10-10", "740047", "classic", "Oven 200g", 200, 190000);
  tobacco("2026-10-10", "740047", "classic", "Hooligan POP/Classic 200g", 400, 380000);
  tobacco("2026-10-10", "740047", "classic", "Darkside Sabotage 250g", 1000, 1260000);

  // 740051 — 10.10
  inventory("2026-10-10", "740051", "Мундштуки одноразовые", 30, 270000);

  // Скрин без шапки, дата файла 10.10
  inventory("2026-10-10", "", "Ершик для колбы Black", 1, 45000);

  data.invoicesFromStartV1 = true;
  return data;
}

function shiftOpeningDate(data, venueId) {
  if (!data || data.startFromAug28V1) return data;
  const oldOpen = "2026-10-01";
  if (!Array.isArray(data.revisions) || !data.revisions.length) {
    data.revisions = [emptyOpening(venueId)];
  } else {
    data.revisions = data.revisions.map((rev) => (
      rev.date === oldOpen ? { ...rev, date: OPENING_DATE } : rev
    ));
    if (!data.revisions.some((rev) => rev.date === OPENING_DATE)) {
      data.revisions.unshift(emptyOpening(venueId));
    }
  }
  data.startFromAug28V1 = true;
  return data;
}

function resetStock(data, venueId) {
  if (!data || data.freshStockV1) return data;
  data.tobacco = [];
  data.hookahSales = [];
  data.revisions = [emptyOpening(venueId)];
  data.inventoryStock = defaultInventory();
  data.coalStock = [];
  data.openingV1 = true;
  data.shishkaOpenV2 = true;
  data.invoicesV1 = true;
  data.invoicesV2 = true;
  data.revisionGroupsV1 = true;
  data.freshStockV1 = true;
  return data;
}

function normalizeVenue(data, venueId) {
  const base = emptyState(venueId);
  if (!data || typeof data !== "object") {
    return resetStock(applyConsumption(base), venueId);
  }
  const venue = {
    employees: data.employees?.length ? data.employees : base.employees,
    schedule: data.schedule || {},
    extras: data.extras || {},
    rates: { ...DEFAULT_RATES, ...(data.rates || {}) },
    tobacco: data.tobacco || [],
    revisions: data.revisions || [],
    inventoryStock: data.inventoryStock?.length ? data.inventoryStock : base.inventoryStock,
    coalStock: Array.isArray(data.coalStock) ? data.coalStock : [],
    fines: data.fines || [],
    hookahSales: data.hookahSales || [],
    gramsPerHookah: Number(data.gramsPerHookah) || DEFAULT_GRAMS_PER_HOOKAH,
    coalsPerHookah: Number(data.coalsPerHookah) || DEFAULT_COALS_PER_HOOKAH,
    coalsPerPack: Number(data.coalsPerPack) || DEFAULT_COALS_PER_PACK,
    staffPerDay: Number(data.staffPerDay ?? DEFAULT_STAFF_PER_DAY),
    consumptionV1: Boolean(data.consumptionV1),
    checklist: data.checklist?.items
      ? {
          tableNo: data.checklist.tableNo || "20",
          copies: Number(data.checklist.copies) || 60,
          items: data.checklist.items,
        }
      : base.checklist,
    openingV1: Boolean(data.openingV1),
    shishkaOpenV2: Boolean(data.shishkaOpenV2),
    invoicesV1: Boolean(data.invoicesV1),
    invoicesV2: Boolean(data.invoicesV2),
    revisionGroupsV1: Boolean(data.revisionGroupsV1),
    freshStockV1: Boolean(data.freshStockV1),
    startFromAug28V1: Boolean(data.startFromAug28V1),
    invoicesFromStartV1: Boolean(data.invoicesFromStartV1),
    monthlyCountV1: Boolean(data.monthlyCountV1),
  };
  return applyMonthlyCount(applyStartInvoices(
    shiftOpeningDate(resetStock(applyConsumption(venue), venueId), venueId),
    venueId
  ));
}

function applyMonthlyCount(data) {
  if (!data || data.monthlyCountV1) return data;
  data.staffPerDay = 0;
  data.monthlyCountV1 = true;
  return data;
}

function loadDb() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw?.venues) {
      return {
        current: VENUES[raw.current] ? raw.current : "tangiers",
        venues: {
          tangiers: normalizeVenue(raw.venues.tangiers, "tangiers"),
          shishka: normalizeVenue(raw.venues.shishka, "shishka"),
        },
      };
    }
    const old = JSON.parse(localStorage.getItem(OLD_KEY));
    return {
      current: "tangiers",
      venues: {
        tangiers: normalizeVenue(old, "tangiers"),
        shishka: normalizeVenue({}, "shishka"),
      },
    };
  } catch {
    return {
      current: "tangiers",
      venues: {
        tangiers: normalizeVenue({}, "tangiers"),
        shishka: normalizeVenue({}, "shishka"),
      },
    };
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
}

function venueName() {
  return VENUES[db.current];
}

function setVenue(id) {
  if (!VENUES[id]) return;
  db.current = id;
  if (!db.venues[id]) db.venues[id] = emptyState(id);
  state = db.venues[id];
  save();
  syncVenueUi();
  render();
}

function syncVenueUi() {
  document.body.dataset.venue = db.current;
  $("#venueEyebrow").textContent = venueName();
  $$(".venue").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.venue === db.current);
  });
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseISODate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function periodKey() {
  return `${monthKey(viewMonth)}-h${half}`;
}

function lastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function periodDays() {
  const last = lastDayOfMonth(viewMonth);
  const start = half === 0 ? 1 : 16;
  const end = half === 0 ? Math.min(15, last) : last;
  const days = [];
  for (let d = start; d <= end; d += 1) {
    days.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
  }
  return days;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 5 || day === 6;
}

function shiftClass(type, date) {
  if (type === "morning") return "morning";
  if (type === "intern") return "intern";
  if (type === "eveningWe") return "evening-we";
  if (type === "evening") return isWeekend(date) ? "evening-we" : "evening-wd";
  return "";
}

function formatSum(n) {
  return Number(n || 0).toLocaleString("ru-RU");
}

function unique(list, field) {
  return [...new Set(list.map((x) => x[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
}

function fillDatalist(id, values) {
  $(id).innerHTML = values.map((v) => `<option value="${escapeHtml(v)}"></option>`).join("");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inCurrentPeriod(iso) {
  if (!iso) return false;
  const d = parseISODate(iso);
  const days = periodDays();
  return d >= days[0] && d <= days[days.length - 1];
}

function ensureInventory() {
  if (!Array.isArray(state.inventoryStock) || !state.inventoryStock.length) {
    state.inventoryStock = defaultInventory();
  }
  state.inventoryStock.forEach((item) => {
    item.kind = stockKind(item);
  });
  if (!Array.isArray(state.fines)) state.fines = [];
  return state.inventoryStock;
}

function ensureCoalStock() {
  if (!Array.isArray(state.coalStock)) state.coalStock = [];
  (state.tobacco || [])
    .filter((row) => row.kind === "coal" && (row.product || "").trim())
    .forEach((row) => {
      const name = row.product.trim();
      if (!state.coalStock.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
        state.coalStock.push({ id: uid(), name, start: 0 });
      }
    });
  return state.coalStock;
}

function ensureStockItem(name, kind = "item") {
  const stock = ensureInventory();
  const found = stock.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (found) {
    if (!found.kind) found.kind = kind;
    return found;
  }
  const created = { id: uid(), name, start: 0, kind };
  stock.push(created);
  return created;
}

function ensureCoalItem(name) {
  const stock = ensureCoalStock();
  const found = stock.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (found) return found;
  const created = { id: uid(), name, start: 0 };
  stock.push(created);
  return created;
}

function incomingQtyFor(name, kind = "inventory") {
  return (state.tobacco || [])
    .filter((t) => (t.kind || "tobacco") === kind && t.product.toLowerCase() === name.toLowerCase())
    .reduce((sum, t) => sum + Number(t.qty || 0), 0);
}

function fineQtyFor(name) {
  return (state.fines || [])
    .filter((f) => f.what.toLowerCase() === name.toLowerCase())
    .reduce((sum, f) => sum + Number(f.qty || 0), 0);
}

function finesForEmp(empId) {
  return (state.fines || []).filter((f) => f.empId === empId && inCurrentPeriod(f.date));
}

function damageTotal(empId) {
  const items = finesForEmp(empId);
  if (items.length) return items.reduce((sum, f) => sum + Number(f.sum || 0), 0);
  return Number(extrasFor(empId).damage || 0);
}

function extrasFor(empId) {
  const key = periodKey();
  if (!state.extras[key]) state.extras[key] = {};
  if (!state.extras[key][empId]) {
    state.extras[key][empId] = { fines: 0, advances: 0, damage: 0 };
  }
  return state.extras[key][empId];
}

function countShifts(empId) {
  const counts = { morning: 0, eveningWeekday: 0, eveningWeekend: 0, intern: 0 };
  periodDays().forEach((date) => {
    const type = state.schedule[toISODate(date)]?.[empId] || "";
    if (type === "morning") counts.morning += 1;
    if (type === "intern") counts.intern += 1;
    if (type === "eveningWe" || (type === "evening" && isWeekend(date))) {
      counts.eveningWeekend += 1;
    } else if (type === "evening") {
      counts.eveningWeekday += 1;
    }
  });
  return counts;
}

function payout(empId) {
  const c = countShifts(empId);
  const extra = extrasFor(empId);
  return (
    c.morning * state.rates.morning +
    c.eveningWeekday * state.rates.eveningWeekday +
    c.eveningWeekend * state.rates.eveningWeekend +
    c.intern * state.rates.intern -
    Number(extra.fines || 0) -
    Number(extra.advances || 0) -
    damageTotal(empId)
  );
}

function renderPeriod() {
  const days = periodDays();
  const first = days[0];
  const last = days[days.length - 1];
  $("#periodRange").textContent = `${MONTHS_RU[viewMonth.getMonth()]} ${first.getDate()}–${last.getDate()}`;
  $("#periodTitle").textContent = `${venueName()} · ${MONTHS_RU[viewMonth.getMonth()]} ${viewMonth.getFullYear()}`;
}

function renderRates() {
  $("#ratesBox").innerHTML = `
    <label class="rate morning">Утро, сум
      <input type="number" min="0" step="1000" data-rate="morning" value="${state.rates.morning}">
    </label>
    <label class="rate intern">Стажировка, сум
      <input type="number" min="0" step="1000" data-rate="intern" value="${state.rates.intern}">
    </label>
    <label class="rate evening-wd">Вечер будни, сум
      <input type="number" min="0" step="1000" data-rate="eveningWeekday" value="${state.rates.eveningWeekday}">
    </label>
    <label class="rate evening-we">Вечер выходные, сум
      <input type="number" min="0" step="1000" data-rate="eveningWeekend" value="${state.rates.eveningWeekend}">
    </label>
  `;
}

function renderRoster() {
  const days = periodDays();
  const head = `
    <tr>
      <th class="name">${MONTHS_RU[viewMonth.getMonth()]}</th>
      ${days.map((d) => `<th>${d.getDate()}</th>`).join("")}
    </tr>
  `;
  const body = state.employees.map((emp) => `
    <tr>
      <th class="name">
        ${escapeHtml(emp.name)}
        <button type="button" class="emp-remove" data-del-emp="${emp.id}">удалить</button>
      </th>
      ${days.map((date) => {
        const iso = toISODate(date);
        const type = state.schedule[iso]?.[emp.id] || "";
        const cls = shiftClass(type, date);
        return `<td><button type="button" class="cell ${cls}" data-emp="${emp.id}" data-day="${iso}">${SHIFT_LABEL[type]}</button></td>`;
      }).join("")}
    </tr>
  `).join("");

  $("#rosterWrap").innerHTML = `<table class="roster"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function renderPay() {
  const rows = state.employees.map((emp) => {
    const c = countShifts(emp.id);
    const extra = extrasFor(emp.id);
    return `
      <tr>
        <th class="name">${escapeHtml(emp.name)}</th>
        <td>${c.morning}</td>
        <td>${c.eveningWeekday}</td>
        <td>${c.eveningWeekend}</td>
        <td>${c.intern}</td>
        <td><input type="number" min="0" step="1000" inputmode="numeric" value="${extra.fines || 0}" data-emp-extra="${emp.id}" data-field="fines"></td>
        <td><input type="number" min="0" step="1000" inputmode="numeric" value="${extra.advances || 0}" data-emp-extra="${emp.id}" data-field="advances"></td>
        <td>${formatSum(damageTotal(emp.id))}</td>
        <td class="sum">${formatSum(payout(emp.id))}</td>
      </tr>
    `;
  }).join("");

  $("#payWrap").innerHTML = `
    <table class="pay">
      <thead>
        <tr>
          <th class="name">Сотрудник</th>
          <th>Утро</th>
          <th>Вечер будние</th>
          <th>Вечер выходные</th>
          <th>Стажировка</th>
          <th>Штрафы</th>
          <th>Авансы</th>
          <th>Порча</th>
          <th>К выплате</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderFines() {
  const days = periodDays();
  const rows = (state.fines || [])
    .filter((f) => inCurrentPeriod(f.date))
    .sort((a, b) => b.date.localeCompare(a.date));
  const empSelect = $("#fineEmpSelect");
  if (empSelect) {
    empSelect.innerHTML = state.employees
      .map((emp) => `<option value="${emp.id}">${escapeHtml(emp.name)}</option>`)
      .join("");
  }
  const dateInput = document.querySelector('#fineForm [name="date"]');
  if (dateInput && !dateInput.value) dateInput.value = toISODate(new Date());
  fillDatalist("#fineWhatList", ensureInventory().map((item) => item.name));

  if (!rows.length) {
    $("#fineList").innerHTML = `<p class="empty">Порчи за ${days[0].getDate()}–${days[days.length - 1].getDate()} число пока нет</p>`;
    return;
  }
  $("#fineList").innerHTML = rows.map((f) => {
    const emp = state.employees.find((e) => e.id === f.empId);
    return `
      <article class="card item">
        <div class="item-head">
          <h3>${escapeHtml(emp?.name || "Сотрудник")}</h3>
          <button type="button" class="danger" data-del-fine="${f.id}">Удалить</button>
        </div>
        <p class="meta">
          ${parseISODate(f.date).toLocaleDateString("ru-RU")} · ${escapeHtml(f.what)} · ${f.qty} шт
          · ${formatSum(f.sum)}
        </p>
      </article>
    `;
  }).join("");
}

function renderShifts() {
  renderPeriod();
  renderRates();
  renderRoster();
  renderPay();
  renderFines();
  if (!$("#reportView")?.hidden) renderReport();
}

function reportPeriodLabel() {
  const days = periodDays();
  return `${MONTHS_RU[viewMonth.getMonth()]} ${days[0].getDate()}–${days[days.length - 1].getDate()} ${viewMonth.getFullYear()}`;
}

function renderReport() {
  const paper = $("#reportPaper");
  if (!paper) return;
  const days = periodDays();
  const rosterHead = `
    <tr>
      <th class="name">${MONTHS_RU[viewMonth.getMonth()]}</th>
      ${days.map((d) => `<th>${d.getDate()}</th>`).join("")}
    </tr>
  `;
  const rosterBody = state.employees.map((emp) => `
    <tr>
      <th class="name">${escapeHtml(emp.name)}</th>
      ${days.map((date) => {
        const type = state.schedule[toISODate(date)]?.[emp.id] || "";
        const cls = shiftClass(type, date);
        const mark = type === "morning" ? "У" : type === "intern" ? "С" : type ? "В" : "/";
        return `<td><span class="cell ${cls}">${mark}</span></td>`;
      }).join("")}
    </tr>
  `).join("");

  const payRows = state.employees.map((emp) => {
    const c = countShifts(emp.id);
    const extra = extrasFor(emp.id);
    return `
      <tr>
        <th class="name">${escapeHtml(emp.name)}</th>
        <td>${c.morning}</td>
        <td>${c.eveningWeekday}</td>
        <td>${c.eveningWeekend}</td>
        <td>${c.intern}</td>
        <td>${formatSum(extra.fines || 0)}</td>
        <td>${formatSum(extra.advances || 0)}</td>
        <td>${formatSum(damageTotal(emp.id))}</td>
      </tr>
    `;
  }).join("");

  const lateFines = state.employees
    .map((emp) => ({ name: emp.name, sum: Number(extrasFor(emp.id).fines || 0) }))
    .filter((row) => row.sum > 0);
  const damages = (state.fines || [])
    .filter((f) => inCurrentPeriod(f.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const lateTotal = lateFines.reduce((sum, row) => sum + row.sum, 0);
  const damageSum = damages.reduce((sum, f) => sum + Number(f.sum || 0), 0);
  const advanceTotal = state.employees.reduce((sum, emp) => sum + Number(extrasFor(emp.id).advances || 0), 0);

  const lateTable = lateFines.length
    ? `<section class="report-fines">
        <h2>Штрафы</h2>
        <table class="pay report-table">
          <thead><tr><th class="name">Сотрудник</th><th>Штраф</th></tr></thead>
          <tbody>
            ${lateFines.map((row) => `<tr><th class="name">${escapeHtml(row.name)}</th><td class="sum">${formatSum(row.sum)}</td></tr>`).join("")}
            <tr><th class="name">Итого</th><td class="sum">${formatSum(lateTotal)}</td></tr>
          </tbody>
        </table>
      </section>`
    : "";

  const damageTable = damages.length
    ? `<section class="report-damage">
        <h2>Порча</h2>
        <table class="pay report-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th class="name">Сотрудник</th>
              <th class="name">Что</th>
              <th>Шт</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${damages.map((f) => {
              const emp = state.employees.find((e) => e.id === f.empId);
              return `<tr>
                <td>${parseISODate(f.date).toLocaleDateString("ru-RU")}</td>
                <th class="name">${escapeHtml(emp?.name || "Сотрудник")}</th>
                <th class="name">${escapeHtml(f.what)}</th>
                <td>${f.qty}</td>
                <td class="sum">${formatSum(f.sum)}</td>
              </tr>`;
            }).join("")}
            <tr><th colspan="4" class="name">Итого</th><td class="sum">${formatSum(damageSum)}</td></tr>
          </tbody>
        </table>
      </section>`
    : "";

  paper.innerHTML = `
    <header class="report-head">
      <h1>${escapeHtml(venueName())} · ${reportPeriodLabel()}</h1>
      <p class="report-rates">
        Утро ${formatSum(state.rates.morning)} ·
        будни ${formatSum(state.rates.eveningWeekday)} ·
        пт–вс ${formatSum(state.rates.eveningWeekend)} ·
        стаж ${formatSum(state.rates.intern)}
      </p>
    </header>

    <div class="excel-card report-roster">
      <table class="roster" style="--rows:${state.employees.length}"><thead>${rosterHead}</thead><tbody>${rosterBody}</tbody></table>
    </div>

    <div class="excel-card report-pay">
      <table class="pay" style="--rows:${state.employees.length + 1}">
        <thead>
          <tr>
            <th class="name">Сотрудник</th>
            <th>Утро</th>
            <th>Будни</th>
            <th>Пт–вс</th>
            <th>Стаж</th>
            <th>Штрафы</th>
            <th>Авансы</th>
            <th>Порча</th>
          </tr>
        </thead>
        <tbody>
          ${payRows}
          <tr>
            <th class="name">Итого</th>
            <td></td><td></td><td></td><td></td>
            <td class="sum">${formatSum(lateTotal)}</td>
            <td class="sum">${formatSum(advanceTotal)}</td>
            <td class="sum">${formatSum(damageSum)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="report-split">${lateTable}${damageTable}</div>
  `;
}

function openReport() {
  renderReport();
  const view = $("#reportView");
  if (view) view.hidden = false;
  document.body.classList.add("report-open");
}

function closeReport() {
  const view = $("#reportView");
  if (view) view.hidden = true;
  document.body.classList.remove("report-open", "print-report");
}

function cycleCell(btn) {
  const empId = btn.dataset.emp;
  const iso = btn.dataset.day;
  if (!state.schedule[iso]) state.schedule[iso] = {};
  const current = state.schedule[iso][empId] || "";
  const next = SHIFT_ORDER[(SHIFT_ORDER.indexOf(current) + 1) % SHIFT_ORDER.length];
  if (next) state.schedule[iso][empId] = next;
  else delete state.schedule[iso][empId];
  save();

  const date = parseISODate(iso);
  btn.textContent = SHIFT_LABEL[next];
  btn.className = `cell ${shiftClass(next, date)}`;
  renderPay();
}

function setTodayDefaults() {
  const today = toISODate(new Date());
  document.querySelector('#tobaccoForm [name="date"]').value = today;
  const fineDate = document.querySelector('#fineForm [name="date"]');
  if (fineDate) fineDate.value = today;
  if (!$("#revisionDate").value) $("#revisionDate").value = OPENING_DATE;
  const saleDate = document.querySelector('#saleForm [name="date"]');
  if (saleDate) saleDate.value = today;
  const coalDate = document.querySelector('#coalForm [name="date"]');
  if (coalDate) coalDate.value = today;
  const chefDate = document.querySelector('#chefForm [name="date"]');
  if (chefDate) chefDate.value = today;
  const monthInput = document.querySelector('#monthSaleForm [name="month"]');
  if (monthInput && !monthInput.value) {
    monthInput.value = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}`;
  }
}

function ensureRevision(date) {
  let rev = state.revisions.find((r) => r.date === date);
  if (!rev) {
    const extra = [...new Set(state.revisions.flatMap((r) => r.items.map((i) => i.name)))]
      .filter((name) => !DEFAULT_BRANDS.includes(name));
    rev = {
      date,
      coals: 0,
      items: [...DEFAULT_BRANDS, ...extra].map((name) => ({ name, grams: 0 })),
    };
    state.revisions.push(rev);
    save();
  }
  return rev;
}

function revisionTotal(rev) {
  return rev.items.reduce((sum, item) => sum + Number(item.grams || 0), 0);
}

function gramsPerHookah() {
  return Math.max(1, Number(state.gramsPerHookah) || DEFAULT_GRAMS_PER_HOOKAH);
}

function staffPerDay() {
  return Math.max(0, Number(state.staffPerDay ?? DEFAULT_STAFF_PER_DAY));
}

function todayISO() {
  return toISODate(new Date());
}

function daysOpenInWindow(fromDate) {
  const cap = parseISODate(todayISO());
  const monthStart = new Date(cap.getFullYear(), cap.getMonth(), 1);
  const windowStart = parseISODate(fromDate);
  const start = windowStart > monthStart ? windowStart : monthStart;
  const until = parseISODate(nextRevisionDate(fromDate));
  until.setDate(until.getDate() - 1);
  const end = cap < until ? cap : until;
  if (end < start) return 0;
  return Math.round((end - start) / 86400000) + 1;
}

function staffHookahsInWindow(fromDate) {
  if (db.current !== "tangiers") return 0;
  return daysOpenInWindow(fromDate) * staffPerDay();
}

function saleKindLabel(kind) {
  if (kind === "chef") return "Шеф";
  if (kind === "shortage") return "Недосдача";
  if (kind === "fruit") return "На фрукте";
  if (kind === "month") return "Ушло за месяц";
  if (kind === "staff") return "Стафф";
  return "Продажа";
}

function gramsForKind(kind, hookahs) {
  const n = Math.max(0, Number(hookahs) || 0);
  if (kind === "fruit") return n * FRUIT_GRAMS;
  return n * gramsPerHookah();
}

function coalsForKind(kind, hookahs) {
  const n = Math.max(0, Number(hookahs) || 0);
  if (kind === "fruit") return n * FRUIT_COALS;
  return n * coalsPerHookah();
}

function coalsPerHookah() {
  return Math.max(0, Number(state.coalsPerHookah) || DEFAULT_COALS_PER_HOOKAH);
}

function coalsPerPack() {
  return Math.max(1, Number(state.coalsPerPack) || DEFAULT_COALS_PER_PACK);
}

function addCoalIncome({ date, packs, perPack, note, sum, supplier, product }) {
  const packCount = Math.max(1, Number(packs || 1));
  const inPack = Math.max(1, Number(perPack || coalsPerPack()));
  const name = (product || "").trim() || "Уголь";
  ensureCoalItem(name);
  state.tobacco.push({
    id: uid(),
    kind: "coal",
    date,
    product: name,
    packs: packCount,
    perPack: inPack,
    qty: packCount * inPack,
    supplier: supplier || "",
    sum: Number(sum || 0),
    note: note || `${packCount} пач. × ${inPack} шт`,
  });
}

function coalRows(fromDate) {
  return (state.tobacco || [])
    .filter((row) => row.kind === "coal" && (!fromDate || inRevisionWindow(row.date, fromDate)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function coalMeta(row) {
  const packs = Number(row.packs || 0);
  const perPack = Number(row.perPack || 0);
  const pieces = Number(row.qty || 0);
  if (packs > 0) return `${formatGrams(packs)} пач. × ${formatGrams(perPack || coalsPerPack())} = ${formatGrams(pieces)} шт`;
  return `${formatGrams(pieces)} шт`;
}

function normalizeName(name) {
  return String(name || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function brandGroup(name) {
  const n = normalizeName(name).replace(/\s+/g, " ");
  if (["classic", "premium", "tangiers"].includes(n)) return n;
  if (n.includes("tangiers") || n === "tng" || n.startsWith("tng ") || n.includes("танж")) {
    return "tangiers";
  }
  if (PREMIUM_BRANDS.some((brand) => n.includes(brand))) return "premium";
  if (/\+|plus|премиум|^premium$/.test(n) || n.includes("smoke break+") || n.includes("break plus")) {
    return "premium";
  }
  if (n.includes("classic") || n.includes("классик") || n.includes("smoke break") || n.includes("smokebrush") || n.includes("smoke brush")) {
    return "classic";
  }
  return "classic";
}

function groupTitle(id) {
  return SALE_GROUPS.find((group) => group.id === id)?.title || id;
}

function nextRevisionDate(fromDate) {
  return (state.revisions || [])
    .map((rev) => rev.date)
    .filter((date) => date > fromDate)
    .sort()[0] || "9999-12-31";
}

function inRevisionWindow(iso, fromDate) {
  return iso >= fromDate && iso < nextRevisionDate(fromDate);
}

function salesForGroup(groupId, fromDate) {
  return (state.hookahSales || []).filter((sale) =>
    brandGroup(sale.product) === groupId && inRevisionWindow(sale.date, fromDate)
  );
}

function saleGrams(sale) {
  if (sale.grams != null && sale.grams !== "") return Number(sale.grams || 0);
  return gramsForKind(sale.kind || "sale", sale.hookahs);
}

function saleCoals(sale) {
  if (sale.coals != null && sale.coals !== "") return Number(sale.coals || 0);
  return coalsForKind(sale.kind || "sale", sale.hookahs);
}

function soldGramsForGroup(groupId, fromDate) {
  const recorded = salesForGroup(groupId, fromDate).reduce((sum, sale) => sum + saleGrams(sale), 0);
  const staff = groupId === "classic" ? staffHookahsInWindow(fromDate) * gramsPerHookah() : 0;
  return recorded + staff;
}

function soldHookahsForGroup(groupId, fromDate) {
  return Math.round(soldGramsForGroup(groupId, fromDate) / gramsPerHookah());
}

function rowGroup(row) {
  return row.group || brandGroup(row.product);
}

function incomeGramsForGroup(groupId, fromDate) {
  return (state.tobacco || [])
    .filter((row) => (row.kind || "tobacco") === "tobacco"
      && rowGroup(row) === groupId
      && row.date >= fromDate
      && row.date < nextRevisionDate(fromDate))
    .reduce((sum, row) => sum + Number(row.qty || 0), 0);
}

function snapshotGramsForGroup(rev, groupId) {
  return rev.items
    .filter((item) => brandGroup(item.name) === groupId)
    .reduce((sum, item) => sum + Number(item.grams || 0), 0);
}

function remainGroup(rev, groupId, fromDate) {
  return snapshotGramsForGroup(rev, groupId)
    + incomeGramsForGroup(groupId, fromDate)
    - soldGramsForGroup(groupId, fromDate);
}

function soldHookahsTotal(fromDate) {
  const recorded = (state.hookahSales || [])
    .filter((sale) => inRevisionWindow(sale.date, fromDate))
    .reduce((sum, sale) => sum + Number(sale.hookahs || 0), 0);
  return recorded + staffHookahsInWindow(fromDate);
}

function shortageGramsInWindow(fromDate) {
  return (state.hookahSales || [])
    .filter((sale) => sale.kind === "shortage" && inRevisionWindow(sale.date, fromDate))
    .reduce((sum, sale) => sum + saleGrams(sale), 0);
}

function saleCard(sale) {
  const extra = sale.kind === "shortage"
    ? ` · как ${sale.shortAs === "fruit" ? "фрукт" : "шеф"}`
    : "";
  const fruitClass = sale.kind === "fruit" ? " group-fruit" : "";
  const shortClass = sale.kind === "shortage" ? " group-shortage" : "";
  return `
    <article class="card item group-${brandGroup(sale.product)}${fruitClass}${shortClass}">
      <div class="item-head">
        <h3>${escapeHtml(saleKindLabel(sale.kind))} · ${escapeHtml(groupTitle(brandGroup(sale.product)))} · ${formatGrams(saleGrams(sale))} г</h3>
        <button type="button" class="danger" data-del-sale="${sale.id}">Удалить</button>
      </div>
      <p class="meta">
        ${parseISODate(sale.date).toLocaleDateString("ru-RU")}
        · −${formatGrams(saleGrams(sale))} г
        · −${formatGrams(saleCoals(sale))} шт угля${extra}
      </p>
    </article>
  `;
}

function incomeCoals(fromDate) {
  return (state.tobacco || [])
    .filter((row) => row.kind === "coal"
      && row.date >= fromDate
      && row.date < nextRevisionDate(fromDate))
    .reduce((sum, row) => sum + Number(row.qty || 0), 0);
}

function remainCoals(rev, fromDate) {
  const used = (state.hookahSales || [])
    .filter((sale) => inRevisionWindow(sale.date, fromDate))
    .reduce((sum, sale) => sum + saleCoals(sale), 0);
  return Number(rev.coals || 0)
    + incomeCoals(fromDate)
    - used
    - staffHookahsInWindow(fromDate) * coalsPerHookah();
}

function stockNow(item) {
  return Number(item.start || 0) + incomingQtyFor(item.name) - fineQtyFor(item.name);
}

function coalNow(item) {
  return Number(item.start || 0) + incomingQtyFor(item.name, "coal");
}

function namedCoalOpening() {
  return ensureCoalStock().reduce((sum, item) => sum + Number(item.start || 0), 0);
}

function syncOpeningCoals() {
  const opening = (state.revisions || []).find((rev) => rev.date === OPENING_DATE);
  if (!opening || !ensureCoalStock().length) return;
  opening.coals = namedCoalOpening();
}

function stockUnit(item) {
  return isMouthpiece(item.name) ? "пач." : "шт";
}

function isEmptyRevision(rev) {
  if (!rev) return true;
  if (rev.date === OPENING_DATE) return false;
  return revisionTotal(rev) === 0 && Number(rev.coals || 0) === 0;
}

function pruneEmptyRevisions() {
  if (!Array.isArray(state.revisions)) return;
  const next = state.revisions.filter((rev) => !isEmptyRevision(rev) || rev.date === OPENING_DATE);
  if (next.length !== state.revisions.length) {
    state.revisions = next;
    save();
  }
}

function shownRevision() {
  return (state.revisions || []).find((row) => row.date === shownRevDate)
    || latestRevision(shownRevDate)
    || ensureRevision(OPENING_DATE);
}

function formatGrams(n) {
  return Number(n || 0).toLocaleString("ru-RU");
}

function latestRevision(date) {
  return (state.revisions || [])
    .filter((rev) => rev.date <= date && !isEmptyRevision(rev))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

function renderRevision() {
  resetStock(state, db.current);
  pruneEmptyRevisions();
  const date = $("#revisionDate").value || OPENING_DATE;
  const exact = (state.revisions || []).find((row) => row.date === date && !isEmptyRevision(row));
  const rev = exact || latestRevision(date) || ensureRevision(OPENING_DATE);
  shownRevDate = rev.date;
  const coalKinds = ensureCoalStock();
  const coalKindRows = $("#coalKindRows");
  if (coalKindRows) {
    coalKindRows.innerHTML = coalKinds.map((item) => `
      <label class="sheet-row coals coal-kind">
        <span>${escapeHtml(item.name)} <small>сейчас ${formatGrams(coalNow(item))} шт</small></span>
        <input type="number" min="0" step="1" inputmode="numeric" value="${item.start || 0}" data-coal-start="${item.id}">
      </label>
    `).join("");
  }
  const coalsInputRow = $("#coalsInputRow");
  if (coalsInputRow) coalsInputRow.hidden = coalKinds.length > 0;
  if (coalKinds.length) syncOpeningCoals();
  $("#coalsInput").value = rev.coals || 0;
  if (!Array.isArray(state.hookahSales)) state.hookahSales = [];
  const gramsInput = $("#gramsPerHookah");
  if (gramsInput && document.activeElement !== gramsInput) {
    gramsInput.value = gramsPerHookah();
  }
  const coalsUseInput = $("#coalsPerHookah");
  if (coalsUseInput && document.activeElement !== coalsUseInput) {
    coalsUseInput.value = coalsPerHookah();
  }
  const staffInput = $("#staffPerDay");
  if (staffInput && document.activeElement !== staffInput) {
    staffInput.value = staffPerDay();
  }
  const tangiersMonth = $("#monthTangiersWrap");
  if (tangiersMonth) tangiersMonth.hidden = db.current === "shishka";
  const fruitTangiers = $("#monthFruitTangiersWrap");
  if (fruitTangiers) fruitTangiers.hidden = db.current === "shishka";
  const shortTangiers = document.querySelector('#monthSaleForm [name="shortGroup"] option[value="tangiers"]');
  if (shortTangiers) shortTangiers.hidden = db.current === "shishka";
  const packInput = document.querySelector('#coalForm [name="perPack"]');
  if (packInput && document.activeElement !== packInput) {
    packInput.value = coalsPerPack();
  }
  const snap = rev.date;
  const remainTotal = SALE_GROUPS.reduce((sum, group) => sum + remainGroup(rev, group.id, snap), 0);
  const coalsNow = remainCoals(rev, snap);
  $("#revisionTotal").textContent = formatGrams(revisionTotal(rev));
  $("#revisionRemain").textContent = formatGrams(remainTotal);
  const shortageEl = $("#shortageTotal");
  if (shortageEl) {
    const shortGrams = shortageGramsInWindow(snap);
    shortageEl.textContent = formatGrams(shortGrams);
    const shortageRow = shortageEl.closest(".sheet-row");
    if (shortageRow) shortageRow.hidden = shortGrams <= 0;
  }
  const coalsRemain = $("#coalsRemain");
  if (coalsRemain) {
    coalsRemain.textContent = `${formatGrams(coalsNow)} шт`;
    coalsRemain.classList.toggle("low-stock", coalsNow <= 0);
  }
  const coalsWarn = $("#coalsWarn");
  if (coalsWarn) coalsWarn.hidden = Number(rev.coals || 0) > 0 || coalsNow > 0;
  $("#revisionRows").innerHTML = rev.items.map((item, index) => {
    const remain = remainGroup(rev, brandGroup(item.name), snap);
    return `
    <label class="sheet-row group-${brandGroup(item.name)}">
      <span>${escapeHtml(item.name)} <small>сейчас ${formatGrams(remain)} г</small></span>
      <input type="number" min="0" step="1" inputmode="numeric" value="${item.grams || 0}" data-grams="${index}">
    </label>
  `;
  }).join("");

  const saleGroups = SALE_GROUPS.filter((group) => db.current !== "shishka" || group.id !== "tangiers");
  $("#saleButtons").innerHTML = saleGroups.map((group) => {
    const remain = remainGroup(rev, group.id, snap);
    const sold = soldHookahsForGroup(group.id, snap);
    return `
      <button type="button" class="sale-btn group-${group.id}" data-sale-group="${group.id}">
        <strong>${group.num}. ${group.title}</strong>
        <span>${group.note} · ${gramsPerHookah()} г / ${coalsPerHookah()} угля</span>
        <b class="${remain <= 0 ? "low-stock" : ""}">${formatGrams(remain)} г</b>
        <em>списано ${sold} кальянов</em>
      </button>
    `;
  }).join("") + saleGroups.map((group) => {
    const remain = remainGroup(rev, group.id, snap);
    return `
      <button type="button" class="sale-btn group-${group.id} group-fruit" data-sale-fruit="${group.id}">
        <strong>Фрукт · ${group.title}</strong>
        <span>${FRUIT_GRAMS} г / ${FRUIT_COALS} угля с ${group.title}</span>
        <b class="${remain <= 0 ? "low-stock" : ""}">${formatGrams(remain)} г</b>
        <em>на фрукте</em>
      </button>
    `;
  }).join("");

  const staffDays = daysOpenInWindow(snap);
  const staffHookahs = staffHookahsInWindow(snap);
  const staffBox = $("#staffBox");
  if (staffBox) {
    const staffOnly = db.current === "tangiers";
    staffBox.hidden = !staffOnly || staffPerDay() <= 0;
    staffBox.innerHTML = staffOnly ? `
      <h2>Стафф кальяны</h2>
      <p class="hint">Только Tangiers. Стафф в реальном времени: сегодня ${new Date().getDate()} число — за ${staffDays} дн. этого месяца × ${staffPerDay()} классик = ${staffHookahs} кальянов (−${formatGrams(staffHookahs * gramsPerHookah())} г и −${formatGrams(staffHookahs * coalsPerHookah())} шт угля).</p>
    ` : "";
  }
  const staffInputWrap = $("#staffPerDay")?.closest("label");
  if (staffInputWrap) staffInputWrap.hidden = db.current !== "tangiers";

  const sales = [...state.hookahSales]
    .filter((sale) => inRevisionWindow(sale.date, snap))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const shortages = sales.filter((sale) => sale.kind === "shortage");
  const rest = sales.filter((sale) => sale.kind !== "shortage");
  const shortageList = $("#shortageList");
  if (shortageList) {
    shortageList.innerHTML = shortages.length
      ? `<h2 class="list-heading">Недосдача</h2>${shortages.map(saleCard).join("")}`
      : "";
  }
  if (!rest.length) {
    $("#salesList").innerHTML = shortages.length
      ? ""
      : `<p class="empty">Раз в месяц скинь кальяны, фрукт и недосдачу — с классика, премиума или Tangiers.</p>`;
  } else {
    $("#salesList").innerHTML = (shortages.length ? `<h2 class="list-heading">Ушло за месяц</h2>` : "")
      + rest.map(saleCard).join("");
  }
}

function incomingRows() {
  return (state.tobacco || [])
    .filter((t) => (t.kind || "tobacco") === incomingKind)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function syncIncomeForm() {
  const meta = INCOME[incomingKind];
  $("#incomeTitle").textContent = meta.title;
  $("#incomeHint").textContent = meta.hint;
  $("#productLabelText").textContent = meta.name;
  document.querySelector('#tobaccoForm [name="product"]').placeholder = meta.placeholder;
  $("#qtyLabelText").textContent = meta.qty;
  $$(".income-kind").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.income === incomingKind);
  });
  const kindSelect = $("#incomeKindSelect");
  if (kindSelect) kindSelect.value = incomingKind;
  const stockWrap = $("#stockProductWrap");
  const freeWrap = $("#freeProductWrap");
  const stockSelect = $("#stockProductSelect");
  const productInput = document.querySelector('#tobaccoForm [name="product"]');
  const isInventory = incomingKind === "inventory";
  const isCoal = incomingKind === "coal";
  if (stockWrap) stockWrap.hidden = !isInventory;
  if (freeWrap) freeWrap.hidden = isInventory;
  const groupWrap = $("#tobaccoGroupWrap");
  if (groupWrap) groupWrap.hidden = incomingKind !== "tobacco";
  const submit = $("#tobaccoSubmit");
  if (submit) submit.hidden = incomingKind !== "inventory";
  const tobaccoForm = $("#tobaccoForm");
  if (tobaccoForm) tobaccoForm.hidden = isCoal;
  const coalForm = $("#coalForm");
  if (coalForm) coalForm.hidden = !isCoal;
  if (isInventory && stockSelect && isMouthpiece(stockSelect.value)) {
    $("#qtyLabelText").textContent = "Пачек";
  }
  if (productInput) {
    productInput.required = false;
  }
  if (stockSelect) {
    stockSelect.disabled = !isInventory;
    stockSelect.required = isInventory;
    const stock = ensureInventory();
    const current = stockSelect.value;
    const bowls = stock.filter((item) => stockKind(item) === "bowl");
    const rest = stock.filter((item) => stockKind(item) !== "bowl");
    const option = (item) => {
      const now = stockNow(item);
      return `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)} · сейчас ${now} ${stockUnit(item)}</option>`;
    };
    stockSelect.innerHTML = `
      ${bowls.length ? `<optgroup label="Чаши">${bowls.map(option).join("")}</optgroup>` : ""}
      ${rest.length ? `<optgroup label="Остальное">${rest.map(option).join("")}</optgroup>` : ""}
    `;
    if (current && [...stockSelect.options].some((opt) => opt.value === current)) {
      stockSelect.value = current;
    }
  }
}

function addTobaccoIncome({ date, group, product, qty, sum, supplier, note }) {
  const groupId = SALE_GROUPS.some((item) => item.id === group) ? group : brandGroup(product);
  const name = (product || "").trim() || groupTitle(groupId);
  state.tobacco.push({
    id: uid(),
    kind: "tobacco",
    group: groupId,
    date,
    product: name,
    supplier: supplier || "",
    qty: Number(qty || 0),
    sum: Number(sum || 0),
    note: note || "",
  });
}

function renderIncomeGroups() {
  const box = $("#incomeGroupButtons");
  if (!box) return;
  if (incomingKind !== "tobacco") {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = SALE_GROUPS.filter((group) => db.current !== "shishka" || group.id !== "tangiers").map((group) => {
    const grams = incomingRows()
      .filter((row) => rowGroup(row) === group.id)
      .reduce((sum, row) => sum + Number(row.qty || 0), 0);
    return `
      <button type="button" class="sale-btn group-${group.id}" data-income-group="${group.id}">
        <strong>${group.num}. ${group.title}</strong>
        <span>${group.note}</span>
        <b>${formatGrams(grams)} г</b>
        <em>нажми, чтобы добавить приход</em>
      </button>
    `;
  }).join("");
}

function renderTobacco() {
  syncIncomeForm();
  const meta = INCOME[incomingKind];
  const rows = incomingRows();
  const qty = rows.reduce((sum, t) => sum + Number(t.qty || 0), 0);
  const sum = rows.reduce((s, t) => s + Number(t.sum || 0), 0);
  const last = rows[0]?.date ? parseISODate(rows[0].date).toLocaleDateString("ru-RU") : "—";
  renderIncomeGroups();

  if (incomingKind === "tobacco") {
    $("#tobaccoStats").innerHTML = SALE_GROUPS.filter((group) => db.current !== "shishka" || group.id !== "tangiers").map((group) => {
      const grams = rows
        .filter((row) => rowGroup(row) === group.id)
        .reduce((total, row) => total + Number(row.qty || 0), 0);
      return `<div class="stat group-${group.id}"><span>${group.num}. ${group.title}</span><b>${formatGrams(grams)} г</b></div>`;
    }).join("") + `
      <div class="stat"><span>Всего</span><b>${formatGrams(qty)} г</b></div>
      <div class="stat"><span>Сумма</span><b>${formatSum(sum)}</b></div>
    `;
  } else {
    $("#tobaccoStats").innerHTML = `
      <div class="stat"><span>Поступлений</span><b>${rows.length}</b></div>
      <div class="stat"><span>${meta.qtyStat}</span><b>${formatGrams(qty)}</b></div>
      <div class="stat"><span>Сумма</span><b>${formatSum(sum)}</b></div>
      <div class="stat"><span>Последний приход</span><b>${last}</b></div>
    `;
  }

  if (!rows.length) {
    $("#tobaccoList").innerHTML = `<p class="empty">${incomingKind === "tobacco" ? "Укажи граммы и нажми Классик, Премиум или Tangiers" : meta.empty}</p>`;
  } else {
    $("#tobaccoList").innerHTML = rows.map((t) => {
      const title = incomingKind === "tobacco"
        ? `${groupTitle(rowGroup(t))}${t.product && t.product !== groupTitle(rowGroup(t)) ? ` · ${t.product}` : ""}`
        : t.product;
      const tone = incomingKind === "tobacco" ? `group-${rowGroup(t)}`
        : incomingKind === "coal" ? "group-coal"
        : "group-inventory";
      return `
      <article class="card item ${tone}">
        <div class="item-head">
          <h3>${escapeHtml(title)}</h3>
          <button type="button" class="danger" data-del-tobacco="${t.id}">Удалить</button>
        </div>
        <p class="meta">
          ${parseISODate(t.date).toLocaleDateString("ru-RU")} · ${incomingKind === "coal" ? coalMeta(t) : `${formatGrams(t.qty)} ${meta.unit}`}
          ${t.sum ? ` · ${formatSum(t.sum)}` : ""}
          ${t.supplier ? `<br>${escapeHtml(t.supplier)}` : ""}
          ${t.note ? `<br>${escapeHtml(t.note)}` : ""}
        </p>
      </article>
    `;
    }).join("");
  }

  const names = unique(incomingRows(), "product");
  const extras = incomingKind === "tobacco" ? DEFAULT_BRANDS : incomingKind === "inventory"
    ? ensureInventory().map((item) => item.name)
    : ensureCoalStock().map((item) => item.name);
  fillDatalist("#productsList", [...new Set([...extras, ...names])]);
  fillDatalist("#suppliersList", unique(incomingRows(), "supplier"));
  fillDatalist("#coalNamesList", ensureCoalStock().map((item) => item.name));
  renderInventoryStock();
}

function renderStockRows(items, { restockAttr, startAttr, delAttr, extraCols, colCount = 6 }) {
  if (!items.length) {
    return `<tr><td colspan="${colCount}" class="empty-row">Пока пусто — добавь название ниже</td></tr>`;
  }
  return items.map((item) => {
    const extra = extraCols(item);
    const now = extra.now;
    return `
      <tr class="${now <= 2 ? "low-stock" : ""}">
        <th class="name">${escapeHtml(item.name)}</th>
        <td><input type="number" min="0" step="1" inputmode="numeric" value="${item.start || 0}" ${startAttr}="${item.id}"></td>
        ${extra.mid}
        <td class="sum">${now} ${extra.unit}</td>
        <td>
          <button type="button" class="ghost restock" ${restockAttr}="${escapeHtml(item.name)}">Дозакупить</button>
          <button type="button" class="danger" ${delAttr}="${item.id}">Удалить</button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderInventoryStock() {
  const box = $("#inventoryStock");
  if (!box) return;
  const show = incomingKind === "inventory" || incomingKind === "coal";
  box.hidden = !show;
  if (!show) return;
  if (incomingKind === "coal") {
    const stock = ensureCoalStock();
    box.innerHTML = `
      <h2 class="block-title">Виды угля</h2>
      <div class="excel-card">
        <table class="pay stock-table">
          <thead>
            <tr>
              <th class="name">Название</th>
              <th>Изначально, шт</th>
              <th>Приход, шт</th>
              <th>Сейчас</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${renderStockRows(stock, {
              restockAttr: "data-restock-coal",
              startAttr: "data-coal-start",
              delAttr: "data-del-coal-stock",
              colCount: 5,
              extraCols: (item) => {
                const income = incomingQtyFor(item.name, "coal");
                return {
                  now: coalNow(item),
                  unit: "шт",
                  mid: `<td>${formatGrams(income)}</td>`,
                };
              },
            })}
          </tbody>
        </table>
      </div>
      <form class="add-brand" id="addCoalStockForm">
        <input type="text" name="name" placeholder="Добавить название угля" required>
        <button type="submit" class="primary compact">+</button>
      </form>
      <p class="hint">Продажи кальянов минусуют общий остаток углей в ревизии. Здесь видно, сколько какого вида завезли.</p>
    `;
    return;
  }
  const stock = ensureInventory();
  const bowls = stock.filter((item) => stockKind(item) === "bowl");
  const rest = stock.filter((item) => stockKind(item) !== "bowl");
  const inventoryCols = (item) => {
    const income = incomingQtyFor(item.name);
    const fines = fineQtyFor(item.name);
    return {
      now: stockNow(item),
      unit: stockUnit(item),
      mid: `<td>${income}</td><td>${fines}</td>`,
    };
  };
  const table = (title, items, placeholder, kind) => `
    <h2 class="block-title">${title}</h2>
    <div class="excel-card">
      <table class="pay stock-table">
        <thead>
          <tr>
            <th class="name">Позиция</th>
            <th>Изначально</th>
            <th>Приход</th>
            <th>Порча</th>
            <th>Сейчас</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${renderStockRows(items, {
            restockAttr: "data-restock",
            startAttr: "data-stock-start",
            delAttr: "data-del-stock",
            extraCols: inventoryCols,
          })}
        </tbody>
      </table>
    </div>
    <form class="add-brand add-stock-form" data-stock-kind="${kind}">
      <input type="text" name="name" placeholder="${placeholder}" required>
      <button type="submit" class="primary compact">+</button>
    </form>
  `;
  box.innerHTML = `
    ${table("Чаши", bowls, "Название чаши, например Solaris", "bowl")}
    ${table("Остальной инвентарь", rest, "Добавить позицию, например колба", "item")}
    <p class="hint">Сейчас = изначально + приход − порча. Мундштуки считаются пачками и с кальянов не списываются.</p>
  `;
}

function ensureChecklist() {
  if (!state.checklist || !Array.isArray(state.checklist.items)) {
    state.checklist = defaultChecklist(db.current);
  }
  if (!state.checklist.checklistV2) {
    state.checklist.items = state.checklist.items.map((item) =>
      String(item).replace(/Smoke brush/gi, "Smoke break")
    );
    state.checklist.checklistV2 = true;
    save();
  }
  return state.checklist;
}

function renderChecklistTickets() {
  const list = ensureChecklist();
  const copies = Math.max(1, Math.min(80, Number(list.copies) || 60));
  $("#checklistPrint").innerHTML = Array.from({ length: copies }, (_, i) => `
    <article class="ticket">
      <div class="ticket-head">
        <span class="ticket-num">${i + 1}.</span>
        <span class="ticket-table">Стол <span class="blank"></span></span>
      </div>
      ${list.items.map((item) => `<p class="ticket-line"><span>${escapeHtml(item)}</span><span class="tick"></span></p>`).join("")}
    </article>
  `).join("");
}

function renderChecklistEditor() {
  const list = ensureChecklist();
  $("#copiesInput").value = list.copies || 60;
  $("#checklistItems").innerHTML = list.items.map((item, index) => `
    <label class="sheet-row">
      <input type="text" value="${escapeHtml(item)}" data-check-item="${index}">
      <button type="button" class="danger" data-del-check="${index}">Удалить</button>
    </label>
  `).join("");
}

function renderChecklist() {
  renderChecklistEditor();
  renderChecklistTickets();
}

function render() {
  renderShifts();
  renderRevision();
  renderTobacco();
  renderChecklist();
}

$$(".venue").forEach((btn) => {
  btn.addEventListener("click", () => setVenue(btn.dataset.venue));
});

$$(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".tab").forEach((t) => {
      t.classList.toggle("is-active", t === btn);
      t.setAttribute("aria-selected", t === btn ? "true" : "false");
    });
    $$(".panel").forEach((panel) => {
      const active = panel.id === btn.dataset.tab;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  });
});

$("#prevPeriod").addEventListener("click", () => {
  if (half === 1) {
    half = 0;
  } else {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    half = 1;
  }
  renderShifts();
});

$("#nextPeriod").addEventListener("click", () => {
  if (half === 0) {
    half = 1;
  } else {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    half = 0;
  }
  renderShifts();
});

$("#rosterWrap").addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (cell) cycleCell(cell);
  const del = e.target.closest("[data-del-emp]");
  if (del) {
    const emp = state.employees.find((row) => row.id === del.dataset.delEmp);
    if (!emp || !window.confirm(`Удалить ${emp.name} из табеля?`)) return;
    state.employees = state.employees.filter((row) => row.id !== del.dataset.delEmp);
    save();
    renderShifts();
  }
});

$("#ratesBox").addEventListener("input", (e) => {
  const key = e.target.dataset.rate;
  if (!key) return;
  state.rates[key] = Number(e.target.value || 0);
  save();
  renderPay();
});

$("#payWrap").addEventListener("input", (e) => {
  const empId = e.target.dataset.empExtra;
  const field = e.target.dataset.field;
  if (!empId || !field) return;
  extrasFor(empId)[field] = Number(e.target.value || 0);
  save();
  const row = e.target.closest("tr");
  if (row) row.querySelector(".sum").textContent = formatSum(payout(empId));
});

$("#fineForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const what = data.what.trim();
  ensureStockItem(what);
  if (!Array.isArray(state.fines)) state.fines = [];
  state.fines.push({
    id: uid(),
    empId: data.empId,
    date: data.date,
    what,
    qty: Number(data.qty || 1),
    sum: Number(data.sum || 0),
  });
  extrasFor(data.empId).damage = 0;
  save();
  e.target.reset();
  setTodayDefaults();
  renderShifts();
  if (incomingKind === "inventory") renderInventoryStock();
});

$("#addEmployeeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = new FormData(e.target).get("name").trim();
  if (!name) return;
  state.employees.push({ id: uid(), name });
  save();
  e.target.reset();
  renderShifts();
});

$("#revisionDate").addEventListener("change", () => {
  renderRevision();
});

$("#revisionRows").addEventListener("input", (e) => {
  const index = e.target.dataset.grams;
  if (index == null) return;
  const rev = shownRevision();
  if (!rev?.items[Number(index)]) return;
  rev.items[Number(index)].grams = Number(e.target.value || 0);
  save();
  $("#revisionTotal").textContent = formatGrams(revisionTotal(rev));
  $("#revisionRemain").textContent = formatGrams(
    SALE_GROUPS.reduce((sum, group) => sum + remainGroup(rev, group.id, rev.date), 0)
  );
});

$("#coalsInput").addEventListener("input", (e) => {
  const rev = shownRevision();
  if (!rev) return;
  rev.coals = Number(e.target.value || 0);
  save();
  const remainEl = $("#coalsRemain");
  if (remainEl) {
    const now = remainCoals(rev, rev.date);
    remainEl.textContent = `${formatGrams(now)} шт`;
    remainEl.classList.toggle("low-stock", now <= 0);
  }
  const coalsWarn = $("#coalsWarn");
  if (coalsWarn) coalsWarn.hidden = Number(rev.coals || 0) > 0 || remainCoals(rev, rev.date) > 0;
});

$("#addBrandForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = new FormData(e.target).get("name").trim();
  if (!name) return;
  const rev = shownRevision();
  if (!rev) return;
  if (!rev.items.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    rev.items.push({ name, grams: 0 });
    save();
    renderRevision();
  }
  e.target.reset();
});

$("#saleForm").addEventListener("submit", (e) => e.preventDefault());

$("#gramsPerHookah").addEventListener("input", (e) => {
  state.gramsPerHookah = Math.max(1, Number(e.target.value || DEFAULT_GRAMS_PER_HOOKAH));
  save();
  renderRevision();
});

$("#coalsPerHookah").addEventListener("input", (e) => {
  state.coalsPerHookah = Math.max(0, Number(e.target.value || DEFAULT_COALS_PER_HOOKAH));
  save();
  renderRevision();
});

$("#coalForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const perPack = Math.max(1, Number(data.perPack || coalsPerPack()));
  state.coalsPerPack = perPack;
  addCoalIncome({
    date: data.date || toISODate(new Date()),
    product: (data.product || "").trim(),
    packs: data.packs,
    perPack,
    sum: data.sum,
    note: (data.note || "").trim(),
  });
  save();
  e.target.reset();
  setTodayDefaults();
  incomingKind = "coal";
  renderRevision();
  renderTobacco();
});

function recordSale(groupId, hookahs, date, kind = "sale", extra = {}) {
  if (!Array.isArray(state.hookahSales)) state.hookahSales = [];
  const grams = extra.grams != null ? Number(extra.grams || 0) : null;
  const coals = extra.coals != null ? Number(extra.coals || 0) : null;
  const count = Math.max(0, Number(hookahs) || 0);
  if (!count && !grams && !coals) return;
  state.hookahSales.push({
    id: uid(),
    date,
    product: groupId,
    hookahs: count || (grams ? Math.round(grams / gramsPerHookah()) : 0),
    kind,
    ...(grams != null ? { grams } : {}),
    ...(coals != null ? { coals } : {}),
    ...(extra.batch ? { batch: true } : {}),
    ...(extra.shortAs ? { shortAs: extra.shortAs } : {}),
  });
  save();
  renderRevision();
  if (incomingKind === "inventory") renderInventoryStock();
}

function openSaleConfirm(groupId, hookahs, date, kind = "sale") {
  pendingSale = { groupId, hookahs, date, kind };
  const modal = $("#confirmModal");
  const text = $("#confirmText");
  if (text) {
    text.textContent = `Списать ${saleKindLabel(kind).toLowerCase()} ${hookahs} × ${groupTitle(groupId)}? −${gramsForKind(kind, hookahs)} г и −${coalsForKind(kind, hookahs)} шт угля`;
  }
  if (modal) modal.hidden = false;
}

function closeSaleConfirm() {
  pendingSale = null;
  const modal = $("#confirmModal");
  if (modal) modal.hidden = true;
}

$("#saleButtons").addEventListener("click", (e) => {
  const fruitBtn = e.target.closest("[data-sale-fruit]");
  const btn = e.target.closest("[data-sale-group]");
  const hookahs = Number(document.querySelector('#saleForm [name="hookahs"]')?.value || 1);
  const date = document.querySelector('#saleForm [name="date"]')?.value || toISODate(new Date());
  if (fruitBtn) {
    openSaleConfirm(fruitBtn.dataset.saleFruit || "classic", Math.max(1, hookahs), date, "fruit");
    return;
  }
  if (!btn) return;
  openSaleConfirm(btn.dataset.saleGroup, Math.max(1, hookahs), date);
});

$("#confirmOk")?.addEventListener("click", () => {
  if (!pendingSale) return;
  if (pendingSale.kind === "month-batch") {
    const monthKey = pendingSale.monthKey;
    state.hookahSales = (state.hookahSales || []).filter((sale) => !(
      sale.batch && String(sale.date || "").slice(0, 7) === monthKey
    ));
    pendingSale.rows.forEach((row) => recordSale(row.groupId, row.hookahs, row.date, row.kind || "month", {
      grams: row.grams,
      coals: row.coals,
      batch: true,
      ...(row.shortAs ? { shortAs: row.shortAs } : {}),
    }));
  } else {
    const kind = pendingSale.kind || "sale";
    recordSale(pendingSale.groupId, pendingSale.hookahs, pendingSale.date, kind, {
      grams: gramsForKind(kind, pendingSale.hookahs),
      coals: coalsForKind(kind, pendingSale.hookahs),
    });
  }
  closeSaleConfirm();
});

$("#staffPerDay")?.addEventListener("input", (e) => {
  state.staffPerDay = Math.max(0, Number(e.target.value || DEFAULT_STAFF_PER_DAY));
  save();
  renderRevision();
});

$("#chefForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const hookahs = Math.max(1, Number(data.hookahs || 1));
  const date = data.date || todayISO();
  openSaleConfirm("classic", hookahs, date, "chef");
});

function monthEnd(yearMonth) {
  const [y, m] = String(yearMonth || "").split("-").map(Number);
  if (!y || !m) return todayISO();
  return toISODate(new Date(y, m, 0));
}

$("#monthSaleForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const date = monthEnd(data.month);
  const rows = SALE_GROUPS
    .filter((group) => db.current !== "shishka" || group.id !== "tangiers")
    .map((group) => {
      const hookahs = Math.max(0, Number(data[group.id] || 0));
      return {
        groupId: group.id,
        hookahs,
        grams: gramsForKind("sale", hookahs),
        coals: coalsForKind("sale", hookahs),
        kind: "month",
        date,
      };
    })
    .filter((row) => row.hookahs > 0);
  const fruitByGroup = {
    classic: Math.max(0, Number(data.fruitClassic || 0)),
    premium: Math.max(0, Number(data.fruitPremium || 0)),
    tangiers: Math.max(0, Number(data.fruitTangiers || 0)),
  };
  SALE_GROUPS
    .filter((group) => db.current !== "shishka" || group.id !== "tangiers")
    .forEach((group) => {
      const fruit = fruitByGroup[group.id] || 0;
      if (!fruit) return;
      rows.push({
        groupId: group.id,
        hookahs: fruit,
        grams: gramsForKind("fruit", fruit),
        coals: coalsForKind("fruit", fruit),
        kind: "fruit",
        date,
      });
    });
  const shortGrams = Math.max(0, Number(data.shortage || 0));
  const shortGroup = SALE_GROUPS.some((group) => group.id === data.shortGroup)
    ? data.shortGroup
    : "classic";
  const shortKind = data.shortAs === "fruit" ? "fruit" : "chef";
  if (shortGrams) {
    const shortHookahs = shortKind === "fruit"
      ? Math.round(shortGrams / FRUIT_GRAMS)
      : Math.round(shortGrams / gramsPerHookah());
    rows.push({
      groupId: shortGroup,
      hookahs: shortHookahs,
      grams: shortGrams,
      coals: shortKind === "fruit" ? shortHookahs * FRUIT_COALS : 0,
      kind: "shortage",
      shortAs: shortKind,
      date,
    });
  }
  if (!rows.length) return;
  const monthKey = String(data.month || date.slice(0, 7));
  const grams = rows.reduce((sum, row) => sum + row.grams, 0);
  const coals = rows.reduce((sum, row) => sum + row.coals, 0);
  pendingSale = { kind: "month-batch", rows, monthKey };
  const modal = $("#confirmModal");
  const text = $("#confirmText");
  if (text) {
    text.textContent = `Списать ${monthKey}: −${formatGrams(grams)} г и −${formatGrams(coals)} шт угля. Фрукт и недосдача с выбранных групп.`;
  }
  if (modal) modal.hidden = false;
});

$("#confirmCancel")?.addEventListener("click", () => closeSaleConfirm());
$("#confirmModal")?.addEventListener("click", (e) => {
  if (e.target.id === "confirmModal") closeSaleConfirm();
});

function setIncomingKind(kind) {
  if (!INCOME[kind]) return;
  incomingKind = kind;
  renderTobacco();
}

$$(".income-kind").forEach((btn) => {
  btn.addEventListener("click", () => setIncomingKind(btn.dataset.income));
});

$("#incomeKindSelect").addEventListener("change", (e) => {
  setIncomingKind(e.target.value);
});

$("#stockProductSelect")?.addEventListener("change", () => {
  if (incomingKind !== "inventory") return;
  $("#qtyLabelText").textContent = isMouthpiece($("#stockProductSelect").value)
    ? "Пачек"
    : INCOME.inventory.qty;
});

$("#incomeGroupButtons").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-income-group]");
  if (!btn) return;
  const form = $("#tobaccoForm");
  const dateInput = form.querySelector('[name="date"]');
  const qtyInput = form.querySelector('[name="qty"]');
  if (dateInput && !dateInput.value) dateInput.value = toISODate(new Date());
  if (!qtyInput.checkValidity()) {
    qtyInput.reportValidity();
    qtyInput.focus();
    return;
  }
  addTobaccoIncome({
    date: dateInput.value,
    group: btn.dataset.incomeGroup,
    product: (form.querySelector('[name="product"]')?.value || "").trim(),
    qty: qtyInput.value,
    sum: form.querySelector('[name="sum"]')?.value,
    supplier: (form.querySelector('[name="supplier"]')?.value || "").trim(),
    note: (form.querySelector('[name="note"]')?.value || "").trim(),
  });
  save();
  const kindSelect = $("#incomeKindSelect");
  if (kindSelect) kindSelect.value = "tobacco";
  form.reset();
  incomingKind = "tobacco";
  setTodayDefaults();
  renderTobacco();
  renderRevision();
});

$("#tobaccoForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const kind = data.kind || incomingKind;
  if (kind === "tobacco") return;
  if (kind === "coal") {
    addCoalIncome({
      date: data.date,
      packs: data.qty,
      perPack: coalsPerPack(),
      note: (data.note || "").trim(),
      sum: data.sum,
      supplier: (data.supplier || "").trim(),
    });
  } else {
    let product = (data.stockProduct || data.product || "").trim();
    if (kind === "inventory") {
      if (!product) return;
      product = ensureStockItem(product).name;
    }
    if (kind === "tobacco" && !product) return;
    state.tobacco.push({
      id: uid(),
      kind,
      date: data.date,
      product,
      supplier: (data.supplier || "").trim(),
      qty: Number(data.qty),
      sum: Number(data.sum || 0),
      note: (data.note || "").trim(),
    });
  }
  save();
  e.target.reset();
  incomingKind = kind;
  setTodayDefaults();
  renderTobacco();
  renderRevision();
});

document.addEventListener("click", (e) => {
  const saleId = e.target.dataset.delSale;
  if (saleId) {
    state.hookahSales = (state.hookahSales || []).filter((sale) => sale.id !== saleId);
    save();
    renderRevision();
  }
  const tobaccoId = e.target.dataset.delTobacco;
  if (tobaccoId) {
    state.tobacco = state.tobacco.filter((t) => t.id !== tobaccoId);
    save();
    renderTobacco();
    renderRevision();
  }
  const fineId = e.target.dataset.delFine;
  if (fineId) {
    state.fines = (state.fines || []).filter((f) => f.id !== fineId);
    save();
    renderShifts();
    if (incomingKind === "inventory") renderInventoryStock();
  }
  const restock = e.target.dataset.restock;
  if (restock) {
    incomingKind = "inventory";
    renderTobacco();
    const select = $("#stockProductSelect");
    if (select) select.value = restock;
    const qty = document.querySelector('#tobaccoForm [name="qty"]');
    if (qty) qty.focus();
    $("#tobaccoForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const restockCoal = e.target.dataset.restockCoal;
  if (restockCoal) {
    incomingKind = "coal";
    renderTobacco();
    const nameInput = document.querySelector('#coalForm [name="product"]');
    if (nameInput) nameInput.value = restockCoal;
    const packs = document.querySelector('#coalForm [name="packs"]');
    if (packs) packs.focus();
    $("#coalForm").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const stockId = e.target.dataset.delStock;
  if (stockId) {
    state.inventoryStock = ensureInventory().filter((item) => item.id !== stockId);
    save();
    renderInventoryStock();
    renderTobacco();
  }
  const coalStockId = e.target.dataset.delCoalStock;
  if (coalStockId) {
    state.coalStock = ensureCoalStock().filter((item) => item.id !== coalStockId);
    save();
    renderInventoryStock();
    renderTobacco();
  }
});

document.addEventListener("input", (e) => {
  const stockId = e.target.dataset.stockStart;
  if (stockId) {
    const item = ensureInventory().find((row) => row.id === stockId);
    if (!item) return;
    item.start = Number(e.target.value || 0);
    save();
    const cell = e.target.closest("tr")?.querySelector(".sum");
    if (cell) cell.textContent = `${stockNow(item)} ${stockUnit(item)}`;
    return;
  }
  const coalId = e.target.dataset.coalStart;
  if (!coalId) return;
  const item = ensureCoalStock().find((row) => row.id === coalId);
  if (!item) return;
  item.start = Number(e.target.value || 0);
  syncOpeningCoals();
  save();
  const cell = e.target.closest("tr")?.querySelector(".sum");
  if (cell) cell.textContent = `${formatGrams(coalNow(item))} шт`;
  const remainEl = $("#coalsRemain");
  if (remainEl) {
    const rev = shownRevision();
    const now = remainCoals(rev, rev?.date);
    remainEl.textContent = `${formatGrams(now)} шт`;
    remainEl.classList.toggle("low-stock", now <= 0);
  }
});

document.addEventListener("submit", (e) => {
  if (e.target.id === "addCoalStockForm") {
    e.preventDefault();
    const name = new FormData(e.target).get("name").trim();
    if (!name) return;
    ensureCoalItem(name);
    save();
    e.target.reset();
    renderTobacco();
    return;
  }
  if (!e.target.classList.contains("add-stock-form")) return;
  e.preventDefault();
  const name = new FormData(e.target).get("name").trim();
  if (!name) return;
  ensureStockItem(name, e.target.dataset.stockKind || "item");
  save();
  e.target.reset();
  renderTobacco();
});

$("#copiesInput").addEventListener("input", (e) => {
  ensureChecklist().copies = Number(e.target.value || 60);
  save();
  renderChecklistTickets();
});

$("#checklistItems").addEventListener("input", (e) => {
  const index = e.target.dataset.checkItem;
  if (index == null) return;
  ensureChecklist().items[Number(index)] = e.target.value;
  save();
  renderChecklistTickets();
});

$("#checklistItems").addEventListener("click", (e) => {
  const del = e.target.dataset.delCheck;
  if (del == null) return;
  ensureChecklist().items.splice(Number(del), 1);
  save();
  renderChecklist();
});

$("#addChecklistItemForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = new FormData(e.target).get("name").trim();
  if (!name) return;
  ensureChecklist().items.push(name);
  save();
  e.target.reset();
  renderChecklist();
});

$("#snapshotBtn")?.addEventListener("click", () => {
  const date = $("#revisionDate").value || OPENING_DATE;
  const prev = shownRevision();
  if (!prev) return;
  if ((state.revisions || []).some((row) => row.date === date && !isEmptyRevision(row))) {
    window.alert("На эту дату снятие уже есть. Поставь другую дату.");
    return;
  }
  const items = SALE_GROUPS
    .filter((group) => db.current !== "shishka" || group.id !== "tangiers")
    .map((group) => ({
      name: group.title,
      grams: Math.max(0, remainGroup(prev, group.id, prev.date)),
    }));
  state.revisions = (state.revisions || []).filter((row) => row.date !== date);
  state.revisions.push({
    date,
    coals: Math.max(0, remainCoals(prev, prev.date)),
    items,
  });
  save();
  renderRevision();
});

async function exportDb() {
  const name = `журнал-${toISODate(new Date())}.json`;
  const text = JSON.stringify(db);
  const file = new File([text], name, { type: "application/json" });
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Копия журнала" });
      return;
    }
  } catch {
    /* user cancelled share */
    return;
  }
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

function importDb(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const raw = JSON.parse(String(reader.result || ""));
      if (!raw?.venues) throw new Error("bad");
      db.current = VENUES[raw.current] ? raw.current : "tangiers";
      db.venues = {
        tangiers: normalizeVenue(raw.venues.tangiers, "tangiers"),
        shishka: normalizeVenue(raw.venues.shishka, "shishka"),
      };
      state = db.venues[db.current];
      save();
      syncVenueUi();
      setTodayDefaults();
      render();
      window.alert("Копия залита");
    } catch {
      window.alert("Этот файл не подходит");
    }
  };
  reader.readAsText(file);
}

$("#exportBtn")?.addEventListener("click", () => exportDb());
$("#importBtn")?.addEventListener("click", () => $("#importFile")?.click());
$("#importFile")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (file) importDb(file);
});

$("#reportBtn")?.addEventListener("click", () => openReport());
$("#reportClose")?.addEventListener("click", () => closeReport());

$("#printBtn").addEventListener("click", () => {
  const tab = document.querySelector(".tab.is-active")?.dataset.tab;
  const onSheet = tab === "checklist";
  const onTimesheet = tab === "shifts" || document.body.classList.contains("report-open");
  document.body.classList.toggle("print-checklist", onSheet);
  if (onTimesheet && !onSheet) {
    openReport();
    document.body.classList.add("print-report");
  }
  window.print();
});

window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-checklist", "print-report");
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

syncVenueUi();
setTodayDefaults();
render();
save();
