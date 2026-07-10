import Link from 'next/link';
import Image from 'next/image';
import { Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="hidden md:block bg-[#2D2D2D] mt-auto">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row justify-between gap-10">
          {/* Left - Brand & Description */}
          <div className="lg:max-w-md">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <Image
                src="/logo.png"
                alt="Yellow Singam Logo"
                width={50}
                height={50}
                className="rounded-full"
              />
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-[#D4A800] tracking-wide">YELLOW SINGAM</span>
                <span className="text-xs text-gray-400 tracking-[0.3em]">HUNTING FOR TRUTH</span>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mt-4">
              Yellow Singam is a trusted Telugu daily newspaper bringing you authentic news with integrity. We are committed to truthful journalism and serving our readers.
            </p>
          </div>

          {/* Right - Head Office */}
          <div className="lg:text-right">
            <h3 className="text-xl font-semibold text-white mb-3">Head Office (Yellow Singam Media)</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Media House, MG Road,<br />
              Vijayawada, Andhra Pradesh - 520001
            </p>
            <div className="flex items-center gap-2 mt-4 lg:justify-end">
              <Mail size={16} className="text-[#D4A800]" />
              <a href="mailto:info@yellowsingam.com" className="text-[#D4A800] hover:underline text-sm">
                info@yellowsingam.com
              </a>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mt-10 pt-6 border-t border-gray-600">
          <Link href="/" className="text-white font-medium hover:text-[#D4A800] transition-colors text-sm">Home</Link>
          <Link href="https://yellowsingam.com/" target='_blank' className="text-white font-medium hover:text-[#D4A800] transition-colors text-sm">Digital News</Link>
          <Link href="https://play.google.com/store/apps/details?id=com.lavish.yellowsingam&pcampaignid=web_share" target='_blank' className="text-white font-medium hover:text-[#D4A800] transition-colors text-sm">Short News</Link>
          <Link href="/contact" className="text-white font-medium hover:text-[#D4A800] transition-colors text-sm">Contact Us</Link>
          <Link href="/terms" className="text-gray-400 hover:text-[#D4A800] transition-colors text-sm">Terms</Link>
          <Link href="/privacy" className="text-gray-400 hover:text-[#D4A800] transition-colors text-sm">Privacy</Link>
        </div>
      </div>

      {/* Disclaimer & Copyright */}
      <div className="border-t border-gray-600 bg-[#252525]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-gray-500 text-xs leading-relaxed mb-4">
            This website provides general information about Yellow Singam and its publications for informational purposes only. All news content is subject to editorial guidelines and journalistic standards. Yellow Singam maintains policies for accuracy, fairness, and ethical reporting. For corrections or clarifications, please contact our editorial team.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-gray-500 text-xs">
              © {new Date().getFullYear()} Yellow Singam Media. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs">
              Developed by <a href="#" className="text-[#D4A800] hover:underline">YS Tech</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
