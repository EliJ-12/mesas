'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

// Devuelve mesas + zona + total en vivo, actualizado por Supabase Realtime
// (push instantáneo, no hace falta refrescar ni hacer polling cada X segundos)
export function useTablesRealtime() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    const { data: tablesData, error: tErr } = await supabase
      .from('tables')
      .select('*, zones(name, sort_order)')
      .order('number');

    const { data: totals, error: totErr } = await supabase
      .from('table_totals')
      .select('*');

    if (tErr || totErr) {
      console.error(tErr || totErr);
      setLoading(false);
      return;
    }

    const merged = tablesData.map((t) => {
      const tot = totals.find((x) => x.table_id === t.id);
      return {
        ...t,
        total: tot?.total ?? 0,
        total_pending: tot?.total_pending ?? 0,
        order_id: tot?.order_id ?? null,
      };
    });

    setTables(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();

    // Nos suscribimos a cambios en las 3 tablas relevantes.
    // Cualquier cambio (desde cualquier dispositivo) dispara loadAll()
    // en TODOS los dispositivos conectados al instante.
    const channel = supabase
      .channel('tables-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, loadAll)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  return { tables, loading, refresh: loadAll };
}
