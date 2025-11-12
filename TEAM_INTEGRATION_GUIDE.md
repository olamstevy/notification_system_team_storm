# Team Integration Guide

## Current Status (as of Nov 12, 2025 - 6:45 AM)

### ✅ Completed Services
1. **User Service** - Freeman (DONE)
2. **Template Service** - StephenAKA (DONE)
3. **API Gateway** - Jibs.A (DONE)

### ⏳ Remaining Services
1. **Email Service** - PENDING
2. **Push Service** - PENDING

## Quick Start for Email & Push Services

### Email Service Checklist
The email service needs to:

1. **Connect to RabbitMQ**
   ```typescript
   // Consume from email.queue
   const connection = await amqp.connect(process.env.RABBITMQ_URL);
   const channel = await connection.createChannel();
   await channel.consume('email.queue', async (msg) => {
     const notification = JSON.parse(msg.content.toString());
     await processEmail(notification);
   });
   ```

2. **Process Notification Message**
   ```typescript
   interface QueueMessage {
     notification_id: string;
     user_id: string;
     template_code: string;
     variables: { name: string; link: string; meta?: any };
     priority: number;
   }
   ```

3. **Fetch User Email** (from User Service)
   ```bash
   GET http://user_service:3000/api/v1/users/{user_id}
   ```

4. **Fetch Template** (from Template Service)
   ```bash
   GET http://template_service:3000/api/v1/templates/{template_code}
   ```

5. **Render Template with Variables**
   ```typescript
   // Replace {{name}}, {{link}} etc in template
   const rendered = template.replace(/{{(\w+)}}/g, (_, key) => variables[key]);
   ```

6. **Send Email** (using SMTP/SendGrid/Mailgun)
   - Gmail SMTP (free): smtp.gmail.com:587
   - SendGrid API
   - Mailgun API

7. **Update Status** (call back to API Gateway)
   ```bash
   POST http://api_gateway:3000/api/v1/email/status
   {
     "notification_id": "uuid",
     "status": "delivered",  # or "failed"
     "error": null
   }
   ```

### Push Service Checklist
The push service needs to:

1. **Connect to RabbitMQ**
   ```typescript
   // Consume from push.queue
   await channel.consume('push.queue', async (msg) => {
     const notification = JSON.parse(msg.content.toString());
     await processPush(notification);
   });
   ```

2. **Fetch User Push Token** (from User Service)
   ```bash
   GET http://user_service:3000/api/v1/users/{user_id}
   # Response includes push_token
   ```

3. **Send Push Notification**
   - Use Firebase Cloud Messaging (FCM)
   - Or OneSignal (free tier)
   - Or Web Push with VAPID

4. **Update Status** (call back to API Gateway)
   ```bash
   POST http://api_gateway:3000/api/v1/push/status
   {
     "notification_id": "uuid",
     "status": "delivered",
     "error": null
   }
   ```

## Testing the Full Flow

### 1. Start Infrastructure
```bash
docker-compose up postgres redis rabbitmq
```

### 2. Run Database Migrations
```bash
# For User Service
npx prisma migrate dev --schema=./apps/user_service/prisma/schema.prisma

# For Template Service  
npx prisma migrate dev --schema=./apps/template_service/prisma/schema.prisma

# For API Gateway
npx prisma migrate dev --schema=./apps/api_gateway/prisma/schema.prisma
```

### 3. Start All Services
```bash
# Terminal 1: User Service
npm run start:dev user_service

# Terminal 2: Template Service
npm run start:dev template_service

# Terminal 3: API Gateway
npm run start:dev api_gateway

# Terminal 4: Email Service (when ready)
npm run start:dev email_service

# Terminal 5: Push Service (when ready)
npm run start:dev push_service
```

### 4. Test End-to-End

**Step 1: Create a user**
```bash
curl -X POST http://localhost:3001/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "push_token": "fcm-token-here"
  }'
```

**Step 2: Create a template**
```bash
curl -X POST http://localhost:3002/api/v1/templates \
  -H "Content-Type: application/json" \
  -d '{
    "code": "welcome",
    "subject": "Welcome {{name}}!",
    "body": "Hi {{name}}, click here: {{link}}"
  }'
```

**Step 3: Send notification**
```bash
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "email",
    "user_id": "user-uuid-from-step-1",
    "template_code": "welcome",
    "variables": {
      "name": "John Doe",
      "link": "https://example.com"
    },
    "request_id": "unique-req-123",
    "priority": 5
  }'
```

**Step 4: Check RabbitMQ**
Visit http://localhost:15672 (guest/guest) to see messages in queues.

**Step 5: Check notification status**
```bash
curl http://localhost:3000/api/v1/notifications/{notification-id}/status
```

## Environment Setup

### Create .env files for each service

**apps/user_service/.env**
```env
PORT=3001
DATABASE_URL="postgresql://user:password@localhost:5432/notification_db"
JWT_SECRET="your-secret-here"
```

**apps/template_service/.env**
```env
PORT=3002
DATABASE_URL="postgresql://user:password@localhost:5432/notification_db"
```

**apps/api_gateway/.env**
```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/notification_db"
RABBITMQ_URL="amqp://guest:guest@localhost:5672"
USER_SERVICE_URL="http://localhost:3001"
TEMPLATE_SERVICE_URL="http://localhost:3002"
```

**apps/email_service/.env**
```env
PORT=3003
RABBITMQ_URL="amqp://guest:guest@localhost:5672"
API_GATEWAY_URL="http://localhost:3000"
USER_SERVICE_URL="http://localhost:3001"
TEMPLATE_SERVICE_URL="http://localhost:3002"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

**apps/push_service/.env**
```env
PORT=3004
RABBITMQ_URL="amqp://guest:guest@localhost:5672"
API_GATEWAY_URL="http://localhost:3000"
USER_SERVICE_URL="http://localhost:3001"
FCM_SERVER_KEY="your-fcm-key"
```

## Docker Compose (For Production)

The docker-compose.yml is already configured. Just need to:

1. Create .env files for each service
2. Build: `docker-compose build`
3. Run: `docker-compose up`

## Deadline Reminders

- **Deadline**: Tonight (Nov 12, 2025) 11:59 PM WAT
- **Current Time**: ~6:45 AM WAT
- **Time Remaining**: ~17 hours

## Priority Tasks

### HIGH PRIORITY (Must Complete)
1. ✅ User Service - DONE
2. ✅ Template Service - DONE  
3. ✅ API Gateway - DONE
4. ⚠️ Email Service - **START NOW**
5. ⚠️ Push Service - **START NOW**

### MEDIUM PRIORITY
- Database migrations for all services
- Environment configuration
- Basic testing

### NICE TO HAVE (if time permits)
- Circuit breaker implementation
- Retry logic with exponential backoff
- Comprehensive test coverage
- CI/CD workflows
- System design diagram

## Communication

Post updates in the team channel:
- What you're working on
- Blockers you're facing
- When features are complete

## Questions?

If you're stuck:
1. Check the README in each completed service
2. Look at API_GATEWAY_IMPLEMENTATION.md for reference
3. Ask in the team channel
4. The API Gateway can serve as a reference for:
   - RabbitMQ integration
   - Service-to-service HTTP calls
   - Prisma setup
   - DTO validation

## Good Luck! 🚀
