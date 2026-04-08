import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export async function generateMetadata({ params, searchParams }: any): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const { id } = resolvedParams;
  const { url, x, y, w, h, base, title } = resolvedSearchParams;

  const baseUrl = base || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const decodedUrl = decodeURIComponent(url || '');
  const decodedTitle = decodeURIComponent(title || 'ePaper Clip');
  
  // Create an absolute URL for the Open Graph image to point directly to the inline crop API
  const cropImageUrl = `${baseUrl}/api/crop?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&inline=true`;

  return {
    title: `${decodedTitle} - Yellow Singam Clip`,
    description: 'Shared snippet from Yellow Singam Daily',
    openGraph: {
      title: `${decodedTitle} - Yellow Singam Clip`,
      description: 'Check out this snippet from Yellow Singam ePaper!',
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
      title: `${decodedTitle} - Yellow Singam Clip`,
      description: 'Check out this snippet from Yellow Singam ePaper!',
      images: [cropImageUrl],
    },
  };
}

export default async function ClipPage({ params, searchParams }: any) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const { id } = resolvedParams;
  const { url, x, y, w, h, title } = resolvedSearchParams;
  const decodedUrl = decodeURIComponent(url || '');
  const decodedTitle = decodeURIComponent(title || 'ePaper Clip');
  
  // Notice we must use a client-side relative or absolute api path for the page rendering
  const cropImageUrl = `/api/crop?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&inline=true`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 max-w-4xl w-full flex flex-col items-center">
        
        {/* Header */}
        <div className="w-full border-b border-gray-100 pb-4 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">{decodedTitle}</h1>
          <span className="text-sm font-medium bg-[#FFF3C4] text-[#D4A800] px-4 py-1.5 rounded-full">Shared Snippet</span>
        </div>

        {/* Cropped Image Display */}
        <div className="relative w-full aspect-auto flex justify-center bg-gray-100 rounded-xl overflow-hidden p-2 shadow-sm mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={cropImageUrl} 
            alt="Shared Snippet" 
            className="w-auto h-auto max-h-[65vh] object-contain shadow-sm border border-gray-200" 
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
          <Link 
            href={`/edition/${id}`} 
            className="w-full sm:w-auto text-center bg-[#D4A800] text-black px-8 py-3.5 rounded-xl font-bold hover:bg-[#c29800] transition-colors shadow-lg shadow-[#D4A800]/20 flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
            Read Full Edition
          </Link>
          <Link 
            href="/" 
            className="w-full sm:w-auto text-center px-8 py-3.5 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Go to Home
          </Link>
        </div>

      </div>
    </div>
  );
}
