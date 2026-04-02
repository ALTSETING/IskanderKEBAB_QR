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
const paymentMethodEls = Array.from(document.querySelectorAll('input[name="paymentMethod"]'));
const takeawayOptionEl = document.getElementById("takeawayOption");


let menu = [];
let cart = []; // [{product_id, name, price, qty, comment}]

const ADDONS = [
  { id: 44, name: "Feta cheese", price: 4.0 },
  { id: 45, name: "Turkish cheese", price: 5.0 },
  { id: 46, name: "Halloumi cheese", price: 5.0 },
  { id: 47, name: "Cheese sauce", price: 3.0 },
  { id: 48, name: "Mozzarella", price: 4.0 },
  { id: 49, name: "Grilled vegetables", price: 8.0 },
  { id: 50, name: "Sauce", price: 4.0 },
  { id: 51, name: "Garlic paste", price: 5.0 },
  { id: 52, name: "Spicy paste", price: 5.0 },
  { id: 53, name: "Tzatziki sauce", price: 5.0 },
  { id: 54, name: "Sweet pepper", price: 5.0 },
  { id: 55, name: "Hot pepper", price: 5.0 },
  { id: 56, name: "Eggplant", price: 4.0 },
  { id: 57, name: "Jalapeno", price: 3.0 },
  { id: 58, name: "Olives", price: 4.0 },
  { id: 59, name: "Fries", price: 12.0 },
  { id: 60, name: "Roasted potatoes", price: 15.0 }
];

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
    <div class="itemMain">
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
    cartListEl.textContent = "Na razie pusto";
    totalEl.textContent = "Total: 0 zł";
    return;
  }
  const calcItemTotal = (item) => {
    const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + addon.price, 0);
    const takeawaySurcharge = takeawayOptionEl?.checked ? item.qty : 0;
    return (item.price + addonsTotal) * item.qty + takeawaySurcharge;
  };

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
          <div class="commentActions">
            <button class="btnComment" type="button" onclick="toggleComment(${idx})">
              Komentarz
            </button>
            <button class="btnComment" type="button" onclick="toggleAddons(${idx})">
              Dodatki
            </button>
          </div>

          <div id="commentWrap-${idx}" class="commentWrap${c.commentOpen ? " show" : ""}">
            <input
            class="commentInput"
            placeholder="Komentarz (np.: bez cebuli / sos osobno)"
            value="${esc(c.comment || "")}"
            oninput="setComment(${idx}, this.value)"
          />
          </div>
          <div id="addonsWrap-${idx}" class="commentWrap addonsWrap${c.addonsOpen ? " show" : ""}">
            ${(ADDONS).map(addon => `
              <label class="addonChoice">
                <span>${esc(addon.name)} · ${money(addon.price)} zł</span>
                <input
                  type="checkbox"
                  ${c.addons?.some(a => a.addon_id === addon.id) ? "checked" : ""}
                  onchange="toggleAddon(${idx}, ${addon.id})"
                />
              </label>
            `).join("")}
          </div>
          ${c.addons?.length ? `
            <div class="mini mt10">
              Dodatki: ${c.addons.map(a => `${esc(a.name)} (${money(a.price)} zł)`).join(", ")}
            </div>
          ` : ""}
        </div>
      </div>

      <div style="display:flex; gap:6px; margin-left:10px;">
        <button class="btn2" type="button" onclick="decQty(${idx})">-</button>
        <button class="btn2" type="button" onclick="incQty(${idx})">+</button>
      </div>
    </div>
  `).join("");

  const total = cart.reduce((sum, item) => sum + calcItemTotal(item), 0);
  totalEl.textContent = `Total: ${money(total)} zł`;
}

function updateFloatingCartButton() {
  if (!floatingCartBtnEl || !floatingCartCountEl || !floatingCartPriceEl) return;

  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => {
    const addonsTotal = (item.addons || []).reduce((aSum, addon) => aSum + addon.price, 0);
    const takeawaySurcharge = takeawayOptionEl?.checked ? item.qty : 0;
    return sum + (item.price + addonsTotal) * item.qty + takeawaySurcharge;
  }, 0);
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
  const hasConfigurableOptions = optionGroups.length > 0;

  if (hasConfigurableOptions) {
    cart.push({
      product_id: id,
      name: p.name,
      price: p.price,
      qty: 1,
      comment: "",
      commentOpen: false,
      optionGroups,
      optionSelections,
      optionSignature,
      addons: [],
      addonsOpen: false
    });
  } else {
    const ex = cart.find(x => x.product_id === id && x.optionSignature === optionSignature);
    if(ex) ex.qty += 1;
    else {
      cart.push({
        product_id: id,
        name: p.name,
        price: p.price,
        qty: 1,
        comment: "",
        commentOpen: false,
        optionGroups,
        optionSelections,
        optionSignature,
        addons: [],
        addonsOpen: false
      });
    }
  }

  renderCart();
};

window.incQty = (idx) => {
  if(!cart[idx]) return;
  if ((cart[idx].optionGroups || []).length > 0) {
    const currentItem = cart[idx];
    cart.splice(idx + 1, 0, {
      ...currentItem,
      qty: 1,
      comment: "",
      commentOpen: false,
      addons: [],
      addonsOpen: false,
      optionSelections: Object.fromEntries(
        (currentItem.optionGroups || []).map(group => [group.group_id, ""])
      ),
      optionSignature: getOptionSignature(
        Object.fromEntries((currentItem.optionGroups || []).map(group => [group.group_id, ""]))
      )
    });
    renderCart();
    return;
  }
  cart[idx].qty += 1;
  renderCart();
};

window.decQty = (idx) => {
  if(!cart[idx]) return;
  if ((cart[idx].optionGroups || []).length > 0) {
    cart.splice(idx, 1);
    renderCart();
    return;
  }
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
  if (!cart[idx]) return;
  cart[idx].commentOpen = !cart[idx].commentOpen;
  const el = document.getElementById(`commentWrap-${idx}`);
  if (!el) return;
  const isOpen = cart[idx].commentOpen;
  el.classList.toggle("show", isOpen);

  if (isOpen) {
    el.querySelector("input")?.focus();
  }
};

window.toggleAddons = (idx) => {
  if (!cart[idx]) return;
  cart[idx].addonsOpen = !cart[idx].addonsOpen;
  const el = document.getElementById(`addonsWrap-${idx}`);
  if (!el) return;
  el.classList.toggle("show", cart[idx].addonsOpen);
};

window.toggleAddon = (idx, addonId) => {
  if (!cart[idx]) return;
  if (!Array.isArray(cart[idx].addons)) cart[idx].addons = [];
  const addon = ADDONS.find(a => a.id === addonId);
  if (!addon) return;

  const hasAddon = cart[idx].addons.some(a => a.addon_id === addonId);
  if (hasAddon) {
    cart[idx].addons = cart[idx].addons.filter(a => a.addon_id !== addonId);
  } else {
    cart[idx].addons.push({
      addon_id: addon.id,
      name: addon.name,
      price: addon.price
    });
  }
  renderCart();
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

  const payment_method = paymentMethodEls.find(el => el.checked)?.value || "";
  if (!payment_method) {
    msgEl.textContent = "Wybierz metodę płatności";
    msgEl.className = "mini err mt12";
    return;
  }
   
  const payload = {
    table_code,
    payment_method,
    is_takeaway: !!takeawayOptionEl?.checked,
    items: cart.map(c => ({
      product_id: c.product_id,
      qty: c.qty,
      comment: c.comment || "",
      addons: c.addons || [],
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
    if (takeawayOptionEl) takeawayOptionEl.checked = false;
    renderCart();
  } catch (e) {
    msgEl.textContent = "Network error: " + e;
    msgEl.className = "mini err mt12";
  }
});
renderCart();
loadMenu();

if (takeawayOptionEl) {
  takeawayOptionEl.addEventListener("change", renderCart);
}


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
