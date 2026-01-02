import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

// Force update using direct MongoDB connection
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Use direct MongoDB connection to bypass any caching
    const db = mongoose.connection.db;
    const collection = db.collection('eventregistrations');

    // Update ALL documents to add checkedIn: false
    const result1 = await collection.updateMany(
      {},
      { $set: { checkedIn: false } }
    );

    // Now update the specific one for Ryan to true
    const result2 = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId('6949dc2d2443915ba43801bc') },
      { $set: { checkedIn: true } }
    );

    // Verify
    const verification = await collection.findOne(
      { _id: new mongoose.Types.ObjectId('6949dc2d2443915ba43801bc') }
    );

    return NextResponse.json({
      success: true,
      allUpdated: result1.modifiedCount,
      ryanUpdated: result2.modifiedCount,
      verification: {
        checkedIn: verification?.checkedIn,
        attended: verification?.attended,
        hoursCompleted: verification?.hoursCompleted,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
