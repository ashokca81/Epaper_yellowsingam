'use client';

import { usePathname } from 'next/navigation';
import AdminShell from '@/components/AdminShell';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  // Login page has its own layout - just render children
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="admin-layout">
      <style jsx global>{`
        .admin-layout ~ header,
        .admin-layout ~ nav,
        .admin-layout ~ footer,
        body > header,
        body > nav:not(.admin-layout *),
        body > footer,
        #bottom-nav {
          display: none !important;
        }
        .admin-layout {
          position: fixed;
          inset: 0;
          z-index: 100;
        }
        body {
          padding-bottom: 0 !important;
        }
      `}</style>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
