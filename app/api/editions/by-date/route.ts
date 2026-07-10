import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date');
    
    if (!dateStr) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }
    
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    
    // Parse date and create range for that day
    const queryDate = new Date(dateStr);
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
    
    const edition = await db.collection('editions').findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      status: 'published'
    });
    
    if (!edition) {
      return NextResponse.json({ 
        found: false,
        message: 'No edition found for this date'
      });
    }
    
    return NextResponse.json({ 
      found: true,
      edition: {
        id: edition._id,
        name: edition.name,
        alias: edition.alias,
        date: edition.date,
        pages: edition.pages,
        pageCount: edition.pageCount,
      }
    });
  } catch (error) {
    console.error('Error fetching edition by date:', error);
    return NextResponse.json({ error: 'Failed to fetch edition' }, { status: 500 });
  }
}
