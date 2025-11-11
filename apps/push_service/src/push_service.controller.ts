import { Controller, Get } from '@nestjs/common';
import { PushServiceService } from './push_service.service';

@Controller()
export class PushServiceController {
  constructor(private readonly pushServiceService: PushServiceService) {}

  @Get()
  getHello(): string {
    return this.pushServiceService.getHello();
  }
}
