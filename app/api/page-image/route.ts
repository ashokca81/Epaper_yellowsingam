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

    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json({ error: 'failed to fetch image' }, { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('Content-Type') || 'image/jpeg';

    return new NextResponse(arrayBuffer as any, {
      headers: {
        'Content-Type': contentType,
        // Allow caching on CDN/browsers for a while since edition pages are immutable
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Page image proxy error:', error);
    return NextResponse.json({ error: 'failed to proxy image' }, { status: 500 });
  }
}

