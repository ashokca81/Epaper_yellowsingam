import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { GlobalFonts, createCanvas } from '@napi-rs/canvas';

// Pre-register fonts for consistent rendering across environments
const fontsDir = path.join(process.cwd(), 'public', 'fonts');
try {
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Roboto-Regular.ttf'), 'Roboto');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Roboto-Bold.ttf'), 'RobotoBold');
} catch (e) {
  console.warn('Failed to register fonts from path, falling back to system fonts:', e);
}

export const runtime = 'nodejs';

const sanitizeAscii = (value: string) =>
  value
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeEnglishDate = (rawDate: string) => {
  // Try hard to get a real date object.
  let d = new Date(rawDate);
  
  // If standard parsing failed, try to extract numbers (Day, Month, Year)
  if (Number.isNaN(d.getTime())) {
    const numbers = rawDate.match(/\d+/g);
    if (numbers && numbers.length >= 3) {
      // Very basic attempt: assume first 3 numbers are D, M, Y
      // We'll try to build a YYYY-MM-DD string
      const day = numbers[0].padStart(2, '0');
      const month = numbers[1].padStart(2, '0');
      const year = numbers[2].length === 2 ? `20${numbers[2]}` : numbers[2];
      const testDate = new Date(`${year}-${month}-${day}`);
      if (!Number.isNaN(testDate.getTime())) {
        d = testDate;
      }
    }
  }

  if (!Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }

  // Final fallback: Strip everything except basic ASCII
  return rawDate.replace(/[^\x20-\x7E]/g, '').trim();
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const x = parseFloat(searchParams.get('x') || '0');
    const y = parseFloat(searchParams.get('y') || '0');
    const w = parseFloat(searchParams.get('w') || '100');
    const h = parseFloat(searchParams.get('h') || '100');
    const filename = searchParams.get('filename') || 'yellow-singam-clip.png';
    const date = searchParams.get('date') || '';
    const page = searchParams.get('page') || '';

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const imageRes = await fetch(url);
    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: imageRes.status });
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const image = sharp(Buffer.from(imageBuffer));
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
    }

    const cropX = Math.round((x / 100) * metadata.width);
    const cropY = Math.round((y / 100) * metadata.height);
    const cropWidth = Math.round((w / 100) * metadata.width);
    const cropHeight = Math.round((h / 100) * metadata.height);

    const finalX = Math.max(0, Math.min(cropX, metadata.width - 1));
    const finalY = Math.max(0, Math.min(cropY, metadata.height - 1));
    const finalWidth = Math.max(1, Math.min(cropWidth, metadata.width - finalX));
    const finalHeight = Math.max(1, Math.min(cropHeight, metadata.height - finalY));

    const croppedBuffer = await image
      .extract({
        left: finalX,
        top: finalY,
        width: finalWidth,
        height: finalHeight,
      })
      .png({ quality: 90, compressionLevel: 6 })
      .toBuffer();

    const logoPath = path.join(process.cwd(), 'public', 'ys-logo.jpeg');
    const logoBuffer = await fs.readFile(logoPath);

    const croppedMeta = await sharp(croppedBuffer).metadata();
    const cropW = croppedMeta.width || finalWidth;
    const cropH = croppedMeta.height || finalHeight;

    const maxLogoWidth = Math.min(cropW, 1200);
    const logoTargetWidth = Math.max(300, Math.round(maxLogoWidth * 0.95));
    const resizedLogoBuffer = await sharp(logoBuffer)
      .resize({ width: logoTargetWidth })
      .flatten({ background: '#ffffff' })
      .png()
      .toBuffer();

    const resizedLogoMeta = await sharp(resizedLogoBuffer).metadata();
    const logoWidth = resizedLogoMeta.width || logoTargetWidth;
    const logoHeight = resizedLogoMeta.height || Math.round(logoTargetWidth * 0.4);

    const escapeXml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const normalizedDate = normalizeEnglishDate(date || '');
    const pageDigits = (page || '').replace(/[^\d]/g, '').trim();
    
    // Construct line1 and force ONLY English/ASCII characters
    let line1 = [normalizedDate, pageDigits ? `Page ${pageDigits}` : '']
      .filter(Boolean)
      .join(' | ');
    line1 = line1.replace(/[^\x20-\x7E]/g, '');

    const line2 = 'https://epaper.yellowsingam.com/';
    const hasLine1 = line1.length > 0;
    
    const line1Size = Math.max(18, Math.round(cropW * 0.038));
    const line2Size = Math.max(14, Math.round(line1Size * 0.75));
    const lineGap = Math.round(line1Size * 0.4);
    const textPaddingY = Math.round(line1Size * 0.4);
    
    const textBlockHeight =
      textPaddingY * 2 + (hasLine1 ? line1Size : 0) + lineGap + line2Size;

    // Use Canvas for reliable text rendering with custom fonts
    const canvas = createCanvas(cropW, textBlockHeight);
    const ctx = canvas.getContext('2d');
    
    // Transparent background for the text block (will be composited over white)
    ctx.clearRect(0, 0, cropW, textBlockHeight);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (hasLine1) {
      ctx.font = `bold ${line1Size}px RobotoBold`;
      ctx.fillStyle = '#1a1a1a'; // Darker for better contrast
      ctx.fillText(line1, cropW / 2, textPaddingY + line1Size / 2);
    }
    
    ctx.font = `${line2Size}px Roboto`;
    ctx.fillStyle = '#555555'; // Slightly darker grey
    ctx.fillText(
      line2, 
      cropW / 2, 
      (hasLine1 ? textPaddingY + line1Size + lineGap : textPaddingY) + line2Size / 2
    );
    
    const textBuffer = canvas.toBuffer('image/png');

    const padding = 20; // Reduced from 24
    const textGap = 8;  // Reduced from 12
    const headerHeight = logoHeight + padding * 2 + textGap + textBlockHeight;
    const finalCanvas = sharp({
      create: {
        width: cropW,
        height: headerHeight + cropH,
        channels: 4,
        background: '#ffffff',
      },
    });

    const composed = await finalCanvas
      .composite([
        {
          input: resizedLogoBuffer,
          top: padding,
          left: Math.max(0, Math.round((cropW - logoWidth) / 2)),
        },
        {
          input: textBuffer,
          top: padding + logoHeight + textGap,
          left: 0,
        },
        {
          input: croppedBuffer,
          top: headerHeight,
          left: 0,
        },
      ])
      .png({ quality: 85, compressionLevel: 5 })
      .toBuffer();

    const isInline = searchParams.get('inline') === 'true';
    const contentDisposition = isInline ? 'inline' : `attachment; filename="${filename}"`;

    return new NextResponse(composed as any, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': composed.length.toString(),
      },
    });
  } catch (error) {
    console.error('Clip download error:', error);
    return NextResponse.json({ error: 'Failed to generate clip' }, { status: 500 });
  }
}
