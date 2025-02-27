import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getToken } from 'next-auth/jwt';

const preferencesSchema = z.object({
  defaultCurrency: z.string().length(3),
  theme: z.enum(['light', 'dark', 'system']),
  chartPreferences: z.record(z.unknown()).optional(),
  notificationSettings: z.record(z.unknown()).optional(),
});

export async function GET(request: Request) {
  try {
    const token = await getToken({ req: request as any });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await prisma.userPreferences.findUnique({
      where: { userId: token.id },
    });

    if (!preferences) {
      // Return default preferences if none exist
      return NextResponse.json({
        defaultCurrency: 'USD',
        theme: 'dark',
        chartPreferences: {},
        notificationSettings: {},
      });
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const token = await getToken({ req: request as any });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const preferences = preferencesSchema.parse(data);

    const updatedPreferences = await prisma.userPreferences.upsert({
      where: { userId: token.id },
      update: preferences,
      create: {
        userId: token.id,
        ...preferences,
      },
    });

    // Update user's preferred currency
    await prisma.user.update({
      where: { id: token.id },
      data: { preferredCurrency: preferences.defaultCurrency },
    });

    return NextResponse.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating preferences:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid preferences data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}