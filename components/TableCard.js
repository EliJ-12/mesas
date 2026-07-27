'use client';
import Link from 'next/link';

const STATUS_STYLES = {
  free: { bg: '#e8f5e9', border: '#43a047', label: 'Libre' },
  occupied: { bg: '#fff8e1', border: '#fb8c00', label: 'Ocupada' },
  to_pay: { bg: '#ffebee', border: '#e53935', label: 'Cobrar' },
};

export default function TableCard({ table }) {
  const style = STATUS_STYLES[table.status] || STATUS_STYLES.free;

  return (
    <Link
      href={`/mesas/${table.id}`}
      style={{
        display: 'block',
        background: style.bg,
        border: `2px solid ${style.border}`,
        borderRadius: 12,
        padding: '16px',
        textDecoration: 'none',
        color: '#222',
        minHeight: 110,
        transition: 'transform 0.1s',
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 700 }}>Mesa {table.number}</div>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{table.zones?.name}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: style.border }}>{style.label}</div>
      {table.total > 0 && (
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>
          {table.total.toFixed(2)} €
        </div>
      )}
    </Link>
  );
}
