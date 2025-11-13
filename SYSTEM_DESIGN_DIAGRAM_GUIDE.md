# System Design Diagram Guide

## 🎨 How to Create the Diagram

Use **Draw.io** (https://app.diagrams.net/) to create the system design diagram.

## 📐 Components to Include

### 1. Client Layer (Top)
```
┌─────────────┐
│   Clients   │
│  (Web/App)  │
└─────────────┘
       │
       ↓
```

### 2. API Gateway (Entry Point)
```
┌─────────────────────────────────┐
│       API Gateway Service       │
│  Port: 3000                     │
│  - Authentication               │
│  - Request Validation           │
│  - Idempotency Check            │
│  - Status Tracking              │
│  └→ /api/v1/notifications       │
│  └→ /api/v1/{type}/status       │
│  └→ /api/v1/health              │
└─────────────────────────────────┘
       │
       ├──────────────────┐
       ↓                  ↓
   [User Service]   [Template Service]
   (HTTP REST)      (HTTP REST)
```

### 3. Core Services

#### User Service
```
┌───────────────────────────┐
│    User Service           │
│    Port: 3001             │
│    - User Management      │
│    - Preferences          │
│    - Push Tokens          │
│    - JWT Auth             │
└───────────────────────────┘
       │
       ↓
  [PostgreSQL DB]
```

#### Template Service
```
┌───────────────────────────┐
│   Template Service        │
│   Port: 3002              │
│   - Template Storage      │
│   - Variable Substitution │
│   - Multi-language        │
│   - Version History       │
└───────────────────────────┘
       │
       ↓
  [PostgreSQL DB]
```

### 4. Message Queue System (CENTER)
```
┌─────────────────────────────────────────┐
│          RabbitMQ Broker                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Exchange: notifications.direct │   │
│  └────────┬─────────────┬──────────┘   │
│           │             │               │
│  ┌────────▼─────┐  ┌───▼────────┐     │
│  │ email.queue  │  │ push.queue │     │
│  └──────────────┘  └────────────┘     │
│                                         │
│  ┌──────────────────┐                  │
│  │  failed.queue    │ (Dead Letter)    │
│  │  (DLQ)           │                  │
│  └──────────────────┘                  │
└─────────────────────────────────────────┘
       │              │
       ↓              ↓
```

### 5. Worker Services

#### Email Service
```
┌──────────────────────────────────┐
│      Email Service               │
│      Port: 3003                  │
│                                  │
│  ┌─────────────────────────┐    │
│  │  Circuit Breaker        │    │
│  │  States: OPEN/CLOSED/   │    │
│  │         HALF_OPEN       │    │
│  └─────────────────────────┘    │
│                                  │
│  ┌─────────────────────────┐    │
│  │  Retry System           │    │
│  │  • Max: 5 attempts      │    │
│  │  • Exponential backoff  │    │
│  │  • Jitter enabled       │    │
│  └─────────────────────────┘    │
│                                  │
│  Consumes: email.queue          │
│  Sends via: SMTP                │
└──────────────────────────────────┘
       │
       ↓
  [SMTP Server]
  (Gmail/SendGrid)
```

#### Push Service
```
┌──────────────────────────────────┐
│      Push Service                │
│      Port: 3004                  │
│                                  │
│  ┌─────────────────────────┐    │
│  │  Circuit Breaker        │    │
│  │  States: OPEN/CLOSED/   │    │
│  │         HALF_OPEN       │    │
│  └─────────────────────────┘    │
│                                  │
│  ┌─────────────────────────┐    │
│  │  Retry System           │    │
│  │  • Max: 5 attempts      │    │
│  │  • Exponential backoff  │    │
│  │  • Jitter enabled       │    │
│  └─────────────────────────┘    │
│                                  │
│  Consumes: push.queue           │
│  Sends via: FCM                 │
└──────────────────────────────────┘
       │
       ↓
   [FCM Server]
   (Firebase)
```

### 6. Shared Infrastructure

#### PostgreSQL
```
┌─────────────────────────┐
│     PostgreSQL          │
│     Port: 5432          │
│                         │
│  ├─ api_gateway_db      │
│  ├─ user_service_db     │
│  └─ template_service_db │
└─────────────────────────┘
```

#### Redis Cache
```
┌─────────────────────────┐
│        Redis            │
│        Port: 6379       │
│                         │
│  - User preferences     │
│  - Rate limiting        │
│  - Session cache        │
└─────────────────────────┘
```

## 🔄 Flow Diagrams

### Happy Path Flow
```
1. Client → API Gateway: POST /api/v1/notifications
2. API Gateway → User Service: Validate user
3. API Gateway → Template Service: Validate template
4. API Gateway → PostgreSQL: Save notification
5. API Gateway → RabbitMQ: Publish to queue
6. Email/Push Service → RabbitMQ: Consume message
7. Email/Push Service → Template Service: Get rendered template
8. Email/Push Service → User Service: Get user details
9. Email/Push Service → SMTP/FCM: Send notification
10. Email/Push Service → API Gateway: Update status
11. API Gateway → Client: Return success
```

### Failure & Retry Flow
```
1. Service consumes message from queue
2. Attempt 1: SMTP/FCM fails
   ↓
3. Retry System: Wait 1s (exponential backoff)
   ↓
4. Attempt 2: SMTP/FCM fails
   ↓
5. Retry System: Wait 2s
   ↓
6. Attempt 3-5: Continue with backoff
   ↓
7. All attempts failed
   ↓
8. Send to failed.queue (DLQ)
   ↓
9. Update status: 'failed'
```

### Circuit Breaker Flow
```
Normal State (CLOSED):
  - All requests go through
  - Failures are tracked
  
After 5 failures (OPEN):
  - Circuit opens
  - Requests fail fast
  - No external calls made
  
After timeout (HALF_OPEN):
  - Test with limited requests
  - If success → CLOSED
  - If failure → OPEN again
```

## 🎨 Color Coding

- **Blue** (#007bff): Services (API Gateway, User, Template)
- **Green** (#28a745): Worker Services (Email, Push)
- **Orange** (#fd7e14): Message Queue (RabbitMQ)
- **Red** (#dc3545): Failure paths, DLQ
- **Purple** (#6f42c1): Databases
- **Gray** (#6c757d): External services (SMTP, FCM)
- **Yellow** (#ffc107): Circuit Breaker, Retry indicators

## 📊 Scaling Strategy Indicators

Add annotations:
```
┌─────────────────────────┐
│   Email Service         │
│   [Horizontal Scaling]  │ ← Add this
│   Can run 3+ instances  │
└─────────────────────────┘
```

For each service, indicate:
- ✅ Stateless (can scale horizontally)
- 📊 Load balanced
- 🔄 Auto-scaling enabled

## 📝 Legend to Include

Create a legend box showing:
```
┌─────────────────────────┐
│        Legend           │
├─────────────────────────┤
│ →  Synchronous call     │
│ ⇢  Async message        │
│ ═  Database connection  │
│ ◆  Circuit breaker      │
│ ↻  Retry flow           │
│ ⚠  Failure path         │
│ ✓  Success path         │
└─────────────────────────┘
```

## 🎯 Key Metrics to Annotate

Add metric boxes:
```
Performance Targets:
├─ 1,000+ notifications/min
├─ <100ms API response
├─ 99.5% delivery rate
└─ Horizontal scaling support
```

## 📦 Deployment View (Optional Second Diagram)

```
┌─────────────────────────────────┐
│      Docker Compose Host        │
│                                 │
│  ┌────────────┐  ┌────────────┐│
│  │  Service   │  │  Service   ││
│  │ Container 1│  │ Container 2││
│  └────────────┘  └────────────┘│
│                                 │
│  ┌────────────────────────────┐│
│  │  Shared Network            ││
│  └────────────────────────────┘│
└─────────────────────────────────┘
```

## 🚀 Export Instructions

1. Open Draw.io: https://app.diagrams.net/
2. Create new diagram
3. Add all components from above
4. Use arrows to show connections
5. Add color coding
6. Include the legend
7. Export as:
   - PNG (for documentation)
   - PDF (for submission)
   - .drawio file (for editing)

Save files as:
- `SYSTEM_DESIGN_DIAGRAM.png`
- `SYSTEM_DESIGN_DIAGRAM.pdf`
- `SYSTEM_DESIGN_DIAGRAM.drawio`

## ✅ Checklist Before Submitting

- [ ] All 5 microservices shown
- [ ] RabbitMQ with exchange and 3 queues
- [ ] PostgreSQL databases per service
- [ ] Redis cache included
- [ ] External services (SMTP, FCM) shown
- [ ] Circuit breaker indicators
- [ ] Retry flow arrows
- [ ] Dead-letter queue flow
- [ ] Scaling annotations
- [ ] Color coding applied
- [ ] Legend included
- [ ] Flow direction clear
- [ ] All ports labeled
- [ ] HTTP vs Message Queue connections differentiated
