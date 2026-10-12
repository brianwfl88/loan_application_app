import { Module } from '@nestjs/common';
import { CreditCheckService } from './credit-check.service';

@Module({
  providers: [CreditCheckService],
  exports: [CreditCheckService],
})
export class CreditCheckModule {}
