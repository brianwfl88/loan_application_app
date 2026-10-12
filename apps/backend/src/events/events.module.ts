import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ApplicationGateway } from './application.gateway';

@Global()
@Module({
  imports: [JwtModule],
  providers: [ApplicationGateway],
  exports: [ApplicationGateway],
})
export class EventsModule {}
