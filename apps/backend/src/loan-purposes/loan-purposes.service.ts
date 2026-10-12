import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface LoanPurposeItem {
  id: string;
  code: string;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
}

@Injectable()
export class LoanPurposesService {
  private readonly logger = new Logger(LoanPurposesService.name);

  // In-memory cache for external core banking loan purposes
  private cachedPurposes: LoanPurposeItem[] | null = null;
  private cacheExpiresAt: number = 0;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves loan purposes.
   * Requirement: Simulate slow external core banking call with a 2-second delay.
   * Optimization: Because "the list rarely changes", result is cached.
   */
  async getLoanPurposes(forceFresh = false): Promise<{ data: LoanPurposeItem[]; cached: boolean; fetchTimeMs: number }> {
    const startTime = Date.now();
    const now = Date.now();

    if (!forceFresh && this.cachedPurposes && now < this.cacheExpiresAt) {
      const elapsed = Date.now() - startTime;
      this.logger.log(`[CACHE HIT] Returning ${this.cachedPurposes.length} loan purposes from cache (${elapsed}ms)`);
      return {
        data: this.cachedPurposes,
        cached: true,
        fetchTimeMs: elapsed,
      };
    }

    this.logger.log(`[CACHE MISS] Fetching loan purposes from external core banking system (simulating 2-second latency)...`);
    const freshData = await this.fetchFromExternalCoreBankingSystem();

    this.cachedPurposes = freshData;
    this.cacheExpiresAt = now + this.CACHE_TTL_MS;

    const totalElapsed = Date.now() - startTime;
    this.logger.log(`[EXTERNAL CORE BANKING] Retrieved ${freshData.length} purposes in ${totalElapsed}ms. Cached for 1 hour.`);

    return {
      data: freshData,
      cached: false,
      fetchTimeMs: totalElapsed,
    };
  }

  /**
   * Simulates slow external core banking system.
   * Enforces 2000ms delay per specification.
   */
  private async fetchFromExternalCoreBankingSystem(): Promise<LoanPurposeItem[]> {
    // 2-second simulated delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Retrieve configured purposes from DB
    const purposes = await this.prisma.loanPurpose.findMany({
      orderBy: { name: 'asc' },
    });

    if (purposes.length === 0) {
      // Default fallback loan purposes if table not yet seeded
      return [
        {
          id: 'purpose-debt-consolidation',
          code: 'DEBT_CONSOLIDATION',
          name: 'Debt Consolidation',
          description: 'Consolidate high-interest cards and loans into one lower monthly payment',
          minAmount: 5000,
          maxAmount: 150000,
        },
        {
          id: 'purpose-home-renovation',
          code: 'HOME_RENOVATION',
          name: 'Home Renovation & Improvement',
          description: 'Upgrade your living space, furnishings, or home fixtures',
          minAmount: 5000,
          maxAmount: 150000,
        },
        {
          id: 'purpose-medical-emergencies',
          code: 'MEDICAL_EMERGENCY',
          name: 'Medical & Healthcare Expenses',
          description: 'Cover healthcare procedures and unexpected medical bills',
          minAmount: 2000,
          maxAmount: 100000,
        },
        {
          id: 'purpose-education',
          code: 'EDUCATION',
          name: 'Education & Professional Certification',
          description: 'Invest in university tuition and career upskilling',
          minAmount: 3000,
          maxAmount: 100000,
        },
        {
          id: 'purpose-business-expansion',
          code: 'BUSINESS_EXPANSION',
          name: 'Small Business Working Capital',
          description: 'Inventory purchasing and business operations',
          minAmount: 10000,
          maxAmount: 200000,
        },
        {
          id: 'purpose-personal-investment',
          code: 'PERSONAL_WEDDING_LIFESTYLE',
          name: 'Wedding & Life Events',
          description: 'Celebrate special life occasions and milestones',
          minAmount: 5000,
          maxAmount: 80000,
        },
      ];
    }

    return purposes.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      minAmount: Number(p.minAmount),
      maxAmount: Number(p.maxAmount),
    }));
  }

  // Clear cache manually if needed
  clearCache(): void {
    this.cachedPurposes = null;
    this.cacheExpiresAt = 0;
  }
}
