'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function ProductosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category_id: '',
    photo_url: '',
    active: true,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/mesas');
      return;
    }
    loadData();
  }, [user, authLoading, router]);

  const loadData = async () => {
    const [catsRes, prodsRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*, categories(name)').order('name'),
    ]);
    if (catsRes.error) console.error(catsRes.error);
    if (prodsRes.error) console.error(prodsRes.error);
    setCategories(catsRes.data || []);
    setProducts(prodsRes.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      price: parseFloat(formData.price),
      category_id: formData.category_id || null,
      photo_url: formData.photo_url || null,
      active: formData.active,
    };

    let error;
    if (editingProduct) {
      const res = await supabase.from('products').update(payload).eq('id', editingProduct.id);
      error = res.error;
    } else {
      const res = await supabase.from('products').insert(payload);
      error = res.error;
    }

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    setShowModal(false);
    setEditingProduct(null);
    setFormData({ name: '', price: '', category_id: '', photo_url: '', active: true });
    loadData();
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category_id: product.category_id || '',
      photo_url: product.photo_url || '',
      active: product.active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    loadData();
  };

  const handleToggleActive = async (product) => {
    const { error } = await supabase.from('products').update({ active: !product.active }).eq('id', product.id);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    loadData();
  };

  if (authLoading || loading) return <div style={{ padding: 24 }}>Cargando...</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Productos</h1>
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
            onClick={() => router.push('/categorias')}
            style={{
              padding: 8,
              borderRadius: 6,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            📁 Categorías
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setFormData({ name: '', price: '', category_id: '', photo_url: '', active: true });
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
            + Nuevo
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #eee', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 12, fontWeight: 600 }}>Producto</th>
              <th style={{ padding: 10, textAlign: 'left', fontSize: 12, fontWeight: 600 }}>Categoría</th>
              <th style={{ padding: 10, textAlign: 'right', fontSize: 12, fontWeight: 600 }}>Precio</th>
              <th style={{ padding: 10, textAlign: 'center', fontSize: 12, fontWeight: 600 }}>Estado</th>
              <th style={{ padding: 10, textAlign: 'center', fontSize: 12, fontWeight: 600 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  {p.photo_url && (
                    <img src={p.photo_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, marginTop: 4 }} />
                  )}
                </td>
                <td style={{ padding: 10, opacity: 0.7, fontSize: 12 }}>{p.categories?.name || '-'}</td>
                <td style={{ padding: 10, textAlign: 'right', fontWeight: 600, fontSize: 13 }}>{p.price.toFixed(2)} €</td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <button
                    onClick={() => handleToggleActive(p)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 12,
                      border: 'none',
                      background: p.active ? '#e8f5e9' : '#ffebee',
                      color: p.active ? '#43a047' : '#e53935',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {p.active ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td style={{ padding: 10, textAlign: 'center' }}>
                  <button
                    onClick={() => handleEdit(p)}
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
                    onClick={() => handleDelete(p.id)}
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
              <h2 style={{ fontSize: 16 }}>{editingProduct ? 'Editar' : 'Nuevo'}</h2>
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

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
                  Precio (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
                  Categoría
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
                  URL de foto
                </label>
                <input
                  type="url"
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  placeholder="https://..."
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Producto activo</span>
                </label>
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
                {editingProduct ? 'Guardar' : 'Crear'}
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
