'use client';

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="login-layout">
      <style jsx global>{`
        .login-layout ~ header,
        .login-layout ~ nav,
        .login-layout ~ footer,
        body > header,
        body > nav:not(.login-layout *),
        body > footer,
        #bottom-nav {
          display: none !important;
        }
        .login-layout {
          position: fixed;
          inset: 0;
          z-index: 100;
        }
        body {
          padding-bottom: 0 !important;
        }
      `}</style>
      {children}
    </div>
  );
}
