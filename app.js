const KEY = "shop-reports-v4";
const OLD_KEY = "shop-reports-v3";

const VENUES = {
  tangiers: "Tangiers",
  shishka: "Shishka Premium",
};

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
    hint: "Чаши, щипцы, шланги и другое",
    name: "Наименование",
    placeholder: "Щипцы, чаша, шланг",
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

function extrasFor(empId) {
  const key = monthKey(viewMonth);
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
    Number(extra.damage || 0)
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
        <td><input type="number" min="0" step="1000" inputmode="numeric" value="${extra.damage || 0}" data-emp-extra="${emp.id}" data-field="damage"></td>
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

function renderShifts() {
  renderPeriod();
  renderRates();
  renderRoster();
  renderPay();
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
  if (!$("#revisionDate").value) $("#revisionDate").value = today;
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

function formatGrams(n) {
  return Number(n || 0).toLocaleString("ru-RU");
}

function renderRevision() {
  const date = $("#revisionDate").value || toISODate(new Date());
  $("#revisionDate").value = date;
  const rev = ensureRevision(date);
  $("#coalsInput").value = rev.coals || 0;
  $("#revisionTotal").textContent = formatGrams(revisionTotal(rev));
  $("#revisionRows").innerHTML = rev.items.map((item, index) => `
    <label class="sheet-row">
      <span>${escapeHtml(item.name)}</span>
      <input type="number" min="0" step="1" inputmode="numeric" value="${item.grams || 0}" data-grams="${index}">
    </label>
  `).join("");
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
  const extras = incomingKind === "tobacco" ? DEFAULT_BRANDS : [];
  fillDatalist("#productsList", [...new Set([...extras, ...names])]);
  fillDatalist("#suppliersList", unique(incomingRows(), "supplier"));
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
  $("#revisionTotal").textContent = formatGrams(revisionTotal(rev));
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

$$(".income-kind").forEach((btn) => {
  btn.addEventListener("click", () => {
    incomingKind = btn.dataset.income;
    renderTobacco();
  });
});

$("#tobaccoForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  state.tobacco.push({
    id: uid(),
    kind: incomingKind,
    date: data.date,
    product: data.product.trim(),
    supplier: data.supplier.trim(),
    qty: Number(data.qty),
    sum: Number(data.sum || 0),
    note: data.note.trim(),
  });
  save();
  e.target.reset();
  setTodayDefaults();
  renderTobacco();
});

document.addEventListener("click", (e) => {
  const tobaccoId = e.target.dataset.delTobacco;
  if (tobaccoId) {
    state.tobacco = state.tobacco.filter((t) => t.id !== tobaccoId);
    save();
    renderTobacco();
  }
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

syncVenueUi();
setTodayDefaults();
render();
