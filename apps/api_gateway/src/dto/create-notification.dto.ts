import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { NotificationType } from '../enums/notification.enum';

export class UserDataDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  link: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}

export class CreateNotificationDto {
  @IsEnum(NotificationType)
  @IsNotEmpty()
  notification_type: NotificationType;

  @IsUUID()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  template_code: string;

  @IsObject()
  @IsNotEmpty()
  variables: UserDataDto;

  @IsString()
  @IsNotEmpty()
  request_id: string;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  priority?: number = 5;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
