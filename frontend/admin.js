const listEl = document.getElementById("list");
const statusEl = document.getElementById("status");
const tableSearchEl = document.getElementById("tableSearch");
const msgEl = document.getElementById("msg");
const infoEl = document.getElementById("info");
const loginMsgEl = document.getElementById("loginMsg");

const refreshBtn = document.getElementById("refresh");
const autoBtn = document.getElementById("auto");

const DEFAULT_ADMIN_CREDENTIALS = [
  ["admin", "1234"],
  ["admin", "admin"],
];

function normalizeLoginValue(v) {
  return String(v ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
}

function normalizePasswordValue(v) {
  return String(v ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function getAllowedCredentials() {
  const fromWindow = window.__ADMIN_CREDENTIALS__;
  if (!Array.isArray(fromWindow)) return DEFAULT_ADMIN_CREDENTIALS;
  const normalized = fromWindow
    .filter((pair) => Array.isArray(pair) && pair.length >= 2)
    .map(([u, p]) => [normalizeLoginValue(u), normalizePasswordValue(p)])
    .filter(([u, p]) => u && p);
  return normalized.length ? normalized : DEFAULT_ADMIN_CREDENTIALS;
}

function canLogin(user, pass) {
  const u = normalizeLoginValue(user);
  const p = normalizePasswordValue(pass);
  return getAllowedCredentials().some(([au, ap]) => au === u && ap === p);
}


const API = window.__API_BASE__
  || (window.location.hostname.endsWith("vercel.app")
    ? "https://iskanderkebab-qr.onrender.com"
    : "");


// ---- TABLE FILTERS ----
const TABLES = ["1","2","3","4","5","6","7","8","9","10"]; // <-- твої столики
const selectedTables = new Set(); // пусто = показувати всі

let timer = null;
let autoOn = true;

// --- comment UI state ---
const openComments = Object.create(null);
const saveTimers = Object.create(null); // (поки не використовується)

const CLICKED_KEY = "clickedCancelOrders";
function readClickedCancel() {
  try {
    const raw = localStorage.getItem(CLICKED_KEY) || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(CLICKED_KEY);
    return [];
  }
}

const clickedCancel = new Set(readClickedCancel());

function saveClickedCancel() {
  localStorage.setItem(CLICKED_KEY, JSON.stringify([...clickedCancel]));
}

function fmtDate(s) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString();
}

function renderTablesFilter(){
  const el = document.getElementById("tablesFilter");
  if(!el) return;

  el.innerHTML = `
    <span class="mini">Столики:</span>
    ${TABLES.map(t => `
      <label class="tbl">
        <input type="checkbox" data-table="${t}">
        <span>${t}</span>
      </label>
    `).join("")}
    <button class="btn2 btnSmall" id="tblClear" type="button">Всі</button>
  `;

  el.querySelectorAll('input[data-table]').forEach(cb => {
    cb.addEventListener("change", () => {
      const t = cb.getAttribute("data-table");
      if(cb.checked) selectedTables.add(t);
      else selectedTables.delete(t);
      load(); // оновити список
    });
  });

  el.querySelector("#tblClear").addEventListener("click", () => {
    selectedTables.clear();
    el.querySelectorAll('input[data-table]').forEach(cb => cb.checked = false);
    load();
  });
}

window.login = function login() {
  const user = document.getElementById("username").value.trim().toLowerCase();
  const pass = document.getElementById("password").value.trim();
  
  if (user === "admin" && pass === "1234") {
    if (loginMsgEl) {
      loginMsgEl.textContent = "";
      loginMsgEl.className = "mini msg";
    }
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("secret").style.display = "block";

    load();
    if (timer) clearInterval(timer);
    timer = setInterval(load, 4000);
  } else {
    if (loginMsgEl) {
      loginMsgEl.textContent = "Невірний логін або пароль (використай admin / 1234)";
      loginMsgEl.className = "mini err msg";
    } else {
      setMsg("Невірний логін або пароль", false);
    }
  }
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setMsg(text, ok = true) {
  msgEl.textContent = text;
  msgEl.className = ok ? "mini ok msg" : "mini err msg";
  if (text) setTimeout(() => { msgEl.textContent = ""; }, 2500);
}

// ---------------- UI: comment toggle ----------------
window.toggleItemComment = (orderId, itemIdx) => {
  const key = `${orderId}-${itemIdx}`;
  openComments[key] = !openComments[key];

  const wrap = document.getElementById(`cw-${orderId}-${itemIdx}`);
  if (!wrap) return;

  wrap.classList.toggle("show", !!openComments[key]);

  if (openComments[key]) {
    const input = wrap.querySelector("input");
    input?.focus();
  }
};

window.setItemComment = (orderId, itemIdx, val) => {
  const key = `${orderId}-${itemIdx}`;
  if (val && !openComments[key]) openComments[key] = true;
};

// ---------------- Data load/render ----------------
async function load() {
  try {
    const st = statusEl.value;
    const q = tableSearchEl.value.trim().toLowerCase();

    const url = "/api/kitchen/orders" + (st ? `?status=${encodeURIComponent(st)}` : "");
    const res = await fetch(API + url);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMsg("Błąd ładowania: " + (data.detail || res.status), false);
      return;
    }

    const orders = await res.json();

    // ✅ комбінуємо фільтри
    let filtered = orders;

    // 1) фільтр по вибраних столиках
    if (selectedTables.size > 0) {
      filtered = filtered.filter(o => selectedTables.has(String(o.table_code || "")));
    }

    // 2) пошук по table_code
    if (q) {
      filtered = filtered.filter(o =>
        String(o.table_code || "").toLowerCase().includes(q)
      );
    }

    infoEl.textContent = `Wyświetlono: ${filtered.length}`;

    if (!filtered.length) {
      listEl.textContent = "Brak zamówień.";
      return;
    }

    listEl.innerHTML = filtered.map(o => {
      const tableLabel = o.table_code ?? "—";
      const cancelActive = clickedCancel.has(o.order_id) ? "active" : "";

      return `
        <div class="card">
          <div class="row">
            <div>
              <div style="font-weight:900; font-size:18px;">Order #${esc(o.order_id)}</div>
              <div class="mini">
                Table: <span class="tag"><b>${esc(tableLabel)}</b></span>
                · Status: <span class="tag"><b>${esc(o.status)}</b></span>
                · ${esc(fmtDate(o.created_at))}
              </div>
            </div>

            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <!-- ⚠️ якщо бекенд дозволяє тільки new/canceled — залиш 1 кнопку -->
              

              <button class="blink-btn ${cancelActive}" type="button"
                onclick="setStatus(${o.order_id}, 'canceled', this)">
                Przyjeto
              </button>
              <button class="btn2" type="button"
                onclick="deleteOrder(${o.order_id}, this)">
                Anuluj
              </button>
            </div>
          </div>

          <div class="items">
            ${(o.items || []).map((i, itemIdx) => {
              return `
                <div class="mini itemLine">
                  • <b>${esc(i.name)}</b> x${esc(i.qty)} (${esc(i.price_at_time)} zł)
                  ${i.comment ? `<span class="tagComment">📝 ${esc(i.comment)}</span>` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }).join("");
  } catch (e) {
    setMsg("Błąd: " + (e?.message || e), false);
  }
}

// ---------------- Status update ----------------
window.setStatus = async (orderId, status, btnEl) => {
  const isBlinkBtn = btnEl && btnEl.classList?.contains("blink-btn");

  // 👉 якщо натиснули blink-кнопку — одразу вимикаємо анімацію
  if (isBlinkBtn) {
    btnEl.classList.add("active");
  }

  const res = await fetch(API + `/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setMsg("Błąd: " + (data.detail || res.status), false);

    // ❌ якщо бекенд впав — повертаємо blink назад
    if (isBlinkBtn) {
      btnEl.classList.remove("active");
    }
    return;
  }

  // ✅ тільки після успіху запам’ятовуємо
  if (isBlinkBtn) {
    clickedCancel.add(orderId);
    saveClickedCancel();
  }

  setMsg(`✅ Order #${orderId} → ${status}`);
  load();
};
// ---------------- UI events ----------------
refreshBtn.addEventListener("click", load);

window.deleteOrder = async (orderId, btnEl) => {
  if (!confirm("Czy na pewno usunąć zamówienie?")) return;

  // щоб не було миготіння через авто-оновлення під час видалення
  const prevAuto = autoOn;
  autoOn = false;
  if (timer) { clearInterval(timer); timer = null; }

  const res = await fetch(API + `/api/orders/${orderId}`, { method: "DELETE" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setMsg("Błąd usuwania: " + (data.detail || res.status), false);

    // повертаємо авто якщо було увімкнено
    if (prevAuto) {
      autoOn = true;
      timer = setInterval(load, 4000);
    }
    return;
  }

  // ✅ чистимо “пам’ять” для цього orderId, щоб не засмічувалось
  clickedCancel.delete(orderId);
  saveClickedCancel();

  setMsg(`🗑 Order #${orderId} usunięty`);
  await load();

  // повертаємо авто якщо було увімкнено
  if (prevAuto) {
    autoOn = true;
    timer = setInterval(load, 4000);
  }
};

autoBtn.addEventListener("click", () => {
  autoOn = !autoOn;
  autoBtn.textContent = "Auto: " + (autoOn ? "ON" : "OFF");

  if (autoOn) {
    if (timer) clearInterval(timer);
    timer = setInterval(load, 4000);
  } else {
    clearInterval(timer);
    timer = null;
  }
});

statusEl.addEventListener("change", load);

renderTablesFilter();

let searchTimeout = null;
tableSearchEl.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(load, 200);
});

// NOTE: load() запускається після login()
