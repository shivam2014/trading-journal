import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    await db.query('DELETE FROM trades'); // This will delete all trades, including demo ones

    return NextResponse.json({
      success: true,
      message: 'All trades cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing trades:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to clear trades',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}