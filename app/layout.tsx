import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';
import Providers from '@/components/Providers';

const siteUrl = process.env.NEXTAUTH_URL || 'https://yellowsingam.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Yellow Singam - Telugu Daily ePaper',
  description: 'Read Yellow Singam Telugu Daily ePaper online.',
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
    apple: [{ url: '/logo.png', type: 'image/png' }],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Yellow Singam',
  },
  openGraph: {
    title: 'Yellow Singam - Telugu Daily ePaper',
    description: 'Read Yellow Singam Telugu Daily ePaper online.',
    images: ['/logo.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yellow Singam - Telugu Daily ePaper',
    description: 'Read Yellow Singam Telugu Daily ePaper online.',
    images: ['/logo.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#D4A800',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen flex flex-col" suppressHydrationWarning>
        <Providers>
          <Header />
          <Navbar />
          <main className="flex-1 w-full max-w-[1400px] mx-auto p-2 sm:p-4 pb-bottom-nav md:pb-4">
            {children}
          </main>
          <Footer />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
