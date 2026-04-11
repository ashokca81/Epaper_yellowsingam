import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

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
  const cropImageUrl = `${baseUrl}/api/crop?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&inline=true`;

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
  const { url, x, y, w, h, title, date, page, cid } = resolvedSearchParams;
  const decodedUrl = decodeURIComponent(url || '');
  const decodedTitle = decodeURIComponent(title || 'ePaper Clip');
  
  // Notice we must use a client-side relative or absolute api path for the page rendering
  const cropImageUrl = `/api/crop?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&inline=true`;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      {/* Branded Clip Card */}
      <div className="bg-white border-[12px] border-[#D4A800] shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500">
        
        {/* Card Header with Banner Style & Branded Text */}
        <div className="bg-white flex flex-col border-b border-gray-100">
          <div className="h-2 bg-[#2D3A2D] w-full" />
          <div className="p-6 flex items-center justify-center bg-white gap-4">
            {/* Lion Logo */}
            <div className="relative w-24 h-24 flex-shrink-0">
              <Image 
                src="/logo.png" 
                alt="Logo" 
                fill 
                className="object-contain"
                priority
              />
            </div>
            {/* Branded Text */}
            <div className="flex flex-col justify-center items-center">
              <h1 className="text-4xl md:text-5xl font-black text-[#D4A800] tracking-tight leading-none uppercase">
                Yellow Singam
              </h1>
              <p className="text-lg md:text-xl text-gray-500 font-medium tracking-widest mt-1 lowercase italic">
                hunting for truth
              </p>
            </div>
          </div>
          <div className="h-[1px] bg-black w-full opacity-10" />
        </div>

        {/* Cropped Image Area */}
        <div className="p-4 bg-white flex flex-col">
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={cropImageUrl} 
              alt="Shared Snippet" 
              className="w-full h-auto object-contain border border-gray-100" 
            />
          </div>
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
      <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-2xl">
        <Link 
          href={`/edition/${id}`} 
          className="w-full sm:w-auto text-center bg-[#D4A800] text-black px-8 py-3.5 rounded-xl font-bold hover:bg-[#c29800] transition-all active:scale-95 shadow-lg shadow-[#D4A800]/20 flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          Read Full Edition
        </Link>
        <Link 
          href="/" 
          className="w-full sm:w-auto text-center px-8 py-3.5 rounded-xl font-semibold text-gray-600 hover:bg-white hover:shadow-md transition-all active:scale-95 border border-gray-200"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
