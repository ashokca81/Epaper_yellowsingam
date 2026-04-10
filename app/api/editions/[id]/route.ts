import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { deleteFromR2 } from '@/lib/r2';

// GET single edition by ID
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

    return NextResponse.json({ edition });
  } catch (error) {
    console.error('Error fetching edition:', error);
    return NextResponse.json({ error: 'Failed to fetch edition' }, { status: 500 });
  }
}

// DELETE edition by ID
export async function DELETE(
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
    
    // First get the edition to delete associated R2 files
    const edition = await db.collection('editions').findOne({ _id: new ObjectId(id) });
    
    if (!edition) {
      return NextResponse.json({ error: 'Edition not found' }, { status: 404 });
    }

    // Delete files from R2
    if (edition.pages && edition.pages.length > 0) {
      const deletePromises = edition.pages.map(async (page: { filename: string; previewFilename?: string }) => {
        const keys = [`editions/${edition.alias}/${page.filename}`];
        if (page.previewFilename) {
          keys.push(`editions/${edition.alias}/${page.previewFilename}`);
        }

        await Promise.all(
          keys.map(async (key) => {
            try {
              await deleteFromR2(key);
            } catch (e) {
              console.error(`Failed to delete R2 file: ${key}`, e);
            }
          })
        );
      });
      await Promise.all(deletePromises);
    }

    // Delete from MongoDB
    const result = await db.collection('editions').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Failed to delete edition' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Edition deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting edition:', error);
    return NextResponse.json({ error: 'Failed to delete edition' }, { status: 500 });
  }
}

// PUT update edition by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      console.error('Invalid ObjectId:', id);
      return NextResponse.json({ error: 'Invalid edition ID' }, { status: 400 });
    }

    const body = await request.json();
    console.log('PUT request body:', body); // Debug log
    
    const { name, alias, date, metaTitle, metaDescription, category, status } = body;

    // Basic validation
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Edition name is required' }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: 'Edition date is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name;
    if (alias) updateData.alias = alias;
    if (date) updateData.date = new Date(date);
    if (metaTitle) updateData.metaTitle = metaTitle;
    if (metaDescription) updateData.metaDescription = metaDescription;
    if (category) updateData.category = category;
    if (status) updateData.status = status;

    console.log('Update data:', updateData); // Debug log

    const result = await db.collection('editions').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    console.log('MongoDB update result:', result); // Debug log

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Edition not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Edition updated successfully' 
    });
  } catch (error) {
    console.error('Error updating edition:', error);
    return NextResponse.json({ 
      error: 'Failed to update edition', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
