import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PushServiceController } from './push_service.controller';
import { PushServiceService } from './push_service.service';
import { CircuitBreakerService } from '../../../libs/common/src/circuit-breaker/circuit-breaker.service';
import { RetryService } from '../../../libs/common/src/retry/retry.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
  ],
  controllers: [PushServiceController],
  providers: [
    PushServiceService,
    CircuitBreakerService,
    RetryService,
  ],
})
export class PushServiceModule {}
