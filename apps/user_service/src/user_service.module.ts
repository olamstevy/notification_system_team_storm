import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserServiceController } from './user_service.controller';
import { UserServiceService } from './user_service.service';
import { PrismaService } from './prisma.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRATION') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UserServiceController],
  providers: [UserServiceService, PrismaService, JwtStrategy],
  exports: [UserServiceService, PrismaService],
})
export class UserServiceModule {}
