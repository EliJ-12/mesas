'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function CajaPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMethod, setFilterMethod] = useState('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/mesas');
      return;
    }
    loadPayments();
  }, [user, authLoading, router, filterDate, filterMethod]);

  const loadPayments = async () => {
    let query = supabase
      .from('payments')
      .select(`
        *,
        orders:order_id (
          tables:table_id (number)
        ),
        payment_items (
          order_items (product_name, quantity)
        )
      `)
      .gte('created_at', new Date(filterDate).toISOString())
      .lt('created_at', new Date(new Date(filterDate).getTime() + 86400000).toISOString())
      .order('created_at', { ascending: false });

    if (filterMethod !== 'all') {
      query = query.eq('method', filterMethod);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
    }
    setPayments(data || []);
    setLoading(false);
  };

  const totals = payments.reduce(
    (acc, p) => {
      if (p.method === 'cash') acc.cash += p.amount;
      if (p.method === 'card') acc.card += p.amount;
      acc.total += p.amount;
      return acc;
    },
    { cash: 0, card: 0, total: 0 }
  );

  if (authLoading || loading) return <div style={{ padding: 24 }}>Cargando...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Cierre de Caja</h1>
        <button
          onClick={() => router.push('/mesas')}
          style={{
            padding: 10,
            borderRadius: 8,
            border: '1px solid #ddd',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          ← Volver a mesas
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Fecha</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid #ddd',
              fontSize: 14,
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>Método</label>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid #ddd',
              fontSize: 14,
              minWidth: 120,
            }}
          >
            <option value="all">Todos</option>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#e8f5e9', padding: 20, borderRadius: 12, border: '2px solid #43a047' }}>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Total Efectivo</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#43a047' }}>{totals.cash.toFixed(2)} €</div>
        </div>
        <div style={{ background: '#e3f2fd', padding: 20, borderRadius: 12, border: '2px solid #1976d2' }}>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Total Tarjeta</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1976d2' }}>{totals.card.toFixed(2)} €</div>
        </div>
        <div style={{ background: '#fafafa', padding: 20, borderRadius: 12, border: '2px solid #222' }}>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Total del Día</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{totals.total.toFixed(2)} €</div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Hora</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Mesa</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Método</th>
              <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>Importe</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Nota</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', opacity: 0.6 }}>
                  No hay cobros para esta fecha
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 12 }}>
                    {new Date(p.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: 12, fontWeight: 600 }}>Mesa {p.orders?.tables?.number || '?'}</td>
                  <td style={{ padding: 12 }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: p.method === 'cash' ? '#e8f5e9' : '#e3f2fd',
                        color: p.method === 'cash' ? '#43a047' : '#1976d2',
                      }}
                    >
                      {p.method === 'cash' ? '💵 Efectivo' : '💳 Tarjeta'}
                    </span>
                  </td>
                  <td style={{ padding: 12, textAlign: 'right', fontWeight: 700 }}>{p.amount.toFixed(2)} €</td>
                  <td style={{ padding: 12, opacity: 0.7, fontSize: 13 }}>{p.note || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
