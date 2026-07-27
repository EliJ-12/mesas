'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// items: order_items pendientes (quantity - paid_quantity > 0)
// mode: 'full' (cobrar todo) | 'split' (elegir productos para una subcuenta)
export default function CheckoutModal({ order, items, onClose }) {
  const [mode, setMode] = useState('full');
  const [selected, setSelected] = useState({}); // { itemId: cantidadSeleccionada }
  const [method, setMethod] = useState('cash');
  const [saving, setSaving] = useState(false);

  const pendingItems = items
    .map((i) => ({ ...i, pending: i.quantity - i.paid_quantity }))
    .filter((i) => i.pending > 0);

  const fullTotal = pendingItems.reduce((s, i) => s + i.unit_price * i.pending, 0);

  const splitTotal = pendingItems.reduce((s, i) => {
    const qty = selected[i.id] || 0;
    return s + i.unit_price * qty;
  }, 0);

  const toggleQty = (item, qty) => {
    const clamped = Math.max(0, Math.min(qty, item.pending));
    setSelected((prev) => ({ ...prev, [item.id]: clamped }));
  };

  const handlePay = async () => {
    setSaving(true);
    try {
      const itemsToCharge =
        mode === 'full'
          ? pendingItems.map((i) => ({ id: i.id, qty: i.pending, unit_price: i.unit_price }))
          : pendingItems
              .filter((i) => (selected[i.id] || 0) > 0)
              .map((i) => ({ id: i.id, qty: selected[i.id], unit_price: i.unit_price }));

      if (itemsToCharge.length === 0) {
        setSaving(false);
        return;
      }

      const amount = itemsToCharge.reduce((s, i) => s + i.unit_price * i.qty, 0);

      // 1. Crear el pago
      const { data: payment, error: payErr } = await supabase
        .from('payments')
        .insert({
          order_id: order.id,
          amount,
          method,
          note: mode === 'full' ? 'Cuenta completa' : 'Subcuenta',
        })
        .select()
        .single();
      if (payErr) throw payErr;

      // 2. Registrar qué order_items cubre y actualizar paid_quantity
      for (const it of itemsToCharge) {
        const { error: piErr } = await supabase.from('payment_items').insert({
          payment_id: payment.id,
          order_item_id: it.id,
          quantity: it.qty,
        });
        if (piErr) throw piErr;

        const original = pendingItems.find((p) => p.id === it.id);
        const { error: updErr } = await supabase
          .from('order_items')
          .update({ paid_quantity: original.paid_quantity + it.qty })
          .eq('id', it.id);
        if (updErr) throw updErr;
      }

      // 3. Cerrar la mesa si ya no queda nada pendiente
      const { error: closeErr } = await supabase.rpc('maybe_close_order', {
        p_order_id: order.id,
      });
      if (closeErr) throw closeErr;

      onClose();
    } catch (e) {
      console.error(e);
      alert('Error al procesar el cobro: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h2>Cobrar mesa</h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
          <button onClick={() => setMode('full')} style={chip(mode === 'full')}>
            Cuenta completa
          </button>
          <button onClick={() => setMode('split')} style={chip(mode === 'split')}>
            Dividir cuenta
          </button>
        </div>

        {mode === 'split' && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, opacity: 0.7 }}>
              Selecciona cuántas unidades de cada producto paga esta persona:
            </p>
            {pendingItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid #eee',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.product_name}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    Pendiente: {item.pending} × {item.unit_price.toFixed(2)} €
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => toggleQty(item, (selected[item.id] || 0) - 1)} style={qtyBtn}>-</button>
                  <span>{selected[item.id] || 0}</span>
                  <button onClick={() => toggleQty(item, (selected[item.id] || 0) + 1)} style={qtyBtn}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {mode === 'full' && (
          <div style={{ marginBottom: 16 }}>
            {pendingItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 14 }}>
                <span>{item.pending}x {item.product_name}</span>
                <span>{(item.unit_price * item.pending).toFixed(2)} €</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setMethod('cash')} style={chip(method === 'cash')}>💵 Efectivo</button>
          <button onClick={() => setMethod('card')} style={chip(method === 'card')}>💳 Tarjeta</button>
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
          Total a cobrar: {(mode === 'full' ? fullTotal : splitTotal).toFixed(2)} €
        </div>

        <button
          onClick={handlePay}
          disabled={saving || (mode === 'full' ? fullTotal : splitTotal) <= 0}
          style={{
            width: '100%', padding: 14, borderRadius: 10, border: 'none',
            background: '#222', color: '#fff', fontSize: 16, fontWeight: 600,
            cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Procesando...' : 'Confirmar cobro'}
        </button>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'flex-end', zIndex: 50,
};
const modalStyle = {
  background: '#fff', width: '100%', maxHeight: '90vh', overflowY: 'auto',
  borderRadius: '16px 16px 0 0', padding: 16,
};
const closeBtn = { border: 'none', background: 'none', fontSize: 18, cursor: 'pointer' };
const chip = (active) => ({
  padding: '6px 12px', borderRadius: 16, border: '1px solid #ccc',
  background: active ? '#222' : '#fff', color: active ? '#fff' : '#222',
  fontSize: 11, cursor: 'pointer',
});
const qtyBtn = {
  width: 24, height: 24, borderRadius: '50%', border: '1px solid #ccc',
  background: '#fff', cursor: 'pointer', fontSize: 14,
};
