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

app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/static/index.html", status_code=307)


@app.get("/admin", include_in_schema=False)
def admin_page():
    return RedirectResponse(url="/static/admin.html", status_code=307)


@app.get("/admin.html", include_in_schema=False)
def admin_html_page():
    return RedirectResponse(url="/static/admin.html", status_code=307)


# ------------------ DB (поки в пам'яті) ------------------
MENU_DB = [
    # --- STARTERS ---
    {"id": 1, "name": "Hummus", "price": 20.0, "category": "Przystawki", "is_active": True, "image_url": "/images/favicon.ico.png"},
    {"id": 2, "name": "Mutobal", "price": 20.0, "category": "Przystawki", "is_active": True},
    {"id": 3, "name": "Hummus z mięsem", "price": 25.0, "category": "Przystawki", "is_active": True},
    {"id": 4, "name": "Zupa", "price": 15.0, "category": "Przystawki", "is_active": True},
    {"id": 5, "name": "Tzatziki", "price": 18.0, "category": "Przystawki", "is_active": True},
    {"id": 6, "name": "Tzatziki z mięsem", "price": 25.0, "category": "Przystawki", "is_active": True},
    {"id": 7, "name": "Szakszuka z jajkiem", "price": 28.0, "category": "Przystawki", "is_active": True},

    # --- SALADS ---
    {"id": 8, "name": "Sałatka arabska", "price": 25.0, "category": "Sałatki", "is_active": True},
    {"id": 9, "name": "Sałatka grecka", "price": 27.0, "category": "Sałatki", "is_active": True},
    {"id": 10, "name": "Sałatka turecka", "price": 25.0, "category": "Sałatki", "is_active": True},
    {"id": 11, "name": "Sałatka z mięsem", "price": 30.0, "category": "Sałatki", "is_active": True},
    {"id": 12, "name": "Sałatka halloumi", "price": 27.0, "category": "Sałatki", "is_active": True},

    # --- KEBABS / KANAPKI ---
    {"id": 13, "name": "Kanapka lawasz mały", "price": 23.0, "category": "kebabs", "is_active": True},
    {"id": 14, "name": "Kanapka lawasz średni", "price": 26.0, "category": "kebabs", "is_active": True},
    {"id": 15, "name": "Kanapka lawasz duży", "price": 29.0, "category": "kebabs", "is_active": True},
    {"id": 16, "name": "Kanapka lawasz mega", "price": 35.0, "category": "kebabs", "is_active": True},

    {"id": 17, "name": "Kanapka standard gruby", "price": 28.0, "category": "kebabs", "is_active": True},
    {"id": 18, "name": "Kanapka duży gruby", "price": 32.0, "category": "kebabs", "is_active": True},
    {"id": 19, "name": "Kanapka giga", "price": 35.0, "category": "kebabs", "is_active": True},

    {"id": 20, "name": "Fryto kebab lawasz", "price": 30.0, "category": "kebabs", "is_active": True},
    {"id": 21, "name": "Fryto kebab gruby", "price": 32.0, "category": "kebabs", "is_active": True},
    {"id": 22, "name": "Grecki kebab a’la gyros", "price": 31.0, "category": "kebabs", "is_active": True},

    {"id": 23, "name": "Falafel lawasz", "price": 26.0, "category": "kebabs", "is_active": True},
    {"id": 24, "name": "Falafel gruby", "price": 27.0, "category": "kebabs", "is_active": True},
    {"id": 25, "name": "Poka Berlin", "price": 36.0, "category": "kebabs", "is_active": True},

    # --- DANIA GŁÓWNE ---
    {"id": 26, "name": "Danie dnia", "price": 37.0, "category": "Dania główne", "is_active": True},
    {"id": 27, "name": "Iskander premium", "price": 45.0, "category": "Dania główne", "is_active": True},
    {"id": 28, "name": "Special Doner", "price": 38.0, "category": "Dania główne", "is_active": True},

    {"id": 29, "name": "Talerz kebab mały", "price": 32.0, "category": "Dania główne", "is_active": True},
    {"id": 30, "name": "Talerz kebab duży", "price": 36.0, "category": "Dania główne", "is_active": True},
    {"id": 31, "name": "Kebab Box", "price": 28.0, "category": "Dania główne", "is_active": True},

    {"id": 32, "name": "Talerz falafel z hummusem", "price": 31.0, "category": "Dania główne", "is_active": True},
    {"id": 33, "name": "Shawarma", "price": 41.0, "category": "Dania główne", "is_active": True},
    {"id": 34, "name": "Kapsalon", "price": 33.0, "category": "Dania główne", "is_active": True},
    {"id": 35, "name": "Zestaw dla dzieci", "price": 31.0, "category": "Dania główne", "is_active": True},

    # --- GRILL ---
    {"id": 36, "name": "Adana", "price": 60.0, "category": "Grill", "is_active": True},
    {"id": 37, "name": "Żeberka", "price": 70.0, "category": "Grill", "is_active": True},
    {"id": 38, "name": "Jagnięcina", "price": 70.0, "category": "Grill", "is_active": True},
    {"id": 39, "name": "Polędwiczki wołowe", "price": 80.0, "category": "Grill", "is_active": True},
    {"id": 40, "name": "Mix grill dla 2 osób", "price": 130.0, "category": "Grill", "is_active": True},
    {"id": 41, "name": "Mix grill dla 4 osób", "price": 240.0, "category": "Grill", "is_active": True},
    {"id": 42, "name": "Shish tawook", "price": 52.0, "category": "Grill", "is_active": True},
    {"id": 43, "name": "Skrzydełka z kurczaka grillowane", "price": 55.0, "category": "Grill", "is_active": True},

    # --- NAPOJE ZIMNE ---
    {"id": 44, "name": "Ayran", "price": 8.0, "category": "Napoje zimne", "is_active": True},

    {"id": 45, "name": "Pepsi w puszce", "price": 8.0, "category": "Napoje zimne", "is_active": True},
    {"id": 46, "name": "Pepsi zero w puszce", "price": 8.0, "category": "Napoje zimne", "is_active": True},
    {"id": 47, "name": "Pepsi w butelce", "price": 8.0, "category": "Napoje zimne", "is_active": True},
    {"id": 48, "name": "Pepsi zero w butelce", "price": 8.0, "category": "Napoje zimne", "is_active": True},

    {"id": 49, "name": "Mirinda w puszce", "price": 8.0, "category": "Napoje zimne", "is_active": True},
    {"id": 50, "name": "7up w puszce", "price": 8.0, "category": "Napoje zimne", "is_active": True},
    {"id": 51, "name": "Lipton w puszce", "price": 8.0, "category": "Napoje zimne", "is_active": True},

    {"id": 52, "name": "Lipton 0.5", "price": 10.0, "category": "Napoje zimne", "is_active": True},
    {"id": 53, "name": "Mountain Dew", "price": 10.0, "category": "Napoje zimne", "is_active": True},
    {"id": 54, "name": "Nektar owocowy", "price": 8.0, "category": "Napoje zimne", "is_active": True},

    # --- NAPOJE CIEPŁE ---
    {"id": 55, "name": "Espresso", "price": 8.0, "category": "Napoje ciepłe", "is_active": True},
    {"id": 56, "name": "Kawa czarna", "price": 10.0, "category": "Napoje ciepłe", "is_active": True},
    {"id": 57, "name": "Cappuccino", "price": 14.0, "category": "Napoje ciepłe", "is_active": True},
    {"id": 58, "name": "Caffe latte", "price": 15.0, "category": "Napoje ciepłe", "is_active": True},
    {"id": 59, "name": "Herbata arabska", "price": 8.0, "category": "Napoje ciepłe", "is_active": True},

    # --- DESERY ---
    {"id": 60, "name": "Baklawa", "price": 10.0, "category": "Desery", "is_active": True},
]

TABLE_CODES = {"1","2","3","4","5","6","7","8","9","10"}


ORDERS_DB: Dict[int, dict] = {}
NEXT_ORDER_ID = 100


DEFAULT_KEBAB_OPTION_GROUPS = [
    {
        "group_id": "meat",
        "title": "Jakie mięso chcesz?",
        "required": True,
        "max_select": 1,
        "options": ["Kurczak", "Wołowina", "Mieszane"],
    },
    {
        "group_id": "sauce",
        "title": "Sosy do wyboru",
        "required": True,
        "max_select": 1,
        "options": ["Sos lagodny", "Sos ostry", "Mieszane"],
    },
]

PRODUCT_OPTION_GROUPS: Dict[int, List[dict]] = {
    product["id"]: DEFAULT_KEBAB_OPTION_GROUPS
    for product in MENU_DB
    if product["category"] == "kebabs"
}



OrderStatus = Literal["new", "ready", "canceled"]

class MenuItemOut(BaseModel):
    id: int
    name: str
    price: float
    category: str
    is_active: bool
    option_groups: List[dict] = []

class OrderItemOptionIn(BaseModel):
    group_id: str
    group_title: str
    value: str


class OrderItemAddonIn(BaseModel):
    addon_id: int
    name: str
    price: float = Field(ge=0)

class OrderItemIn(BaseModel):
    product_id: int
    qty: int = Field(ge=1, le=20)
    comment: str = ""
    options: List[OrderItemOptionIn] = []
    addons: List[OrderItemAddonIn] = []
        


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
    
    



#---------РОУТИ---------№



@app.get("/api/menu", response_model=List[MenuItemOut])
def get_menu(category: Optional[str] = Query(default=None)):
    items = [m for m in MENU_DB if m["is_active"]]

    if category:
        category_l = category.strip().lower()
        items = [m for m in items if m["category"].strip().lower() == category_l]

    return [
        {**item, "option_groups": PRODUCT_OPTION_GROUPS.get(item["id"], [])}
        for item in items
    ]

@app.post("/api/orders", response_model=OrderCreateOut)
def create_order(payload: OrderCreateIn):
    global NEXT_ORDER_ID
    
    menu_by_id = {m["id"]: m for m in MENU_DB}
    for it in payload.items:
        product = menu_by_id.get(it.product_id)
        if not product or not product["is_active"]:
            raise HTTPException(
                status_code=400,
                detail=f"Product {it.product_id} unavailable",
            )
        groups = PRODUCT_OPTION_GROUPS.get(it.product_id, [])
        required_group_ids = {g["group_id"] for g in groups if g.get("required")}
        selected_group_ids = {opt.group_id for opt in it.options}
        missing = required_group_ids - selected_group_ids
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Product {it.product_id} is missing required options: {', '.join(sorted(missing))}",
            )

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
            "options": [opt.dict() for opt in it.options],
            "addons": [addon.dict() for addon in it.addons],
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
def kitchen_orders(status: OrderStatus | None = Query(default=None)):
    orders = list(ORDERS_DB.values())
    # фільтр по статусу, якщо передали
    if status:
        orders = [o for o in orders if o["status"] == status]
    # найновіші зверху
    orders.sort(key=lambda o: o["created_at"], reverse=True)
    return orders


@app.patch("/api/orders/{order_id}/status")
def update_status(order_id: int, payload: StatusUpdateIn):
    order = ORDERS_DB.get(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # (опційно) перевірка столика вже з order, а не з payload
    if order.get("table_code") not in TABLE_CODES:
        raise HTTPException(status_code=404, detail="Table not found")

    order["status"] = payload.status
    return {"ok": True, "order_id": order_id, "status": order["status"]}

@app.delete("/api/orders/{order_id}")
def delete_order(order_id: int):
    if order_id not in ORDERS_DB:
        raise HTTPException(status_code=404, detail="Order not found")

    del ORDERS_DB[order_id]
    return {"ok": True, "deleted": order_id}

