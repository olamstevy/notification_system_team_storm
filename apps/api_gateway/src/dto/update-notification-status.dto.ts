import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { NotificationStatus } from '../enums/notification.enum';

export class UpdateNotificationStatusDto {
  @IsString()
  @IsNotEmpty()
  notification_id: string;

  @IsEnum(NotificationStatus)
  @IsNotEmpty()
  status: NotificationStatus;

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  error?: string;
}
