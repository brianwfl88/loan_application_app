import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { LoanPurposesService } from './loan-purposes.service';

@Controller('loan-purposes')
export class LoanPurposesController {
  constructor(private readonly loanPurposesService: LoanPurposesService) {}

  @Get()
  async getLoanPurposes(
    @Query('fresh') fresh: string,
    @Res() res: Response,
  ) {
    const forceFresh = fresh === 'true';
    const result = await this.loanPurposesService.getLoanPurposes(forceFresh);

    res.setHeader('X-Cache', result.cached ? 'HIT' : 'MISS');
    res.setHeader('X-Response-Time-Ms', result.fetchTimeMs.toString());

    return res.status(HttpStatus.OK).json({
      data: result.data,
      meta: {
        cached: result.cached,
        fetchTimeMs: result.fetchTimeMs,
      },
    });
  }
}
