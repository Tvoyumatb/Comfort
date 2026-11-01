const APP_VERSION = "91";
const APP_NOTES = "";
const RESTORE_URL = "./journal-restore.json?n=" + Date.now();
const KEY = "shop-reports-v4";
const OLD_KEY = "shop-reports-v3";
const MQTT_TOPIC = "comfort/tvoyumatb/journal/v1";
const MQTT_BROKERS = [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://broker.hivemq.com:8884/mqtt",
];

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

const REVISION_GROUPS = [
  { id: "classic", title: "Классик", note: "Smoke break" },
  { id: "premium", title: "Премиум", note: "Bonche, Jent Cigar, Troffimoff's" },
  { id: "fruit", title: "Фрукт", note: "Табак на фрукте, 40 г" },
  { id: "tangiers", title: "Tangiers", note: "Tangiers-акция" },
];

const PREMIUM_BRANDS = [
  "bonche",
  "jent cigar",
  "jentcigar",
  "troffimoff",
  "trofimoff",
  "troffimofs",
];

const CLASSIC_PACK_BRANDS = ["Banger", "Blackburn", "Bliss", "Chabacco"];

const DEFAULT_BRANDS = [
  ...CLASSIC_PACK_BRANDS,
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

const SHIFT_ORDER = ["", "morning", "evening", "intern"];
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
    hint: "Только чеки, которые скинул. Это не ревизия — забытые накладные сюда можно не догонять",
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
    hint: "Сначала добавь название угля, потом коробки. Обычно 72 шт в коробке",
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
let viewRevMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let viewLoungeMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let half = new Date().getDate() > 15 ? 1 : 0;
let incomingKind = "tobacco";
let reportKind = "shifts";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isMouthpiece(name) {
  return /мундштук/i.test(String(name || ""));
}

function isConsumable(name) {
  const n = String(name || "").toLowerCase();
  if (/smoke/.test(n)) return false;
  return /мундштук|mouthpiece|ершик|щетк/.test(n);
}

function dropConsumableStock(list) {
  return (list || []).filter((item) => !isConsumable(item?.name));
}

function defaultInventory() {
  return [
    { id: uid(), name: "Колба", start: 0, kind: "item" },
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
    items: [],
  };
}

function seedStockItem(data, name, kind = "item") {
  if (isConsumable(name)) return name;
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
    loungeBoughtV1: Boolean(data.loungeBoughtV1),
    loungeBoughtUndoV1: Boolean(data.loungeBoughtUndoV1),
  };
  venue.employees = (venue.employees || []).filter((emp) => !isPlaceholderEmployee(emp));
  venue.inventoryStock = dropConsumableStock(venue.inventoryStock);
  return applySplitClassicPack(applyMonthlyCount(applyStartInvoices(
    shiftOpeningDate(resetStock(applyConsumption(venue), venueId), venueId),
    venueId
  )));
}

function applySplitClassicPack(data) {
  if (!data) return data;
  (data.revisions || []).forEach((rev) => splitCombinedClassicPack(rev));
  return data;
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
      return unpackDb(raw);
    }
    const old = JSON.parse(localStorage.getItem(OLD_KEY));
    return unpackDb({
      current: "tangiers",
      venues: { tangiers: old, shishka: {} },
    });
  } catch {
    return unpackDb(null);
  }
}

function unpackDb(raw) {
  const empty = {
    current: "tangiers",
    updatedAt: 0,
    venues: {
      tangiers: normalizeVenue({}, "tangiers"),
      shishka: normalizeVenue({}, "shishka"),
    },
  };
  if (!raw?.venues) return empty;
  return {
    current: VENUES[raw.current] ? raw.current : "tangiers",
    updatedAt: Number(raw.updatedAt || 0),
    venues: {
      tangiers: normalizeVenue(raw.venues.tangiers, "tangiers"),
      shishka: normalizeVenue(raw.venues.shishka, "shishka"),
    },
  };
}

function packedDb() {
  return {
    app: "comfort-journal",
    updatedAt: Number(db.updatedAt || 0),
    current: db.current,
    venues: db.venues,
  };
}

function dbFill(raw) {
  const venues = raw?.venues || {};
  let n = 0;
  Object.values(venues).forEach((venue) => {
    if (!venue) return;
    n += Object.keys(venue.schedule || {}).length;
    n += (venue.tobacco || []).length;
    n += (venue.fines || []).length;
    n += (venue.hookahSales || []).length;
    n += (venue.revisions || []).length;
    n += Object.keys(venue.extras || {}).length;
  });
  return n;
}

function shouldUseRemote(remote, local) {
  if (!remote?.venues) return false;
  return dbFill(remote) > dbFill(local);
}

function applyCloud(raw) {
  const next = unpackDb(raw);
  db.current = next.current;
  db.updatedAt = next.updatedAt;
  db.venues = next.venues;
  state = db.venues[db.current];
}

function saveLocal() {
  localStorage.setItem(KEY, JSON.stringify(packedDb()));
}

function setSyncStatus(text) {
  const el = $("#syncStatus");
  if (el) el.textContent = text;
}

function save() {
  db.updatedAt = Date.now();
  saveLocal();
  queueCloudPush();
}

let cloudReady = false;
let cloudApplying = false;
let cloudTimer = 0;
let mqttPing = 0;
let lastRemote = null;
const mqttSockets = [];
const mqttEncoder = new TextEncoder();
const mqttDecoder = new TextDecoder();

function mqttStr(text) {
  const bytes = mqttEncoder.encode(text);
  const out = new Uint8Array(2 + bytes.length);
  out[0] = (bytes.length >> 8) & 255;
  out[1] = bytes.length & 255;
  out.set(bytes, 2);
  return out;
}

function mqttRemain(n) {
  const bytes = [];
  do {
    let digit = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) digit |= 128;
    bytes.push(digit);
  } while (n > 0);
  return bytes;
}

function mqttConcat(parts) {
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
}

function mqttPacket(typeFlags, payload) {
  const remain = mqttRemain(payload.length);
  const out = new Uint8Array(1 + remain.length + payload.length);
  out[0] = typeFlags;
  out.set(remain, 1);
  out.set(payload, 1 + remain.length);
  return out;
}

function mqttConnectPacket() {
  const proto = mqttStr("MQTT");
  const header = mqttConcat([proto, Uint8Array.of(4, 2, 0, 45)]);
  const id = `comfort-${Math.random().toString(16).slice(2, 10)}`;
  return mqttPacket(0x10, mqttConcat([header, mqttStr(id)]));
}

function mqttPublishPacket(text) {
  return mqttPacket(0x31, mqttConcat([mqttStr(MQTT_TOPIC), mqttEncoder.encode(text)]));
}

function mqttSubscribePacket() {
  return mqttPacket(0x82, mqttConcat([Uint8Array.of(0, 1), mqttStr(MQTT_TOPIC), Uint8Array.of(0)]));
}

function mqttParse(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const packets = [];
  let index = 0;
  while (index < bytes.length) {
    const type = bytes[index] >> 4;
    let multiply = 1;
    let length = 0;
    let pos = index + 1;
    let guard = 0;
    while (pos < bytes.length && guard < 4) {
      const digit = bytes[pos];
      pos += 1;
      length += (digit & 127) * multiply;
      if ((digit & 128) === 0) break;
      multiply *= 128;
      guard += 1;
    }
    packets.push({
      type,
      flags: bytes[index] & 0x0f,
      payload: bytes.slice(pos, pos + length),
    });
    index = pos + length;
  }
  return packets;
}

function asJournal(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!raw || (raw.app && raw.app !== "comfort-journal")) return null;
  return raw;
}

function applyRemote(remote, status) {
  const dirty = Object.values(remote.venues || {}).some((venue) =>
    (venue.employees || []).some(isPlaceholderEmployee)
  );
  cloudApplying = true;
  applyCloud(remote);
  saveLocal();
  syncVenueUi();
  setTodayDefaults();
  render();
  cloudApplying = false;
  setSyncStatus(status);
  if (dirty) {
    lastRemote = packedDb();
    save();
  }
}

function handleCloudMessage(text) {
  const remote = asJournal(text);
  if (!remote?.venues) return;
  lastRemote = remote;
  if (cloudApplying) return;
  if (shouldUseRemote(remote, db)) {
    applyRemote(remote, "Подтянул свежие данные");
  }
}

function liveMqttSockets() {
  return mqttSockets.filter((ws) => ws.readyState === WebSocket.OPEN);
}

function pushCloud() {
  if (lastRemote && dbFill(db) < dbFill(lastRemote)) {
    setSyncStatus("На устройстве меньше данных — облако не трогаю");
    return false;
  }
  const open = liveMqttSockets();
  if (!open.length) {
    setSyncStatus("Нет сети — пока только на этом устройстве");
    mqttConnectAll();
    return false;
  }
  const body = JSON.stringify(packedDb());
  const packet = mqttPublishPacket(body);
  open.forEach((ws) => ws.send(packet));
  setSyncStatus("Сохранено на телефон и ноут");
  return true;
}

async function loadRestoreCopy() {
  try {
    const res = await fetch(RESTORE_URL, { cache: "no-store" });
    if (!res.ok) return null;
    return asJournal(await res.json());
  } catch {
    return null;
  }
}

function pickRicher(a, b) {
  if (b && dbFill(b) > dbFill(a)) return b;
  return a;
}

function queueCloudPush() {
  if (cloudApplying) return;
  window.clearTimeout(cloudTimer);
  cloudTimer = window.setTimeout(() => {
    if (!cloudReady) {
      queueCloudPush();
      return;
    }
    pushCloud();
  }, 300);
}

function bindMqttSocket(ws, url) {
  ws.binaryType = "arraybuffer";
  ws.addEventListener("message", (event) => {
    mqttParse(event.data).forEach((packet) => {
      if (packet.type === 2) {
        ws.send(mqttSubscribePacket());
        return;
      }
      if (packet.type !== 3) return;
      const payload = packet.payload;
      const topicLen = (payload[0] << 8) + payload[1];
      const qos = (packet.flags >> 1) & 3;
      const start = 2 + topicLen + (qos ? 2 : 0);
      handleCloudMessage(mqttDecoder.decode(payload.slice(start)));
    });
  });
  ws.addEventListener("close", () => {
    const index = mqttSockets.indexOf(ws);
    if (index >= 0) mqttSockets.splice(index, 1);
    window.setTimeout(() => mqttConnect(url), 2500);
  });
  ws.addEventListener("error", () => {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  });
}

function mqttConnect(url) {
  if (mqttSockets.some((ws) => ws._broker === url && ws.readyState <= 1)) return;
  try {
    const ws = new WebSocket(url, "mqtt");
    ws._broker = url;
    mqttSockets.push(ws);
    bindMqttSocket(ws, url);
    ws.addEventListener("open", () => {
      ws.send(mqttConnectPacket());
    });
  } catch {
    window.setTimeout(() => mqttConnect(url), 4000);
  }
}

function mqttConnectAll() {
  MQTT_BROKERS.forEach((url) => mqttConnect(url));
}

function startMqttPing() {
  window.clearInterval(mqttPing);
  mqttPing = window.setInterval(() => {
    liveMqttSockets().forEach((ws) => ws.send(Uint8Array.of(0xc0, 0x00)));
  }, 20000);
}

async function bootCloud() {
  navigator.storage?.persist?.().catch(() => {});
  setSyncStatus("Загружаю общие данные…");
  const backup = await loadRestoreCopy();
  if (shouldUseRemote(backup, db)) {
    applyRemote(backup, "Вернул сохранённый журнал");
  }
  mqttConnectAll();
  startMqttPing();
  const started = Date.now();
  while (Date.now() - started < 4000 && !liveMqttSockets().length) {
    await new Promise((resolve) => window.setTimeout(resolve, 200));
  }
  cloudReady = true;
  await new Promise((resolve) => window.setTimeout(resolve, 1500));
  const richest = pickRicher(pickRicher(packedDb(), lastRemote), backup);
  if (shouldUseRemote(richest, db)) {
    applyRemote(richest, "Вернул сохранённый журнал");
  }
  if (!liveMqttSockets().length) {
    setSyncStatus("Нет сети — пока только на этом устройстве");
  } else if (dbFill(db) >= dbFill(lastRemote || {})) {
    pushCloud();
  } else {
    setSyncStatus("Данные с телефона и ноута");
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") mqttConnectAll();
  });
  window.addEventListener("online", () => mqttConnectAll());
  $("#syncStatus")?.addEventListener("click", async () => {
    setSyncStatus("Обновляю…");
    const copy = await loadRestoreCopy();
    if (shouldUseRemote(copy, db)) applyRemote(copy, "Вернул сохранённый журнал");
    mqttConnectAll();
    if (lastRemote && shouldUseRemote(lastRemote, db)) {
      applyRemote(lastRemote, "Подтянул свежие данные");
    }
    pushCloud();
  });
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

function shiftType(type) {
  return type === "eveningWe" ? "evening" : (type || "");
}

function shiftClass(type, date) {
  const kind = shiftType(type);
  if (kind === "morning") return "morning";
  if (kind === "intern") return "intern";
  if (kind === "evening") return isWeekend(date) ? "evening-we" : "evening-wd";
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

function inLoungeMonth(iso) {
  if (!iso) return false;
  return monthKey(parseISODate(iso)) === monthKey(viewLoungeMonth);
}

function loungeDefaultDate() {
  const today = new Date();
  if (monthKey(today) === monthKey(viewLoungeMonth)) return todayISO();
  return lastDayOfMonthISO(toISODate(viewLoungeMonth));
}

function syncLoungeMonthUi() {
  const label = $("#loungeMonthLabel");
  if (label) {
    label.textContent = `${MONTHS_RU[viewLoungeMonth.getMonth()]} ${viewLoungeMonth.getFullYear()}`;
  }
  const dateInput = document.querySelector("#fineForm [name=\"date\"]");
  if (!dateInput) return;
  const monthISO = toISODate(viewLoungeMonth);
  dateInput.min = `${monthKey(viewLoungeMonth)}-01`;
  dateInput.max = lastDayOfMonthISO(monthISO);
  dateInput.value = clampDateToMonth(dateInput.value || loungeDefaultDate(), monthISO);
}

function qtyInLoungeMonth(name, kind = "inventory") {
  return (state.tobacco || [])
    .filter((row) => (row.kind || "tobacco") === kind
      && inLoungeMonth(row.date)
      && String(row.product || "").toLowerCase() === String(name || "").toLowerCase())
    .reduce((sum, row) => sum + Number(row.qty || 0), 0);
}

function packsInLoungeMonth(name, perPack) {
  const size = Math.max(1, Number(perPack) || coalsPerPack());
  return (state.tobacco || [])
    .filter((row) => row.kind === "coal"
      && inLoungeMonth(row.date)
      && String(row.product || "").toLowerCase() === String(name || "").toLowerCase())
    .reduce((sum, row) => sum + coalRowPacks(row, size), 0);
}

function monthBrokenQty(name) {
  return (state.fines || [])
    .filter((f) => inLoungeMonth(f.date) && String(f.what || "").toLowerCase() === String(name || "").toLowerCase())
    .reduce((sum, f) => sum + Number(f.qty || 0), 0);
}

function monthNeedQty(item) {
  return Math.max(0, monthBrokenQty(item.name) - qtyInLoungeMonth(item.name, "inventory"));
}

function ensureInventory() {
  if (!Array.isArray(state.inventoryStock) || !state.inventoryStock.length) {
    state.inventoryStock = defaultInventory();
  }
  const cleaned = dropConsumableStock(state.inventoryStock);
  if (cleaned.length !== state.inventoryStock.length) {
    state.inventoryStock = cleaned;
    save();
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
  if (isConsumable(name)) return { id: "", name, start: 0, kind, skip: true };
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
    const type = shiftType(state.schedule[toISODate(date)]?.[empId] || "");
    if (type === "morning") counts.morning += 1;
    if (type === "intern") counts.intern += 1;
    if (type === "evening") {
      if (isWeekend(date)) counts.eveningWeekend += 1;
      else counts.eveningWeekday += 1;
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
    <label class="rate morning">Утро с 11:30
      <input type="number" min="0" step="1000" data-rate="morning" value="${state.rates.morning}">
    </label>
    <label class="rate evening-wd">Вечер будни пн–чт с 18:00
      <input type="number" min="0" step="1000" data-rate="eveningWeekday" value="${state.rates.eveningWeekday}">
    </label>
    <label class="rate evening-we">Вечер выходные пт–вс
      <input type="number" min="0" step="1000" data-rate="eveningWeekend" value="${state.rates.eveningWeekend}">
    </label>
    <label class="rate intern">Стажировка
      <input type="number" min="0" step="1000" data-rate="intern" value="${state.rates.intern}">
    </label>
  `;
}

function employeeById(id) {
  return (state.employees || []).find((emp) => emp.id === id);
}

function isPlaceholderEmployee(emp) {
  const name = String(emp?.name || "").toLowerCase();
  return /бывш/.test(name) || /уш[её]л/.test(name);
}

function empHasPeriodWork(emp) {
  return periodDays().some((date) => state.schedule[toISODate(date)]?.[emp.id]);
}

function visibleEmployees() {
  return (state.employees || []).filter((emp) => !emp.leftOn || empHasPeriodWork(emp));
}

function activeEmployees() {
  return (state.employees || []).filter((emp) => !emp.leftOn);
}

function renderRoster() {
  const days = periodDays();
  const people = visibleEmployees();
  const head = `
    <tr>
      <th class="name">${MONTHS_RU[viewMonth.getMonth()]}</th>
      ${days.map((d) => `<th>${d.getDate()}</th>`).join("")}
    </tr>
  `;
  const body = people.map((emp) => `
    <tr>
      <th class="name">
        ${escapeHtml(emp.name)}
        <button type="button" class="emp-remove" data-del-emp="${emp.id}">удалить</button>
      </th>
      ${days.map((date) => {
        const iso = toISODate(date);
        const type = shiftType(state.schedule[iso]?.[emp.id] || "");
        const cls = shiftClass(type, date);
        return `<td><button type="button" class="cell ${cls}" data-emp="${emp.id}" data-day="${iso}">${SHIFT_LABEL[type]}</button></td>`;
      }).join("")}
    </tr>
  `).join("");

  $("#rosterWrap").innerHTML = `<table class="roster"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function renderPay() {
  const rows = visibleEmployees().map((emp) => {
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
  syncLoungeMonthUi();
  const rows = (state.fines || [])
    .filter((f) => inLoungeMonth(f.date))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const empSelect = $("#fineEmpSelect");
  if (empSelect) {
    empSelect.innerHTML = activeEmployees()
      .map((emp) => `<option value="${emp.id}">${escapeHtml(emp.name)}</option>`)
      .join("");
  }
  fillDatalist("#fineWhatList", ensureInventory().map((item) => item.name));
  const list = $("#fineList");
  if (!list) return;

  if (!rows.length) {
    list.innerHTML = `<p class="empty">В этом месяце порчи нет</p>`;
    return;
  }
  list.innerHTML = rows.map((f) => {
    const emp = employeeById(f.empId);
    return `
      <div class="hall-event">
        <div>
          <strong>${escapeHtml(f.what)}</strong>
          <span>${escapeHtml(emp?.name || "Сотрудник")} · ${parseISODate(f.date).toLocaleDateString("ru-RU")} · ${f.qty} шт · ${formatSum(f.sum)}</span>
        </div>
        <button type="button" class="text-del" data-del-fine="${f.id}" aria-label="Удалить">×</button>
      </div>
    `;
  }).join("");
}

function renderShifts() {
  renderPeriod();
  renderRates();
  renderRoster();
  renderPay();
  renderFines();
  if (!$("#reportView")?.hidden) refreshOpenReport();
}

function reportPeriodLabel() {
  const days = periodDays();
  return `${MONTHS_RU[viewMonth.getMonth()]} ${days[0].getDate()}–${days[days.length - 1].getDate()} ${viewMonth.getFullYear()}`;
}

function renderReport() {
  const paper = $("#reportPaper");
  if (!paper) return;
  const days = periodDays();
  const nameHtml = (text) => escapeHtml(text).replace(" ", "<br>");
  const rosterCells = [
    `<div class="rt-head rt-name">${MONTHS_RU[viewMonth.getMonth()]}</div>`,
    ...days.map((d) => `<div class="rt-head rt-day">${d.getDate()}</div>`),
    ...visibleEmployees().flatMap((emp) => [
      `<div class="rt-name">${nameHtml(emp.name)}</div>`,
      ...days.map((date) => {
        const type = shiftType(state.schedule[toISODate(date)]?.[emp.id] || "");
        const cls = shiftClass(type, date);
        return `<div class="rt-shift cell ${cls}">${SHIFT_LABEL[type]}</div>`;
      }),
    ]),
  ].join("");

  const payRows = visibleEmployees().map((emp) => {
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

  const lateFines = visibleEmployees()
    .map((emp) => ({ name: emp.name, sum: Number(extrasFor(emp.id).fines || 0) }))
    .filter((row) => row.sum > 0);
  const damages = (state.fines || [])
    .filter((f) => inCurrentPeriod(f.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const lateTotal = lateFines.reduce((sum, row) => sum + row.sum, 0);
  const damageSum = damages.reduce((sum, f) => sum + Number(f.sum || 0), 0);
  const advanceTotal = visibleEmployees().reduce((sum, emp) => sum + Number(extrasFor(emp.id).advances || 0), 0);

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
              const emp = employeeById(f.empId);
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
      <div class="report-timesheet" style="--days:${days.length};display:grid;grid-template-columns:minmax(0,7.6em) repeat(${days.length},minmax(0,1fr));width:100%;min-width:0">
        ${rosterCells}
      </div>
    </div>

    <div class="excel-card report-pay">
      <table class="pay" style="--rows:${state.employees.length + 1}">
        <thead>
          <tr>
            <th class="name">Сотрудник</th>
            <th>Утро</th>
            <th>Будни вечер</th>
            <th>Выходной вечер</th>
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
  requestAnimationFrame(() => requestAnimationFrame(fitReportPaper));
}

function syncReportOrientation() {
  const landscape = window.matchMedia("(orientation: landscape)").matches;
  document.body.classList.toggle("report-land", landscape);
  document.body.classList.toggle("report-port", !landscape);
}

function fitReportPaper() {
  const paper = $("#reportPaper");
  const frame = paper?.closest(".report-frame");
  if (!paper || !frame || $("#reportView")?.hidden) return;
  syncReportOrientation();
  const landscape = window.matchMedia("(orientation: landscape)").matches;
  paper.style.transform = "none";
  paper.style.maxWidth = "none";
  if (reportKind === "revision") {
    const native = Math.min(440, landscape ? 440 : frame.clientWidth);
    paper.style.width = `${native}px`;
    paper.style.minWidth = `${native}px`;
  } else {
    const native = landscape ? frame.clientWidth : 900;
    paper.style.width = `${native}px`;
    paper.style.minWidth = `${native}px`;
  }
  const width = Math.max(paper.scrollWidth, paper.offsetWidth, 1);
  const height = Math.max(paper.scrollHeight, paper.offsetHeight, 1);
  const scale = Math.min(frame.clientWidth / width, frame.clientHeight / height, 1);
  const x = Math.max(0, (frame.clientWidth - width * scale) / 2);
  const y = Math.max(0, (frame.clientHeight - height * scale) / 2);
  paper.style.transformOrigin = "top left";
  paper.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

function openReport() {
  reportKind = "shifts";
  const paper = $("#reportPaper");
  if (paper) paper.classList.remove("rev-shot");
  renderReport();
  const view = $("#reportView");
  if (view) view.hidden = false;
  document.body.classList.add("report-open");
  requestAnimationFrame(() => requestAnimationFrame(fitReportPaper));
}

function closeReport() {
  const view = $("#reportView");
  if (view) view.hidden = true;
  document.body.classList.remove("report-open", "print-report");
}

function refreshOpenReport() {
  if ($("#reportView")?.hidden) return;
  if (reportKind === "revision") renderRevisionReport();
  else renderReport();
}

function revisionReportLabel(rev) {
  const month = `${MONTHS_RU[viewRevMonth.getMonth()]} ${viewRevMonth.getFullYear()}`;
  const snap = parseISODate(rev.date).toLocaleDateString("ru-RU");
  return { month, snap };
}

function renderRevisionReport() {
  const paper = $("#reportPaper");
  if (!paper) return;
  const monthISO = toISODate(viewRevMonth);
  const date = $("#revisionDate")?.value || lastDayOfMonthISO(monthISO);
  const rev = ensureRevision(date);
  const prev = prevMonthRevision(rev.date);
  const groups = REVISION_GROUPS.filter((group) => db.current !== "shishka" || group.id !== "tangiers");
  const { month, snap } = revisionReportLabel(rev);
  let itemCount = 0;
  const cols = groups.map((group) => {
    const rows = (rev.items || []).filter((item) => itemGroup(item) === group.id);
    if (!rows.length) return "";
    itemCount += rows.length;
    const used = prev ? usedGramsForGroup(rev, group.id, rev.date) : null;
    const sum = rows.reduce((n, item) => n + Number(item.grams || 0), 0);
    const usedSum = rows.reduce((n, item) => n + (prev ? usedGramsForItem(rev, item, rev.date) : 0), 0);
    const list = rows.map((item) => {
      const delta = prev ? usedGramsForItem(rev, item, rev.date) : null;
      return `<tr>
        <td class="name">${escapeHtml(item.name)}</td>
        <td>${formatGrams(item.grams)}</td>
        <td>${delta == null ? "—" : formatGrams(delta)}</td>
      </tr>`;
    }).join("");
    return `
      <table class="rev-shot-sheet">
        <colgroup><col class="name"><col class="num"><col class="num"></colgroup>
        <thead>
          <tr class="rev-g group-${group.id}"><th colspan="3">${escapeHtml(group.title)}${used == null ? "" : ` <small>− ${formatGrams(used)} г</small>`}</th></tr>
          <tr><th class="name">Марка</th><th>г</th><th>−</th></tr>
        </thead>
        <tbody>
          ${list}
          <tr class="rev-sum">
            <th class="name">Итого</th>
            <td>${formatGrams(sum)}</td>
            <td>${prev ? formatGrams(usedSum) : ""}</td>
          </tr>
        </tbody>
      </table>
    `;
  }).join("");
  const prevTotal = prev ? revisionTotal(prev) : 0;
  const nowTotal = revisionTotal(rev);
  const usedTotal = prev ? prevTotal - nowTotal : null;
  const prevCoals = Number(prev?.coals || 0);
  const nowCoals = Number(rev.coals || 0);
  const usedCoalsN = prev ? prevCoals - nowCoals : null;
  paper.classList.add("rev-shot");
  paper.classList.toggle("is-dense", itemCount > 14);
  paper.innerHTML = `
    <header class="report-head">
      <h1>${escapeHtml(venueName())} · Ревизия</h1>
      <p class="report-rates">${month} · снятие ${snap}</p>
    </header>
    ${cols
      ? `<div class="rev-shot-cols">${cols}</div>`
      : `<p class="rev-shot-empty">Марок в этом месяце нет</p>`}
    <table class="rev-shot-sheet rev-shot-foot">
      <colgroup><col class="name"><col class="num"><col class="num"><col class="num"></colgroup>
      <thead>
        <tr>
          <th class="name"></th>
          <th>Прошлый</th>
          <th>Снятие</th>
          <th>−</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th class="name">Табак, г</th>
          <td>${formatGrams(prevTotal)}</td>
          <td>${formatGrams(nowTotal)}</td>
          <td>${usedTotal == null ? "—" : formatGrams(usedTotal)}</td>
        </tr>
        <tr>
          <th class="name">Угли, шт</th>
          <td>${formatGrams(prevCoals)}</td>
          <td>${formatGrams(nowCoals)}</td>
          <td>${usedCoalsN == null ? "—" : formatGrams(usedCoalsN)}</td>
        </tr>
      </tbody>
    </table>
  `;
  requestAnimationFrame(() => requestAnimationFrame(fitReportPaper));
}

function openRevisionReport() {
  reportKind = "revision";
  renderRevisionReport();
  const view = $("#reportView");
  if (view) view.hidden = false;
  document.body.classList.add("report-open");
  requestAnimationFrame(() => requestAnimationFrame(fitReportPaper));
}

function syncReportBtn() {
  const tab = document.querySelector(".tab.is-active")?.dataset.tab;
  const btn = $("#reportBtn");
  if (btn) btn.textContent = tab === "revision" ? "Просмотр ревизии" : "Просмотр отчёта";
}

function cycleCell(btn) {
  const empId = btn.dataset.emp;
  const iso = btn.dataset.day;
  if (!state.schedule[iso]) state.schedule[iso] = {};
  const current = shiftType(state.schedule[iso][empId] || "");
  const next = SHIFT_ORDER[(Math.max(0, SHIFT_ORDER.indexOf(current)) + 1) % SHIFT_ORDER.length];
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
  if (fineDate) fineDate.value = loungeDefaultDate();
  if (!$("#revisionDate").value) {
    $("#revisionDate").value = todayISO();
    const now = new Date();
    viewRevMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  }
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

function defaultBrandItems(venueId = db.current) {
  const items = DEFAULT_BRANDS.map((name) => ({
    name,
    grams: 0,
    group: brandGroup(name),
  }));
  if (venueId !== "shishka" && !items.some((item) => item.group === "tangiers")) {
    items.push({ name: "Tangiers", grams: 0, group: "tangiers" });
  }
  return items.filter((item) => venueId !== "shishka" || item.group !== "tangiers");
}

function isCombinedClassicPack(name) {
  const n = normalizeName(name);
  if (CLASSIC_PACK_BRANDS.some((brand) => n === normalizeName(brand))) return false;
  return /blackburn/i.test(n) && /banger/i.test(n);
}

function splitCombinedClassicPack(rev) {
  if (!rev?.items) return false;
  const idx = rev.items.findIndex((item) => isCombinedClassicPack(item.name));
  if (idx < 0) return false;
  const old = rev.items[idx];
  const group = old.group || "classic";
  const have = new Set(rev.items.map((item) => normalizeName(item.name)));
  const added = CLASSIC_PACK_BRANDS
    .filter((name) => !have.has(normalizeName(name)))
    .map((name) => ({ name, grams: 0, group }));
  rev.items.splice(idx, 1, ...added);
  return true;
}

function fillRevisionBrands(rev) {
  if (!rev.items) rev.items = [];
  const split = splitCombinedClassicPack(rev);
  rev.items.forEach((item) => {
    if (!item.group) item.group = brandGroup(item.name);
  });
  return split;
}

function revisionForMonth(iso) {
  const key = monthKey(parseISODate(iso));
  return (state.revisions || [])
    .filter((rev) => monthKey(parseISODate(rev.date)) === key)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

function ensureRevision(date) {
  const iso = date || toISODate(viewRevMonth);
  let rev = revisionForMonth(iso);
  if (!rev) {
    const prev = prevMonthRevision(iso);
    rev = {
      date: clampDateToMonth(iso, iso),
      month: monthKey(parseISODate(iso)),
      coals: 0,
      items: (prev?.items || []).map((item) => ({
        name: item.name,
        group: item.group || brandGroup(item.name),
        grams: 0,
      })),
    };
    state.revisions.push(rev);
    save();
  } else {
    if (!rev.month) rev.month = monthKey(parseISODate(rev.date));
    if (fillRevisionBrands(rev)) save();
  }
  return rev;
}

function prevMonthRevision(fromDate) {
  const date = parseISODate(fromDate);
  return revisionForMonth(toISODate(new Date(date.getFullYear(), date.getMonth() - 1, 1)));
}

function usedGramsForGroup(rev, groupId, fromDate) {
  const prev = prevMonthRevision(fromDate);
  const before = prev ? snapshotGramsForGroup(prev, groupId) : 0;
  return before - snapshotGramsForGroup(rev, groupId);
}

function usedGramsForItem(rev, item, fromDate) {
  const prev = prevMonthRevision(fromDate);
  const prevItem = (prev?.items || []).find((row) =>
    itemGroup(row) === itemGroup(item) && normalizeName(row.name) === normalizeName(item.name)
  );
  return Number(prevItem?.grams || 0) - Number(item.grams || 0);
}

function usedCoals(rev, fromDate) {
  const prev = prevMonthRevision(fromDate);
  return Number(prev?.coals || 0) - Number(rev.coals || 0);
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

function lastDayOfMonthISO(iso) {
  const date = parseISODate(iso);
  return toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function monthStartISO(iso) {
  const date = parseISODate(iso);
  const start = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;
  if (monthKey(date) === monthKey(parseISODate(OPENING_DATE)) && start < OPENING_DATE) {
    return OPENING_DATE;
  }
  return start;
}

function monthEndISO(iso) {
  const date = parseISODate(iso);
  return toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 1));
}

function clampDateToMonth(iso, monthISO) {
  const start = monthStartISO(monthISO);
  const last = lastDayOfMonthISO(monthISO);
  if (!iso || iso < start) return start;
  if (iso > last) return last;
  return iso;
}

function daysOpenInWindow(fromDate) {
  const today = parseISODate(todayISO());
  const month = parseISODate(fromDate);
  if (monthKey(month) > monthKey(today)) return 0;
  const start = parseISODate(monthStartISO(fromDate));
  const last = parseISODate(lastDayOfMonthISO(fromDate));
  const end = monthKey(month) === monthKey(today) ? (today < last ? today : last) : last;
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
  const perPack = Number(row.perPack || coalsPerPack());
  const packs = coalRowPacks(row, perPack);
  const pieces = Number(row.qty || packs * perPack);
  return `${formatBoxes(packs)} × ${formatGrams(perPack)} шт`;
}

function coalPackSize(item) {
  return Math.max(1, Number(item?.perPack) || coalsPerPack());
}

function coalRowPacks(row, perPack) {
  const size = Math.max(1, Number(row?.perPack || perPack) || coalsPerPack());
  if (Number(row?.packs) > 0) return Number(row.packs);
  return Number(row?.qty || 0) / size;
}

function incomingCoalPacks(name, perPack) {
  const size = Math.max(1, Number(perPack) || coalsPerPack());
  return (state.tobacco || [])
    .filter((row) => row.kind === "coal" && String(row.product || "").toLowerCase() === String(name || "").toLowerCase())
    .reduce((sum, row) => sum + coalRowPacks(row, size), 0);
}

function formatBoxes(n) {
  const value = Math.round(Number(n || 0) * 10) / 10;
  return `${value} кор.`;
}

function normalizeName(name) {
  return String(name || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function brandGroup(name) {
  const n = normalizeName(name).replace(/\s+/g, " ");
  if (["classic", "premium", "tangiers", "fruit"].includes(n)) return n;
  if (n.includes("фрукт") || n.includes("fruit")) return "fruit";
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

function itemGroup(item) {
  if (item?.group && REVISION_GROUPS.some((group) => group.id === item.group)) return item.group;
  return brandGroup(item?.name);
}

function isGroupTitleName(name) {
  const n = normalizeName(name);
  return REVISION_GROUPS.some((group) => n === group.id || n === normalizeName(group.title));
}

function groupTitle(id) {
  return REVISION_GROUPS.find((group) => group.id === id)?.title
    || SALE_GROUPS.find((group) => group.id === id)?.title
    || id;
}

function inRevisionWindow(iso, fromDate) {
  if (!iso) return false;
  return iso >= monthStartISO(fromDate) && iso < monthEndISO(fromDate);
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
  if (groupId === "fruit") {
    return (state.hookahSales || [])
      .filter((sale) => sale.kind === "fruit" && inRevisionWindow(sale.date, fromDate))
      .reduce((sum, sale) => sum + saleGrams(sale), 0);
  }
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
      && inRevisionWindow(row.date, fromDate))
    .reduce((sum, row) => sum + Number(row.qty || 0), 0);
}

function incomeForItem(rev, item, fromDate) {
  const groupId = itemGroup(item);
  const brands = (rev.items || []).filter((row) => itemGroup(row) === groupId && !isGroupTitleName(row.name));
  return (state.tobacco || [])
    .filter((row) => (row.kind || "tobacco") === "tobacco"
      && rowGroup(row) === groupId
      && inRevisionWindow(row.date, fromDate))
    .filter((row) => {
      if (isGroupTitleName(item.name)) {
        return !brands.some((brand) => normalizeName(brand.name) === normalizeName(row.product));
      }
      return normalizeName(row.product) === normalizeName(item.name);
    })
    .reduce((sum, row) => sum + Number(row.qty || 0), 0);
}

function snapshotGramsForGroup(rev, groupId) {
  return rev.items
    .filter((item) => itemGroup(item) === groupId)
    .reduce((sum, item) => sum + Number(item.grams || 0), 0);
}

function remainGroup(rev, groupId, fromDate) {
  const snap = snapshotGramsForGroup(rev, groupId) + incomeGramsForGroup(groupId, fromDate);
  if (groupId === "fruit") return snap;
  return snap - soldGramsForGroup(groupId, fromDate);
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
    .filter((row) => row.kind === "coal" && inRevisionWindow(row.date, fromDate))
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

function itemNeedBuy(item) {
  return Math.max(0, Number(item?.needBuy || 0));
}

function stockNeedsBuy(item) {
  return itemNeedBuy(item) > 0;
}

function stockAlertReason(item) {
  const need = itemNeedBuy(item);
  return need > 1 ? `закупить ${need} шт` : "закупить";
}

function loungeAlertRows() {
  return ensureInventory()
    .map((item) => ({ item, need: monthNeedQty(item) }))
    .filter((row) => row.need > 0)
    .map((row) => ({
      name: row.item.name,
      now: stockNow(row.item),
      unit: stockUnit(row.item),
      reason: row.need > 1 ? `закупить ${row.need} шт` : "закупить",
      restock: row.item.name,
      qty: row.need,
      coal: false,
    }));
}

function isHypeBowl(name) {
  return /hype|хайп/i.test(String(name || ""));
}

function ensureHypeBowl() {
  const stock = ensureInventory();
  const found = stock.find((item) => isHypeBowl(item.name));
  if (found) {
    found.kind = "bowl";
    return found;
  }
  const created = { id: uid(), name: "Hype", start: 0, kind: "bowl", needBuy: 1 };
  stock.push(created);
  return created;
}

function buyWithoutInvoice(name, qty = 1, kind = "inventory") {
  const amount = Math.max(1, Number(qty || 1));
  const product = kind === "coal"
    ? ensureCoalItem(name).name
    : ensureStockItem(name, /чаш|hype|хайп/i.test(name) ? "bowl" : "item").name;
  if (!Array.isArray(state.tobacco)) state.tobacco = [];
  const date = loungeDefaultDate();
  if (kind === "coal") {
    const item = ensureCoalItem(name);
    const perPack = coalPackSize(item);
    state.tobacco.push({
      id: uid(),
      kind,
      date,
      product,
      packs: amount,
      perPack,
      qty: amount * perPack,
      supplier: "",
      sum: 0,
      note: "закуп без накладной",
    });
    return;
  }
  state.tobacco.push({
    id: uid(),
    kind,
    date,
    product,
    supplier: "",
    qty: amount,
    sum: 0,
    note: "закуп без накладной",
  });
}

function fulfillNeedBuy(name, kind = "inventory") {
  if (kind === "coal") {
    const item = ensureCoalItem(name);
    const qty = Math.max(1, itemNeedBuy(item) || 1);
    buyWithoutInvoice(name, qty, "coal");
    item.needBuy = 0;
    return;
  }
  const item = ensureStockItem(name, /чаш|hype|хайп/i.test(name) ? "bowl" : "item");
  const qty = Math.max(1, monthNeedQty(item) || itemNeedBuy(item) || 1);
  buyWithoutInvoice(item.name, qty, "inventory");
  item.needBuy = 0;
  item.alert = false;
}

function markNeedBuy(name, qty = 1) {
  if (isConsumable(name)) return null;
  const item = ensureStockItem(name, /чаш|hype|хайп/i.test(name) ? "bowl" : "item");
  if (item.skip) return null;
  item.needBuy = itemNeedBuy(item) + Math.max(1, Number(qty || 1));
  item.alert = true;
  return item;
}

function undoFalseBuys() {
  if (state.loungeBoughtUndoV1) return;
  if (state.loungeBoughtV1) {
    state.tobacco = (state.tobacco || []).filter((row) => row.note !== "закуп без накладной");
  }
  const hype = ensureHypeBowl();
  const bought = (state.tobacco || []).some((row) =>
    (row.kind || "tobacco") === "inventory" && isHypeBowl(row.product)
  );
  if (!bought) hype.needBuy = Math.max(1, itemNeedBuy(hype));
  state.loungeBoughtV1 = true;
  state.loungeBoughtUndoV1 = true;
  save();
}

function coalNow(item) {
  const per = coalPackSize(item);
  const startPacks = item.startPacks != null ? Number(item.startPacks || 0) : Number(item.start || 0) / per;
  return startPacks + incomingCoalPacks(item.name, per);
}

function namedCoalOpening() {
  return ensureCoalStock().reduce((sum, item) => {
    const per = coalPackSize(item);
    const startPacks = item.startPacks != null ? Number(item.startPacks || 0) : Number(item.start || 0) / per;
    return sum + startPacks * per;
  }, 0);
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
  if ((rev.items || []).length) return false;
  return revisionTotal(rev) === 0 && Number(rev.coals || 0) === 0;
}

function pruneEmptyRevisions() {
  if (!Array.isArray(state.revisions)) return;
  const keepMonth = monthKey(viewRevMonth);
  const next = state.revisions.filter((rev) => {
    if (!isEmptyRevision(rev) || rev.date === OPENING_DATE) return true;
    return monthKey(parseISODate(rev.date)) === keepMonth;
  });
  if (next.length !== state.revisions.length) {
    state.revisions = next;
    save();
  }
}

function shownRevision() {
  return ensureRevision($("#revisionDate")?.value || toISODate(viewRevMonth));
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
  const monthISO = toISODate(viewRevMonth);
  const dateInput = $("#revisionDate");
  if (dateInput) {
    const min = monthStartISO(monthISO);
    const max = lastDayOfMonthISO(monthISO);
    dateInput.min = min;
    dateInput.max = max;
    if (document.activeElement !== dateInput) {
      dateInput.value = clampDateToMonth(dateInput.value || max, monthISO);
    }
  }
  const date = dateInput?.value || lastDayOfMonthISO(monthISO);
  const rev = ensureRevision(date);
  rev.date = clampDateToMonth(date, monthISO);
  shownRevDate = rev.date;
  const monthLabel = $("#revMonthLabel");
  if (monthLabel) {
    monthLabel.textContent = `${MONTHS_RU[viewRevMonth.getMonth()]} ${viewRevMonth.getFullYear()}`;
  }
  const tangiersBrandOpt = document.querySelector('#addBrandForm [name="group"] option[value="tangiers"]');
  if (tangiersBrandOpt) tangiersBrandOpt.hidden = db.current === "shishka";
  const tangiersIncomeOpt = document.querySelector('#incomeGroupSelect option[value="tangiers"]');
  if (tangiersIncomeOpt) tangiersIncomeOpt.hidden = db.current === "shishka";
  $("#coalsInput").value = rev.coals || 0;
  if (!Array.isArray(state.hookahSales)) state.hookahSales = [];
  const packInput = document.querySelector('#coalForm [name="perPack"]');
  if (packInput && document.activeElement !== packInput) {
    packInput.value = coalsPerPack();
  }
  const snap = rev.date;
  const prev = prevMonthRevision(snap);
  const prevTotal = prev ? revisionTotal(prev) : 0;
  const usedTotal = prev ? prevTotal - revisionTotal(rev) : null;
  const coalsUsed = prev ? usedCoals(rev, snap) : null;
  $("#revisionPrev").textContent = formatGrams(prevTotal);
  $("#revisionTotal").textContent = formatGrams(revisionTotal(rev));
  $("#revisionUsed").textContent = usedTotal == null ? "—" : formatGrams(usedTotal);
  const prevCoals = Number(prev?.coals || 0);
  const nowCoals = Number(rev.coals || 0);
  const coalsPrevEl = $("#coalsPrev");
  if (coalsPrevEl) coalsPrevEl.textContent = `${formatGrams(prevCoals)} шт`;
  const coalsNowEl = $("#coalsNow");
  if (coalsNowEl) coalsNowEl.textContent = `${formatGrams(nowCoals)} шт`;
  const coalsRemain = $("#coalsRemain");
  if (coalsRemain) {
    coalsRemain.textContent = coalsUsed == null ? "—" : `${formatGrams(coalsUsed)} шт`;
    coalsRemain.classList.toggle("low-stock", Number(coalsUsed) > 0);
  }
  const groups = REVISION_GROUPS.filter((group) => db.current !== "shishka" || group.id !== "tangiers");
  if (!rev.items.length) {
    $("#revisionRows").innerHTML = `<p class="rev-empty">Список пустой. Добавь марку сам: тип + название + граммы остатка.</p>`;
    if (!$("#reportView")?.hidden && reportKind === "revision") renderRevisionReport();
    return;
  }
  $("#revisionRows").innerHTML = groups
    .map((group) => {
      const rows = rev.items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => itemGroup(item) === group.id);
      if (!rows.length) return "";
      const used = prev ? usedGramsForGroup(rev, group.id, snap) : null;
      const list = rows.map(({ item, index }) => `
          <div class="sheet-row rev-item group-${group.id}">
            <span>${escapeHtml(item.name)}</span>
            <input type="number" min="0" step="1" inputmode="numeric" value="${item.grams || 0}" data-grams="${index}">
            <button type="button" class="danger compact" data-del-brand="${index}" aria-label="Удалить">×</button>
          </div>
        `).join("");
      return `
        <section class="rev-block group-${group.id}">
          <h3>${escapeHtml(group.title)}${used == null ? "" : ` <small>− ${formatGrams(used)} г</small>`}</h3>
          ${list}
        </section>
      `;
    })
    .join("");
  if (!$("#reportView")?.hidden && reportKind === "revision") renderRevisionReport();
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
  if (stockWrap) stockWrap.hidden = true;
  if (freeWrap) freeWrap.hidden = false;
  const groupWrap = $("#tobaccoGroupWrap");
  if (groupWrap) groupWrap.hidden = incomingKind !== "tobacco";
  const submit = $("#tobaccoSubmit");
  if (submit) submit.hidden = isCoal;
  const tobaccoForm = $("#tobaccoForm");
  if (tobaccoForm) tobaccoForm.hidden = isCoal;
  const coalForm = $("#coalForm");
  if (coalForm) coalForm.hidden = !isCoal;
  if (isInventory && stockSelect && isMouthpiece(stockSelect.value)) {
    $("#qtyLabelText").textContent = "Пачек";
  }
  if (productInput) {
    productInput.required = isInventory;
  }
  if (stockSelect) {
    stockSelect.disabled = true;
    stockSelect.required = false;
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
  const groupId = REVISION_GROUPS.some((item) => item.id === group) ? group : brandGroup(product);
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
  box.innerHTML = REVISION_GROUPS.filter((group) => db.current !== "shishka" || group.id !== "tangiers").map((group, index) => {
    const grams = incomingRows()
      .filter((row) => rowGroup(row) === group.id)
      .reduce((sum, row) => sum + Number(row.qty || 0), 0);
    return `
      <button type="button" class="sale-btn group-${group.id}" data-income-group="${group.id}">
        <strong>${index + 1}. ${group.title}</strong>
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
    $("#tobaccoStats").innerHTML = REVISION_GROUPS.filter((group) => db.current !== "shishka" || group.id !== "tangiers").map((group, index) => {
      const grams = rows
        .filter((row) => rowGroup(row) === group.id)
        .reduce((total, row) => total + Number(row.qty || 0), 0);
      return `<div class="stat group-${group.id}"><span>${index + 1}. ${group.title}</span><b>${formatGrams(grams)} г</b></div>`;
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
    $("#tobaccoList").innerHTML = `<p class="empty">${incomingKind === "tobacco" ? "Выбери тип, укажи граммы и нажми «Записать приход»" : meta.empty}</p>`;
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

function hallCard(item, { now, income, broken, restockAttr, delAttr, unit = "шт", need = 0, extra = "" }) {
  const tags = [
    income ? `<span class="hall-tag in">пришло +${income}</span>` : "",
    broken ? `<span class="hall-tag out">сломали −${broken}</span>` : "",
  ].join("");
  return `
    <article class="hall-card ${need ? "is-need" : ""}">
      <div class="hall-card-top">
        <h3>${escapeHtml(item.name)}</h3>
        <b>${now} ${unit}</b>
      </div>
      <p class="hall-tags">${tags}</p>
      ${extra}
      ${need ? `<button type="button" class="primary compact" ${restockAttr}="${escapeHtml(item.name)}">Закупили ${need} шт</button>` : ""}
      <button type="button" class="text-del" ${delAttr}="${item.id}">убрать</button>
    </article>
  `;
}

function renderLoungeAlerts() {
  const box = $("#loungeAlerts");
  const badge = $("#loungeBadge");
  const rows = loungeAlertRows();
  if (badge) {
    badge.hidden = !rows.length;
    badge.textContent = rows.length ? String(rows.length) : "";
  }
  if (!box) return;
  if (!rows.length) {
    box.innerHTML = "";
    return;
  }
  box.innerHTML = `
    <div class="lounge-alert">
      <p>Сломали, ждут закуп</p>
      <span>${rows.map((row) => escapeHtml(row.name)).join(" · ")}</span>
    </div>
  `;
}

function renderInventoryStock() {
  const box = $("#inventoryStock");
  if (!box) return;
  box.hidden = false;
  const stock = ensureInventory();
  const bowls = stock.filter((item) => stockKind(item) === "bowl");
  const rest = stock.filter((item) => stockKind(item) !== "bowl");
  const group = (title, items, placeholder, kind, coal = false) => `
    <section class="hall-group">
      <h2 class="block-title">${title}</h2>
      <div class="hall-grid">
        ${items.length ? items.map((item) => hallCard(item, coal
          ? {
              now: formatBoxes(coalNow(item)),
              income: (() => {
                const packs = packsInLoungeMonth(item.name, coalPackSize(item));
                return packs ? formatBoxes(packs) : "";
              })(),
              broken: 0,
              unit: "",
              restockAttr: "data-restock-coal",
              delAttr: "data-del-coal-stock",
              extra: `<label class="hall-pack">в коробке <input type="number" min="1" step="1" value="${coalPackSize(item)}" data-coal-pack="${item.id}"></label>`,
            }
          : {
              now: stockNow(item),
              income: qtyInLoungeMonth(item.name),
              broken: monthBrokenQty(item.name),
              need: monthNeedQty(item),
              restockAttr: "data-restock",
              delAttr: "data-del-stock",
            })).join("") : `<p class="empty">Пока пусто</p>`}
      </div>
      <form class="add-brand ${coal ? "" : "add-stock-form"}" ${coal ? 'id="addCoalStockForm"' : `data-stock-kind="${kind}"`}>
        <input type="text" name="name" placeholder="${placeholder}" required>
        <button type="submit" class="primary compact">Добавить</button>
      </form>
    </section>
  `;
  box.innerHTML = `
    ${group("Чаши", bowls, "Название чаши", "bowl")}
    ${group("Инвентарь", rest, "Колба, калауд…", "item")}
    ${group("Уголь", ensureCoalStock(), "Название угля", "coal", true)}
  `;
}

function renderLounge() {
  undoFalseBuys();
  renderLoungeAlerts();
  renderInventoryStock();
  renderFines();
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
  renderLounge();
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
    syncReportBtn();
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
    if (!emp || !window.confirm(`Убрать ${emp.name} из табеля?`)) return;
    if (emp.leftOn || isPlaceholderEmployee(emp)) {
      state.employees = state.employees.filter((row) => row.id !== emp.id);
    } else {
      emp.leftOn = todayISO();
    }
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
  const date = clampDateToMonth(data.date, toISODate(viewLoungeMonth));
  if (!Array.isArray(state.fines)) state.fines = [];
  state.fines.push({
    id: uid(),
    empId: data.empId,
    date,
    what,
    qty: Number(data.qty || 1),
    sum: Number(data.sum || 0),
  });
  extrasFor(data.empId).damage = 0;
  save();
  e.target.reset();
  setTodayDefaults();
  renderShifts();
  renderLounge();
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

$("#prevRevMonth")?.addEventListener("click", () => {
  viewRevMonth = new Date(viewRevMonth.getFullYear(), viewRevMonth.getMonth() - 1, 1);
  const dateInput = $("#revisionDate");
  if (dateInput) dateInput.value = lastDayOfMonthISO(toISODate(viewRevMonth));
  renderRevision();
});

$("#nextRevMonth")?.addEventListener("click", () => {
  viewRevMonth = new Date(viewRevMonth.getFullYear(), viewRevMonth.getMonth() + 1, 1);
  const dateInput = $("#revisionDate");
  if (dateInput) {
    const today = todayISO();
    dateInput.value = monthKey(viewRevMonth) === monthKey(new Date())
      ? today
      : lastDayOfMonthISO(toISODate(viewRevMonth));
  }
  renderRevision();
});

$("#prevLoungeMonth")?.addEventListener("click", () => {
  viewLoungeMonth = new Date(viewLoungeMonth.getFullYear(), viewLoungeMonth.getMonth() - 1, 1);
  renderLounge();
});

$("#nextLoungeMonth")?.addEventListener("click", () => {
  viewLoungeMonth = new Date(viewLoungeMonth.getFullYear(), viewLoungeMonth.getMonth() + 1, 1);
  renderLounge();
});

$("#revisionDate").addEventListener("change", () => {
  const iso = $("#revisionDate").value;
  if (iso) {
    const date = parseISODate(iso);
    viewRevMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  }
  renderRevision();
});

$("#revisionRows").addEventListener("input", (e) => {
  const index = e.target.dataset.grams;
  if (index == null) return;
  const rev = shownRevision();
  if (!rev?.items[Number(index)]) return;
  rev.items[Number(index)].grams = Number(e.target.value || 0);
  save();
  const prev = prevMonthRevision(rev.date);
  const prevTotal = prev ? revisionTotal(prev) : 0;
  if ($("#revisionPrev")) $("#revisionPrev").textContent = formatGrams(prevTotal);
  if ($("#revisionTotal")) $("#revisionTotal").textContent = formatGrams(revisionTotal(rev));
  if ($("#revisionUsed")) $("#revisionUsed").textContent = prev ? formatGrams(prevTotal - revisionTotal(rev)) : "—";
});

$("#revisionRows").addEventListener("click", (e) => {
  const del = e.target.dataset.delBrand;
  if (del == null) return;
  const rev = shownRevision();
  if (!rev) return;
  rev.items.splice(Number(del), 1);
  save();
  renderRevision();
});

$("#coalsInput").addEventListener("input", (e) => {
  const rev = shownRevision();
  if (!rev) return;
  rev.coals = Number(e.target.value || 0);
  save();
  const remainEl = $("#coalsRemain");
  if (remainEl) {
    const prev = prevMonthRevision(rev.date);
    const now = usedCoals(rev, rev.date);
    remainEl.textContent = prev ? `${formatGrams(now)} шт` : "—";
    remainEl.classList.toggle("low-stock", Boolean(prev) && now > 0);
    const coalsPrevEl = $("#coalsPrev");
    if (coalsPrevEl) coalsPrevEl.textContent = `${formatGrams(Number(prev?.coals || 0))} шт`;
    const coalsNowEl = $("#coalsNow");
    if (coalsNowEl) coalsNowEl.textContent = `${formatGrams(Number(rev.coals || 0))} шт`;
  }
  const coalsWarn = $("#coalsWarn");
  if (coalsWarn) coalsWarn.hidden = Number(rev.coals || 0) > 0 || remainCoals(rev, rev.date) > 0;
});

$("#addBrandForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const name = (data.name || "").trim();
  if (!name) return;
  const rev = shownRevision();
  if (!rev) return;
  const group = REVISION_GROUPS.some((item) => item.id === data.group) ? data.group : brandGroup(name);
  if (!rev.items.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    rev.items.push({ name, grams: 0, group });
    save();
    renderRevision();
  }
  e.target.reset();
  if (e.target.group) e.target.group.value = group;
});

$("#saleForm")?.addEventListener("submit", (e) => e.preventDefault());

$("#gramsPerHookah")?.addEventListener("input", (e) => {
  state.gramsPerHookah = Math.max(1, Number(e.target.value || DEFAULT_GRAMS_PER_HOOKAH));
  save();
  renderRevision();
});

$("#coalsPerHookah")?.addEventListener("input", (e) => {
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

$("#saleButtons")?.addEventListener("click", (e) => {
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

$("#incomeGroupButtons")?.addEventListener("click", (e) => {
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

let invoiceDrafts = [];
let invoiceDraftMeta = { date: "", check: "", supplier: "Rotana" };

function setScanStatus(text, show = true) {
  const el = $("#scanStatus");
  if (!el) return;
  el.hidden = !show;
  el.textContent = text || "";
}

function guessIncomeKind(name) {
  const n = normalizeName(name);
  if (/угол|coal|coco|cocoloco|bigmaks|коконар|том\s*коко|\d+\s*mm/.test(n)) return "coal";
  if (/чаш|колб|калауд|мундштук|щипц|ершик|коврик|доска|фольг|шило|колпак|кадиллак|lotus|alpha bowl/.test(n)) {
    return "inventory";
  }
  return "tobacco";
}

function parseInvoiceDate(text) {
  const match = String(text || "").match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  let year = match[3];
  if (year.length === 2) year = `20${year}`;
  return `${year}-${month}-${day}`;
}

function parseInvoiceCheck(text) {
  const match = String(text || "").match(/(?:чек|накладн|док(?:умент)?|№|#)\s*[:.]?\s*(\d{3,})/i)
    || String(text || "").match(/\b(\d{5,})\b/);
  return match ? match[1] : "";
}

function parseMoney(value) {
  const clean = String(value || "").replace(/\s/g, "").replace(",", ".");
  const num = Number(clean);
  return Number.isFinite(num) ? num : 0;
}

function parseInvoiceLines(text) {
  const date = parseInvoiceDate(text) || new Date().toISOString().slice(0, 10);
  const check = parseInvoiceCheck(text);
  const supplier = /rotana|ротана/i.test(text) ? "Rotana" : "";
  const rows = [];
  String(text || "").split(/\n+/).forEach((line) => {
    const clean = line.replace(/\s+/g, " ").trim();
    if (clean.length < 6) return;
    if (/итого|всего|сумма|накладн|поставщик|получател|дата|чек/i.test(clean) && !/\d{2,}\s+\d{3,}/.test(clean)) return;
    const hit = clean.match(/^(.*?)(?:\s+(\d+(?:[.,]\d+)?))?\s+(\d[\d\s]{2,})$/);
    if (!hit) return;
    let product = hit[1].replace(/[-–]+$/g, "").trim();
    const qty = parseMoney(hit[2] || "1");
    const sum = parseMoney(hit[3]);
    product = product.replace(/^\d+[.)]\s*/, "").trim();
    if (product.length < 3 || sum < 100) return;
    const kind = guessIncomeKind(product);
    rows.push({
      keep: true,
      kind,
      group: brandGroup(product),
      product,
      qty: kind === "coal" && qty <= 200 ? qty : Math.round(qty || 1),
      packs: kind === "coal" ? Math.max(1, Math.round(qty || 1)) : 0,
      sum,
    });
  });
  invoiceDraftMeta = { date, check, supplier: supplier || "Rotana" };
  invoiceDrafts = rows.length ? rows : [{
    keep: true,
    kind: "tobacco",
    group: "classic",
    product: "",
    qty: 0,
    packs: 1,
    sum: 0,
  }];
}

function renderInvoiceDraft() {
  const box = $("#scanDraft");
  if (!box) return;
  if (!invoiceDrafts.length) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  box.hidden = false;
  box.innerHTML = `
    <p class="hint">Проверь, поправь если надо, и только потом запиши.</p>
    <label>Дата
      <input type="date" id="scanDate" value="${invoiceDraftMeta.date || ""}">
    </label>
    <label>Поставщик
      <input type="text" id="scanSupplier" value="${escapeHtml(invoiceDraftMeta.supplier || "")}">
    </label>
    <label>Номер чека
      <input type="text" id="scanCheck" value="${escapeHtml(invoiceDraftMeta.check || "")}">
    </label>
    <div class="scan-draft">
      ${invoiceDrafts.map((row, index) => `
        <div class="scan-row${row.keep ? "" : " is-off"}" data-scan-row="${index}">
          <label class="scan-row-top">
            <input type="checkbox" data-scan-keep="${index}" ${row.keep ? "checked" : ""}>
            Записать эту строку
          </label>
          <label>Что это
            <select data-scan-kind="${index}">
              <option value="tobacco"${row.kind === "tobacco" ? " selected" : ""}>Табак</option>
              <option value="inventory"${row.kind === "inventory" ? " selected" : ""}>Инвентарь</option>
              <option value="coal"${row.kind === "coal" ? " selected" : ""}>Уголь</option>
            </select>
          </label>
          <label ${row.kind === "tobacco" ? "" : "hidden"}>Тип
            <select data-scan-group="${index}">
              <option value="classic"${row.group === "classic" ? " selected" : ""}>Классик</option>
              <option value="premium"${row.group === "premium" ? " selected" : ""}>Премиум</option>
              <option value="fruit"${row.group === "fruit" ? " selected" : ""}>Фрукт</option>
              <option value="tangiers"${row.group === "tangiers" ? " selected" : ""}>Tangiers</option>
            </select>
          </label>
          <label>Название
            <input type="text" data-scan-product="${index}" value="${escapeHtml(row.product)}">
          </label>
          <div class="row">
            <label>${row.kind === "coal" ? "Пачек" : row.kind === "inventory" ? "Штук" : "Граммы"}
              <input type="number" data-scan-qty="${index}" min="0" step="1" value="${row.kind === "coal" ? row.packs || row.qty : row.qty}">
            </label>
            <label>Сумма
              <input type="number" data-scan-sum="${index}" min="0" step="1" value="${row.sum || 0}">
            </label>
          </div>
        </div>
      `).join("")}
    </div>
    <div class="scan-actions">
      <button type="button" class="primary" id="scanSave">Записать проверенное</button>
      <button type="button" class="ghost" id="scanCancel">Отмена</button>
    </div>
  `;
}

function collectInvoiceDraft() {
  invoiceDraftMeta.date = $("#scanDate")?.value || invoiceDraftMeta.date;
  invoiceDraftMeta.supplier = $("#scanSupplier")?.value.trim() || "";
  invoiceDraftMeta.check = $("#scanCheck")?.value.trim() || "";
  invoiceDrafts = invoiceDrafts.map((row, index) => ({
    ...row,
    keep: Boolean(document.querySelector(`[data-scan-keep="${index}"]`)?.checked),
    kind: document.querySelector(`[data-scan-kind="${index}"]`)?.value || row.kind,
    group: document.querySelector(`[data-scan-group="${index}"]`)?.value || row.group,
    product: document.querySelector(`[data-scan-product="${index}"]`)?.value.trim() || row.product,
    qty: Number(document.querySelector(`[data-scan-qty="${index}"]`)?.value || 0),
    packs: Number(document.querySelector(`[data-scan-qty="${index}"]`)?.value || 0),
    sum: Number(document.querySelector(`[data-scan-sum="${index}"]`)?.value || 0),
  }));
}

function clearInvoiceDraft() {
  invoiceDrafts = [];
  const box = $("#scanDraft");
  const img = $("#scanPreview");
  const photo = $("#invoicePhoto");
  if (box) {
    box.hidden = true;
    box.innerHTML = "";
  }
  if (img) {
    img.hidden = true;
    img.removeAttribute("src");
  }
  if (photo) photo.value = "";
  setScanStatus("", false);
}

function saveInvoiceDraft() {
  collectInvoiceDraft();
  const date = invoiceDraftMeta.date || new Date().toISOString().slice(0, 10);
  const note = invoiceDraftMeta.check ? `чек ${invoiceDraftMeta.check}` : "фото накладной";
  const supplier = invoiceDraftMeta.supplier;
  const picked = invoiceDrafts.filter((row) => row.keep && row.product && Number(row.qty || row.packs) > 0);
  if (!picked.length) {
    window.alert("Нет строк для записи. Проверь галочки, название и количество.");
    return;
  }
  picked.forEach((row) => {
    if (row.kind === "tobacco") {
      addTobaccoIncome({
        date,
        group: row.group,
        product: row.product,
        qty: row.qty,
        sum: row.sum,
        supplier,
        note,
      });
      return;
    }
    if (row.kind === "coal") {
      addCoalIncome({
        date,
        product: row.product,
        packs: row.packs || row.qty,
        perPack: coalsPerPack(),
        sum: row.sum,
        supplier,
        note,
      });
      return;
    }
    const product = ensureStockItem(row.product).name;
    state.tobacco.push({
      id: uid(),
      kind: "inventory",
      date,
      product,
      supplier,
      qty: Number(row.qty),
      sum: Number(row.sum || 0),
      note,
    });
  });
  save();
  incomingKind = picked[0].kind;
  setTodayDefaults();
  renderTobacco();
  renderRevision();
  clearInvoiceDraft();
  setScanStatus(`Записал ${picked.length} поз. Проверь список ниже.`, true);
}

async function loadTesseract() {
  if (window.Tesseract) return window.Tesseract;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("ocr"));
    document.head.appendChild(script);
  });
  return window.Tesseract;
}

function shrinkInvoiceImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    img.src = url;
  });
}

async function scanInvoicePhoto(file) {
  if (!file) return;
  const preview = $("#scanPreview");
  if (preview) {
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
  }
  setScanStatus("Читаю фото… это может занять полминуты", true);
  try {
    const Tesseract = await loadTesseract();
    const image = await shrinkInvoiceImage(file);
    const worker = await Tesseract.createWorker("rus+eng");
    const result = await worker.recognize(image);
    await worker.terminate();
    parseInvoiceLines(result?.data?.text || "");
    renderInvoiceDraft();
    setScanStatus(
      invoiceDrafts.some((row) => row.product)
        ? "Проверь строки. Если что-то не то — поправь руками."
        : "Текст прочитался плохо. Допиши строки руками и запиши.",
      true
    );
  } catch {
    setScanStatus("Не смог прочитать фото. Можно вписать позиции руками ниже.", true);
    parseInvoiceLines("");
    renderInvoiceDraft();
  }
}

$("#invoicePhoto")?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) scanInvoicePhoto(file);
});

document.addEventListener("click", (event) => {
  if (event.target.id === "scanSave") {
    saveInvoiceDraft();
    return;
  }
  if (event.target.id === "scanCancel") {
    clearInvoiceDraft();
  }
});

document.addEventListener("change", (event) => {
  const kind = event.target?.dataset?.scanKind;
  if (kind == null) return;
  collectInvoiceDraft();
  renderInvoiceDraft();
});

$("#tobaccoForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const kind = data.kind || incomingKind;
  if (kind === "tobacco") {
    addTobaccoIncome({
      date: data.date,
      group: data.group,
      product: (data.product || "").trim(),
      qty: data.qty,
      sum: data.sum,
      supplier: (data.supplier || "").trim(),
      note: (data.note || "").trim(),
    });
    save();
    e.target.reset();
    incomingKind = "tobacco";
    setTodayDefaults();
    renderTobacco();
    renderRevision();
    return;
  }
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
      if (!isConsumable(product)) product = ensureStockItem(product).name;
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
    if (kind === "inventory" && !isConsumable(product)) {
      const stock = ensureStockItem(product);
      stock.needBuy = Math.max(0, itemNeedBuy(stock) - Number(data.qty || 1));
      if (!stock.needBuy) stock.alert = false;
    }
  }
  save();
  e.target.reset();
  incomingKind = kind;
  setTodayDefaults();
  renderTobacco();
  renderRevision();
  renderLounge();
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
    const gone = (state.fines || []).find((f) => f.id === fineId);
    state.fines = (state.fines || []).filter((f) => f.id !== fineId);
    if (gone?.what) {
      const item = ensureInventory().find((row) => row.name.toLowerCase() === gone.what.toLowerCase());
      if (item) {
        item.needBuy = Math.max(0, itemNeedBuy(item) - Number(gone.qty || 1));
        if (!item.needBuy) item.alert = false;
      }
    }
    save();
    renderShifts();
    renderLounge();
  }
  const buy = e.target.dataset.buy;
  if (buy) {
    fulfillNeedBuy(buy, e.target.dataset.buyKind === "coal" ? "coal" : "inventory");
    save();
    renderLounge();
    renderTobacco();
    return;
  }
  const restock = e.target.dataset.restock;
  if (restock) {
    fulfillNeedBuy(restock, "inventory");
    save();
    renderLounge();
    renderTobacco();
    return;
  }
  const restockCoal = e.target.dataset.restockCoal;
  if (restockCoal) {
    fulfillNeedBuy(restockCoal, "coal");
    save();
    renderLounge();
    renderTobacco();
    return;
  }
  const stockId = e.target.dataset.delStock;
  if (stockId) {
    state.inventoryStock = ensureInventory().filter((item) => item.id !== stockId);
    save();
    renderLounge();
    renderTobacco();
  }
  const coalStockId = e.target.dataset.delCoalStock;
  if (coalStockId) {
    state.coalStock = ensureCoalStock().filter((item) => item.id !== coalStockId);
    save();
    renderLounge();
    renderTobacco();
  }
});

document.addEventListener("input", (e) => {
  const packId = e.target.dataset.coalPack;
  if (packId) {
    const item = ensureCoalStock().find((row) => row.id === packId);
    if (!item) return;
    item.perPack = Math.max(1, Number(e.target.value || DEFAULT_COALS_PER_PACK));
    save();
    renderLounge();
    return;
  }
  const stockId = e.target.dataset.stockStart;
  if (stockId) {
    const item = ensureInventory().find((row) => row.id === stockId);
    if (!item) return;
    item.start = Number(e.target.value || 0);
    save();
    const row = e.target.closest("tr");
    const cell = row?.querySelector(".sum");
    if (cell) cell.textContent = `${stockNow(item)} ${stockUnit(item)}`;
    row?.classList.toggle("low-stock", stockNeedsBuy(item));
    renderLoungeAlerts();
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
    renderLounge();
    renderTobacco();
    return;
  }
  if (!e.target.classList.contains("add-stock-form")) return;
  e.preventDefault();
  const name = new FormData(e.target).get("name").trim();
  if (!name || isConsumable(name)) return;
  ensureStockItem(name, e.target.dataset.stockKind || "item");
  save();
  e.target.reset();
  renderLounge();
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
  const rev = shownRevision();
  if (!rev) return;
  rev.date = clampDateToMonth($("#revisionDate").value || toISODate(viewRevMonth), toISODate(viewRevMonth));
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
      db.updatedAt = Date.now();
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

$("#reportBtn")?.addEventListener("click", () => {
  const tab = document.querySelector(".tab.is-active")?.dataset.tab;
  if (tab === "revision") openRevisionReport();
  else openReport();
});
$("#revisionReportBtn")?.addEventListener("click", () => openRevisionReport());
$("#reportClose")?.addEventListener("click", () => closeReport());
window.addEventListener("resize", () => {
  if (!$("#reportView")?.hidden) fitReportPaper();
});
window.addEventListener("orientationchange", () => {
  setTimeout(fitReportPaper, 280);
});
window.visualViewport?.addEventListener("resize", () => {
  if (!$("#reportView")?.hidden) fitReportPaper();
});

$("#printBtn").addEventListener("click", () => {
  const tab = document.querySelector(".tab.is-active")?.dataset.tab;
  const onSheet = tab === "checklist";
  const onTimesheet = tab === "shifts" || document.body.classList.contains("report-open");
  document.body.classList.toggle("print-checklist", onSheet);
  if (!onSheet && (tab === "revision" || reportKind === "revision")) {
    openRevisionReport();
    document.body.classList.add("print-report");
  } else if (onTimesheet && !onSheet) {
    openReport();
    document.body.classList.add("print-report");
  }
  window.print();
});

window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-checklist", "print-report");
});

localStorage.setItem("journal-seen", APP_VERSION);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  }).catch(() => {});
}
if (window.caches?.keys) {
  caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch(() => {});
}

["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
  document.addEventListener(type, (event) => event.preventDefault(), { passive: false });
});

let lastTapAt = 0;
document.addEventListener("touchend", (event) => {
  if (event.target.closest("input, textarea, select, button, a")) {
    lastTapAt = Date.now();
    return;
  }
  const now = Date.now();
  if (now - lastTapAt < 350) event.preventDefault();
  lastTapAt = now;
}, { passive: false });

document.addEventListener("dblclick", (event) => event.preventDefault());

syncVenueUi();
syncReportBtn();
setTodayDefaults();
render();
bootCloud();
