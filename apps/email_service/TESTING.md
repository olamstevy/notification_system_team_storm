# Email Service Integration Testing Guide

This guide provides step-by-step instructions for testing and validating the Email Service integration within the notification system.

## Prerequisites

1. All services running (API Gateway, Email Service, User Service, Template Service, RabbitMQ)
2. Email templates created in Template Service
3. Users registered in User Service with valid email addresses
4. Postman or equivalent API client installed

## Testing Workflow

### 1. Health Check

**Verify email service is running:**

```
GET http://localhost:3003/api/v1/health
```

Expected Response (200 OK):
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

### 2. Service Status Check

**Check email service status including SMTP connection:**

```
GET http://localhost:3003/api/v1/status
```

Expected Response (200 OK):
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

### 3. Create User (if not exists)

**Register a test user in User Service:**

```
POST http://localhost:3001/api/v1/users/register
Content-Type: application/json

{
  "name": "Test User",
  "email": "testuser@example.com",
  "password": "TestPassword123!",
  "push_token": "test-token-123"
}
```

Expected Response (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid-123",
      "name": "Test User",
      "email": "testuser@example.com",
      "push_token": "test-token-123",
      "preferences": {
        "email": true,
        "push": true
      }
    },
    "access_token": "jwt-token"
  },
  "message": "User registered successfully"
}
```

### 4. Create Email Template

**Create a test email template in Template Service:**

```
POST http://localhost:3002/api/v1/templates
Content-Type: application/json

{
  "code": "welcome_email",
  "subject": "Welcome to Our Service, {{name}}!",
  "body": "Hello {{name}},\n\nWelcome to our notification system!\n\nBest regards,\nThe Team",
  "language": "en"
}
```

Expected Response (201 Created):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "code": "welcome_email",
    "subject": "Welcome to Our Service, {{name}}!",
    "body": "Hello {{name}},\n\nWelcome to our notification system!\n\nBest regards,\nThe Team",
    "language": "en",
    "version": 1,
    "created_at": "2025-12-11T10:30:00Z"
  },
  "message": "template_created"
}
```

### 5. Create Email Notification

**Trigger an email notification through the API Gateway:**

```
POST http://localhost:3000/api/v1/notifications
Content-Type: application/json

{
  "request_id": "req-001-{{timestamp}}",
  "notification_type": "email",
  "user_id": "user-uuid-123",
  "template_code": "welcome_email",
  "variables": {
    "name": "Test User"
  },
  "priority": 5,
  "metadata": {
    "campaign": "welcome_campaign",
    "source": "postman_test"
  }
}
```

Expected Response (201 Created):
```json
{
  "success": true,
  "data": {
    "notification_id": "notif-uuid-456",
    "status": "PENDING",
    "created_at": "2025-12-11T10:30:00Z"
  },
  "message": "Notification queued successfully"
}
```

### 6. Check Notification Status

**Query the notification status:**

```
GET http://localhost:3000/api/v1/notifications/notif-uuid-456/status
```

Expected Response (200 OK):
```json
{
  "success": true,
  "data": {
    "notification_id": "notif-uuid-456",
    "status": "SENT",
    "status_history": [
      {
        "status": "PENDING",
        "created_at": "2025-12-11T10:30:00Z"
      },
      {
        "status": "SENT",
        "created_at": "2025-12-11T10:30:05Z",
        "metadata": {
          "messageId": "email-message-id-123"
        }
      }
    ]
  },
  "message": "Notification status retrieved"
}
```

## Test Scenarios

### Scenario 1: Successful Email Send

**Steps:**
1. Create user with valid email
2. Create email template
3. Send email notification
4. Verify status changes from PENDING → SENT

**Success Criteria:**
- Notification status is SENT
- Message ID is present in metadata
- Email is received by user

### Scenario 2: Template Not Found

**Steps:**
1. Create user with valid email
2. Send notification with non-existent template code

**Success Criteria:**
- Notification status is FAILED
- Error message indicates template not found
- Message is acknowledged from queue

### Scenario 3: User Not Found

**Steps:**
1. Send notification with non-existent user ID
2. Check notification status

**Success Criteria:**
- Notification status is FAILED
- Error message indicates user not found

### Scenario 4: SMTP Connection Failure

**Steps:**
1. Stop or misconfigure SMTP server
2. Send email notification
3. Verify retry logic

**Success Criteria:**
- Notification is retried up to MAX_RETRIES times
- After max retries, status is FAILED
- Message moves to failed queue

### Scenario 5: Queue Processing

**Steps:**
1. Send multiple notifications
2. Monitor queue processing
3. Check status updates

**Success Criteria:**
- All messages are processed
- No messages remain in queue
- Status updates reflect email delivery

## Monitoring

### View RabbitMQ Queue Status

Access RabbitMQ Management Console:
```
http://localhost:15672
```

Login with credentials:
- Username: guest
- Password: guest

Check:
- `email.queue` - Should have 0 or minimal messages when processing
- `email.failed.queue` - Check for failed messages
- Consumer count should be 1

### View Application Logs

For Docker deployment:
```bash
docker logs email_service
```

For local development:
```bash
npm run start:dev
```

## Debugging Tips

### Enable Detailed Logging
Set `LOG_LEVEL=debug` in .env

### Check Service URLs
Verify all service URLs in email service .env:
```bash
curl http://localhost:3001/api/v1/health
curl http://localhost:3002/api/v1/health
curl http://localhost:3000/api/v1/health
```

### Test SMTP Connection
```bash
# Test SMTP connectivity
telnet localhost 587
```

### Inspect RabbitMQ Messages
Use RabbitMQ management console to view message details, headers, and retry counts

## Performance Testing

### Send Bulk Notifications

Create a script to send multiple notifications:

```bash
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/v1/notifications \
    -H "Content-Type: application/json" \
    -d "{
      \"request_id\": \"req-bulk-$i\",
      \"notification_type\": \"email\",
      \"user_id\": \"user-uuid-123\",
      \"template_code\": \"welcome_email\",
      \"variables\": {\"name\": \"User $i\"}
    }"
  sleep 1
done
```

Monitor:
- Queue processing speed
- Email delivery rate
- Error rate
- Service performance metrics

## Troubleshooting

### Issue: Emails not being sent

**Check:**
1. Email service is running: `GET /api/v1/health`
2. SMTP connection: `GET /api/v1/status`
3. RabbitMQ has messages in queue
4. Service logs for errors

### Issue: Messages stuck in queue

**Solution:**
1. Check consumer is active
2. Restart email service
3. Check for application errors in logs
4. Manually requeue failed messages via RabbitMQ console

### Issue: Template rendering fails

**Check:**
1. Template exists: `GET http://localhost:3002/api/v1/templates/template-code`
2. Variables match template placeholders
3. Template syntax is correct

### Issue: User lookup fails

**Check:**
1. User exists in User Service
2. USER_SERVICE_URL is correct
3. User has email field populated
4. Network connectivity between services

## Next Steps

After successful testing:
1. Deploy to staging environment
2. Perform load testing
3. Implement monitoring and alerting
4. Set up retry policies
5. Configure backup SMTP server
6. Document runbooks for operations team
