const API = window.location.hostname.endsWith("vercel.app")
   ? "https://iskanderkebab-qr.onrender.com"
  : ""; // якщо сайт і API на одному домені

const menuListEl = document.getElementById("menuList");
const cartListEl = document.getElementById("cartList");
const totalEl = document.getElementById("total");
const msgEl = document.getElementById("msg");
const tableCodeEl = document.getElementById("tableCode");
const floatingCartBtnEl = document.getElementById("floatingCartBtn");
const floatingCartCountEl = document.getElementById("floatingCartCount");
const floatingCartPriceEl = document.getElementById("floatingCartPrice");
const filtersEl = document.getElementById("filters");


let menu = [];
let cart = []; // [{product_id, name, price, qty, comment}]

function getOptionSignature(optionSelections = {}) {
  return Object.keys(optionSelections)
    .sort()
    .map(k => `${k}:${optionSelections[k] || ""}`)
    .join("|");
}

function money(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderMenu() {
  if (!menu.length) {
    menuListEl.textContent = "Menu jest puste.";
    return;
  }

  menuListEl.innerHTML = menu.map(m => `
    <div class="item">
      <div>
        <div class="itemTitle">${esc(m.name)}</div>
        <div class="mini">${esc(m.category)} · ${money(m.price)} zł</div>
      </div>
      <button class="btn" type="button" onclick="addToCart(${m.id})">Dodaj</button>
    </div>
  `).join("");
}

function renderCart(){
  updateFloatingCartButton();
   
  if(!cart.length){
    cartListEl.textContent = "Поки пусто";
    totalEl.textContent = "Total: 0 zł";
    return;
  }

  cartListEl.innerHTML = cart.map((c, idx) => `
    <div class="item" style="align-items:flex-start;">
      <div style="flex:1;">
        <div class="itemTitle">${esc(c.name)}</div>
        <div class="mini">${money(c.price)} zł · Ilość: ${c.qty}</div>
        ${(c.optionGroups || []).map(group => `
          <div class="optionGroup">
            <div class="optionHeader">
              <span class="optionTitle">${esc(group.title)}</span>
              ${group.required ? `<span class="optionRequired">obowiązkowo</span>` : ""}
            </div>
            <div class="mini">Wybierz 1 opcję</div>
            <div class="optionChoices">
              ${(group.options || []).map(opt => `
                <label class="optionChoice">
                  <span>${esc(opt)}</span>
                  <input
                    type="radio"
                    name="opt-${idx}-${esc(group.group_id)}"
                    ${c.optionSelections?.[group.group_id] === opt ? "checked" : ""}
                    onchange="setItemOption(${idx}, '${esc(group.group_id)}', '${esc(group.title)}', '${esc(opt)}')"
                  />
                </label>
              `).join("")}
            </div>
          </div>
        `).join("")}

        <div class="commentBlock">
          <button class="btnComment" type="button"
                  onclick="toggleComment(${idx})">
            Komentarz
          </button>

          <div id="commentWrap-${idx}" class="commentWrap">
            <input
            class="commentInput"
            placeholder="Komentarz (np.: bez cebuli / sos osobno)"
            value="${esc(c.comment || "")}"
            oninput="setComment(${idx}, this.value)"
          />
          </div>
        </div>
      </div>

      <div style="display:flex; gap:6px; margin-left:10px;">
        <button class="btn2" type="button" onclick="decQty(${idx})">-</button>
        <button class="btn2" type="button" onclick="incQty(${idx})">+</button>
      </div>
    </div>
  `).join("");

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  totalEl.textContent = `Total: ${money(total)} zł`;
}

function updateFloatingCartButton() {
  if (!floatingCartBtnEl || !floatingCartCountEl || !floatingCartPriceEl) return;

  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartTabEl = document.getElementById("tabCart");
  const isCartTabActive = window.innerWidth <= 768 && cartTabEl?.classList.contains("active");

  floatingCartCountEl.textContent = String(count);
  floatingCartPriceEl.textContent = `${money(total)} zł`;
  floatingCartBtnEl.classList.toggle("show", count > 0 && !isCartTabActive);
}


// --- Глобальні (бо ти використовуєш onclick=...) ---
window.addToCart = (id) => {
  const p = menu.find(x => x.id === id);
  if(!p) return;

  const optionGroups = Array.isArray(p.option_groups) ? p.option_groups : [];
  const optionSelections = Object.fromEntries(optionGroups.map(g => [g.group_id, ""]));
  const optionSignature = getOptionSignature(optionSelections);

  const ex = cart.find(x => x.product_id === id && x.optionSignature === optionSignature);
  if(ex) ex.qty += 1;
  else {
    cart.push({
      product_id: id,
      name: p.name,
      price: p.price,
      qty: 1,
      comment: "",
      optionGroups,
      optionSelections,
      optionSignature
    });
  }

  renderCart();
};

window.incQty = (idx) => {
  if(!cart[idx]) return;
  cart[idx].qty += 1;
  renderCart();
};

window.decQty = (idx) => {
  if(!cart[idx]) return;
  cart[idx].qty -= 1;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  renderCart();
};

window.setComment = (idx, val) => {
  if(!cart[idx]) return;
  cart[idx].comment = val;
};

window.setItemOption = (idx, groupId, groupTitle, val) => {
  if (!cart[idx]) return;
  cart[idx].optionSelections = {
    ...(cart[idx].optionSelections || {}),
    [groupId]: val
  };
  cart[idx].optionSignature = getOptionSignature(cart[idx].optionSelections);
  renderCart();
};


window.toggleComment = (idx) => {
  const el = document.getElementById(`commentWrap-${idx}`);
  if (!el) return;

  const isOpen = el.classList.toggle("show");

  if (isOpen) {
    el.querySelector("input")?.focus();
  }
};

document.getElementById("clearBtn").addEventListener("click", () => {
  cart = [];
  msgEl.textContent = "";
  msgEl.className = "mini mt12";
  renderCart();
});

let currentCategory = "";

async function loadMenu(category = "") {
  menuListEl.textContent = "Loading...";

  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(API + "/api/menu" + qs);

  menu = await res.json();
  renderMenu();
}


const filterBtns = Array.from(document.querySelectorAll("#filters [data-cat]"));

function setActiveFilterBtn(cat) {
  filterBtns.forEach(b =>
    b.classList.toggle("is-active", (b.dataset.cat || "") === (cat || ""))
  );
}

filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    currentCategory = btn.dataset.cat || "";
    setActiveFilterBtn(currentCategory);
    loadMenu(currentCategory);
  });
});

// при старті активний "Усі"
setActiveFilterBtn("");

document.getElementById("orderBtn").addEventListener("click", async () => {
  msgEl.textContent = "";
  msgEl.className = "mini mt12";

  const table_code = tableCodeEl.value.trim();
  if (!table_code) {
    msgEl.textContent = "Podaj numer stolika";
    msgEl.className = "mini err mt12";
    return;
  }
  if (!cart.length) {
    msgEl.textContent = "Koszyk jest pusty";
    msgEl.className = "mini err mt12";
    return;
  }

  const payload = {
    table_code,
    items: cart.map(c => ({
      product_id: c.product_id,
      qty: c.qty,
      comment: c.comment || "",
      options: (c.optionGroups || [])
        .map(group => ({
          group_id: group.group_id,
          group_title: group.title,
          value: c.optionSelections?.[group.group_id] || ""
        }))
        .filter(opt => opt.value)
    }))
  };

  const invalidItem = cart.find(c =>
    (c.optionGroups || []).some(group =>
      group.required && !c.optionSelections?.[group.group_id]
    )
  );
  if (invalidItem) {
    msgEl.textContent = `Wybierz obowiązkowe opcje dla: ${invalidItem.name}`;
    msgEl.className = "mini err mt12";
    return;
  }


  try {
    const res = await fetch(API + "/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      msgEl.textContent = "Błąd: " + (data.detail || JSON.stringify(data));
      msgEl.className = "mini err mt12";
      return;
    }

    msgEl.innerHTML = `<span class="ok">✅ Zamówienie zostało złożone!</span> order_id: <b>${data.order_id}</b>, status: <b>${data.status}</b>`;
    cart = [];
    renderCart();
  } catch (e) {
    msgEl.textContent = "Network error: " + e;
    msgEl.className = "mini err mt12";
  }
});
renderCart();
loadMenu();

;

const tabMenu = document.getElementById("tabMenu");
const tabCart = document.getElementById("tabCart");
const menuSection = document.getElementById("menuSection");
const cartSection = document.getElementById("cartSection");

function setMobileTab(tab) {
  if (!menuSection || !cartSection || !tabMenu || !tabCart) return;

  if (tab === "menu") {
    menuSection.classList.add("active-section");
    cartSection.classList.remove("active-section");

    tabMenu.classList.add("active");
    tabCart.classList.remove("active");
  } else {
    cartSection.classList.add("active-section");
    menuSection.classList.remove("active-section");

    tabCart.classList.add("active");
    tabMenu.classList.remove("active");
  }

  filtersEl?.classList.toggle("is-hidden-mobile", tab === "cart");
  updateFloatingCartButton();
}

function handleMobileTabs() {
  if (!menuSection || !cartSection || !tabMenu || !tabCart) return;

  if (window.innerWidth <= 768) {
    if (
      !menuSection.classList.contains("active-section") &&
      !cartSection.classList.contains("active-section")
    ) {
      setMobileTab("menu");
    }
  } else {
    menuSection.classList.remove("active-section");
    cartSection.classList.remove("active-section");

    tabMenu.classList.remove("active");
    tabCart.classList.remove("active");
    filtersEl?.classList.remove("is-hidden-mobile");
    updateFloatingCartButton();
  }
}

if (tabMenu) {
  tabMenu.addEventListener("click", () => setMobileTab("menu"));
}

if (tabCart) {
  tabCart.addEventListener("click", () => setMobileTab("cart"));
}

if (floatingCartBtnEl) {
  floatingCartBtnEl.addEventListener("click", () => {
    setMobileTab("cart");
    cartSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

window.addEventListener("resize", handleMobileTabs);

handleMobileTabs();
