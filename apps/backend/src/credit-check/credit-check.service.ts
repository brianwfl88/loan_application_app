import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationGateway } from '../events/application.gateway';
import { ApplicationStatus } from '@rhb/shared-types';

@Injectable()
export class CreditCheckService implements OnModuleInit {
  private readonly logger = new Logger(CreditCheckService.name);
  private activeTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private applicationGateway: ApplicationGateway,
  ) {}

  async onModuleInit() {
    // Resume pending applications on server restart if any
    this.resumePendingApplications();
  }

  private async resumePendingApplications() {
    try {
      const pendingApps = await this.prisma.loanApplication.findMany({
        where: { status: ApplicationStatus.PENDING },
        take: 20,
      });

      if (pendingApps.length > 0) {
        this.logger.log(`Found ${pendingApps.length} pending application(s) upon startup. Resuming credit checks...`);
        for (const app of pendingApps) {
          // Schedule with a short random delay between 5s and 20s for recovered apps
          const delayMs = Math.floor(Math.random() * (20000 - 5000 + 1)) + 5000;
          this.scheduleCreditCheck(app.id, delayMs);
        }
      }
    } catch (err) {
      this.logger.warn(`Could not check for pending applications on startup: ${err.message}`);
    }
  }

  /**
   * Schedules an asynchronous credit check for the loan application.
   * Requirement: Completes at a random time between 10 seconds and 5 minutes (300 seconds).
   */
  scheduleCreditCheck(applicationId: string, overrideDelayMs?: number): number {
    const minSec = parseInt(this.configService.get<string>('CREDIT_CHECK_MIN_DELAY_SEC') || '10', 10);
    const maxSec = parseInt(this.configService.get<string>('CREDIT_CHECK_MAX_DELAY_SEC') || '300', 10);

    const delaySec = Math.floor(Math.random() * (maxSec - minSec + 1)) + minSec;
    const delayMs = overrideDelayMs !== undefined ? overrideDelayMs : delaySec * 1000;

    this.logger.log(
      `[CREDIT CHECK SCHEDULED] Application ${applicationId} will complete in ${(delayMs / 1000).toFixed(1)} seconds.`,
    );

    const timer = setTimeout(async () => {
      this.activeTimers.delete(applicationId);
      await this.executeCreditCheck(applicationId);
    }, delayMs);

    this.activeTimers.set(applicationId, timer);
    return delayMs;
  }

  /**
   * Simulates the core banking credit check logic and updates application status.
   */
  async executeCreditCheck(applicationId: string) {
    try {
      this.logger.log(`[CREDIT CHECK RUNNING] Processing credit decision for application ${applicationId}...`);

      const application = await this.prisma.loanApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        this.logger.warn(`Application ${applicationId} not found during credit check execution.`);
        return;
      }

      if (application.status !== ApplicationStatus.PENDING) {
        this.logger.log(`Application ${applicationId} already in terminal status ${application.status}. Skipping.`);
        return;
      }

      const monthlyIncome = Number(application.monthlyIncome);
      const loanAmount = Number(application.loanAmount);
      const tenureMonths = application.tenureMonths;

      // Realistic Banking Credit Decision Engine:
      // Annual interest rate assumption: 5.5% p.a.
      const annualInterestRate = 0.055;
      const totalInterest = loanAmount * annualInterestRate * (tenureMonths / 12);
      const totalRepayment = loanAmount + totalInterest;
      const estimatedMonthlyInstallment = totalRepayment / tenureMonths;

      // Debt Service Ratio (DSR)
      const dsr = monthlyIncome > 0 ? estimatedMonthlyInstallment / monthlyIncome : 1.0;

      // Simulated Credit Score between 450 and 850
      // Higher income relative to loan amount yields higher base score
      const baseRatio = Math.min(monthlyIncome / (estimatedMonthlyInstallment || 1), 5) / 5;
      const randomVariance = Math.floor(Math.random() * 120) - 40;
      const creditScore = Math.min(850, Math.max(450, Math.round(520 + baseRatio * 250 + randomVariance)));

      // Decision rules: DSR <= 60% and creditScore >= 560
      const isApproved = dsr <= 0.60 && creditScore >= 560;
      const status = isApproved ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;

      const reason = isApproved
        ? `Application Approved: DSR is ${(dsr * 100).toFixed(1)}% (within 60.0% policy limit). Simulated Credit Score: ${creditScore}/850.`
        : dsr > 0.60
        ? `Application Declined: Estimated monthly installment (RM ${estimatedMonthlyInstallment.toFixed(2)}) results in a DSR of ${(dsr * 100).toFixed(1)}%, which exceeds RHB's maximum 60.0% threshold.`
        : `Application Declined: Simulated credit bureau score (${creditScore}/850) is below the minimum threshold of 560.`;

      const updated = await this.prisma.loanApplication.update({
        where: { id: applicationId },
        data: {
          status,
          creditScore,
          creditDecisionReason: reason,
          decidedAt: new Date(),
        },
      });

      this.logger.log(
        `[CREDIT CHECK COMPLETED] Application ${applicationId} decided: ${status}. Score: ${creditScore}. DSR: ${(dsr * 100).toFixed(1)}%`,
      );

      // Push real-time event via Socket.IO
      this.applicationGateway.notifyApplicationUpdate({
        applicationId: updated.id,
        userId: updated.userId,
        status: updated.status,
        creditScore: updated.creditScore ?? undefined,
        creditDecisionReason: updated.creditDecisionReason ?? undefined,
        decidedAt: updated.decidedAt ? updated.decidedAt.toISOString() : undefined,
        updatedAt: updated.updatedAt.toISOString(),
      });
    } catch (err) {
      this.logger.error(`Error during credit check execution for ${applicationId}: ${err.message}`, err.stack);
    }
  }

  cancelScheduledCheck(applicationId: string) {
    const timer = this.activeTimers.get(applicationId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(applicationId);
    }
  }
}
