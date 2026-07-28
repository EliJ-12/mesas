'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function MesasGestionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tables, setTables] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [formData, setFormData] = useState({
    number: '',
    zone_id: '',
    status: 'free',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/mesas');
      return;
    }
    loadData();
  }, [user, authLoading, router]);

  const loadData = async () => {
    const [zonesRes, tablesRes] = await Promise.all([
      supabase.from('zones').select('*').order('sort_order'),
      supabase.from('tables').select('*, zones(name)').order('number'),
    ]);
    console.log('Zones response:', zonesRes);
    console.log('Tables response:', tablesRes);
    if (zonesRes.error) console.error('Zones error:', zonesRes.error);
    if (tablesRes.error) console.error('Tables error:', tablesRes.error);
    setZones(zonesRes.data || []);
    setTables(tablesRes.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      number: parseInt(formData.number),
      zone_id: formData.zone_id || null,
      status: formData.status,
    };

    let error;
    if (editingTable) {
      const res = await supabase.from('tables').update(payload).eq('id', editingTable.id);
      error = res.error;
    } else {
      const res = await supabase.from('tables').insert(payload);
      error = res.error;
    }

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    setShowModal(false);
    setEditingTable(null);
    setFormData({ number: '', zone_id: '', status: 'free' });
    loadData();
  };

  const handleEdit = (table) => {
    setEditingTable(table);
    setFormData({
      number: table.number.toString(),
      zone_id: table.zone_id || '',
      status: table.status || 'free',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta mesa?')) return;
    console.log('Intentando eliminar mesa con ID:', id);

    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) {
      console.error('Error al eliminar mesa:', error);
      alert('Error al eliminar: ' + error.message);
      return;
    }
    console.log('Mesa eliminada correctamente');
    loadData();
  };

  if (authLoading || loading) return <div style={{ padding: 24 }}>Cargando...</div>;

  // Agrupar mesas por zona
  const tablesByZone = zones.map((zone) => ({
    zone,
    tables: tables.filter((t) => t.zone_id === zone.id),
  }));

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Gestión de Mesas</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/mesas')}
            style={{
              padding: 8,
              borderRadius: 6,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            ← Mesas
          </button>
          <button
            onClick={() => {
              setEditingTable(null);
              setFormData({ number: '', zone_id: '' });
              setShowModal(true);
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: 'none',
              background: '#222',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            + Nueva
          </button>
        </div>
      </div>

      {tablesByZone.map(({ zone, tables: zoneTables }) => {
        const isInterior = zone.name.toLowerCase().includes('interior');
        return (
          <div key={zone.id} style={{ marginBottom: 24 }}>
            <div style={{
              background: isInterior ? '#e3f2fd' : '#fff3e0',
              padding: '12px 16px',
              borderRadius: '8px 8px 0 0',
              borderBottom: `2px solid ${isInterior ? '#2196f3' : '#ff9800'}`,
            }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: isInterior ? '#1565c0' : '#e65100' }}>
                {zone.name}
              </h2>
            </div>
          <div style={{ background: '#fff', borderRadius: '0 0 8px 8px', border: '1px solid #eee', borderTop: 'none', overflow: 'hidden' }}>
            {zoneTables.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', opacity: 0.6, fontSize: 13 }}>
                No hay mesas en esta zona
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #eee' }}>
                    <th style={{ padding: 10, textAlign: 'left', fontSize: 12, fontWeight: 600 }}>Número</th>
                    <th style={{ padding: 10, textAlign: 'left', fontSize: 12, fontWeight: 600 }}>Estado</th>
                    <th style={{ padding: 10, textAlign: 'center', fontSize: 12, fontWeight: 600 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneTables.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 10, fontWeight: 700, fontSize: 14 }}>Mesa {t.number}</td>
                      <td style={{ padding: 10 }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                            background:
                              t.status === 'free'
                                ? '#e8f5e9'
                                : t.status === 'occupied'
                                ? '#fff8e1'
                                : '#ffebee',
                            color:
                              t.status === 'free'
                                ? '#43a047'
                                : t.status === 'occupied'
                                ? '#fb8c00'
                                : '#e53935',
                          }}
                        >
                          {t.status === 'free' ? 'Libre' : t.status === 'occupied' ? 'Ocupada' : 'Cobrar'}
                        </span>
                      </td>
                      <td style={{ padding: 10, textAlign: 'center' }}>
                        <button
                          onClick={() => handleEdit(t)}
                          style={{
                            padding: 4,
                            borderRadius: 4,
                            border: '1px solid #ddd',
                            background: '#fff',
                            cursor: 'pointer',
                            marginRight: 4,
                            fontSize: 12,
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          style={{
                            padding: 4,
                            borderRadius: 4,
                            border: '1px solid #ddd',
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        );
      })}

      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{editingTable ? 'Editar mesa' : 'Nueva mesa'}</h2>
              <button onClick={() => setShowModal(false)} style={closeBtn}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
                  Número de mesa
                </label>
                <input
                  type="number"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  required
                  min="1"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
                  Zona
                </label>
                <select
                  value={formData.zone_id}
                  onChange={(e) => setFormData({ ...formData, zone_id: e.target.value })}
                  required
                  style={inputStyle}
                >
                  <option value="">Selecciona una zona</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
                  Estado
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={inputStyle}
                >
                  <option value="free">Libre</option>
                  <option value="occupied">Ocupada</option>
                  <option value="to_pay">Cobrar</option>
                </select>
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 10,
                  border: 'none',
                  background: '#222',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {editingTable ? 'Guardar cambios' : 'Crear mesa'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
};

const modalStyle = {
  background: '#fff',
  width: '90%',
  maxWidth: 400,
  borderRadius: 16,
  padding: 24,
};

const closeBtn = {
  border: 'none',
  background: 'none',
  fontSize: 20,
  cursor: 'pointer',
};

const inputStyle = {
  width: '100%',
  padding: 12,
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 14,
  boxSizing: 'borderBox',
};
