import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// POST - Reorder pages for an edition
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid edition ID' }, { status: 400 });
    }

    const body = await request.json();
    const { pages } = body;

    if (!pages || !Array.isArray(pages)) {
      return NextResponse.json({ error: 'Invalid pages array' }, { status: 400 });
    }

    // Update page numbers based on new order
    const updatedPages = pages.map((page, index) => ({
      ...page,
      pageNum: index + 1
    }));

    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');

    const result = await db.collection('editions').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          pages: updatedPages,
          pageCount: updatedPages.length,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Edition not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Pages reordered successfully',
      pages: updatedPages
    });
  } catch (error) {
    console.error('Error reordering pages:', error);
    return NextResponse.json({ error: 'Failed to reorder pages' }, { status: 500 });
  }
}