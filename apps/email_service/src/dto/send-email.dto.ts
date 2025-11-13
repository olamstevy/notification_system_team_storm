import {
    IsString,
    IsEmail,
    IsOptional,
    IsObject,
    IsEnum,
} from 'class-validator';

export enum EmailPriority {
    LOW = 1,
    NORMAL = 5,
    HIGH = 10,
}

export class SendEmailDto {
    @IsString()
    notification_id: string;

    @IsEmail()
    to: string;

    @IsString()
    template_code: string;

    @IsOptional()
    @IsObject()
    variables?: Record<string, any>;

    @IsOptional()
    @IsEnum(EmailPriority)
    priority?: EmailPriority;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class EmailDeliveryDto {
    @IsString()
    notification_id: string;

    @IsString()
    @IsEmail()
    to: string;

    @IsString()
    subject: string;

    @IsString()
    body: string;

    @IsOptional()
    @IsObject()
    variables?: Record<string, any>;
}

export class EmailConfirmationDto {
    @IsString()
    notification_id: string;

    @IsString()
    message_id: string;

    @IsString()
    status: 'sent' | 'failed' | 'bounced' | 'delivered';

    @IsOptional()
    @IsString()
    error_message?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
