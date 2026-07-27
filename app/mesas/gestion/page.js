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
    setFormData({ number: '', zone_id: '' });
    loadData();
  };

  const handleEdit = (table) => {
    setEditingTable(table);
    setFormData({
      number: table.number.toString(),
      zone_id: table.zone_id || '',
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

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Gestión de Mesas</h1>
        <div style={{ display: 'flex', gap: 10 }}>
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
          <button
            onClick={() => {
              setEditingTable(null);
              setFormData({ number: '', zone_id: '' });
              setShowModal(true);
            }}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#222',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            + Nueva mesa
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Número</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Zona</th>
              <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Estado</th>
              <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 12, fontWeight: 700, fontSize: 16 }}>Mesa {t.number}</td>
                <td style={{ padding: 12, opacity: 0.7 }}>{t.zones?.name || '-'}</td>
                <td style={{ padding: 12 }}>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 12,
                      fontSize: 12,
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
                <td style={{ padding: 12, textAlign: 'center' }}>
                  <button
                    onClick={() => handleEdit(t)}
                    style={{
                      padding: 6,
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      background: '#fff',
                      cursor: 'pointer',
                      marginRight: 4,
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    style={{
                      padding: 6,
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

              <div style={{ marginBottom: 20 }}>
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
