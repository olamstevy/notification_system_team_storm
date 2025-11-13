# Distributed Notification System - Team Storm

> A production-ready microservices-based notification system built with NestJS, featuring circuit breaker pattern, retry mechanisms, and message queue architecture.

## 🏗️ Architecture Overview

A scalable, fault-tolerant notification system supporting email and push notifications with advanced reliability patterns including circuit breakers, exponential backoff retry, and dead-letter queue handling.

### 📊 System Design
![System Architecture](./SYSTEM_DESIGN_DIAGRAM.png)

---

## 🎯 Key Features

- ✅ **5 Microservices Architecture** - Independent, scalable services
- ✅ **Circuit Breaker Pattern** - Prevents cascading failures
- ✅ **Retry System** - Exponential backoff with up to 5 attempts
- ✅ **Idempotency** - Prevents duplicate notifications using request_id
- ✅ **Dead Letter Queue** - Handles permanently failed messages
- ✅ **JWT Authentication** - Secure user authentication
- ✅ **Template Engine** - Dynamic content with variable substitution
- ✅ **Multi-language Support** - Internationalization ready
- ✅ **Health Monitoring** - All services expose health endpoints
- ✅ **Horizontal Scaling** - Stateless design for easy scaling

---

## 🚀 Services

### 1. API Gateway (Port 3000)
**Entry point for all notification requests**
- Request validation and authentication
- Idempotency checking (request_id)
- User and template validation
- Message routing to appropriate queues
- Notification status tracking

**Endpoints:**
- `POST /api/v1/notifications` - Create notification
- `POST /api/v1/:type/status` - Update notification status
- `GET /api/v1/notifications/:id/status` - Get notification status
- `GET /api/v1/health` - Health check

### 2. User Service (Port 3001)
**User management and preferences**
- User registration and authentication (JWT)
- Notification preferences (email/push enable/disable)
- Push token management
- User profile management

**Endpoints:**
- `POST /api/v1/users/register` - Register user
- `POST /api/v1/users/login` - Login
- `GET /api/v1/users/:id` - Get user
- `PATCH /api/v1/users/preferences` - Update preferences
- `GET /api/v1/health` - Health check

### 3. Template Service (Port 3002)
**Template storage and rendering**
- Template CRUD operations
- Variable substitution with Handlebars
- Multi-language template support
- Version history tracking

**Pre-loaded Templates:**
- `welcome` - Welcome email/push for new users
- `new_message` - New message notification
- `password_reset` - Password reset email

**Endpoints:**
- `POST /api/v1/templates/render` - Render template
- `GET /api/v1/templates` - List all templates
- `GET /api/v1/templates/:code` - Get specific template
- `POST /api/v1/templates` - Create template
- `GET /api/v1/health` - Health check

### 4. Email Service (Port 3003)
**Email delivery worker**
- Consumes messages from `email.queue`
- Sends emails via SMTP (Gmail/SendGrid)
- Circuit breaker for SMTP failures
- Retry with exponential backoff (1s, 2s, 4s, 8s, 16s)
- Failed messages sent to DLQ after 5 attempts

**Features:**
- HTML and plain text email support
- Template rendering integration
- User preference checking
- Delivery status updates

### 5. Push Service (Port 3004)
**Push notification delivery worker**
- Consumes messages from `push.queue`
- Sends push notifications via FCM
- Circuit breaker for FCM failures
- Retry with exponential backoff
- Rich notification support (title, body, image, link)

**Features:**
- FCM integration
- Device token validation
- User preference checking
- Delivery status updates

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | NestJS (TypeScript) |
| Message Queue | RabbitMQ |
| Database | PostgreSQL (per service) |
| Cache | Redis |
| Email | SMTP (Gmail/SendGrid) |
| Push | Firebase Cloud Messaging (FCM) |
| Authentication | JWT (Passport) |
| Template Engine | Handlebars |
| Validation | class-validator |
| Containerization | Docker |
| CI/CD | GitHub Actions |

---

## 🏃 Quick Start

### Prerequisites
- Node.js (v20+)
- Docker & Docker Compose
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Infrastructure
```bash
# Start PostgreSQL, Redis, and RabbitMQ
docker-compose up -d postgres redis rabbitmq

# Wait for services to be ready (~30 seconds)
docker ps
```

### 3. Configure Environment Variables

Create `.env` files for each service:

**Email Service** (`apps/email_service/.env`):
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@notifications.com
RABBITMQ_URL=amqp://guest:guest@localhost:5672
USER_SERVICE_URL=http://localhost:3001
TEMPLATE_SERVICE_URL=http://localhost:3002
API_GATEWAY_URL=http://localhost:3000
PORT=3000
```

**Push Service** (`apps/push_service/.env`):
```env
FCM_SERVER_KEY=your-fcm-server-key
RABBITMQ_URL=amqp://guest:guest@localhost:5672
USER_SERVICE_URL=http://localhost:3001
TEMPLATE_SERVICE_URL=http://localhost:3002
API_GATEWAY_URL=http://localhost:3000
PORT=3000
```

### 4. Start All Services

Open 5 separate terminals and run:

```bash
# Terminal 1: API Gateway
npm run start:dev -- api_gateway

# Terminal 2: User Service
npm run start:dev -- user_service

# Terminal 3: Template Service
npm run start:dev -- template_service

# Terminal 4: Email Service
npm run start:dev -- email_service

# Terminal 5: Push Service
npm run start:dev -- push_service
```

### 5. Verify Health

```bash
curl http://localhost:3000/api/v1/health  # API Gateway
curl http://localhost:3001/api/v1/health  # User Service
curl http://localhost:3002/api/v1/health  # Template Service
curl http://localhost:3003/api/v1/health  # Email Service
curl http://localhost:3004/api/v1/health  # Push Service
```

### 6. Test Notification Flow

**Create a user:**
```bash
curl -X POST http://localhost:3001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Send notification:**
```bash
curl -X POST http://localhost:3000/api/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "notification_type": "email",
    "user_id": "USER_ID_FROM_ABOVE",
    "template_code": "welcome",
    "variables": {
      "name": "John Doe",
      "link": "https://example.com"
    },
    "request_id": "unique-id-123",
    "priority": 5
  }'
```

---

## 📊 Message Queue Architecture

### RabbitMQ Setup

```
Exchange: notifications.direct (Direct Exchange)
    ├─ email.queue  → Email Service
    ├─ push.queue   → Push Service
    └─ failed.queue → Dead Letter Queue (DLQ)
```

### Message Flow

1. Client → API Gateway (HTTP)
2. API Gateway → RabbitMQ (Publish)
3. RabbitMQ → Worker Service (Consume)
4. Worker → External Service (SMTP/FCM)
5. Worker → API Gateway (Status Update)

### Failure Handling

```
Attempt 1: Failed
  ↓ Wait 1s
Attempt 2: Failed
  ↓ Wait 2s
Attempt 3: Failed
  ↓ Wait 4s
Attempt 4: Failed
  ↓ Wait 8s
Attempt 5: Failed
  ↓
Sent to DLQ (failed.queue)
Status updated to "failed"
```

---

## 🔧 Configuration

### Response Format

All APIs return standardized responses:

```typescript
{
  success: boolean,
  data?: T,
  error?: string,
  message: string,
  meta?: {
    total: number,
    limit: number,
    page: number,
    total_pages: number,
    has_next: boolean,
    has_previous: boolean
  }
}
```

### Notification Types

```typescript
enum NotificationType {
  email = "email",
  push = "push"
}

enum NotificationStatus {
  pending = "pending",
  delivered = "delivered",
  failed = "failed"
}
```

---

## 📊 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| Throughput | 1,000+ notifications/min | ✅ Achievable |
| API Response Time | < 100ms | ✅ Optimized |
| Delivery Success Rate | 99.5% | ✅ With retry system |
| Horizontal Scaling | Supported | ✅ Stateless design |

---

## 🔐 Security

- ✅ Environment variables for secrets (never hardcoded)
- ✅ JWT authentication for protected endpoints
- ✅ Password hashing with bcrypt
- ✅ Request validation with class-validator
- ✅ CORS enabled
- ✅ Rate limiting (planned with Redis)

---

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Manual Testing
```bash
# Test SMTP configuration
node test-email.js

# Check RabbitMQ Management UI
open http://localhost:15672
# Username: guest, Password: guest
```

---

## 🚀 CI/CD Pipeline

Automated pipeline with GitHub Actions:

1. **Lint & Test** - Code quality and test execution
2. **Build** - Docker images for all services
3. **Deploy** - Automated deployment to server
4. **Health Check** - Post-deployment verification

See `.github/workflows/ci-cd.yml` for details.

---

## 📝 Documentation

- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Complete implementation details and technical overview
- [QUICK_START.md](./QUICK_START.md) - Quick start guide
- [TEST_RESULTS.md](./TEST_RESULTS.md) - Test results and verification
- [SYSTEM_DESIGN_DIAGRAM_GUIDE.md](./SYSTEM_DESIGN_DIAGRAM_GUIDE.md) - Architecture guide
- [ACTION_ITEMS_FOR_TEAM.md](./ACTION_ITEMS_FOR_TEAM.md) - Team task breakdown
- [FINAL_SUBMISSION_CHECKLIST.md](./FINAL_SUBMISSION_CHECKLIST.md) - Submission guide

---

## 👥 Team Members - Team Storm

- Member 1 - Ajibola Abolade
- Member 2 - Stephen Akande
- Member 3 - Steve David
- Member 4 - James O


---

## 📄 License

UNLICENSED - Private Project

---

## 🙏 Acknowledgments

Built as part of HNG Internship Stage 4 Backend Task - Distributed Notification System

**Project Statistics:**
- **Services:** 5 microservices
- **Lines of Code:** 3,000+
- **Patterns Implemented:** 12+ (Circuit Breaker, Retry, DLQ, Idempotency, etc.)
- **Test Coverage:** Infrastructure, SMTP, Templates verified
- **Documentation Pages:** 8+

---

## 📞 Support

For questions or issues:
1. Check documentation files in project root
2. Review implementation status in `IMPLEMENTATION_STATUS.md`
3. See troubleshooting in `QUICK_START.md`

---

**Built with ❤️ by Team Storm**
