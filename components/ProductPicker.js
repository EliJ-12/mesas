'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { addProductToTable } from '@/lib/useOrderRealtime';

export default function ProductPicker({ tableId, onClose }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customPrice, setCustomPrice] = useState('');

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

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setCustomPrice(product.price.toString());
    setShowPriceModal(true);
  };

  const handleAddWithPrice = async (useCustomPrice) => {
    const priceToUse = useCustomPrice ? parseFloat(customPrice) : null;
    await addProductToTable(tableId, selectedProduct, priceToUse);
    setShowPriceModal(false);
    setSelectedProduct(null);
    setCustomPrice('');
  };

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
              onClick={() => handleProductClick(p)}
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

      {showPriceModal && selectedProduct && (
        <div style={priceModalOverlay}>
          <div style={priceModalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Modificar precio</h3>
              <button onClick={() => setShowPriceModal(false)} style={closeBtn}>✕</button>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{selectedProduct.name}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Precio original: {selectedProduct.price.toFixed(2)} €</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
                Precio a usar (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleAddWithPrice(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  background: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Usar precio original
              </button>
              <button
                onClick={() => handleAddWithPrice(true)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: 'none',
                  background: '#222',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Usar precio modificado
              </button>
            </div>
          </div>
        </div>
      )}
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
const priceModalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
};
const priceModalStyle = {
  background: '#fff', width: '90%', maxWidth: 400, borderRadius: 16, padding: 24,
};
const inputStyle = {
  width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd',
  fontSize: 14, boxSizing: 'border-box',
};
