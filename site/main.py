from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from wsgiref.simple_server import make_server

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "orders.db"
STYLE_PATH = BASE_DIR / "static" / "style.css"

MENU = [
    {"id": 1, "name": "Kebab Classic", "price": 160},
    {"id": 2, "name": "Kebab Cheese", "price": 175},
    {"id": 3, "name": "Falafel Box", "price": 145},
    {"id": 4, "name": "Fries", "price": 70},
    {"id": 5, "name": "Lemonade", "price": 55},
]


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_number TEXT NOT NULL,
                customer_name TEXT,
                items TEXT NOT NULL,
                total_price INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'new',
                created_at TEXT NOT NULL
            )
            """
        )


def response(start_response, status: str, body: str | bytes, content_type: str = "text/html; charset=utf-8"):
    if isinstance(body, str):
        data = body.encode("utf-8")
    else:
        data = body
    start_response(status, [("Content-Type", content_type), ("Content-Length", str(len(data)))])
    return [data]


def json_response(start_response, status: str, payload: dict | list):
    return response(start_response, status, json.dumps(payload, ensure_ascii=False), "application/json; charset=utf-8")


def get_orders() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, table_number, customer_name, items, total_price, status, created_at FROM orders ORDER BY id DESC"
        ).fetchall()
    return [dict(row) for row in rows]


def render_site(table: str = "") -> str:
    menu_html = "".join(
        f'''<label class="menu-item"><input type="checkbox" name="item" value="{item['id']}"/><span>{item['name']}</span><strong>{item['price']} ₴</strong></label>'''
        for item in MENU
    )
    return f'''<!doctype html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Restaurant of the Future — QR замовлення</title><link rel="stylesheet" href="/static/style.css"/></head><body><main class="container"><header><h1>Restaurant of the Future</h1><p>Скануй QR код за столиком і оформлюй замовлення за 30 секунд.</p></header><section class="card"><h2>Оформлення замовлення</h2><form id="order-form"><label>Номер столика<input id="table" required value="{table}" placeholder="Напр. 12"/></label><label>Ваше ім'я (необов'язково)<input id="customer" placeholder="Ім'я"/></label><div class="menu-grid">{menu_html}</div><button type="submit">Підтвердити замовлення</button></form><p id="result"></p></section></main><script>const form=document.getElementById('order-form');const result=document.getElementById('result');form.addEventListener('submit',async(e)=>{{e.preventDefault();const tableNumber=document.getElementById('table').value.trim();const customerName=document.getElementById('customer').value.trim();const itemIds=[...document.querySelectorAll('input[name="item"]:checked')].map(el=>Number(el.value));const resp=await fetch('/api/orders',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{table_number:tableNumber,customer_name:customerName,item_ids:itemIds}})}});const data=await resp.json();if(!resp.ok){{result.textContent=data.error||'Не вдалося створити замовлення';result.className='error';return;}}result.textContent=`Замовлення №${{data.order_id}} прийнято!`;result.className='success';form.reset();}});</script></body></html>'''


def render_admin() -> str:
    return '''<!doctype html><html lang="uk"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Admin — Restaurant orders</title><style>body{font-family:Arial,sans-serif;margin:20px;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f3f3f3;}select{padding:4px;}.muted{color:#777;margin-bottom:10px;}</style></head><body><h1>Admin panel — incoming orders</h1><p class="muted">Спрощений інтерфейс для прийому замовлень через бекенд.</p><table><thead><tr><th>ID</th><th>Стіл</th><th>Клієнт</th><th>Позиції</th><th>Сума</th><th>Статус</th><th>Створено</th></tr></thead><tbody id="orders"></tbody></table><script>async function loadOrders(){const response=await fetch('/api/orders');const orders=await response.json();const tbody=document.getElementById('orders');tbody.innerHTML='';for(const order of orders){const tr=document.createElement('tr');tr.innerHTML=`<td>${order.id}</td><td>${order.table_number}</td><td>${order.customer_name||'-'}</td><td>${order.items}</td><td>${order.total_price} ₴</td><td><select data-id="${order.id}">${['new','accepted','done'].map(s=>`<option value="${s}" ${s===order.status?'selected':''}>${s}</option>`).join('')}</select></td><td>${order.created_at}</td>`;tbody.appendChild(tr);}document.querySelectorAll('select[data-id]').forEach((select)=>{select.addEventListener('change',async(event)=>{const id=Number(event.target.dataset.id);const status=event.target.value;await fetch(`/api/orders/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});});});}loadOrders();setInterval(loadOrders,5000);</script></body></html>'''


def parse_json(environ) -> dict:
    try:
        size = int(environ.get("CONTENT_LENGTH") or 0)
    except ValueError:
        size = 0
    raw = environ["wsgi.input"].read(size) if size else b"{}"
    try:
        return json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return {}


def application(environ, start_response):
    method = environ["REQUEST_METHOD"].upper()
    path = environ.get("PATH_INFO", "/")

    if path == "/":
        start_response("302 Found", [("Location", "/site")])
        return [b""]

    if method == "GET" and path == "/health":
        return json_response(start_response, "200 OK", {"status": "ok"})

    if method == "GET" and path == "/site":
        query = parse_qs(urlparse(environ.get("RAW_URI", "")).query)
        table = (query.get("table") or [""])[0]
        return response(start_response, "200 OK", render_site(table))

    if method == "GET" and path == "/admin":
        return response(start_response, "200 OK", render_admin())

    if method == "GET" and path == "/static/style.css":
        return response(start_response, "200 OK", STYLE_PATH.read_bytes(), "text/css; charset=utf-8")

    if path == "/api/orders" and method == "GET":
        return json_response(start_response, "200 OK", get_orders())

    if path == "/api/orders" and method == "POST":
        payload = parse_json(environ)
        table = str(payload.get("table_number", "")).strip()
        customer_name = str(payload.get("customer_name", "")).strip()
        item_ids = payload.get("item_ids", [])

        if not table:
            return json_response(start_response, "400 Bad Request", {"error": "Table number is required"})
        if not isinstance(item_ids, list) or not item_ids:
            return json_response(start_response, "400 Bad Request", {"error": "Select at least one item"})

        selected = [item for item in MENU if item["id"] in item_ids]
        if not selected:
            return json_response(start_response, "400 Bad Request", {"error": "Invalid menu selection"})

        names = ", ".join(item["name"] for item in selected)
        total = sum(item["price"] for item in selected)
        with get_connection() as conn:
            cur = conn.execute(
                "INSERT INTO orders (table_number, customer_name, items, total_price, status, created_at) VALUES (?, ?, ?, ?, 'new', ?)",
                (table, customer_name, names, total, datetime.utcnow().isoformat(timespec="seconds")),
            )
        return json_response(start_response, "200 OK", {"ok": True, "order_id": cur.lastrowid})

    if method == "PATCH" and path.startswith("/api/orders/"):
        try:
            order_id = int(path.split("/")[-1])
        except ValueError:
            return json_response(start_response, "400 Bad Request", {"error": "Invalid order id"})
        status = str(parse_json(environ).get("status", "")).strip()
        if status not in {"new", "accepted", "done"}:
            return json_response(start_response, "400 Bad Request", {"error": "Invalid status"})
        with get_connection() as conn:
            cur = conn.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
        if cur.rowcount == 0:
            return json_response(start_response, "404 Not Found", {"error": "Order not found"})
        return json_response(start_response, "200 OK", {"ok": True})

    return response(start_response, "404 Not Found", "Not found", "text/plain; charset=utf-8")


if __name__ == "__main__":
    init_db()
    port = int(os.getenv("PORT", "8000"))
    with make_server("0.0.0.0", port, application) as server:
        print(f"Server running on http://0.0.0.0:{port}")
        server.serve_forever()
