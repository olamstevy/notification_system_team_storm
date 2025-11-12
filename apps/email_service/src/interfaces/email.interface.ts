export interface EmailProvider {
    sendEmail(
        to: string,
        subject: string,
        body: string,
        htmlBody?: string,
    ): Promise<{ messageId: string; success: boolean }>;
}

export interface EmailDeliveryEvent {
    notification_id: string;
    message_id: string;
    status: 'sent' | 'failed' | 'bounced' | 'delivered';
    error_message?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface QueueMessage {
    notification_id: string;
    user_id: string;
    template_code: string;
    variables?: Record<string, any>;
    priority?: number;
    metadata?: Record<string, any>;
}
