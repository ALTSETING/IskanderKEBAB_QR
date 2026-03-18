import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Literal, Dict, Optional
from datetime import datetime
from pathlib import Path

app = FastAPI(title="QR API")

# --- CORS (можеш лишити як було) ---
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = ["*"] if allowed_origins_env.strip() == "*" else [
    o.strip() for o in allowed_origins_env.split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

# ------------------ DB (поки в пам'яті) ------------------
MENU_DB = [
    # --- STARTERS ---
    {"id": 1, "name": "Hummus", "price": 23.0, "category": "Starters", "is_active": True},
    {"id": 2, "name": "Mutobal", "price": 23.0, "category": "Starters", "is_active": True},
    {"id": 3, "name": "Hummus with meat", "price": 30.0, "category": "Starters", "is_active": True},
    {"id": 4, "name": "Soup", "price": 18.0, "category": "Starters", "is_active": True},
    {"id": 5, "name": "Tzatziki", "price": 18.0, "category": "Starters", "is_active": True},
    {"id": 6, "name": "Tzatziki with meat", "price": 28.0, "category": "Starters", "is_active": True},
    {"id": 7, "name": "Shakshuka with egg", "price": 28.0, "category": "Starters", "is_active": True},

    # --- SALADS ---
    {"id": 8, "name": "Arabic salad", "price": 30.0, "category": "Salads", "is_active": True},
    {"id": 9, "name": "Greek salad", "price": 30.0, "category": "Salads", "is_active": True},
    {"id": 10, "name": "Turkish salad", "price": 30.0, "category": "Salads", "is_active": True},
    {"id": 11, "name": "Salad with meat", "price": 38.0, "category": "Salads", "is_active": True},
    {"id": 12, "name": "Halloumi salad", "price": 35.0, "category": "Salads", "is_active": True},

    # --- SANDWICHES ---
    {"id": 13, "name": "Lawasz small", "price": 25.0, "category": "kebabs", "is_active": True},
    {"id": 14, "name": "Lawasz medium", "price": 28.0, "category": "kebabs", "is_active": True},
    {"id": 15, "name": "Lawasz large", "price": 31.0, "category": "kebabs", "is_active": True},
    {"id": 16, "name": "Lawasz mega", "price": 40.0, "category": "kebabs", "is_active": True},
    {"id": 17, "name": "Standard thick", "price": 30.0, "category": "kebabs", "is_active": True},
    {"id": 18, "name": "Large thick", "price": 35.0, "category": "kebabs", "is_active": True},
    {"id": 19, "name": "Giga", "price": 45.0, "category": "kebabs", "is_active": True},
    {"id": 20, "name": "Fryto kebab lawasz", "price": 33.0, "category": "kebabs", "is_active": True},
    {"id": 21, "name": "Fryto kebab thick", "price": 36.0, "category": "kebabs", "is_active": True},
    {"id": 22, "name": "Greek kebab (gyros)", "price": 38.0, "category": "kebabs", "is_active": True},
    {"id": 23, "name": "Falafel lawasz", "price": 25.0, "category": "kebabs", "is_active": True},
    {"id": 24, "name": "Falafel thick", "price": 28.0, "category": "kebabs", "is_active": True},
    {"id": 25, "name": "Poka Berlin", "price": 45.0, "category": "kebabs", "is_active": True},

    # --- MAIN DISHES ---
    {"id": 26, "name": "Dish of the day", "price": 37.0, "category": "kebabs", "is_active": True},
    {"id": 27, "name": "Iskander premium", "price": 45.0, "category": "kebabs", "is_active": True},
    {"id": 28, "name": "Special Doner", "price": 45.0, "category": "kebabs", "is_active": True},
    {"id": 29, "name": "Kebab plate small", "price": 35.0, "category": "kebabs", "is_active": True},
    {"id": 30, "name": "Kebab plate large", "price": 40.0, "category": "kebabs", "is_active": True},
    {"id": 31, "name": "Kebab box", "price": 30.0, "category": "kebabs", "is_active": True},
    {"id": 32, "name": "Falafel plate", "price": 35.0, "category": "kebabs", "is_active": True},
    {"id": 33, "name": "Shawarma", "price": 46.0, "category": "kebabs", "is_active": True},
    {"id": 34, "name": "Kapsalon", "price": 36.0, "category": "kebabs", "is_active": True},
    {"id": 35, "name": "Kids set", "price": 35.0, "category": "kebabs", "is_active": True},

    # --- GRILL ---
    {"id": 36, "name": "Adana", "price": 65.0, "category": "Grill", "is_active": True},
    {"id": 37, "name": "Ribs", "price": 75.0, "category": "Grill", "is_active": True},
    {"id": 38, "name": "Lamb", "price": 70.0, "category": "Grill", "is_active": True},
    {"id": 39, "name": "Beef tenderloin", "price": 100.0, "category": "Grill", "is_active": True},
    {"id": 40, "name": "Mix grill for 2", "price": 135.0, "category": "Grill", "is_active": True},
    {"id": 41, "name": "Mix grill for 4", "price": 250.0, "category": "Grill", "is_active": True},
    {"id": 42, "name": "Shish tawook", "price": 55.0, "category": "Grill", "is_active": True},
    {"id": 43, "name": "Chicken wings grilled", "price": 50.0, "category": "Grill", "is_active": True},

    # --- SIDES ---
    {"id": 44, "name": "Feta cheese", "price": 4.0, "category": "Sides", "is_active": True},
    {"id": 45, "name": "Turkish cheese", "price": 5.0, "category": "Sides", "is_active": True},
    {"id": 46, "name": "Halloumi cheese", "price": 5.0, "category": "Sides", "is_active": True},
    {"id": 47, "name": "Cheese sauce", "price": 3.0, "category": "Sides", "is_active": True},
    {"id": 48, "name": "Mozzarella", "price": 4.0, "category": "Sides", "is_active": True},
    {"id": 49, "name": "Grilled vegetables", "price": 8.0, "category": "Sides", "is_active": True},
    {"id": 50, "name": "Sauce", "price": 4.0, "category": "Sides", "is_active": True},
    {"id": 51, "name": "Garlic paste", "price": 5.0, "category": "Sides", "is_active": True},
    {"id": 52, "name": "Spicy paste", "price": 5.0, "category": "Sides", "is_active": True},
    {"id": 53, "name": "Tzatziki sauce", "price": 5.0, "category": "Sides", "is_active": True},
    {"id": 54, "name": "Sweet pepper", "price": 5.0, "category": "Sides", "is_active": True},
    {"id": 55, "name": "Hot pepper", "price": 5.0, "category": "Sides", "is_active": True},
    {"id": 56, "name": "Eggplant", "price": 4.0, "category": "Sides", "is_active": True},
    {"id": 57, "name": "Jalapeno", "price": 3.0, "category": "Sides", "is_active": True},
    {"id": 58, "name": "Olives", "price": 4.0, "category": "Sides", "is_active": True},
    {"id": 59, "name": "Fries", "price": 14.0, "category": "Sides", "is_active": True},
    {"id": 60, "name": "Roasted potatoes", "price": 15.0, "category": "Sides", "is_active": True},

    # --- DRINKS ---
    {"id": 61, "name": "Ayran", "price": 8.0, "category": "Drinks", "is_active": True},
    {"id": 62, "name": "Pepsi can", "price": 8.0, "category": "Drinks", "is_active": True},
    {"id": 63, "name": "Pepsi zero can", "price": 8.0, "category": "Drinks", "is_active": True},
    {"id": 64, "name": "Pepsi bottle", "price": 8.0, "category": "Drinks", "is_active": True},
    {"id": 65, "name": "Pepsi zero bottle", "price": 8.0, "category": "Drinks", "is_active": True},
    {"id": 66, "name": "Mirinda", "price": 8.0, "category": "Drinks", "is_active": True},
    {"id": 67, "name": "7up", "price": 8.0, "category": "Drinks", "is_active": True},
    {"id": 68, "name": "Lipton can", "price": 8.0, "category": "Drinks", "is_active": True},
    {"id": 69, "name": "Lipton 0.5", "price": 10.0, "category": "Drinks", "is_active": True},
    {"id": 70, "name": "Mountain Dew", "price": 10.0, "category": "Drinks", "is_active": True},
    {"id": 71, "name": "Juice nectar", "price": 8.0, "category": "Drinks", "is_active": True},
    {"id": 72, "name": "Espresso", "price": 10.0, "category": "Drinks", "is_active": True},
    {"id": 73, "name": "Black coffee", "price": 8.0, "category": "Drinks", "is_active": True},
    {"id": 74, "name": "Cappuccino", "price": 10.0, "category": "Drinks", "is_active": True},
    {"id": 75, "name": "Caffe latte", "price": 10.0, "category": "Drinks", "is_active": True},
    {"id": 76, "name": "Arabic tea", "price": 8.0, "category": "Drinks", "is_active": True},

    # --- DESSERTS ---
    {"id": 77, "name": "Baklava", "price": 8.0, "category": "Desserts", "is_active": True},
]

ORDERS_DB: Dict[int, dict] = {}
NEXT_ORDER_ID = 100

# ✅ статуси як в admin.html
OrderStatus = Literal["new", "cooking", "ready", "served", "canceled"]

# ------------------ Models ------------------
class MenuItemOut(BaseModel):
    id: int
    name: str
    price: float
    category: str
    is_active: bool

class OrderItemIn(BaseModel):
    product_id: int
    qty: int = Field(ge=1, le=20)
    comment: str = ""

class OrderCreateIn(BaseModel):
    table_code: str = Field(min_length=1, max_length=30)
    items: List[OrderItemIn] = Field(min_length=1)

class OrderCreateOut(BaseModel):
    order_id: int
    status: OrderStatus

class KitchenOrderOut(BaseModel):
    order_id: int
    table_code: str
    status: OrderStatus
    created_at: datetime
    items: List[dict]

class StatusUpdateIn(BaseModel):
    status: OrderStatus

# ------------------ API ------------------
@app.get("/api/menu", response_model=List[MenuItemOut])
def get_menu(category: Optional[str] = Query(default=None)):
    items = [m for m in MENU_DB if m["is_active"]]
    if category:
        category_l = category.strip().lower()
        items = [m for m in items if m["category"].strip().lower() == category_l]
    return items

@app.post("/api/orders", response_model=OrderCreateOut)
def create_order(payload: OrderCreateIn):
    global NEXT_ORDER_ID

    menu_by_id = {m["id"]: m for m in MENU_DB}
    for it in payload.items:
        product = menu_by_id.get(it.product_id)
        if (not product) or (not product["is_active"]):
            raise HTTPException(status_code=400, detail=f"Product {it.product_id} unavailable")

    NEXT_ORDER_ID += 1
    order_id = NEXT_ORDER_ID

    items_snapshot = []
    for it in payload.items:
        product = menu_by_id[it.product_id]
        items_snapshot.append({
            "product_id": it.product_id,
            "name": product["name"],
            "qty": it.qty,
            "price_at_time": product["price"],
            "comment": it.comment,
        })

    ORDERS_DB[order_id] = {
        "order_id": order_id,
        "table_code": payload.table_code,
        "status": "new",
        "created_at": datetime.utcnow(),
        "items": items_snapshot,
    }

    return {"order_id": order_id, "status": "new"}

@app.get("/api/kitchen/orders", response_model=List[KitchenOrderOut])
def kitchen_orders(status: Optional[OrderStatus] = Query(default=None)):
    orders = list(ORDERS_DB.values())
    if status:
        orders = [o for o in orders if o["status"] == status]
    orders.sort(key=lambda o: o["created_at"], reverse=True)
    return orders

@app.patch("/api/orders/{order_id}/status")
def update_status(order_id: int, payload: StatusUpdateIn):
    order = ORDERS_DB.get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order["status"] = payload.status
    return {"ok": True, "order_id": order_id, "status": order["status"]}

@app.delete("/api/orders/{order_id}")
def delete_order(order_id: int):
    order = ORDERS_DB.pop(order_id, None)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"ok": True, "order_id": order_id}


# ------------------ Frontend ------------------
if not FRONTEND_DIR.exists():
    raise RuntimeError(f"FRONTEND_DIR not found: {FRONTEND_DIR}")

# ✅ Важливо: монтуємо фронтенд як "сайт" з кореня "/"
# Тоді index.html, styles.css, app.js працюють без змін.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

# (необов'язково) зручне посилання /admin -> /admin.html
@app.get("/admin")
def admin_redirect():
    return RedirectResponse(url="/admin.html")
