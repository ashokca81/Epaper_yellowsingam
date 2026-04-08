import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const x = parseFloat(searchParams.get('x') || '0');
    const y = parseFloat(searchParams.get('y') || '0');
    const w = parseFloat(searchParams.get('w') || '100');
    const h = parseFloat(searchParams.get('h') || '100');
    const filename = searchParams.get('filename') || 'cropped-image.png';

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the original image from R2
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    
    // Get image metadata
    const image = sharp(Buffer.from(imageBuffer));
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
    }

    // Calculate crop dimensions in pixels
    const cropX = Math.round((x / 100) * metadata.width);
    const cropY = Math.round((y / 100) * metadata.height);
    const cropWidth = Math.round((w / 100) * metadata.width);
    const cropHeight = Math.round((h / 100) * metadata.height);

    // Ensure crop dimensions are within bounds
    const finalX = Math.max(0, Math.min(cropX, metadata.width - 1));
    const finalY = Math.max(0, Math.min(cropY, metadata.height - 1));
    const finalWidth = Math.max(1, Math.min(cropWidth, metadata.width - finalX));
    const finalHeight = Math.max(1, Math.min(cropHeight, metadata.height - finalY));

    // Crop the image
    const croppedBuffer = await image
      .extract({
        left: finalX,
        top: finalY,
        width: finalWidth,
        height: finalHeight
      })
      .png({ quality: 90, compressionLevel: 6 })
      .toBuffer();

    const isInline = searchParams.get('inline') === 'true';
    const contentDisposition = isInline ? 'inline' : `attachment; filename="${filename}"`;

    // Return the cropped image with dynamic headers based on usage
    return new NextResponse(croppedBuffer as any, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': croppedBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Crop error:', error);
    return NextResponse.json({ error: 'Failed to crop image' }, { status: 500 });
  }
}