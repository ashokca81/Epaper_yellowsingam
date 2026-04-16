import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import clientPromise from '@/lib/mongodb';
import { uploadToR2 } from '@/lib/r2';
import path from 'path';
import sharp from 'sharp';
import { pdf as pdfToImages } from 'pdf-to-img';

function isPdfUpload(file: File, buffer: Buffer): boolean {
  if (file.type === 'application/pdf') return true;
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return true;
  return buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF';
}

async function uploadEditionImageBuffers(
  rawImageBuffer: Buffer,
  folderName: string,
  pageNum: number
) {
  const pageBaseName = `page_${pageNum}`;
  const filename = `${pageBaseName}.webp`;
  const previewFilename = `${pageBaseName}_thumb.webp`;
  const key = `editions/${folderName}/${filename}`;
  const previewKey = `editions/${folderName}/${previewFilename}`;

  const webpBuffer = await sharp(rawImageBuffer)
    .rotate()
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const previewBuffer = await sharp(rawImageBuffer)
    .rotate()
    .resize({
      width: 420,
      height: 630,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 68, effort: 4 })
    .toBuffer();

  const [url, previewUrl] = await Promise.all([
    uploadToR2(webpBuffer, key, 'image/webp'),
    uploadToR2(previewBuffer, previewKey, 'image/webp'),
  ]);

  return {
    filename,
    url,
    pageNum,
    previewUrl,
    previewFilename,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    
    let query: any = {};
    
    // Add date range filter if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate + 'T00:00:00.000Z'),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }
    
    const showAll = searchParams.get('all') === 'true';
    
    // Show published editions AND scheduled editions whose date has passed
    if (!showAll) {
      query.$or = [
        { status: 'published' },
        { status: 'scheduled', date: { $lte: new Date() } }
      ];
    }
    
    const editions = await db.collection('editions')
      .find(query)
      .sort({ date: -1 })
      .limit(limit)
      .toArray();
    
    const headers: Record<string, string> = showAll
      ? { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      : { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' };

    return NextResponse.json(
      { editions },
      { headers }
    );
  } catch (error) {
    console.error('Error fetching editions:', error);
    return NextResponse.json({ error: 'Failed to fetch editions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    const payload = isJson ? await request.json() : null;
    const formData = isJson ? null : await request.formData();

    const name = isJson ? payload?.name : (formData?.get('name') as string);
    const alias = isJson ? payload?.alias : (formData?.get('alias') as string);
    const date = isJson ? payload?.date : (formData?.get('date') as string);
    const metaTitle = isJson ? payload?.metaTitle : (formData?.get('metaTitle') as string);
    const metaDescription = isJson ? payload?.metaDescription : (formData?.get('metaDescription') as string);
    const category = isJson ? payload?.category : (formData?.get('category') as string);
    const status = isJson ? payload?.status : (formData?.get('status') as string);
    const uploadType = isJson ? payload?.uploadType : (formData?.get('uploadType') as string);

    // Validate required fields
    if (!name || !date || !status || !uploadType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // JSON mode: pages are already uploaded separately.
    if (isJson) {
      const client = await clientPromise;
      const db = client.db('yellowsingam_epaper');
      const folderName = alias || date;
      const pages = Array.isArray(payload?.pages) ? payload.pages : [];

      const edition = {
        name,
        alias: folderName,
        date: new Date(date),
        metaTitle,
        metaDescription,
        category,
        status: status === 'live' ? 'published' : status === 'scheduled' ? 'scheduled' : 'draft',
        uploadType,
        pages,
        pageCount: pages.length,
        views: 0,
        downloads: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection('editions').insertOne(edition);
      revalidateTag('home-data');
      return NextResponse.json({
        success: true,
        editionId: result.insertedId,
        message: 'Edition created successfully',
        pages: pages.length,
      });
    }

    // Multipart mode: process uploaded files and upload to Cloudflare R2
    const files: {
      filename: string;
      url: string;
      pageNum: number;
      previewUrl?: string;
      previewFilename?: string;
    }[] = [];
    let fileIndex = 0;
    let nextPageNum = 1;

    const folderName = alias || date;

    while (formData?.has(`file_${fileIndex}`)) {
      const file = formData.get(`file_${fileIndex}`) as File;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        if (file.type.startsWith('image/')) {
          const pageMeta = await uploadEditionImageBuffers(buffer, folderName, nextPageNum);
          files.push(pageMeta);
          nextPageNum += 1;
        } else if (isPdfUpload(file, buffer)) {
          try {
            const doc = await pdfToImages(buffer, { scale: 2.5 });
            for await (const pagePng of doc) {
              const pageMeta = await uploadEditionImageBuffers(
                Buffer.from(pagePng),
                folderName,
                nextPageNum
              );
              files.push(pageMeta);
              nextPageNum += 1;
            }
          } catch (pdfErr) {
            console.error('PDF to image conversion failed:', pdfErr);
            return NextResponse.json(
              {
                error:
                  'Failed to convert PDF to images. Use a valid, unencrypted PDF or try exporting it again from your source.',
              },
              { status: 400 }
            );
          }
        } else {
          // Non-image fallback (kept for compatibility with existing flows).
          const ext = path.extname(file.name) || '.bin';
          const filename = `page_${nextPageNum}${ext}`;
          const key = `editions/${folderName}/${filename}`;
          const contentType = file.type || 'application/octet-stream';
          const url = await uploadToR2(buffer, key, contentType);

          files.push({
            filename,
            url,
            pageNum: nextPageNum,
          });
          nextPageNum += 1;
        }
      }
      fileIndex++;
    }

    // Save to MongoDB
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    
    const edition = {
      name,
      alias: folderName,
      date: new Date(date),
      metaTitle,
      metaDescription,
      category,
      status: status === 'live' ? 'published' : status === 'scheduled' ? 'scheduled' : 'draft',
      uploadType,
      pages: files,
      pageCount: files.length,
      views: 0,
      downloads: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('editions').insertOne(edition);
    revalidateTag('home-data');

    return NextResponse.json({ 
      success: true, 
      editionId: result.insertedId,
      message: 'Edition created successfully',
      pages: files.length
    });
  } catch (error) {
    console.error('Error creating edition:', error);
    return NextResponse.json({ error: 'Failed to create edition' }, { status: 500 });
  }
}
