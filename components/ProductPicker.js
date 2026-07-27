'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addProductToTable } from '@/lib/useOrderRealtime';

export default function ProductPicker({ tableId, onClose }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: cats } = await supabase.from('categories').select('*').order('sort_order');
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name');
      setCategories(cats || []);
      setProducts(prods || []);
    })();
  }, []);

  const filtered = activeCategory
    ? products.filter((p) => p.category_id === activeCategory)
    : products;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Añadir producto</h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '12px 0', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveCategory(null)}
            style={chip(activeCategory === null)}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button key={c.id} onClick={() => setActiveCategory(c.id)} style={chip(activeCategory === c.id)}>
              {c.name}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={async () => {
                await addProductToTable(tableId, p);
              }}
              style={productBtn}
            >
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.name} style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <div style={{ width: '100%', height: 70, background: '#eee', borderRadius: 8 }} />
              )}
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{p.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{p.price.toFixed(2)} €</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'flex-end', zIndex: 50,
};
const modalStyle = {
  background: '#fff', width: '100%', maxHeight: '80vh', overflowY: 'auto',
  borderRadius: '16px 16px 0 0', padding: 20,
};
const closeBtn = { border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' };
const chip = (active) => ({
  padding: '6px 12px', borderRadius: 20, border: '1px solid #ccc',
  background: active ? '#222' : '#fff', color: active ? '#fff' : '#222',
  fontSize: 13, cursor: 'pointer',
});
const productBtn = {
  border: '1px solid #eee', borderRadius: 10, padding: 8, textAlign: 'left',
  background: '#fafafa', cursor: 'pointer',
};
