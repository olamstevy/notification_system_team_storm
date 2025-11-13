import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { EmailServiceController } from './email_service.controller';
import { EmailServiceService } from './email_service.service';
import { CircuitBreakerService } from '../../../libs/common/src/circuit-breaker/circuit-breaker.service';
import { RetryService } from '../../../libs/common/src/retry/retry.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HttpModule],
  controllers: [EmailServiceController],
  providers: [EmailServiceService, CircuitBreakerService, RetryService],
})
export class EmailServiceModule { }
