import { Module } from '@nestjs/common';
import { LoanPurposesService } from './loan-purposes.service';
import { LoanPurposesController } from './loan-purposes.controller';

@Module({
  controllers: [LoanPurposesController],
  providers: [LoanPurposesService],
  exports: [LoanPurposesService],
})
export class LoanPurposesModule {}
