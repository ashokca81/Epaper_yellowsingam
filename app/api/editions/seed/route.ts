import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { uploadToR2 } from '@/lib/r2';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read sample image
    const imagePath = path.join(process.cwd(), 'public', 'sample-page.jpg');
    const imageBuffer = fs.readFileSync(imagePath);
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // 2026-04-08
    const alias = `edition-${dateStr}`;
    
    // Upload to R2
    const key = `editions/${alias}/page_1.jpg`;
    const url = await uploadToR2(imageBuffer, key, 'image/jpeg');
    
    console.log('Uploaded to R2:', url);
    
    // Save to MongoDB
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    
    // Delete existing edition for today if any
    await db.collection('editions').deleteMany({ alias });
    
    const edition = {
      name: `Yellow Singam - ${new Date().toLocaleDateString('te-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`,
      alias,
      date: new Date(),
      metaTitle: 'Yellow Singam Telugu Daily ePaper',
      metaDescription: 'Read Yellow Singam Telugu Daily ePaper online',
      category: 'main',
      status: 'published',
      uploadType: 'images',
      pages: [
        {
          filename: 'page_1.jpg',
          url,
          pageNum: 1,
        }
      ],
      pageCount: 1,
      views: 0,
      downloads: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection('editions').insertOne(edition);
    
    return NextResponse.json({ 
      success: true,
      message: 'Sample edition created successfully!',
      editionId: result.insertedId,
      imageUrl: url,
      alias
    });
  } catch (error) {
    console.error('Error creating sample edition:', error);
    return NextResponse.json({ 
      error: 'Failed to create sample edition',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
