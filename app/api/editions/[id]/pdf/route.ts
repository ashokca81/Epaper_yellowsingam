import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

function toSafePdfName(name: string | undefined, id: string): string {
  const safe = (name || `edition-${id}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${safe || `edition-${id}`}.pdf`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid edition ID' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    const edition = await db.collection('editions').findOne({ _id: new ObjectId(id) });

    if (!edition) {
      return NextResponse.json({ error: 'Edition not found' }, { status: 404 });
    }

    const pages = Array.isArray(edition.pages)
      ? [...edition.pages].sort((a, b) => (a.pageNum || 0) - (b.pageNum || 0))
      : [];

    if (pages.length === 0) {
      return NextResponse.json({ error: 'No pages found for this edition' }, { status: 400 });
    }

    const pdf = await PDFDocument.create();

    for (const page of pages) {
      const imageUrl = String(page?.url || '').trim();
      if (!imageUrl) continue;

      const res = await fetch(imageUrl, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Failed to fetch edition page image (${res.status})`);
      }

      const source = Buffer.from(await res.arrayBuffer());
      const png = await sharp(source).rotate().png().toBuffer();
      const embedded = await pdf.embedPng(png);
      const { width, height } = embedded.scale(1);
      const pdfPage = pdf.addPage([width, height]);
      pdfPage.drawImage(embedded, { x: 0, y: 0, width, height });
    }

    if (pdf.getPageCount() === 0) {
      return NextResponse.json({ error: 'Failed to build PDF' }, { status: 400 });
    }

    const bytes = await pdf.save();
    const filename = toSafePdfName(edition.name as string | undefined, id);
    const isDownload = request.nextUrl.searchParams.get('download') === '1';

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Edition PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
