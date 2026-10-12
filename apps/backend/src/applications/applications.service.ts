import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditCheckService } from '../credit-check/credit-check.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { QueryApplicationsDto } from './dto/query-applications.dto';
import { Role, ApplicationStatus } from '@rhb/shared-types';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private prisma: PrismaService,
    private creditCheckService: CreditCheckService,
  ) {}

  /**
   * Normalize Malaysian NRIC into standard YYMMDD-PB-###G format
   */
  private formatNric(rawNric: string): string {
    const cleaned = rawNric.replace(/\D/g, '');
    if (cleaned.length === 12) {
      return `${cleaned.slice(0, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8, 12)}`;
    }
    return rawNric.trim();
  }

  async createApplication(userId: string, dto: CreateApplicationDto) {
    // Verify purpose exists
    let purpose = await this.prisma.loanPurpose.findUnique({
      where: { id: dto.purposeId },
    });

    if (!purpose) {
      // Fallback: check by code
      purpose = await this.prisma.loanPurpose.findUnique({
        where: { code: dto.purposeId },
      });
    }

    if (!purpose) {
      throw new BadRequestException('Selected loan purpose does not exist');
    }

    // Check purpose amount bounds
    const loanAmount = Number(dto.loanAmount);
    if (loanAmount < Number(purpose.minAmount) || loanAmount > Number(purpose.maxAmount)) {
      throw new BadRequestException(
        `Loan amount must be between RM ${Number(purpose.minAmount).toLocaleString()} and RM ${Number(purpose.maxAmount).toLocaleString()} for ${purpose.name}`,
      );
    }

    const formattedNric = this.formatNric(dto.nric);

    // Create loan application in DB as PENDING
    const application = await this.prisma.loanApplication.create({
      data: {
        userId,
        fullName: dto.fullName.trim(),
        nric: formattedNric,
        phoneNumber: dto.phoneNumber.trim(),
        email: dto.email.toLowerCase().trim(),
        monthlyIncome: dto.monthlyIncome,
        loanAmount: dto.loanAmount,
        tenureMonths: dto.tenureMonths,
        purposeId: purpose.id,
        status: ApplicationStatus.PENDING,
      },
      include: {
        purpose: true,
      },
    });

    this.logger.log(`Created Loan Application ${application.id} for user ${userId}. Scheduling credit check...`);

    // Schedule asynchronous credit check (simulates between 10 seconds and 5 minutes)
    this.creditCheckService.scheduleCreditCheck(application.id);

    return this.mapApplication(application);
  }

  async getMyApplications(userId: string, query: QueryApplicationsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.loanApplication.count({ where }),
      this.prisma.loanApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { purpose: true },
      }),
    ]);

    return {
      data: items.map((app) => this.mapApplication(app)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getApplicationById(id: string, currentUser: { id: string; role: Role }) {
    const application = await this.prisma.loanApplication.findUnique({
      where: { id },
      include: {
        purpose: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Loan application with ID "${id}" not found`);
    }

    if (currentUser.role !== Role.ADMIN && application.userId !== currentUser.id) {
      throw new ForbiddenException('You are not authorized to view this application');
    }

    return this.mapApplication(application);
  }

  async getAllApplications(query: QueryApplicationsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { fullName: { contains: term } },
        { email: { contains: term } },
        { nric: { contains: term } },
        { phoneNumber: { contains: term } },
      ];
    }

    const orderByField = query.sortBy || 'createdAt';
    const orderDirection = query.sortOrder || 'desc';

    const [total, items] = await Promise.all([
      this.prisma.loanApplication.count({ where }),
      this.prisma.loanApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderDirection },
        include: {
          purpose: true,
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items.map((app) => this.mapApplication(app)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getAdminStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.loanApplication.count(),
      this.prisma.loanApplication.count({ where: { status: ApplicationStatus.PENDING } }),
      this.prisma.loanApplication.count({ where: { status: ApplicationStatus.APPROVED } }),
      this.prisma.loanApplication.count({ where: { status: ApplicationStatus.REJECTED } }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      approvalRate: total > 0 ? ((approved / (approved + rejected || 1)) * 100).toFixed(1) : '0.0',
    };
  }

  private mapApplication(app: any) {
    return {
      id: app.id,
      userId: app.userId,
      fullName: app.fullName,
      nric: app.nric,
      phoneNumber: app.phoneNumber,
      email: app.email,
      monthlyIncome: Number(app.monthlyIncome),
      loanAmount: Number(app.loanAmount),
      tenureMonths: app.tenureMonths,
      purposeId: app.purposeId,
      purpose: app.purpose
        ? {
            id: app.purpose.id,
            code: app.purpose.code,
            name: app.purpose.name,
            description: app.purpose.description,
            minAmount: Number(app.purpose.minAmount),
            maxAmount: Number(app.purpose.maxAmount),
          }
        : undefined,
      status: app.status,
      creditScore: app.creditScore,
      creditDecisionReason: app.creditDecisionReason,
      submittedAt: app.submittedAt ? app.submittedAt.toISOString() : app.createdAt.toISOString(),
      decidedAt: app.decidedAt ? app.decidedAt.toISOString() : null,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
      user: app.user,
    };
  }
}
