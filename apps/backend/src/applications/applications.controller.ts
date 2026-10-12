import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreditCheckService } from '../credit-check/credit-check.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { QueryApplicationsDto } from './dto/query-applications.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly creditCheckService: CreditCheckService,
  ) {}

  /**
   * Submit loan application (Customer only)
   */
  @Post()
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applicationsService.createApplication(userId, dto);
  }

  /**
   * Customer retrieves their own applications
   */
  @Get('my')
  getMyApplications(
    @CurrentUser('id') userId: string,
    @Query() query: QueryApplicationsDto,
  ) {
    return this.applicationsService.getMyApplications(userId, query);
  }

  /**
   * Admin retrieves all applications with status filter and pagination
   */
  @Get('admin/all')
  @Roles(Role.ADMIN)
  getAllAdminApplications(@Query() query: QueryApplicationsDto) {
    return this.applicationsService.getAllApplications(query);
  }

  /**
   * Admin statistics dashboard
   */
  @Get('admin/stats')
  @Roles(Role.ADMIN)
  getAdminStats() {
    return this.applicationsService.getAdminStats();
  }

  /**
   * Helper endpoint: Fast-track credit check decision for testing/demo
   */
  @Post('admin/fast-track/:id')
  @Roles(Role.ADMIN)
  async fastTrackCreditCheck(@Param('id') id: string) {
    await this.creditCheckService.executeCreditCheck(id);
    return { success: true, message: `Fast-tracked credit decision for application ${id}` };
  }

  /**
   * Retrieve application details by ID (Customer can only see own; Admin can see any)
   */
  @Get(':id')
  getApplicationById(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.applicationsService.getApplicationById(id, user);
  }
}
