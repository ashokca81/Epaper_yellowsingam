import { Metadata } from 'next';
import Image from 'next/image';
import ClipActions from '@/components/ClipActions';
import ClipImagePreview from '@/components/ClipImagePreview';

export async function generateMetadata({ params, searchParams }: any): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const { id } = resolvedParams;
  const { url, x, y, w, h, base, title, date, page, cid } = resolvedSearchParams;

  const baseUrl = base || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const decodedUrl = decodeURIComponent(url || '');
  const decodedTitle = decodeURIComponent(title || 'ePaper Clip');
  const displayDate = date || '';
  
  // Create an absolute URL for the Open Graph image to point directly to the inline crop API
  const cropImageUrl = `${baseUrl}/api/clip-download?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&date=${encodeURIComponent(displayDate)}&page=${page}&inline=true`;

  return {
    title: `${decodedTitle} | Yellow Singam ePaper | ${displayDate}`,
    description: 'Shared snippet from Yellow Singam Daily Telugu ePaper',
    openGraph: {
      title: `${decodedTitle} | Yellow Singam ePaper`,
      description: `Snippet from Page ${page} of ${displayDate} edition.`,
      images: [
        {
          url: cropImageUrl,
          width: 800,
          height: 600,
          alt: 'ePaper Clip',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${decodedTitle} | Yellow Singam ePaper`,
      description: `Snippet from Page ${page} of ${displayDate} edition.`,
      images: [cropImageUrl],
    },
  };
}

export default async function ClipPage({ params, searchParams }: any) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const { id } = resolvedParams;
  const { url, x, y, w, h, title, date, page, cid, base } = resolvedSearchParams;
  const decodedUrl = decodeURIComponent(url || '');
  const decodedTitle = decodeURIComponent(title || 'ePaper Clip');
  
  // Notice we must use a client-side relative or absolute api path for the page rendering
  const cropImageUrl = `/api/clip-download?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&date=${encodeURIComponent(date || '')}&page=${page}&inline=true`;
  const baseUrl = base || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const shareUrl = `${baseUrl}/edition/${id}/clip?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&title=${encodeURIComponent(decodedTitle)}&base=${encodeURIComponent(baseUrl)}&date=${encodeURIComponent(date || '')}&page=${page}&cid=${cid}`;
  const downloadUrl = `/api/clip-download?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&date=${encodeURIComponent(date || '')}&page=${page}&filename=${encodeURIComponent(`yellow-singam-clip-${cid || 'clip'}.png`)}`;
  const readUrl = `/edition/${id}?page=${page}&hx=${x}&hy=${y}&hw=${w}&hh=${h}`;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      {/* Branded Clip Card */}
      <div className="bg-white border-[12px] border-[#D4A800] shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500">
        
        {/* Card Header with Banner Style & Branded Text */}
        <div className="bg-white flex flex-col border-b border-gray-100">
          <div className="h-2 bg-[#2D3A2D] w-full" />
          <div className="h-4 bg-white" />
          <div className="h-[1px] bg-black w-full opacity-10" />
        </div>

        {/* Cropped Image Area */}
        <div className="bg-white flex flex-col">
          <ClipImagePreview src={cropImageUrl} />
        </div>

        {/* Branded Footer */}
        <div className="bg-[#D4A800] p-4 text-center">
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[#2D2D2D] font-bold text-xs sm:text-sm uppercase tracking-tight">
            <span>epaper.yellowsingam.com</span>
            <span className="hidden sm:inline opacity-30">|</span>
            <span>{date}</span>
            <span className="hidden sm:inline opacity-30">|</span>
            <span>Page: {page}</span>
            <span className="hidden sm:inline opacity-30">|</span>
            <span>Clip ID: {cid}</span>
          </div>
          <p className="text-[#2D2D2D]/80 text-[10px] sm:text-xs mt-1.5 font-medium leading-tight">
            For more details, visit epaper.yellowsingam.com
          </p>
        </div>
      </div>

      {/* Page Actions (Outside of branding area) */}
      <ClipActions shareUrl={shareUrl} downloadUrl={downloadUrl} readUrl={readUrl} />
    </div>
  );
}
