import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { TradeGroupingService } from '@/lib/services/trade-grouping';

// Schema for group creation
const createGroupSchema = z.object({
  tradeIds: z.array(z.string()),
  strategy: z.enum(['ticker', 'day', 'week', 'pattern', 'custom']),
  minTrades: z.number().optional(),
  patternConfidence: z.number().min(0).max(1).optional(),
  maxTimeGap: z.number().optional(),
  customGroupId: z.string().optional(),
  notes: z.string().optional(),
});

// Schema for group update
const updateGroupSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(['OPEN', 'CLOSED']).optional(),
});

/**
 * POST - Create trade groups
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const validatedData = createGroupSchema.parse(body);
    
    // Get trades to group
    const trades = await prisma.trade.findMany({
      where: {
        id: { in: validatedData.tradeIds },
        userId: session.user.id,
      },
    });
    
    if (trades.length === 0) {
      return NextResponse.json(
        { error: 'No valid trades found' },
        { status: 400 }
      );
    }
    
    // Create trade groups
    const groupingService = new TradeGroupingService();
    const results = await groupingService.groupTrades(session.user.id, trades, {
      strategy: validatedData.strategy,
      minTrades: validatedData.minTrades,
      patternConfidence: validatedData.patternConfidence,
      maxTimeGap: validatedData.maxTimeGap,
      customGroupId: validatedData.customGroupId,
      notes: validatedData.notes,
    });
    
    return NextResponse.json({ groups: results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.format() },
        { status: 400 }
      );
    }
    
    console.error('Error creating trade groups:', error);
    return NextResponse.json(
      { error: 'Failed to create trade groups' },
      { status: 500 }
    );
  }
}

/**
 * GET - Retrieve trade groups
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const ticker = searchParams.get('ticker');
    const timeframe = searchParams.get('timeframe');
    
    // Build query
    const where = {
      userId: session.user.id,
      ...(status ? { status: status.toUpperCase() } : {}),
      ...(ticker ? { ticker } : {}),
    };
    
    // Get trade groups with basic info
    const groups = await prisma.tradeGroup.findMany({
      where,
      include: {
        entries: {
          include: {
            trade: true,
          },
        },
        patterns: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    
    // Calculate metrics for each group
    const groupingService = new TradeGroupingService();
    const groupsWithMetrics = await Promise.all(
      groups.map(async (group) => {
        const metrics = await groupingService.calculateGroupMetrics(group.id);
        return { group, metrics };
      })
    );
    
    return NextResponse.json({ groups: groupsWithMetrics });
  } catch (error) {
    console.error('Error fetching trade groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trade groups' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update a trade group
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get group ID from query params
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('id');
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    const validatedData = updateGroupSchema.parse(body);
    
    // Update group
    const group = await prisma.tradeGroup.findUnique({
      where: { id: groupId },
    });
    
    if (!group) {
      return NextResponse.json(
        { error: 'Trade group not found' },
        { status: 404 }
      );
    }
    
    if (group.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const updatedGroup = await prisma.tradeGroup.update({
      where: { id: groupId },
      data: validatedData,
      include: {
        entries: {
          include: {
            trade: true,
          },
        },
        patterns: true,
      },
    });
    
    // Calculate updated metrics
    const groupingService = new TradeGroupingService();
    const metrics = await groupingService.calculateGroupMetrics(groupId);
    
    return NextResponse.json({ group: updatedGroup, metrics });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.format() },
        { status: 400 }
      );
    }
    
    console.error('Error updating trade group:', error);
    return NextResponse.json(
      { error: 'Failed to update trade group' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a trade group
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get group ID from query params
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('id');
    
    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }
    
    // Check ownership
    const group = await prisma.tradeGroup.findUnique({
      where: { id: groupId },
    });
    
    if (!group) {
      return NextResponse.json(
        { error: 'Trade group not found' },
        { status: 404 }
      );
    }
    
    if (group.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Delete group and related entries
    await prisma.$transaction([
      prisma.tradeGroupEntry.deleteMany({
        where: { tradeGroupId: groupId },
      }),
      prisma.technicalPattern.deleteMany({
        where: { tradeGroupId: groupId },
      }),
      prisma.tradeGroup.delete({
        where: { id: groupId },
      }),
    ]);
    
    return NextResponse.json({
      success: true,
      message: 'Trade group deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting trade group:', error);
    return NextResponse.json(
      { error: 'Failed to delete trade group' },
      { status: 500 }
    );
  }
}