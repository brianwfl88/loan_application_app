import { Test, TestingModule } from '@nestjs/testing';
import { LoanPurposesService } from './loan-purposes.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LoanPurposesService', () => {
  let service: LoanPurposesService;

  const mockPrisma = {
    loanPurpose: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'test-1',
          code: 'HOME_RENOVATION',
          name: 'Home Renovation',
          description: 'Renovation loan',
          minAmount: 5000,
          maxAmount: 100000,
        },
      ]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoanPurposesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LoanPurposesService>(LoanPurposesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should simulate slow core banking and cache results on subsequent call', async () => {
    // Override the 2000ms delay in unit test for fast assertion
    const originalMethod = (service as any).fetchFromExternalCoreBankingSystem.bind(service);
    (service as any).fetchFromExternalCoreBankingSystem = jest.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 50)); // Fast simulated delay for test
      return [
        {
          id: 'test-1',
          code: 'HOME_RENOVATION',
          name: 'Home Renovation',
          description: 'Renovation loan',
          minAmount: 5000,
          maxAmount: 100000,
        },
      ];
    });

    // 1st call: Cache MISS
    const firstCall = await service.getLoanPurposes(false);
    expect(firstCall.cached).toBe(false);
    expect(firstCall.data.length).toBe(1);

    // 2nd call: Cache HIT
    const secondCall = await service.getLoanPurposes(false);
    expect(secondCall.cached).toBe(true);
    expect(secondCall.data.length).toBe(1);
    expect((service as any).fetchFromExternalCoreBankingSystem).toHaveBeenCalledTimes(1);
  });
});
