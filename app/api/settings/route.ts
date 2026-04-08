import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    
    let settings = await db.collection('settings').findOne({ type: 'global' });
    
    if (!settings) {
      // Default settings
      const newSettings = {
        type: 'global',
        siteName: 'Yellow Singam Telugu Daily',
        tagline: 'Hunting for Truth',
        siteUrl: 'https://epaper.yellowsingam.com',
        email: 'contact@yellowsingam.com',
        phone: '+91 9876543210',
        address: 'Vijayawada, Andhra Pradesh, India',
        timezone: 'Asia/Kolkata',
        language: 'te',
        primaryColor: '#D4A800',
        secondaryColor: '#2D2D2D',
        enableNotifications: true,
        enableAnalytics: true,
        enableWatermark: true,
        watermarkText: 'Yellow Singam',
        pdfQuality: 'high',
        imageQuality: 'high',
        // Ad Settings
        adEnabled: false,
        adType: 'custom',
        googleAdCode: '',
        customAdImage: '',
        customAdLink: ''
      };
      await db.collection('settings').insertOne(newSettings);
      settings = newSettings as any;
    }
    
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');

    const updateData = { ...body };
    delete updateData._id; 
    updateData.updatedAt = new Date();

    await db.collection('settings').updateOne(
      { type: 'global' },
      { $set: updateData },
      { upsert: true }
    );
    
    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
