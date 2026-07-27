-- =========================================================
-- ESQUEMA BASE DE DATOS - GESTIÓN DE MESAS
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =========================================================

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- 1. ZONAS (interior / exterior) — extensible a más zonas
-- ---------------------------------------------------------
create table zones (
  id uuid primary key default uuid_generate_v4(),
  name text not null,          -- 'Interior', 'Exterior', 'Terraza'...
  sort_order int default 0
);

insert into zones (name, sort_order) values ('Interior', 1), ('Exterior', 2);

-- ---------------------------------------------------------
-- 2. MESAS
-- ---------------------------------------------------------
create table tables (
  id uuid primary key default uuid_generate_v4(),
  number int not null,
  zone_id uuid references zones(id) on delete cascade not null,
  status text not null default 'free'
    check (status in ('free', 'occupied', 'to_pay')),
  -- 'free' = libre, 'occupied' = con comanda abierta, 'to_pay' = pidió cuenta
  created_at timestamptz default now(),
  unique (zone_id, number)
);

-- ---------------------------------------------------------
-- 3. CATEGORÍAS DE PRODUCTOS (opcional, útil para el picker)
-- ---------------------------------------------------------
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sort_order int default 0
);

-- ---------------------------------------------------------
-- 4. PRODUCTOS (catálogo, con foto y precio)
-- ---------------------------------------------------------
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  photo_url text,
  category_id uuid references categories(id),
  active boolean default true,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------
-- 5. COMANDAS (una "orden" abierta por mesa; se cierra al cobrar)
-- ---------------------------------------------------------
create table orders (
  id uuid primary key default uuid_generate_v4(),
  table_id uuid references tables(id) on delete cascade not null,
  status text not null default 'open'
    check (status in ('open', 'closed')),
  opened_at timestamptz default now(),
  closed_at timestamptz
);

-- ---------------------------------------------------------
-- 6. LÍNEAS DE PEDIDO (productos añadidos a la mesa)
--    paid_amount permite pagos parciales por unidad (ej. dividir 1 producto)
-- ---------------------------------------------------------
create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) on delete cascade not null,
  product_id uuid references products(id) not null,
  product_name text not null,      -- snapshot por si cambia el producto luego
  unit_price numeric(10,2) not null,
  quantity int not null default 1 check (quantity > 0),
  paid_quantity int not null default 0 check (paid_quantity >= 0),
  created_at timestamptz default now(),
  check (paid_quantity <= quantity)
);

-- ---------------------------------------------------------
-- 7. PAGOS (para cuentas divididas y el registro de caja)
-- ---------------------------------------------------------
create table payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references orders(id) not null,
  amount numeric(10,2) not null check (amount > 0),
  method text not null check (method in ('cash', 'card')),
  created_at timestamptz default now(),
  note text  -- ej: "Subcuenta 2 personas" o "Cuenta completa"
);

-- Detalle de qué order_item (y cuánta cantidad) cubre cada pago
create table payment_items (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid references payments(id) on delete cascade not null,
  order_item_id uuid references order_items(id) not null,
  quantity int not null check (quantity > 0)
);

-- =========================================================
-- VISTA: total actual de cada mesa (para el grid principal)
-- =========================================================
create or replace view table_totals as
select
  t.id as table_id,
  o.id as order_id,
  coalesce(sum(oi.unit_price * oi.quantity), 0) as total,
  coalesce(sum(oi.unit_price * oi.paid_quantity), 0) as total_paid,
  coalesce(sum(oi.unit_price * (oi.quantity - oi.paid_quantity)), 0) as total_pending
from tables t
left join orders o on o.table_id = t.id and o.status = 'open'
left join order_items oi on oi.order_id = o.id
group by t.id, o.id;

-- =========================================================
-- FUNCIÓN: crear/obtener la orden abierta de una mesa
-- =========================================================
create or replace function get_or_create_open_order(p_table_id uuid)
returns uuid as $$
declare
  v_order_id uuid;
begin
  select id into v_order_id from orders
    where table_id = p_table_id and status = 'open'
    limit 1;

  if v_order_id is null then
    insert into orders (table_id, status) values (p_table_id, 'open')
      returning id into v_order_id;
    update tables set status = 'occupied' where id = p_table_id;
  end if;

  return v_order_id;
end;
$$ language plpgsql;

-- =========================================================
-- FUNCIÓN: cerrar mesa cuando todo está pagado
-- (se llama tras insertar un pago que cubre lo pendiente)
-- =========================================================
create or replace function maybe_close_order(p_order_id uuid)
returns void as $$
declare
  v_pending numeric;
  v_table_id uuid;
begin
  select total_pending into v_pending from table_totals where order_id = p_order_id;
  select table_id into v_table_id from orders where id = p_order_id;

  if v_pending <= 0 then
    update orders set status = 'closed', closed_at = now() where id = p_order_id;
    update tables set status = 'free' where id = v_table_id;
  else
    update tables set status = 'occupied' where id = v_table_id;
  end if;
end;
$$ language plpgsql;

-- =========================================================
-- REALTIME: habilitar réplica en tablas relevantes
-- =========================================================
alter publication supabase_realtime add table tables;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table payments;

-- =========================================================
-- RLS (Row Level Security) — ajusta según autenticación real.
-- Aquí: acceso abierto a usuarios autenticados (staff con login).
-- =========================================================
alter table tables enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table payment_items enable row level security;
alter table zones enable row level security;
alter table categories enable row level security;

-- Política simple: cualquier usuario autenticado (staff) puede leer/escribir.
-- En producción, crea una tabla `staff` y roles (camarero/admin) si lo necesitas.
create policy "staff_all_zones" on zones for all using (auth.role() = 'authenticated');
create policy "staff_all_categories" on categories for all using (auth.role() = 'authenticated');
create policy "staff_all_tables" on tables for all using (auth.role() = 'authenticated');
create policy "staff_all_products" on products for all using (auth.role() = 'authenticated');
create policy "staff_all_orders" on orders for all using (auth.role() = 'authenticated');
create policy "staff_all_order_items" on order_items for all using (auth.role() = 'authenticated');
create policy "staff_all_payments" on payments for all using (auth.role() = 'authenticated');
create policy "staff_all_payment_items" on payment_items for all using (auth.role() = 'authenticated');

-- =========================================================
-- DATOS DE EJEMPLO (borra esto en producción)
-- =========================================================
insert into categories (name, sort_order) values ('Bebidas', 1), ('Tapas', 2), ('Postres', 3);

do $$
declare v_int uuid; v_ext uuid;
begin
  select id into v_int from zones where name = 'Interior';
  select id into v_ext from zones where name = 'Exterior';
  insert into tables (number, zone_id) values
    (1, v_int), (2, v_int), (3, v_int), (4, v_int),
    (1, v_ext), (2, v_ext), (3, v_ext);
end $$;
