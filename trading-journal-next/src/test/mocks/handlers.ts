import { http, HttpResponse, delay } from 'msw';
import { Decimal } from '@prisma/client/runtime/library';

export const handlers = [
  // Mock trade import endpoint
  http.post('/api/trades/import', async () => {
    await delay(100); // Simulate network delay
    return HttpResponse.json({
      count: 2,
      message: 'Successfully imported trades',
    });
  }),

  // Mock trades fetch endpoint
  http.get('/api/trades', async () => {
    await delay(100);
    return HttpResponse.json({
      trades: [
        {
          id: '1',
          userId: 'user1',
          brokerTradeId: 'bt1',
          ticker: 'AAPL',
          action: 'BUY',
          quantity: new Decimal(100),
          price: new Decimal(150),
          currency: 'USD',
          timestamp: new Date('2025-01-01T12:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          totalAmount: new Decimal(15000),
        },
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 1,
      },
    });
  }),

  // Mock clear trades endpoint
  http.post('/api/trades/clear', async () => {
    await delay(100);
    return HttpResponse.json({
      message: 'All trades cleared successfully',
    });
  }),

  // Mock trade groups fetch endpoint
  http.get('/api/trade-groups', async () => {
    await delay(100);
    return HttpResponse.json({
      groups: [
        {
          id: 'group1',
          userId: 'user1',
          ticker: 'AAPL',
          status: 'OPEN',
          entryDate: new Date('2025-01-01T12:00:00Z'),
          initialQuantity: new Decimal(100),
          remainingQuantity: new Decimal(50),
          averageEntryPrice: new Decimal(150),
          currency: 'USD',
          entries: [
            {
              id: 'entry1',
              tradeId: '1',
              quantity: new Decimal(100),
            },
          ],
          patterns: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        totalPages: 1,
        totalItems: 1,
      },
    });
  }),

  // Mock trade group creation endpoint
  http.post('/api/trade-groups', async () => {
    await delay(100);
    return HttpResponse.json({
      group: {
        id: 'new-group',
        userId: 'user1',
        ticker: 'AAPL',
        status: 'OPEN',
        entryDate: new Date(),
        initialQuantity: new Decimal(100),
        remainingQuantity: new Decimal(100),
        averageEntryPrice: new Decimal(150),
        currency: 'USD',
        entries: [],
        patterns: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }),

  // Mock error response
  http.get('/api/error', () => {
    return new HttpResponse(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }),
];