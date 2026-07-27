# App de gestión de mesas (tiempo real)

Stack: **Next.js 14 (App Router)** + **Supabase (Postgres + Realtime + Auth)** + **Vercel**.

## ¿Por qué no un refresco cada 0,1s / 1s?

Con Supabase **no hace falta polling**. En vez de que cada dispositivo pregunte
"¿hay cambios?" cada X ms (lo cual gastaría recursos y tendría lag),
usamos **Supabase Realtime**: los dispositivos se suscriben a las tablas
(`tables`, `orders`, `order_items`, `payments`) vía websockets, y en cuanto
un camarero añade un producto o cobra desde su móvil, **todos los demás
dispositivos reciben el cambio en <200ms** automáticamente, sin refrescar
la página. Es más rápido, más barato y no satura la base de datos.

Los hooks `useTablesRealtime` y `useOrderRealtime` ya implementan esto.

## Estructura del proyecto

```
mesas-app/
├── supabase/
│   └── schema.sql          # Ejecutar en Supabase SQL Editor
├── lib/
│   ├── supabase.js         # Cliente Supabase
│   ├── auth.js             # Contexto de autenticación
│   ├── useTablesRealtime.js
│   └── useOrderRealtime.js
├── components/
│   ├── TableCard.js
│   ├── ProductPicker.js
│   ├── CheckoutModal.js
│   └── LoginModal.js       # Modal de login para staff
└── app/
    ├── layout.js
    ├── page.js              # redirige a /mesas
    ├── mesas/
    │   ├── page.js          # grid de mesas (interior/exterior) + login
    │   └── [id]/page.js     # detalle de mesa + cobro + pedir cuenta
    ├── productos/
    │   └── page.js         # gestión CRUD de productos
    └── caja/
        └── page.js         # historial de cobros / cierre de caja
```

## Modelo de datos (resumen)

- **zones**: Interior / Exterior (o las que quieras)
- **tables**: mesas, cada una con `zone_id` y `status` (free/occupied/to_pay)
- **categories / products**: catálogo con foto y precio
- **orders**: una comanda "open" por mesa; se cierra cuando todo está pagado
- **order_items**: productos añadidos, con `quantity` y `paid_quantity`
  (permite pagar solo parte de las unidades de un mismo producto)
- **payments / payment_items**: cada cobro (efectivo/tarjeta), con qué
  líneas y cantidades cubre — esto es lo que permite las **subcuentas**

## Pasos para desplegar

### 1. Supabase
1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`
3. En **Project Settings > API**, copia `URL` y `anon public key`
4. (Opcional) Sube fotos de productos a **Storage** y usa esa URL en `photo_url`
5. Configura **Authentication** para tu staff (email/password es lo más simple)
   — el esquema usa `auth.role() = 'authenticated'`, así que cualquier
   usuario logueado puede operar. Si quieres roles (camarero vs admin),
   añade una tabla `staff(user_id, role)` y ajusta las políticas RLS.

### 2. Proyecto local
```bash
npm install
cp .env.local.example .env.local
# rellena NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

### 3. Vercel
1. Sube este proyecto a un repo de GitHub
2. Importa el repo en [vercel.com](https://vercel.com)
3. En **Environment Variables**, añade las mismas dos variables de `.env.local`
4. Deploy — listo, cada dispositivo que abra la URL verá los cambios en vivo

## Funcionalidades implementadas

- ✅ **Login de staff** - Sistema de autenticación con Supabase Auth (email/password)
  - Modal de login integrado en la página principal
  - Sesión persistente con contexto React
  - Botón de cierre de sesión

- ✅ **Gestión del catálogo de productos** - CRUD completo en `/productos`
  - Crear, editar y eliminar productos
  - Asignar categorías
  - Activar/desactivar productos
  - Gestionar URLs de fotos

- ✅ **Historial de cobros / cierre de caja** - Vista en `/caja`
  - Filtrado por fecha y método de pago
  - Totales por efectivo, tarjeta y total del día
  - Listado detallado de todos los cobros

- ✅ **Notificación visual "Pedir cuenta"** - Botón en detalle de mesa
  - Marca la mesa como `to_pay` para indicar que el cliente quiere la cuenta
  - La mesa se muestra en rojo en el grid principal

## Pendiente de implementar (opcional)

- Fotos de productos: usa **Supabase Storage** (bucket público) y guarda la URL
  - Actualmente se pueden añadir URLs manualmente en el formulario de productos
- Roles de usuario (camarero vs admin) - añadir tabla `staff(user_id, role)` y ajustar políticas RLS

## Notas técnicas importantes

- `order_items.paid_quantity` es la clave de las subcuentas: cuando alguien
  paga 2 de las 4 cañas de la mesa, esa línea queda con `quantity=4,
  paid_quantity=2`, y el resto sigue pendiente para que otra persona lo pague.
- La función SQL `maybe_close_order` cierra automáticamente la comanda y
  libera la mesa cuando `total_pending = 0`.
- La vista `table_totals` es la que alimenta el grid principal — puedes
  extenderla si necesitas más columnas (ej. tiempo abierta, camarero asignado).
