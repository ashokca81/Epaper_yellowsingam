import { NextRequest, NextResponse } from 'next/server';
import { getPresignedPutUrl } from '@/lib/r2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const folderName = String(body.folderName || '').trim() || 'untitled';
    const pageNum = Math.max(1, Number.parseInt(String(body.pageNum || '1'), 10) || 1);

    const pageBaseName = `page_${pageNum}`;
    const filename = `${pageBaseName}.webp`;
    const previewFilename = `${pageBaseName}_thumb.webp`;
    const fullKey = `editions/${folderName}/${filename}`;
    const thumbKey = `editions/${folderName}/${previewFilename}`;

    const publicBase = process.env.CLOUDFLARE_R2_PUBLIC_URL!;
    const [fullPutUrl, thumbPutUrl] = await Promise.all([
      getPresignedPutUrl(fullKey, 'image/webp'),
      getPresignedPutUrl(thumbKey, 'image/webp'),
    ]);

    return NextResponse.json({
      success: true,
      full: {
        putUrl: fullPutUrl,
        publicUrl: `${publicBase}/${fullKey}`,
        key: fullKey,
        filename,
      },
      thumb: {
        putUrl: thumbPutUrl,
        publicUrl: `${publicBase}/${thumbKey}`,
        key: thumbKey,
        filename: previewFilename,
      },
    });
  } catch (error) {
    console.error('presign-upload error:', error);
    return NextResponse.json({ error: 'Failed to create upload URLs' }, { status: 500 });
  }
}
