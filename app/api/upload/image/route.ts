import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const ext = path.extname(file.name) || '.jpg';
    const filename = `ad_${Date.now()}${ext}`;
    const key = `ads/${filename}`;
    
    const contentType = file.type || 'image/jpeg';
    
    // Upload to R2
    const url = await uploadToR2(buffer, key, contentType);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Error uploading ad image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
