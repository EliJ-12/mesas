'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

export function useOrderRealtime(tableId) {
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!tableId) return;

    const { data: openOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('table_id', tableId)
      .eq('status', 'open')
      .maybeSingle();

    setOrder(openOrder);

    if (openOrder) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', openOrder.id)
        .order('created_at');
      setItems(orderItems || []);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [tableId]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`order-${tableId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [tableId, load]);

  return { order, items, loading, refresh: load };
}

// --- Acciones sobre la comanda ---

export async function addProductToTable(tableId, product, customPrice = null) {
  const { data: orderId, error: orderErr } = await supabase
    .rpc('get_or_create_open_order', { p_table_id: tableId });

  if (orderErr) throw orderErr;

  const finalPrice = customPrice !== null ? customPrice : product.price;

  // Si el producto ya está en la comanda y no tiene unidades pagadas, sumamos cantidad
  const { data: existing } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .eq('product_id', product.id)
    .eq('paid_quantity', 0)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('order_items')
      .update({ quantity: existing.quantity + 1 })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('order_items').insert({
      order_id: orderId,
      product_id: product.id,
      product_name: product.name,
      unit_price: finalPrice,
      quantity: 1,
    });
    if (error) throw error;
  }
}

export async function changeItemQuantity(item, delta) {
  const newQty = item.quantity + delta;
  // Permitir eliminar completamente (newQty <= 0) incluso si hay unidades pagadas
  if (newQty <= 0) {
    const { error } = await supabase.from('order_items').delete().eq('id', item.id);
    if (error) throw error;
    
    // Verificar si no quedan más productos en la orden y liberar la mesa
    const { data: remainingItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', item.order_id);
    
    if (!remainingItems || remainingItems.length === 0) {
      // No hay productos, liberar la mesa
      const { data: order } = await supabase
        .from('orders')
        .select('table_id')
        .eq('id', item.order_id)
        .single();
      
      if (order) {
        const { error: tableError } = await supabase
          .from('tables')
          .update({ status: 'free' })
          .eq('id', order.table_id);
        
        if (tableError) console.error('Error al liberar mesa:', tableError);
      }
    }
    return;
  }
  // No bajar por debajo de lo ya pagado (excepto eliminación completa)
  if (newQty < item.paid_quantity) return;
  const { error } = await supabase
    .from('order_items')
    .update({ quantity: newQty })
    .eq('id', item.id);
  if (error) throw error;
}
