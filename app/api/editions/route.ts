import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { uploadToR2 } from '@/lib/r2';
import path from 'path';

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
    
    return NextResponse.json({ editions });
  } catch (error) {
    console.error('Error fetching editions:', error);
    return NextResponse.json({ error: 'Failed to fetch editions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const name = formData.get('name') as string;
    const alias = formData.get('alias') as string;
    const date = formData.get('date') as string;
    const metaTitle = formData.get('metaTitle') as string;
    const metaDescription = formData.get('metaDescription') as string;
    const category = formData.get('category') as string;
    const status = formData.get('status') as string;
    const uploadType = formData.get('uploadType') as string;

    // Validate required fields
    if (!name || !date || !status || !uploadType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Process uploaded files and upload to Cloudflare R2
    const files: { filename: string; url: string; pageNum: number }[] = [];
    let fileIndex = 0;
    
    const folderName = alias || date;

    while (formData.has(`file_${fileIndex}`)) {
      const file = formData.get(`file_${fileIndex}`) as File;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const ext = path.extname(file.name) || '.jpg';
        const filename = `page_${fileIndex + 1}${ext}`;
        const key = `editions/${folderName}/${filename}`;
        
        // Get content type
        const contentType = file.type || 'image/jpeg';
        
        // Upload to R2
        const url = await uploadToR2(buffer, key, contentType);
        
        files.push({
          filename,
          url,
          pageNum: fileIndex + 1,
        });
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
