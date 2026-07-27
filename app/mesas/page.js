'use client';
import { useTablesRealtime } from '@/lib/useTablesRealtime';
import TableCard from '@/components/TableCard';
import LoginModal from '@/components/LoginModal';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import Link from 'next/link';

export default function MesasPage() {
  const { tables, loading } = useTablesRealtime();
  const { user, loading: authLoading, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  if (authLoading) return <div style={{ padding: 24 }}>Cargando...</div>;

  if (!user) {
    return (
      <div style={{ padding: 24, maxWidth: 400, margin: '100px auto', textAlign: 'center' }}>
        <h1 style={{ marginBottom: 16 }}>Gestión de Mesas</h1>
        <p style={{ opacity: 0.6, marginBottom: 24 }}>
          Inicia sesión para acceder al sistema de gestión
        </p>
        <button
          onClick={() => setShowLogin(true)}
          style={{
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
          Iniciar sesión
        </button>
        {showLogin && (
          <LoginModal
            onClose={() => setShowLogin(false)}
            onLogin={() => setShowLogin(false)}
          />
        )}
      </div>
    );
  }

  if (loading) return <div style={{ padding: 24 }}>Cargando mesas...</div>;

  // Agrupar por zona (usa sort_order de la zona)
  const zones = [...new Map(tables.map((t) => [t.zone_id, t.zones])).entries()]
    .sort((a, b) => (a[1]?.sort_order || 0) - (b[1]?.sort_order || 0));

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Mesas</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            href="/mesas/gestion"
            style={{
              padding: 8,
              borderRadius: 8,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              textDecoration: 'none',
              color: '#222',
            }}
          >
            🪑 Gestionar mesas
          </Link>
          <Link
            href="/productos"
            style={{
              padding: 8,
              borderRadius: 8,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              textDecoration: 'none',
              color: '#222',
            }}
          >
            📦 Productos
          </Link>
          <Link
            href="/caja"
            style={{
              padding: 8,
              borderRadius: 8,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              textDecoration: 'none',
              color: '#222',
            }}
          >
            💰 Caja
          </Link>
          <span style={{ fontSize: 14, opacity: 0.6 }}>{user.email}</span>
          <button
            onClick={logout}
            style={{
              padding: 8,
              borderRadius: 8,
              border: '1px solid #ddd',
              background: '#fff',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {zones.map(([zoneId, zone]) => (
        <div key={zoneId} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, textTransform: 'uppercase', opacity: 0.6, marginBottom: 12 }}>
            {zone?.name}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 12,
            }}
          >
            {tables
              .filter((t) => t.zone_id === zoneId)
              .map((t) => (
                <TableCard key={t.id} table={t} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
