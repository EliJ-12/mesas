import { AuthProvider } from '@/lib/auth';

export const metadata = {
  title: 'Gestión de Mesas',
  description: 'App de gestión de mesas en tiempo real',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fff' }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
