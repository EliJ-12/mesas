'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function CategoriasPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sort_order: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/mesas');
      return;
    }
    loadData();
  }, [user, authLoading, router]);

  const loadData = async () => {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order');
    if (error) console.error(error);
    setCategories(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      sort_order: formData.sort_order,
    };

    let error;
    if (editingCategory) {
      const res = await supabase.from('categories').update(payload).eq('id', editingCategory.id);
      error = res.error;
    } else {
      const res = await supabase.from('categories').insert(payload);
      error = res.error;
    }

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', sort_order: 0 });
    loadData();
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      sort_order: category.sort_order,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    loadData();
  };

  const handleMoveUp = async (index) => {
    if (index === 0) return;
    const newCategories = [...categories];
    const temp = newCategories[index].sort_order;
    newCategories[index].sort_order = newCategories[index - 1].sort_order;
    newCategories[index - 1].sort_order = temp;

    const { error } = await supabase
      .from('categories')
      .update({ sort_order: newCategories[index].sort_order })
      .eq('id', newCategories[index].id);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    const { error: error2 } = await supabase
      .from('categories')
      .update({ sort_order: newCategories[index - 1].sort_order })
      .eq('id', newCategories[index - 1].id);
    if (error2) {
      alert('Error: ' + error2.message);
      return;
    }
    loadData();
  };

  const handleMoveDown = async (index) => {
    if (index === categories.length - 1) return;
    const newCategories = [...categories];
    const temp = newCategories[index].sort_order;
    newCategories[index].sort_order = newCategories[index + 1].sort_order;
    newCategories[index + 1].sort_order = temp;

    const { error } = await supabase
      .from('categories')
      .update({ sort_order: newCategories[index].sort_order })
      .eq('id', newCategories[index].id);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    const { error: error2 } = await supabase
      .from('categories')
      .update({ sort_order: newCategories[index + 1].sort_order })
      .eq('id', newCategories[index + 1].id);
    if (error2) {
      alert('Error: ' + error2.message);
      return;
    }
    loadData();
  };

  if (authLoading || loading) return <div style={{ padding: 24 }}>Cargando...</div>;

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Categorías</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/productos')}
            style={{
              padding: 8,
              borderRadius: 6,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            ← Productos
          </button>
          <button
            onClick={() => {
              setEditingCategory(null);
              setFormData({ name: '', sort_order: categories.length });
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

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 12, fontWeight: 600 }}>Nombre</th>
              <th style={{ padding: 10, textAlign: 'center', fontSize: 12, fontWeight: 600 }}>Orden</th>
              <th style={{ padding: 10, textAlign: 'center', fontSize: 12, fontWeight: 600 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c, index) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10, fontWeight: 600, fontSize: 13 }}>{c.name}</td>
                <td style={{ padding: 10, textAlign: 'center', opacity: 0.7, fontSize: 12 }}>{c.sort_order}</td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    style={{
                      padding: 4,
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      background: '#fff',
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                      opacity: index === 0 ? 0.4 : 1,
                      marginRight: 4,
                      fontSize: 12,
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === categories.length - 1}
                    style={{
                      padding: 4,
                      borderRadius: 4,
                      border: '1px solid #ddd',
                      background: '#fff',
                      cursor: index === categories.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: index === categories.length - 1 ? 0.4 : 1,
                      marginRight: 4,
                      fontSize: 12,
                    }}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => handleEdit(c)}
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
                    onClick={() => handleDelete(c.id)}
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
      </div>

      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 16 }}>{editingCategory ? 'Editar' : 'Nueva'}</h2>
              <button onClick={() => setShowModal(false)} style={closeBtn}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
                  Orden
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  required
                  style={inputStyle}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: 'none',
                  background: '#222',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {editingCategory ? 'Guardar' : 'Crear'}
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
  maxWidth: 350,
  borderRadius: 12,
  padding: 16,
};

const closeBtn = {
  border: 'none',
  background: 'none',
  fontSize: 18,
  cursor: 'pointer',
};

const inputStyle = {
  width: '100%',
  padding: 10,
  borderRadius: 6,
  border: '1px solid #ddd',
  fontSize: 13,
  boxSizing: 'border-box',
};
