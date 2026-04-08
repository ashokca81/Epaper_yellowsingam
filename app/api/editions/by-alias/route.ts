import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const alias = searchParams.get('alias');

    if (!alias) {
      return NextResponse.json({ error: 'Alias is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    
    const edition = await db.collection('editions').findOne({ alias });
    
    if (!edition) {
      return NextResponse.json({ error: 'Edition not found' }, { status: 404 });
    }

    return NextResponse.json({ edition });
  } catch (error) {
    console.error('Error fetching edition by alias:', error);
    return NextResponse.json({ error: 'Failed to fetch edition' }, { status: 500 });
  }
}
