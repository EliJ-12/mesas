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
  const [editingPriceItem, setEditingPriceItem] = useState(null);
  const [customPrice, setCustomPrice] = useState('');

  const markAsToPay = async () => {
    const { error } = await supabase.from('tables').update({ status: 'to_pay' }).eq('id', id);
    if (error) {
      alert('Error al marcar la mesa: ' + error.message);
    }
  };

  const toggleTableStatus = async () => {
    const { data: table } = await supabase.from('tables').select('status').eq('id', id).single();
    if (!table) return;
    
    const newStatus = table.status === 'free' ? 'occupied' : 'free';
    const { error } = await supabase.from('tables').update({ status: newStatus }).eq('id', id);
    if (error) {
      alert('Error al cambiar estado de la mesa: ' + error.message);
    }
  };

  const handleEditPrice = (item) => {
    setEditingPriceItem(item);
    setCustomPrice(item.unit_price.toString());
  };

  const savePrice = async () => {
    const { error } = await supabase
      .from('order_items')
      .update({ unit_price: parseFloat(customPrice) })
      .eq('id', editingPriceItem.id);
    if (error) {
      alert('Error al modificar precio: ' + error.message);
      return;
    }
    setEditingPriceItem(null);
    setCustomPrice('');
  };

  if (loading) return <div style={{ padding: 24 }}>Cargando...</div>;

  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const totalPending = items.reduce((s, i) => s + i.unit_price * (i.quantity - i.paid_quantity), 0);
  const totalPaid = total - totalPending;

  const paidItems = items.filter((i) => i.paid_quantity > 0);
  const pendingItems = items.filter((i) => i.quantity - i.paid_quantity > 0);

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: '0 auto', paddingBottom: 120 }}>
      <button onClick={() => router.push('/mesas')} style={{ border: 'none', background: 'none', marginBottom: 10, cursor: 'pointer', fontSize: 14 }}>
        ← Volver
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Mesa</h1>
        <button
          onClick={toggleTableStatus}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #ddd',
            background: '#fff',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          🔄 Estado
        </button>
      </div>

      {items.length === 0 && (
        <p style={{ opacity: 0.6, marginTop: 20 }}>No hay productos añadidos todavía.</p>
      )}

      {/* Productos pendientes */}
      {pendingItems.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, marginBottom: 8, textTransform: 'uppercase' }}>
            Pendientes de pago
          </div>
          {pendingItems.map((item) => {
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
                    {editingPriceItem?.id === item.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          step="0.01"
                          value={customPrice}
                          onChange={(e) => setCustomPrice(e.target.value)}
                          style={{
                            width: 60,
                            padding: 4,
                            borderRadius: 4,
                            border: '1px solid #ddd',
                            fontSize: 12,
                          }}
                        />
                        <span style={{ fontSize: 12 }}>€</span>
                        <button
                          onClick={savePrice}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: 'none',
                            background: '#43a047',
                            color: '#fff',
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            setEditingPriceItem(null);
                            setCustomPrice('');
                          }}
                          style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: 'none',
                            background: '#e53935',
                            color: '#fff',
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        {item.unit_price.toFixed(2)} € / ud.
                        <button
                          onClick={() => handleEditPrice(item)}
                          style={{
                            marginLeft: 6,
                            padding: '2px 6px',
                            borderRadius: 4,
                            border: '1px solid #ddd',
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: 10,
                            opacity: 0.6,
                          }}
                          title="Modificar precio"
                        >
                          ✏️
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    disabled={pending <= 0}
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
      )}

      {/* Productos pagados */}
      {paidItems.length > 0 && (
        <div style={{ marginTop: 20, padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, marginBottom: 8, textTransform: 'uppercase' }}>
            Ya pagados
          </div>
          {paidItems.map((item) => {
            const pending = item.quantity - item.paid_quantity;
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '1px solid #e0e0e0',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    {item.unit_price.toFixed(2)} € / ud.
                    <span style={{ color: '#43a047', marginLeft: 6 }}>· {item.paid_quantity} pagada(s)</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {pending > 0 && (
                    <>
                      <button
                        onClick={() => changeItemQuantity(item, -1)}
                        style={qtyBtn}
                      >
                        -
                      </button>
                      <span style={{ minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => changeItemQuantity(item, 1)} style={qtyBtn}>+</button>
                    </>
                  )}
                  {pending === 0 && (
                    <span style={{ fontSize: 12, opacity: 0.6, minWidth: 60, textAlign: 'center' }}>
                      {item.quantity} ud.
                    </span>
                  )}
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
      )}

      <div style={{ marginTop: 20, padding: 14, background: '#fafafa', borderRadius: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span>Total</span><span>{total.toFixed(2)} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#43a047' }}>
          <span>Pagado</span><span>{totalPaid.toFixed(2)} €</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
          <span>Pendiente</span><span>{totalPending.toFixed(2)} €</span>
        </div>
      </div>

      {/* Botones fijos abajo */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff',
        padding: 12, display: 'flex', gap: 8, borderTop: '1px solid #eee',
        flexWrap: 'wrap',
      }}>
        <button onClick={() => setShowPicker(true)} style={secondaryBtn}>
          + Producto
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
          🔔 Cuenta
        </button>
      </div>

      {showPicker && <ProductPicker tableId={id} onClose={() => setShowPicker(false)} />}
    </div>
  );
}

const qtyBtn = {
  width: 28, height: 28, borderRadius: '50%', border: '1px solid #ccc',
  background: '#fff', cursor: 'pointer', fontSize: 14,
};
const secondaryBtn = {
  flex: 1, padding: 10, borderRadius: 8, border: '1px solid #222',
  background: '#fff', color: '#222', fontWeight: 600, cursor: 'pointer', fontSize: 13,
};
const primaryBtn = {
  flex: 1, padding: 10, borderRadius: 8, border: 'none',
  background: '#222', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13,
};
