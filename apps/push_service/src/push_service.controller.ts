import { Controller, Get } from '@nestjs/common';
import { PushServiceService } from './push_service.service';

@Controller('api/v1')
export class PushServiceController {
  constructor(private readonly pushServiceService: PushServiceService) {}

  @Get('health')
  async getHealth() {
    return this.pushServiceService.getHealth();
  }
}
