'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Smartphone, Newspaper } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <header className={`bg-white safe-top z-50 ${isHomePage ? 'sticky top-0 elevation-2' : 'md:relative sticky top-0 md:z-auto elevation-2 md:shadow-none md:border-b'}`}>
      {/* Mobile App Bar - Material Design 3 style - Always Sticky */}
      <div className="md:hidden flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Yellow Singam Logo"
            width={40}
            height={40}
            className="rounded-full"
          />
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-[#D4A800] leading-tight">
              YELLOW SINGAM
            </span>
            <span className="text-[10px] text-gray-500 tracking-wider">
              hunting for truth
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="https://yellowsingam.com/" target='_blank' className="p-2.5 rounded-full bg-[#2D2D2D] active:bg-[#3D3D3D] touch-ripple transition-colors">
            <Smartphone size={20} className="text-[#D4A800]" />
          </Link>
          <Link href="https://play.google.com/store/apps/details?id=com.lavish.yellowsingam&pcampaignid=web_share" target='_blank' className="p-2.5 rounded-full bg-[#D4A800] active:bg-[#C49700] touch-ripple transition-colors">
            <Newspaper size={20} className="text-white" />
          </Link>
        </div>
      </div>

      {/* Desktop Header - Sticky on home, scrollable on other pages */}
      <div className="hidden md:block py-3 px-4 sm:px-6 lg:px-8 border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Left - Logo */}
          <Link href="/" className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="Yellow Singam Logo"
              width={55}
              height={55}
              className="rounded-full"
            />
            <div className="flex flex-col items-center">
              <span className="text-2xl lg:text-3xl font-bold text-[#D4A800] tracking-wide">
                YELLOW SINGAM
              </span>
              <span className="text-xs text-gray-600 tracking-widest">
                hunting for truth
              </span>
            </div>
          </Link>

          {/* Right - App Icons */}
          <div className="flex items-center gap-3">
            <Link
              href="https://yellowsingam.com"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#2D2D2D] text-white rounded-lg hover:bg-[#3D3D3D] transition-colors group"
              target='_blank'
            >
              <Smartphone size={20} className="text-[#D4A800]" />
              <span className="font-medium text-sm">Digital News</span>
            </Link>
            <Link
              href="https://play.google.com/store/apps/details?id=com.lavish.yellowsingam&pcampaignid=web_share"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#D4A800] text-white rounded-lg hover:bg-[#C49700] transition-colors group"
              target='_blank'
            >
              <Newspaper size={20} />
              <span className="font-medium text-sm">Short News</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
