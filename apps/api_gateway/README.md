# API Gateway Service

The API Gateway is the entry point for the distributed notification system. It handles request validation, authentication, routing to message queues, and notification status tracking.

## Features

- ✅ Request validation and authentication
- ✅ Idempotency using `request_id` (prevents duplicate notifications)
- ✅ Routes notifications to RabbitMQ queues (email/push)
- ✅ Tracks notification status and history
- ✅ Health check endpoint
- ✅ Validates users and templates exist before queueing
- ✅ RESTful API with proper error handling

## Endpoints

### 1. Create Notification
**POST** `/api/v1/notifications`

Creates a new notification and queues it for processing.

```json
{
  "notification_type": "email",
  "user_id": "uuid-here",
  "template_code": "welcome_email",
  "variables": {
    "name": "John Doe",
    "link": "https://example.com",
    "meta": {}
  },
  "request_id": "unique-request-id",
  "priority": 5,
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification queued successfully",
  "data": {
    "notification_id": "uuid",
    "status": "pending",
    "created_at": "2025-11-12T05:00:00Z"
  }
}
```

### 2. Update Notification Status
**POST** `/api/v1/{notification_preference}/status`

Updates the status of a notification (called by email/push services).

```json
{
  "notification_id": "uuid",
  "status": "delivered",
  "timestamp": "2025-11-12T05:00:00Z",
  "error": null
}
```

### 3. Get Notification Status
**GET** `/api/v1/notifications/:id/status`

Retrieves the status and history of a notification.

### 4. Health Check
**GET** `/api/v1/health`

Returns the health status of the API Gateway.

## Environment Variables

```env
PORT=3000
DATABASE_URL="postgresql://user:password@postgres:5432/notification_db"
RABBITMQ_URL="amqp://guest:guest@rabbitmq:5672"
USER_SERVICE_URL="http://user_service:3000"
TEMPLATE_SERVICE_URL="http://template_service:3000"
```

## Database Schema

The API Gateway uses two tables:
- `notification`: Main notification record
- `notification_status`: Status history for each notification

## RabbitMQ Setup

The service creates:
- **Exchange**: `notifications.direct`
- **Queues**: `email.queue`, `push.queue`, `failed.queue`

Messages are routed based on `notification_type`.

## Development

```bash
# Generate Prisma client
npx prisma generate --schema=./apps/api_gateway/prisma/schema.prisma

# Run migrations
npx prisma migrate dev --schema=./apps/api_gateway/prisma/schema.prisma

# Start in development
npm run start:dev api_gateway
```

## Key Features Implemented

### Idempotency
Uses `request_id` to prevent duplicate notifications. If the same `request_id` is sent twice, it returns a 409 Conflict error.

### Validation
- Validates user exists by calling User Service
- Validates template exists by calling Template Service
- Validates all request fields using class-validator

### Status Tracking
- Records every status change in `notification_status` table
- Maintains complete history of notification lifecycle

### Error Handling
- Proper HTTP status codes
- Detailed error messages
- Failed messages can be routed to dead-letter queue
