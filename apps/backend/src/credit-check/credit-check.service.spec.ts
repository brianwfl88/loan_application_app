import { Test, TestingModule } from '@nestjs/testing';
import { CreditCheckService } from './credit-check.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ApplicationGateway } from '../events/application.gateway';
import { ApplicationStatus } from '@rhb/shared-types';

describe('CreditCheckService', () => {
  let service: CreditCheckService;

  const mockPrisma = {
    loanApplication: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockConfig = {
    get: jest.fn((key) => {
      if (key === 'CREDIT_CHECK_MIN_DELAY_SEC') return '1';
      if (key === 'CREDIT_CHECK_MAX_DELAY_SEC') return '2';
      return null;
    }),
  };

  const mockGateway = {
    notifyApplicationUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditCheckService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: ApplicationGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<CreditCheckService>(CreditCheckService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should evaluate credit decision and notify gateway', async () => {
    const fakeApp = {
      id: 'app-123',
      userId: 'user-456',
      status: ApplicationStatus.PENDING,
      monthlyIncome: 10000,
      loanAmount: 20000,
      tenureMonths: 24,
    };

    mockPrisma.loanApplication.findUnique.mockResolvedValue(fakeApp);
    mockPrisma.loanApplication.update.mockResolvedValue({
      ...fakeApp,
      status: ApplicationStatus.APPROVED,
      creditScore: 780,
      creditDecisionReason: 'Application Approved: DSR meets risk criteria.',
      decidedAt: new Date(),
      updatedAt: new Date(),
    });

    await service.executeCreditCheck('app-123');

    expect(mockPrisma.loanApplication.update).toHaveBeenCalled();
    expect(mockGateway.notifyApplicationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 'app-123',
        userId: 'user-456',
        status: ApplicationStatus.APPROVED,
      }),
    );
  });
});
