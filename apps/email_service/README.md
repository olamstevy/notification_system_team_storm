# Email Service

The Email Service is a microservice responsible for processing email notifications from the notification system. It reads messages from RabbitMQ, renders templates with variables, sends emails via SMTP or Gmail, and handles delivery confirmations and bounce notifications.

## Features

- **Asynchronous Message Processing**: Consumes email notifications from RabbitMQ queue with automatic retry logic
- **Template Rendering**: Fetches and renders email templates with dynamic variables via REST API
- **Multi-Provider Support**: Supports both SMTP and Gmail API for sending emails
- **Service Communication**:
  - **Asynchronous**: RabbitMQ for notification processing and status updates
  - **Synchronous**: REST API calls to User Service, Template Service, and API Gateway
- **Delivery Tracking**: Tracks email delivery status and provides delivery confirmations
- **Error Handling**: Implements retry logic with exponential backoff for failed sends
- **Health Checks**: Provides health and status endpoints for monitoring

## Service Communication Architecture

### Asynchronous Communication (RabbitMQ)
```
API Gateway
    ↓
Notification Queue (notifications.direct exchange)
    ↓
Email Service (Consumer)
    ↓
Process Email & Send
    ↓
Retry Queue (on failure)
    ↓
Failed Queue (DLQ after max retries)
```

### Synchronous Communication (REST)
```
Email Service
    ├── GET /users/{userId} → User Service (fetch user email)
    ├── GET /users/{userId}/preferences → User Service (fetch preferences)
    ├── POST /templates/render/{code} → Template Service (render template)
    ├── GET /templates/{code} → Template Service (fetch template)
    └── POST /email/status → API Gateway (update notification status)
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Email Service                     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │   RabbitMQ Consumer Service                  │   │
│  │   - Consumes from email.queue                │   │
│  │   - Handles retry logic (max 3 retries)      │   │
│  │   - Acknowledgment on success                │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                 │
│  ┌──────────────────▼───────────────────────────┐   │
│  │   Email Service Core                         │   │
│  │   - Process notifications                    │   │
│  │   - Template rendering                       │   │
│  │   - Email sending coordination               │   │
│  │   - Status tracking                          │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                 │
│     ┌───────────────┼───────────────┐                │
│     │               │               │                │
│  ┌──▼──┐       ┌────▼────┐    ┌───▼──────┐          │
│  │SMTP │       │Template │    │   HTTP   │          │
│  │Email│       │Rendering│    │  Client  │          │
│  │Sender       │Service  │    │ (REST)   │          │
│  └─────┘       └─────────┘    └──────────┘          │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

```env
# Service Configuration
PORT=3000
NODE_ENV=development

# RabbitMQ Configuration
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# Email Provider (smtp or gmail)
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@example.com

# SMTP Configuration
SMTP_HOST=localhost
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-smtp-password

# Gmail Configuration (if using EMAIL_PROVIDER=gmail)
GMAIL_EMAIL=your-gmail@gmail.com
GMAIL_PASSWORD=your-app-password

# Service URLs for REST Communication
USER_SERVICE_URL=http://localhost:3001
TEMPLATE_SERVICE_URL=http://localhost:3002
API_GATEWAY_URL=http://localhost:3000

# Email Retry Configuration
MAX_RETRIES=3
RETRY_DELAY_MS=5000
REQUEST_TIMEOUT_MS=10000
```

## API Endpoints

### Health Check
```
GET /api/v1/health
```
Returns health status of the email service.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-11T10:30:00Z"
  },
  "message": "Email service is healthy"
}
```

### Service Status
```
GET /api/v1/status
```
Returns detailed status information including SMTP connection and queue consumer status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "email_service",
    "smtp_connected": true,
    "queue_consumer_active": true,
    "timestamp": "2025-12-11T10:30:00Z"
  },
  "message": "Service status retrieved"
}
```

## Message Format

### Email Notification Message (from RabbitMQ)
```json
{
  "notification_id": "uuid-123",
  "user_id": "user-456",
  "template_code": "welcome_email",
  "variables": {
    "name": "John Doe",
    "email": "john@example.com",
    "activation_link": "https://example.com/activate/token"
  },
  "priority": 5,
  "metadata": {
    "campaign_id": "campaign-789",
    "send_at": "2025-12-11T10:30:00Z"
  }
}
```

### Status Update to API Gateway
```json
{
  "notification_id": "uuid-123",
  "status": "sent|failed|bounced|delivered",
  "metadata": {
    "messageId": "message-id-from-smtp",
    "errorMessage": "Error details if failed",
    "timestamp": "2025-12-11T10:30:00Z"
  }
}
```

## Email Processing Flow

1. **Message Received**: Email Service consumes message from RabbitMQ `email.queue`
2. **User Lookup**: Fetches user details from User Service via REST API
3. **Template Rendering**: Requests template rendering from Template Service with variables
4. **Email Sending**: Sends email via configured SMTP provider
5. **Status Update**: Updates notification status in API Gateway
6. **Error Handling**: On failure, retries up to MAX_RETRIES times with exponential backoff
7. **Dead Letter**: After max retries, message moves to failed queue

## Error Handling & Retry Logic

### Retry Strategy
- **Max Retries**: 3 attempts per message
- **Retry Delay**: 5 seconds (configurable)
- **Backoff**: Linear backoff between retries
- **Dead Letter Queue**: Messages exceeding max retries are moved to `email.failed.queue`

### Error Scenarios
- **User Not Found**: Status updated to failed, message acknowledged
- **Template Not Found**: Status updated to failed, message retried
- **SMTP Connection Failed**: Message retried with backoff
- **Invalid Email Format**: Status updated to failed, message acknowledged

## Development

### Install Dependencies
```bash
npm install
```

### Run in Development Mode
```bash
npm run start:dev
```

### Build
```bash
npm run build
```

### Run in Production
```bash
npm run start:prod
```

## Testing

### Email Service Tests
```bash
npm run test -- email_service
```

### E2E Tests
```bash
npm run test:e2e -- email_service
```

## Integration with Other Services

### User Service Integration
- **Endpoint**: `GET /api/v1/users/{userId}`
- **Purpose**: Fetch user email address and preferences
- **Required**: User must have email field

### Template Service Integration
- **Endpoints**:
  - `POST /api/v1/templates/render/{code}` - Render template with variables
  - `GET /api/v1/templates/{code}` - Fetch template metadata
- **Purpose**: Get email subject and body with rendered variables

### API Gateway Integration
- **Endpoint**: `POST /api/v1/email/status`
- **Purpose**: Update notification delivery status
- **Payload**: Includes notification_id, status, and metadata

## Monitoring

The service provides monitoring endpoints:
- Health checks: `/api/v1/health`
- Status endpoint: `/api/v1/status`
- RabbitMQ queue monitoring via management console
- Log aggregation for message processing

## Troubleshooting

### SMTP Connection Issues
- Verify SMTP credentials
- Check firewall rules for port access
- Ensure SMTP_SECURE setting matches server requirements

### Messages Not Processing
- Check RabbitMQ connection in logs
- Verify `email.queue` exists and has messages
- Check queue consumer is active: `GET /api/v1/status`

### User Service Not Found
- Verify USER_SERVICE_URL is correct
- Ensure User Service is running and accessible
- Check network connectivity between services

### Template Rendering Failures
- Verify TEMPLATE_SERVICE_URL is correct
- Ensure template exists with correct code
- Check template variables match expected format

## Deployment

The service is containerized and can be deployed using Docker Compose. See the main project's `docker-compose.yml` for configuration.

```yaml
email_service:
  build:
    context: .
    dockerfile: apps/email_service/Dockerfile
  container_name: email_service
  env_file:
    - apps/email_service/.env
  ports:
    - "3003:3000"
  depends_on:
    - rabbitmq
    - postgres
```

## License

UNLICENSED
