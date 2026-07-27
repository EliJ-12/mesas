'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrderRealtime, changeItemQuantity } from '@/lib/useOrderRealtime';
import ProductPicker from '@/components/ProductPicker';
import CheckoutModal from '@/components/CheckoutModal';
import { supabase } from '@/lib/supabase';

export default function MesaDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { order, items, loading } = useOrderRealtime(id);
  const [showPicker, setShowPicker] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const markAsToPay = async () => {
    const { error } = await supabase.from('tables').update({ status: 'to_pay' }).eq('id', id);
    if (error) {
      alert('Error al marcar la mesa: ' + error.message);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Cargando...</div>;

  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const totalPending = items.reduce((s, i) => s + i.unit_price * (i.quantity - i.paid_quantity), 0);
  const totalPaid = total - totalPending;

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto', paddingBottom: 100 }}>
      <button onClick={() => router.push('/mesas')} style={{ border: 'none', background: 'none', marginBottom: 12, cursor: 'pointer' }}>
        ← Volver a mesas
      </button>

      <h1>Mesa</h1>

      {items.length === 0 && (
        <p style={{ opacity: 0.6, marginTop: 20 }}>No hay productos añadidos todavía.</p>
      )}

      <div style={{ marginTop: 16 }}>
        {items.map((item) => {
          const pending = item.quantity - item.paid_quantity;
          return (
            <div
              key={item.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: '1px solid #eee',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>
                  {item.unit_price.toFixed(2)} € / ud.
                  {item.paid_quantity > 0 && (
                    <span style={{ color: '#43a047' }}> · {item.paid_quantity} pagada(s)</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  disabled={pending <= 0 && item.paid_quantity >= item.quantity}
                  onClick={() => changeItemQuantity(item, -1)}
                  style={qtyBtn}
                >
                  -
                </button>
                <span style={{ minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                <button onClick={() => changeItemQuantity(item, 1)} style={qtyBtn}>+</button>
                <button
                  onClick={() => changeItemQuantity(item, -item.quantity)}
                  style={{
                    ...qtyBtn,
                    background: '#ffebee',
                    borderColor: '#e53935',
                    color: '#e53935',
                  }}
                  title="Eliminar producto"
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: '#fafafa', borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span>Total</span><span>{total.toFixed(2)} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#43a047' }}>
          <span>Pagado</span><span>{totalPaid.toFixed(2)} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700 }}>
          <span>Pendiente</span><span>{totalPending.toFixed(2)} €</span>
        </div>
      </div>

      {/* Botones fijos abajo */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff',
        padding: 16, display: 'flex', gap: 10, borderTop: '1px solid #eee',
        flexWrap: 'wrap',
      }}>
        <button onClick={() => setShowPicker(true)} style={secondaryBtn}>
          + Añadir producto
        </button>
        <button
          onClick={markAsToPay}
          disabled={!order}
          style={{
            ...secondaryBtn,
            opacity: !order ? 0.4 : 1,
            background: '#ffebee',
            borderColor: '#e53935',
            color: '#e53935',
          }}
        >
          🔔 Pedir cuenta
        </button>
        <button
          onClick={() => setShowCheckout(true)}
          disabled={!order || totalPending <= 0}
          style={{ ...primaryBtn, opacity: !order || totalPending <= 0 ? 0.4 : 1 }}
        >
          Cobrar
        </button>
      </div>

      {showPicker && <ProductPicker tableId={id} onClose={() => setShowPicker(false)} />}
      {showCheckout && order && (
        <CheckoutModal order={order} items={items} onClose={() => setShowCheckout(false)} />
      )}
    </div>
  );
}

const qtyBtn = {
  width: 30, height: 30, borderRadius: '50%', border: '1px solid #ccc',
  background: '#fff', cursor: 'pointer', fontSize: 16,
};
const secondaryBtn = {
  flex: 1, padding: 14, borderRadius: 10, border: '1px solid #222',
  background: '#fff', color: '#222', fontWeight: 600, cursor: 'pointer',
};
const primaryBtn = {
  flex: 1, padding: 14, borderRadius: 10, border: 'none',
  background: '#222', color: '#fff', fontWeight: 600, cursor: 'pointer',
};
