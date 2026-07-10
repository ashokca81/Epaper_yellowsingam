import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // Basic safety: only allow http/https remote URLs
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json({ error: 'invalid url' }, { status: 400 });
    }

    const response = await fetch(url, {
      cache: 'force-cache',
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'failed to fetch image' }, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'image/jpeg';

    const upstreamEtag = response.headers.get('ETag');
    const upstreamLastModified = response.headers.get('Last-Modified');
    const upstreamContentLength = response.headers.get('Content-Length');

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      // Edition page images are immutable; allow long browser + CDN caching.
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      'CDN-Cache-Control': 'public, max-age=31536000, immutable',
      'Vercel-CDN-Cache-Control': 'public, max-age=31536000, immutable',
    };

    if (upstreamEtag) headers['ETag'] = upstreamEtag;
    if (upstreamLastModified) headers['Last-Modified'] = upstreamLastModified;
    if (upstreamContentLength) headers['Content-Length'] = upstreamContentLength;

    return new NextResponse(arrayBuffer as any, {
      headers: {
        ...headers,
      },
    });
  } catch (error) {
    console.error('Page image proxy error:', error);
    return NextResponse.json({ error: 'failed to proxy image' }, { status: 500 });
  }
}

