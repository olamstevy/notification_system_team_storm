import { Module } from '@nestjs/common';
import { PushServiceController } from './push_service.controller';
import { PushServiceService } from './push_service.service';

@Module({
  imports: [],
  controllers: [PushServiceController],
  providers: [PushServiceService],
})
export class PushServiceModule {}
