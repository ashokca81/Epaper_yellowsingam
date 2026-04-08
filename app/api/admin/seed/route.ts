import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');

    // Check if admin already exists
    const existingAdmin = await db.collection('admins').findOne({ 
      email: 'admin@yellowsingam.com' 
    });

    if (existingAdmin) {
      return NextResponse.json({ 
        message: 'Admin user already exists',
        email: 'admin@yellowsingam.com'
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await db.collection('admins').insertOne({
      name: 'Admin',
      email: 'admin@yellowsingam.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
    });

    return NextResponse.json({ 
      success: true,
      message: 'Admin user created successfully',
      credentials: {
        email: 'admin@yellowsingam.com',
        password: 'admin123'
      }
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed admin' }, { status: 500 });
  }
}
