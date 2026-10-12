import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LoanPurposesModule } from './loan-purposes/loan-purposes.module';
import { EventsModule } from './events/events.module';
import { CreditCheckModule } from './credit-check/credit-check.module';
import { ApplicationsModule } from './applications/applications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    AuthModule,
    LoanPurposesModule,
    EventsModule,
    CreditCheckModule,
    ApplicationsModule,
  ],
})
export class AppModule {}
