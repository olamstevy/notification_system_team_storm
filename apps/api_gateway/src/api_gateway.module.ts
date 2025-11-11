import { Module } from '@nestjs/common';
import { ApiGatewayController } from './api_gateway.controller';
import { ApiGatewayService } from './api_gateway.service';

@Module({
  imports: [],
  controllers: [ApiGatewayController],
  providers: [ApiGatewayService],
})
export class ApiGatewayModule {}
