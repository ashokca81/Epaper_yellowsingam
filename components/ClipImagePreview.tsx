'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ClipImagePreviewProps {
  src: string;
}

export default function ClipImagePreview({ src }: ClipImagePreviewProps) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="relative w-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
          <Loader2 className="w-10 h-10 animate-spin text-[#D4A800]" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Shared Snippet"
        className="w-full h-auto object-contain border border-gray-100"
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
      />
    </div>
  );
}
