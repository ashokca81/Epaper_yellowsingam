'use client';

import { Copy, Download, Facebook, Linkedin, Send, Share2, ExternalLink, Loader2 } from 'lucide-react';
import { useState } from 'react';
import WhatsAppIcon from './WhatsAppIcon';

interface ClipActionsProps {
  shareUrl: string;
  downloadUrl: string;
  readUrl: string;
}

export default function ClipActions({ shareUrl, downloadUrl, readUrl }: ClipActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied!');
    } catch {
      alert('Could not copy link');
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'yellow-singam-clip.png';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const open = (url: string) => window.open(url, '_blank');

  return (
    <div className="mt-8 flex flex-col gap-4 items-center justify-center w-full max-w-2xl">
      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'Yellow Singam Clip',
                text: 'Check out this ePaper clip',
                url: shareUrl,
              }).catch(() => undefined);
            } else {
              open(shareUrl);
            }
          }}
          className="bg-[#0088ff] text-white p-3 rounded-sm hover:bg-blue-600 transition-colors"
          title="Share"
        >
          <Share2 size={22} />
        </button>
        <button
          onClick={copyLink}
          className="bg-[#0088ff] text-white p-3 rounded-sm hover:bg-blue-600 transition-colors"
          title="Copy Link"
        >
          <Copy size={22} />
        </button>
        <button
          onClick={() => open(shareUrl)}
          className="bg-[#0088ff] text-white p-3 rounded-sm hover:bg-blue-600 transition-colors"
          title="Open Link"
        >
          <ExternalLink size={22} />
        </button>
        <button
          onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)}
          className="bg-[#1877F2] text-white p-3 rounded-sm hover:bg-blue-700 transition-colors"
          title="Facebook"
        >
          <Facebook size={22} />
        </button>
        <button
          onClick={() => open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Yellow Singam Clip')}`)}
          className="bg-black text-white p-3 rounded-sm hover:bg-gray-800 transition-colors"
          title="X (Twitter)"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l16 16M4 20L20 4" /></svg>
        </button>
        <button
          onClick={() => open(`https://wa.me/?text=${encodeURIComponent(`Yellow Singam Clip ${shareUrl}`)}`)}
          className="bg-[#25D366] text-white p-3 rounded-sm hover:bg-green-600 transition-colors"
          title="WhatsApp"
        >
          <WhatsAppIcon size={22} />
        </button>
        <button
          onClick={() => open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`)}
          className="bg-[#0A66C2] text-white p-3 rounded-sm hover:bg-blue-800 transition-colors"
          title="LinkedIn"
        >
          <Linkedin size={22} />
        </button>
        <button
          onClick={() => open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Yellow Singam Clip')}`)}
          className="bg-[#229ED9] text-white p-3 rounded-sm hover:bg-blue-500 transition-colors"
          title="Telegram"
        >
          <Send size={22} />
        </button>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="bg-[#D4A800] text-black p-3 rounded-sm hover:bg-[#c29800] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          title="Download Clip"
        >
          {isDownloading ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <Download size={22} />
          )}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
        <a
          href={readUrl}
          className="w-full sm:w-auto text-center bg-[#D4A800] text-black px-8 py-3.5 rounded-xl font-bold hover:bg-[#c29800] transition-all active:scale-95 shadow-lg shadow-[#D4A800]/20 flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          Read Full Edition
        </a>
        <a
          href="/"
          className="w-full sm:w-auto text-center px-8 py-3.5 rounded-xl font-semibold text-gray-600 hover:bg-white hover:shadow-md transition-all active:scale-95 border border-gray-200"
        >
          Go to Home
        </a>
      </div>
    </div>
  );
}
