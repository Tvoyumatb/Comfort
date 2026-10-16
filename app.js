const KEY = "shop-reports-v4";
const OLD_KEY = "shop-reports-v3";

const VENUES = {
  tangiers: "Tangiers",
  shishka: "Shishka Premium",
};

const SALE_GROUPS = [
  { id: "classic", num: "1", title: "Классик", note: "Smoke break" },
  { id: "premium", num: "2", title: "Премиум", note: "Smoke break+" },
  { id: "tangiers", num: "3", title: "Tangiers", note: "Tangiers-акция" },
];

const PREMIUM_BRANDS = [
  "overdose", "spectrum", "deus", "sebero", "starline", "darkside",
  "musthave", "satyr", "jent", "hooligan", "jent cigar",
  "blackburn/banger/bliss/chabacco",
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
    hint: "Поступления в граммах",
    name: "Марка",
    placeholder: "Например Starline",
    qty: "Граммы",
    unit: "г",
    qtyStat: "Граммы",
    empty: "Прихода табака пока нет",
  },
  inventory: {
    title: "Приход инвентаря",
    hint: "Приход привязан к остаткам: изначально + дозакупка − порча",
    name: "Наименование",
    placeholder: "Колба, чаша, шланг",
    qty: "Количество, шт",
    unit: "шт",
    qtyStat: "Штук",
    empty: "Прихода инвентаря пока нет",
  },
  coal: {
    title: "Приход угля",
    hint: "Коробки или килограммы",
    name: "Наименование",
    placeholder: "Кокосовый уголь",
    qty: "Количество",
    unit: "шт",
    qtyStat: "Кол-во",
    empty: "Прихода угля пока нет",
  },
};

const db = loadDb();
let state = db.venues[db.current];
let viewMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let half = new Date().getDate() > 15 ? 1 : 0;
let incomingKind = "tobacco";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function defaultInventory() {
  return [
    { id: uid(), name: "Колба", start: 0 },
    { id: uid(), name: "Чаша", start: 0 },
  ];
}

function defaultChecklist(venueId) {
  const items = venueId === "shishka"
    ? ["Classic", "Premium", "Smoke brush", "Smoke brush"]
    : ["Classic", "Premium", "Tangiers", "Smoke brush", "Smoke brush", "Tangiers-Aroma"];
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
    fines: [],
    hookahSales: [],
    gramsPerHookah: 20,
  };
}

function normalizeVenue(data, venueId) {
  const base = emptyState(venueId);
  if (!data || typeof data !== "object") return base;
  return {
    employees: data.employees?.length ? data.employees : base.employees,
    schedule: data.schedule || {},
    extras: data.extras || {},
    rates: { ...DEFAULT_RATES, ...(data.rates || {}) },
    tobacco: data.tobacco || [],
    revisions: data.revisions || [],
    inventoryStock: data.inventoryStock?.length ? data.inventoryStock : base.inventoryStock,
    fines: data.fines || [],
    hookahSales: data.hookahSales || [],
    gramsPerHookah: Number(data.gramsPerHookah) || 20,
    checklist: data.checklist?.items
      ? {
          tableNo: data.checklist.tableNo || "20",
          copies: Number(data.checklist.copies) || 60,
          items: data.checklist.items,
        }
      : base.checklist,
  };
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
        shishka: emptyState("shishka"),
      },
    };
  } catch {
    return {
      current: "tangiers",
      venues: {
        tangiers: emptyState("tangiers"),
        shishka: emptyState("shishka"),
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
  return day === 0 || day === 6;
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
  if (!Array.isArray(state.fines)) state.fines = [];
  return state.inventoryStock;
}

function ensureStockItem(name) {
  const stock = ensureInventory();
  const found = stock.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (found) return found;
  const created = { id: uid(), name, start: 0 };
  stock.push(created);
  return created;
}

function incomingQtyFor(name) {
  return (state.tobacco || [])
    .filter((t) => (t.kind || "tobacco") === "inventory" && t.product.toLowerCase() === name.toLowerCase())
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
  if (!$("#revisionDate").value) $("#revisionDate").value = today;
  const saleDate = document.querySelector('#saleForm [name="date"]');
  if (saleDate) saleDate.value = today;
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
  return Math.max(1, Number(state.gramsPerHookah) || 20);
}

function normalizeName(name) {
  return String(name || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function brandGroup(name) {
  const n = normalizeName(name);
  if (["classic", "premium", "tangiers"].includes(n)) return n;
  if (/\+|plus|премиум|^premium$/.test(n) || n.includes("smoke break+") || n.includes("break plus")) {
    return "premium";
  }
  if (n.includes("tangiers") || n.includes("акция") || n.includes("aroma") || n === "tng") {
    return "tangiers";
  }
  if (n.includes("classic") || n.includes("классик") || n.includes("smoke break") || n.includes("smokebrush") || n.includes("smoke brush")) {
    return "classic";
  }
  if (PREMIUM_BRANDS.some((brand) => n.includes(brand))) return "premium";
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

function soldGramsForGroup(groupId, fromDate) {
  return salesForGroup(groupId, fromDate).reduce((sum, sale) => sum + Number(sale.hookahs || 0) * gramsPerHookah(), 0);
}

function soldHookahsForGroup(groupId, fromDate) {
  return salesForGroup(groupId, fromDate).reduce((sum, sale) => sum + Number(sale.hookahs || 0), 0);
}

function incomeGramsForGroup(groupId, fromDate) {
  return (state.tobacco || [])
    .filter((row) => (row.kind || "tobacco") === "tobacco"
      && brandGroup(row.product) === groupId
      && row.date > fromDate
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

function formatGrams(n) {
  return Number(n || 0).toLocaleString("ru-RU");
}

function renderRevision() {
  const date = $("#revisionDate").value || toISODate(new Date());
  $("#revisionDate").value = date;
  const rev = ensureRevision(date);
  $("#coalsInput").value = rev.coals || 0;
  if (!Array.isArray(state.hookahSales)) state.hookahSales = [];
  const gramsInput = $("#gramsPerHookah");
  if (gramsInput && document.activeElement !== gramsInput) {
    gramsInput.value = gramsPerHookah();
  }
  const remainTotal = SALE_GROUPS.reduce((sum, group) => sum + remainGroup(rev, group.id, date), 0);
  $("#revisionTotal").textContent = formatGrams(revisionTotal(rev));
  $("#revisionRemain").textContent = formatGrams(remainTotal);
  $("#revisionRows").innerHTML = rev.items.map((item, index) => `
    <label class="sheet-row">
      <span>${escapeHtml(item.name)}</span>
      <input type="number" min="0" step="1" inputmode="numeric" value="${item.grams || 0}" data-grams="${index}">
    </label>
  `).join("");

  $("#saleButtons").innerHTML = SALE_GROUPS.map((group) => {
    const remain = remainGroup(rev, group.id, date);
    const sold = soldHookahsForGroup(group.id, date);
    return `
      <button type="button" class="sale-btn" data-sale-group="${group.id}">
        <strong>${group.num}. ${group.title}</strong>
        <span>${group.note}</span>
        <b class="${remain <= 0 ? "low-stock" : ""}">${formatGrams(remain)} г</b>
        <em>продано ${sold} кальянов</em>
      </button>
    `;
  }).join("");

  const sales = [...state.hookahSales]
    .filter((sale) => inRevisionWindow(sale.date, date))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  if (!sales.length) {
    $("#salesList").innerHTML = `<p class="empty">Жмите 1 Классик, 2 Премиум или 3 Tangiers — с остатка группы спишется само</p>`;
  } else {
    $("#salesList").innerHTML = sales.map((sale) => `
      <article class="card item">
        <div class="item-head">
          <h3>${escapeHtml(groupTitle(brandGroup(sale.product)))} · ${sale.hookahs} кальянов</h3>
          <button type="button" class="danger" data-del-sale="${sale.id}">Удалить</button>
        </div>
        <p class="meta">
          ${parseISODate(sale.date).toLocaleDateString("ru-RU")}
          · −${formatGrams(Number(sale.hookahs) * gramsPerHookah())} г
        </p>
      </article>
    `).join("");
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
  if (stockWrap) stockWrap.hidden = !isInventory;
  if (freeWrap) freeWrap.hidden = isInventory;
  if (productInput) productInput.required = !isInventory;
  if (stockSelect) {
    stockSelect.required = isInventory;
    const stock = ensureInventory();
    const current = stockSelect.value;
    stockSelect.innerHTML = stock
      .map((item) => {
        const now = Number(item.start || 0) + incomingQtyFor(item.name) - fineQtyFor(item.name);
        return `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)} · сейчас ${now} шт</option>`;
      })
      .join("");
    if (current && [...stockSelect.options].some((opt) => opt.value === current)) {
      stockSelect.value = current;
    }
  }
}

function renderTobacco() {
  syncIncomeForm();
  const meta = INCOME[incomingKind];
  const rows = incomingRows();
  const qty = rows.reduce((sum, t) => sum + Number(t.qty || 0), 0);
  const sum = rows.reduce((s, t) => s + Number(t.sum || 0), 0);
  const last = rows[0]?.date ? parseISODate(rows[0].date).toLocaleDateString("ru-RU") : "—";

  $("#tobaccoStats").innerHTML = `
    <div class="stat"><span>Поступлений</span><b>${rows.length}</b></div>
    <div class="stat"><span>${meta.qtyStat}</span><b>${formatGrams(qty)}</b></div>
    <div class="stat"><span>Сумма</span><b>${formatSum(sum)}</b></div>
    <div class="stat"><span>Последний приход</span><b>${last}</b></div>
  `;

  if (!rows.length) {
    $("#tobaccoList").innerHTML = `<p class="empty">${meta.empty}</p>`;
  } else {
    $("#tobaccoList").innerHTML = rows.map((t) => `
      <article class="card item">
        <div class="item-head">
          <h3>${escapeHtml(t.product)}</h3>
          <button type="button" class="danger" data-del-tobacco="${t.id}">Удалить</button>
        </div>
        <p class="meta">
          ${parseISODate(t.date).toLocaleDateString("ru-RU")} · ${formatGrams(t.qty)} ${meta.unit}
          ${t.sum ? ` · ${formatSum(t.sum)}` : ""}
          ${t.supplier ? `<br>${escapeHtml(t.supplier)}` : ""}
          ${t.note ? `<br>${escapeHtml(t.note)}` : ""}
        </p>
      </article>
    `).join("");
  }

  const names = unique(incomingRows(), "product");
  const extras = incomingKind === "tobacco" ? DEFAULT_BRANDS : incomingKind === "inventory"
    ? ensureInventory().map((item) => item.name)
    : [];
  fillDatalist("#productsList", [...new Set([...extras, ...names])]);
  fillDatalist("#suppliersList", unique(incomingRows(), "supplier"));
  renderInventoryStock();
}

function renderInventoryStock() {
  const box = $("#inventoryStock");
  if (!box) return;
  const show = incomingKind === "inventory";
  box.hidden = !show;
  if (!show) return;
  const stock = ensureInventory();
  box.innerHTML = `
    <h2 class="block-title">Остатки инвентаря</h2>
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
          ${stock.map((item) => {
            const income = incomingQtyFor(item.name);
            const fines = fineQtyFor(item.name);
            const now = Number(item.start || 0) + income - fines;
            return `
              <tr class="${now <= 2 ? "low-stock" : ""}">
                <th class="name">${escapeHtml(item.name)}</th>
                <td><input type="number" min="0" step="1" inputmode="numeric" value="${item.start || 0}" data-stock-start="${item.id}"></td>
                <td>${income}</td>
                <td>${fines}</td>
                <td class="sum">${now}</td>
                <td>
                  <button type="button" class="ghost restock" data-restock="${escapeHtml(item.name)}">Дозакупить</button>
                  <button type="button" class="danger" data-del-stock="${item.id}">Удалить</button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
    <form class="add-brand" id="addStockForm">
      <input type="text" name="name" placeholder="Добавить позицию, например колба" required>
      <button type="submit" class="primary compact">+</button>
    </form>
    <p class="hint">Изначально ставите один раз. Дальше только приход / дозакупка и порча: сейчас = изначально + приход − порча.</p>
  `;
}

function ensureChecklist() {
  if (!state.checklist || !Array.isArray(state.checklist.items)) {
    state.checklist = defaultChecklist(db.current);
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
      ${list.items.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
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
    document.body.classList.toggle("print-checklist", btn.dataset.tab === "checklist");
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
    state.employees = state.employees.filter((emp) => emp.id !== del.dataset.delEmp);
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
  const rev = ensureRevision($("#revisionDate").value);
  rev.items[Number(index)].grams = Number(e.target.value || 0);
  save();
  const date = $("#revisionDate").value;
  $("#revisionTotal").textContent = formatGrams(revisionTotal(rev));
  $("#revisionRemain").textContent = formatGrams(
    SALE_GROUPS.reduce((sum, group) => sum + remainGroup(rev, group.id, date), 0)
  );
});

$("#coalsInput").addEventListener("input", (e) => {
  const rev = ensureRevision($("#revisionDate").value);
  rev.coals = Number(e.target.value || 0);
  save();
});

$("#addBrandForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = new FormData(e.target).get("name").trim();
  if (!name) return;
  const rev = ensureRevision($("#revisionDate").value);
  if (!rev.items.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    rev.items.push({ name, grams: 0 });
    save();
    renderRevision();
  }
  e.target.reset();
});

$("#saleForm").addEventListener("submit", (e) => e.preventDefault());

$("#gramsPerHookah").addEventListener("input", (e) => {
  state.gramsPerHookah = Math.max(1, Number(e.target.value || 20));
  save();
  renderRevision();
});

$("#saleButtons").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-sale-group]");
  if (!btn) return;
  const hookahs = Number(document.querySelector('#saleForm [name="hookahs"]')?.value || 1);
  const date = document.querySelector('#saleForm [name="date"]')?.value || toISODate(new Date());
  if (!Array.isArray(state.hookahSales)) state.hookahSales = [];
  state.hookahSales.push({
    id: uid(),
    date,
    product: btn.dataset.saleGroup,
    hookahs: Math.max(1, hookahs),
  });
  save();
  renderRevision();
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

$("#tobaccoForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const kind = data.kind || incomingKind;
  let product = (data.stockProduct || data.product || "").trim();
  if (kind === "inventory") {
    if (!product) return;
    product = ensureStockItem(product).name;
  }
  state.tobacco.push({
    id: uid(),
    kind,
    date: data.date,
    product,
    supplier: data.supplier.trim(),
    qty: Number(data.qty),
    sum: Number(data.sum || 0),
    note: data.note.trim(),
  });
  save();
  e.target.reset();
  incomingKind = kind;
  setTodayDefaults();
  renderTobacco();
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
  const stockId = e.target.dataset.delStock;
  if (stockId) {
    state.inventoryStock = ensureInventory().filter((item) => item.id !== stockId);
    save();
    renderInventoryStock();
  }
});

document.addEventListener("input", (e) => {
  const stockId = e.target.dataset.stockStart;
  if (!stockId) return;
  const item = ensureInventory().find((row) => row.id === stockId);
  if (!item) return;
  item.start = Number(e.target.value || 0);
  save();
  const income = incomingQtyFor(item.name);
  const fines = fineQtyFor(item.name);
  const cell = e.target.closest("tr")?.querySelector(".sum");
  if (cell) cell.textContent = String(item.start + income - fines);
});

document.addEventListener("submit", (e) => {
  if (e.target.id !== "addStockForm") return;
  e.preventDefault();
  const name = new FormData(e.target).get("name").trim();
  if (!name) return;
  ensureStockItem(name);
  save();
  renderInventoryStock();
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

$("#printBtn").addEventListener("click", () => {
  const onSheet = document.querySelector(".tab.is-active")?.dataset.tab === "checklist";
  document.body.classList.toggle("print-checklist", onSheet);
  window.print();
});

window.addEventListener("afterprint", () => {
  const onSheet = document.querySelector(".tab.is-active")?.dataset.tab === "checklist";
  document.body.classList.toggle("print-checklist", onSheet);
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

syncVenueUi();
setTodayDefaults();
render();
