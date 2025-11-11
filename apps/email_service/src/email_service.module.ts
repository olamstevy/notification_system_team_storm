import { Module } from '@nestjs/common';
import { EmailServiceController } from './email_service.controller';
import { EmailServiceService } from './email_service.service';

@Module({
  imports: [],
  controllers: [EmailServiceController],
  providers: [EmailServiceService],
})
export class EmailServiceModule {}
